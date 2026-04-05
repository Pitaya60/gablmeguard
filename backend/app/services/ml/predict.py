"""
ML-модуль predict_risk_escalation.
Использует sklearn Pipeline: StandardScaler + GradientBoostingClassifier.
Обучается на синтетических поведенческих данных при первом запуске.
"""
import numpy as np
import os
import pickle
from typing import List
from collections import defaultdict
from datetime import datetime

from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score

from app.models import Transaction
from app.services.scoring import is_gambling_transaction

MODEL_PATH = os.path.join(os.path.dirname(__file__), "escalation_model.pkl")

FEATURE_NAMES = [
    "gambling_share",
    "night_ratio",
    "max_per_day_norm",
    "credit_bet_ratio",
    "amount_trend",
    "frequency_norm",
    "avg_amount_ratio",
    "unique_days_norm",
]


def _generate_synthetic_data(n: int = 3000):
    rng = np.random.default_rng(42)
    X = np.zeros((n, 8))
    X[:, 0] = rng.beta(2, 5, n)
    X[:, 1] = rng.beta(1.5, 4, n)
    X[:, 2] = rng.exponential(0.15, n).clip(0, 1)
    X[:, 3] = rng.beta(1, 6, n)
    X[:, 4] = rng.normal(0.1, 0.3, n).clip(-1, 1)
    X[:, 5] = rng.beta(1.5, 5, n)
    X[:, 6] = rng.beta(2, 4, n)
    X[:, 7] = rng.beta(1.5, 4, n)
    weights = np.array([0.28, 0.14, 0.14, 0.22, 0.10, 0.05, 0.04, 0.03])
    raw = X @ weights + rng.normal(0, 0.05, n)
    threshold = np.percentile(raw, 65)
    y = (raw > threshold).astype(int)
    return X, y


def _train_model() -> Pipeline:
    print("[GambleGuard ML] Обучение модели predict_risk_escalation...")
    X, y = _generate_synthetic_data(3000)
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.8,
            random_state=42,
        )),
    ])
    pipeline.fit(X, y)
    scores = cross_val_score(pipeline, X, y, cv=5, scoring="roc_auc")
    print(f"[GambleGuard ML] ROC-AUC: {scores.mean():.3f} +/- {scores.std():.3f}")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"[GambleGuard ML] Модель сохранена -> {MODEL_PATH}")
    return pipeline


def _load_model() -> Pipeline:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)
    return _train_model()


_model = None


def get_model() -> Pipeline:
    global _model
    if _model is None:
        _model = _load_model()
    return _model


def build_feature_vector(transactions: List[Transaction]) -> np.ndarray:
    if not transactions:
        return np.zeros(8)

    gambling_txs = [tx for tx in transactions if is_gambling_transaction(tx)]
    total_txs = len(transactions)
    gambling_count = len(gambling_txs)

    total_spending = sum(tx.amount for tx in transactions if not tx.is_credit) or 1.0
    gambling_spending = sum(tx.amount for tx in gambling_txs if not tx.is_credit)

    f1 = min(gambling_spending / total_spending, 1.0)

    night = sum(1 for tx in gambling_txs if tx.date and (tx.date.hour >= 23 or tx.date.hour <= 5))
    f2 = night / gambling_count if gambling_count > 0 else 0.0

    by_day = defaultdict(int)
    for tx in gambling_txs:
        if tx.date:
            by_day[tx.date.date()] += 1
    f3 = min(max(by_day.values(), default=0) / 10.0, 1.0)

    credit_txs = [tx for tx in transactions if tx.is_credit and tx.date]
    credit_bets = 0
    for ctx in credit_txs:
        for gtx in gambling_txs:
            if gtx.date and 0 <= (gtx.date - ctx.date).total_seconds() <= 86400:
                credit_bets += 1
                break
    f4 = min(credit_bets / 5.0, 1.0)

    if len(gambling_txs) >= 4:
        amounts = [tx.amount for tx in sorted(gambling_txs, key=lambda t: t.date or datetime.min)]
        x = np.arange(len(amounts), dtype=float)
        slope = float(np.polyfit(x, amounts, 1)[0])
        f5 = float(np.clip(slope / 10000.0, -1.0, 1.0))
    else:
        f5 = 0.0

    f6 = min(gambling_count / 50.0, 1.0)

    avg_gambling = gambling_spending / gambling_count if gambling_count > 0 else 0.0
    avg_all = total_spending / total_txs if total_txs > 0 else 1.0
    f7 = min(avg_gambling / (avg_all * 10 + 1e-9), 1.0)

    unique_days = len(by_day)
    f8 = min(unique_days / 30.0, 1.0)

    return np.array([f1, f2, f3, f4, f5, f6, f7, f8], dtype=float)


def predict_escalation(transactions: List[Transaction]) -> dict:
    model = get_model()
    features = build_feature_vector(transactions)
    prob = float(model.predict_proba(features.reshape(1, -1))[0][1])
    prob = round(prob, 3)

    if prob >= 0.70:
        verdict, advice, color = "ВЫСОКИЙ", "Требуется немедленное вмешательство. Рекомендована очная консультация специалиста.", "CRITICAL"
    elif prob >= 0.45:
        verdict, advice, color = "УМЕРЕННЫЙ", "Риск роста значителен. Рекомендованы профилактические меры и самоограничения.", "HIGH"
    elif prob >= 0.25:
        verdict, advice, color = "НИЗКИЙ", "Риск эскалации невысок. Продолжайте мониторинг транзакций.", "MEDIUM"
    else:
        verdict, advice, color = "МИНИМАЛЬНЫЙ", "Признаков эскалации не выявлено.", "LOW"

    clf = model.named_steps["clf"]
    importances = {name: round(float(imp), 4) for name, imp in zip(FEATURE_NAMES, clf.feature_importances_)}
    values = {name: round(float(val), 3) for name, val in zip(FEATURE_NAMES, features)}

    return {
        "escalation_probability": prob,
        "verdict": verdict,
        "color": color,
        "advice": advice,
        "feature_importances": importances,
        "feature_values": values,
        "model_info": {"type": "GradientBoostingClassifier", "n_features": 8},
    }
