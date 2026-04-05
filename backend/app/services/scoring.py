"""
Rule-based scoring engine — 6 поведенческих паттернов с весами.
Каждый вывод объясняется: какой паттерн сработал и почему.
"""
from datetime import datetime
from typing import List
from collections import defaultdict
from app.models import Transaction

# ─── Классификатор gambling-транзакций ───────────────────────────────────────

GAMBLING_KEYWORDS = [
    "1xbet", "olimp", "fonbet", "melbet", "parimatch", "betcity",
    "winline", "leon", "mostbet", "casino", "poker", "slots", "bet",
    "ставки", "букмекер", "азартн", "лотере", "тотализатор",
    "joycasino", "vavada", "vulkan", "pin-up",
]
GAMBLING_MCC = {"7993", "7994", "7995"}


def is_gambling_transaction(tx: Transaction) -> bool:
    merchant_lower = (tx.merchant or "").lower()
    if any(kw in merchant_lower for kw in GAMBLING_KEYWORDS):
        return True
    if tx.mcc and tx.mcc.strip() in GAMBLING_MCC:
        return True
    return False


# ─── Scoring engine ───────────────────────────────────────────────────────────

PATTERNS = {
    "night_gambling":       {"weight": 15, "label": "Ночная активность"},
    "repeated_topups":      {"weight": 20, "label": "Многократные пополнения"},
    "spending_spike":       {"weight": 20, "label": "Эскалация ставок"},
    "high_gambling_share":  {"weight": 25, "label": "Высокая доля gambling"},
    "credit_to_bet":        {"weight": 20, "label": "Кредит → ставка"},
    "loss_chasing":         {"weight": 15, "label": "Отыгрыш потерь"},
}


def score_transactions(transactions: List[Transaction]) -> dict:
    if not transactions:
        return _empty_result()

    gambling_txs = [tx for tx in transactions if is_gambling_transaction(tx)]

    if not gambling_txs:
        return _empty_result()

    score = 0
    patterns = []

    # Предвычисления
    gambling_txs_sorted = sorted(gambling_txs, key=lambda t: t.date or datetime.min)
    total_spending = sum(tx.amount for tx in transactions if not tx.is_credit)
    gambling_spending = sum(tx.amount for tx in gambling_txs if not tx.is_credit)
    gambling_count = len(gambling_txs)

    by_day: dict = defaultdict(list)
    for tx in gambling_txs:
        if tx.date:
            by_day[tx.date.date()].append(tx)

    # ── Паттерн 1: Ночная активность ──────────────────────────────────────────
    night_count = sum(
        1 for tx in gambling_txs
        if tx.date and (tx.date.hour >= 23 or tx.date.hour <= 5)
    )
    if gambling_count > 0 and night_count / gambling_count > 0.30:
        w = PATTERNS["night_gambling"]["weight"]
        score += w
        patterns.append({
            "id": "night_gambling",
            "weight": w,
            "description": f"Ночные ставки: {night_count} из {gambling_count} транзакций между 23:00–05:00 ({night_count/gambling_count:.0%})",
            "severity": "medium",
        })

    # ── Паттерн 2: Многократные пополнения за день ────────────────────────────
    max_per_day = max((len(v) for v in by_day.values()), default=0)
    days_with_3plus = sum(1 for v in by_day.values() if len(v) >= 3)
    if max_per_day >= 3:
        w = PATTERNS["repeated_topups"]["weight"]
        score += w
        patterns.append({
            "id": "repeated_topups",
            "weight": w,
            "description": f"Многократные пополнения: до {max_per_day} ставок в день, {days_with_3plus} таких дней",
            "severity": "high",
        })

    # ── Паттерн 3: Эскалация ставок (тренд роста) ─────────────────────────────
    if len(gambling_txs_sorted) >= 4:
        mid = len(gambling_txs_sorted) // 2
        first_avg = sum(t.amount for t in gambling_txs_sorted[:mid]) / mid
        second_avg = sum(t.amount for t in gambling_txs_sorted[mid:]) / max(len(gambling_txs_sorted) - mid, 1)
        if first_avg > 0 and second_avg / first_avg > 1.8:
            w = PATTERNS["spending_spike"]["weight"]
            score += w
            ratio = second_avg / first_avg
            patterns.append({
                "id": "spending_spike",
                "weight": w,
                "description": f"Эскалация ставок: средняя сумма выросла в {ratio:.1f}x ({first_avg:,.0f} → {second_avg:,.0f} ₸)",
                "severity": "high",
            })

    # ── Паттерн 4: Высокая доля gambling от всех расходов ─────────────────────
    if total_spending > 0:
        share = gambling_spending / total_spending
        if share > 0.25:
            w = PATTERNS["high_gambling_share"]["weight"]
            score += w
            patterns.append({
                "id": "high_gambling_share",
                "weight": w,
                "description": f"Доля азартных игр: {share:.0%} от всех расходов ({gambling_spending:,.0f} из {total_spending:,.0f} ₸)",
                "severity": "critical" if share > 0.5 else "high",
            })

    # ── Паттерн 5: Кредит → ставка в течение 24 часов ─────────────────────────
    credit_txs = [tx for tx in transactions if tx.is_credit and tx.date]
    credit_to_bet_count = 0
    for ctx in credit_txs:
        for gtx in gambling_txs:
            if gtx.date and 0 <= (gtx.date - ctx.date).total_seconds() <= 86400:
                credit_to_bet_count += 1
                break
    if credit_to_bet_count > 0:
        w = PATTERNS["credit_to_bet"]["weight"]
        score += w
        patterns.append({
            "id": "credit_to_bet",
            "weight": w,
            "description": f"Кредит → ставка: {credit_to_bet_count} случаев пополнения счёта кредитными средствами в течение 24 часов",
            "severity": "critical",
        })

    # ── Паттерн 6: Отыгрыш потерь (loss chasing) ──────────────────────────────
    # Признак: после крупной суммы идут 2+ транзакции подряд в тот же день
    loss_chasing_count = 0
    for day, day_txs in by_day.items():
        if len(day_txs) >= 3:
            sorted_day = sorted(day_txs, key=lambda t: t.date or datetime.min)
            amounts = [t.amount for t in sorted_day]
            # Если первая транзакция > 1.5x средней и потом идут ещё
            avg_amount = sum(amounts) / len(amounts)
            if amounts[0] > avg_amount * 1.3 and len(amounts) >= 3:
                loss_chasing_count += 1
    if loss_chasing_count >= 2:
        w = PATTERNS["loss_chasing"]["weight"]
        score += w
        patterns.append({
            "id": "loss_chasing",
            "weight": w,
            "description": f"Отыгрыш потерь: {loss_chasing_count} дней с признаками попытки вернуть проигранное",
            "severity": "high",
        })

    # ── Уровень риска ─────────────────────────────────────────────────────────
    final_score = min(score, 100)
    if final_score >= 75:
        level = "CRITICAL"
    elif final_score >= 50:
        level = "HIGH"
    elif final_score >= 25:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "score": final_score,
        "level": level,
        "patterns": patterns,
        "gambling_tx_count": gambling_count,
        "total_tx_count": len(transactions),
        "gambling_total": gambling_spending,
        "total_spending": total_spending,
        "gambling_share": round(gambling_spending / total_spending, 3) if total_spending > 0 else 0,
    }


def _empty_result() -> dict:
    return {
        "score": 0,
        "level": "LOW",
        "patterns": [],
        "gambling_tx_count": 0,
        "total_tx_count": 0,
        "gambling_total": 0.0,
        "total_spending": 0.0,
        "gambling_share": 0.0,
    }
