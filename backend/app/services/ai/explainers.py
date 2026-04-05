"""
AI-объяснения через Groq API (Llama 3.1 8B).
Ключ читается при каждом вызове — поддерживает hot-reload .env.
При отсутствии ключа возвращает rule-based fallback.
"""
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"   # Llama 3.1 8B — бесплатно на Groq
FALLBACK_MODEL = "llama3-8b-8192"  # запасной


def _get_key() -> str:
    """Читает ключ при каждом вызове, чтобы .env hot-reload работал."""
    load_dotenv(override=True)
    return os.getenv("GROQ_API_KEY", "").strip()


def _rule_based_fallback(score: float, level: str, patterns: list) -> str:
    """Текстовый fallback без AI, когда нет GROQ_API_KEY."""
    level_texts = {
        "LOW":      "Ваш уровень риска низкий. Азартные игры не занимают значительную долю расходов.",
        "MEDIUM":   "Выявлен умеренный риск. Стоит обратить внимание на паттерны поведения.",
        "HIGH":     "Выявлен высокий риск игровой зависимости. Рекомендуется принять меры.",
        "CRITICAL": "КРИТИЧЕСКИЙ уровень риска! Необходима немедленная поддержка специалиста.",
    }
    base = level_texts.get(level, "")
    if patterns:
        plist = "\n".join(f"• {p['description']}" for p in patterns)
        base += f"\n\nВыявленные паттерны:\n{plist}"
    base += "\n\n⚠️ AI-инсайты недоступны: добавьте GROQ_API_KEY в backend/.env для персонального анализа от Llama 3.1."
    return base


async def _call_groq(system: str, user: str, max_tokens: int = 600) -> str | None:
    """Вызывает Groq API. Возвращает None при ошибке."""
    key = _get_key()
    if not key:
        return None

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.65,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(GROQ_URL, headers=headers, json=payload)
            if resp.status_code == 404:
                # Попробуем запасную модель
                payload["model"] = FALLBACK_MODEL
                resp = await client.post(GROQ_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                err = resp.json().get("error", {}).get("message", resp.text)
                return f"[Groq API ошибка {resp.status_code}]: {err}"
            return resp.json()["choices"][0]["message"]["content"]
    except httpx.TimeoutException:
        return "[Groq API]: Таймаут запроса. Попробуйте позже."
    except Exception as e:
        return f"[Groq API]: {str(e)}"


# ──────────────────────────────────────────────
# Публичные функции
# ──────────────────────────────────────────────

async def explain_risk(score: float, level: str, patterns: list, gambling_total: float) -> str:
    """Персональное объяснение риска + практические советы."""
    fallback = _rule_based_fallback(score, level, patterns)

    system = """Ты — AI-ассистент платформы GambleGuard (Казахстан). 
Помогаешь людям понять их финансовый риск игровой зависимости.
Tone: тёплый, эмпатичный, без осуждения, конкретный.
Формат ответа:
1. Краткая оценка ситуации (2–3 предложения)
2. Что именно вызывает беспокойство (по паттернам)
3. 3 конкретных практических шага
Язык: русский. Длина: до 280 слов."""

    patterns_text = "\n".join(f"- {p['description']} (вес: {p['weight']})" for p in patterns) or "Паттерны не выявлены"
    user = f"""Данные пользователя:
- Риск-скор: {score}/100, уровень: {level}
- Потрачено на азартные игры: {gambling_total:,.0f} ₸
- Сработавшие паттерны:
{patterns_text}

Дай персональное объяснение и рекомендации."""

    result = await _call_groq(system, user, max_tokens=500)
    return result if result else fallback


async def recovery_plan(score: float, level: str, patterns: list) -> str:
    """30-дневный план восстановления."""
    system = """Ты — психолог-консультант платформы GambleGuard.
Составляешь персональный план восстановления от игровой зависимости.
Формат:
Неделя 1 (Осознание): 2–3 конкретных шага
Неделя 2 (Замена): 2–3 конкретных шага  
Неделя 3–4 (Закрепление): 2–3 конкретных шага
+ Ресурсы помощи в Казахстане
Язык: русский. Конкретно, без воды. До 320 слов."""

    patterns_text = "\n".join(f"- {p['description']}" for p in patterns) or "—"
    user = f"""Уровень риска: {level} (скор {score}/100)
Выявленные паттерны:
{patterns_text}

Составь 30-дневный план восстановления."""

    result = await _call_groq(system, user, max_tokens=550)
    if result:
        return result
    return (
        f"30-дневный план (уровень {level}):\n\n"
        "Неделя 1: Установите дневной лимит расходов. Удалите приложения букмекеров. Расскажите близкому человеку.\n\n"
        "Неделя 2: Найдите альтернативное занятие для вечернего времени. Заблокируйте сайты ставок.\n\n"
        "Неделя 3–4: Обратитесь на горячую линию 150 (Казахстан). Ведите дневник расходов.\n\n"
        "⚠️ Добавьте GROQ_API_KEY для персонального AI-плана."
    )


async def family_explain(score: float, level: str) -> str:
    """Объяснение для близких: что делать, чего избегать."""
    system = """Ты помогаешь близким людей с игровой зависимостью.
Объясни ситуацию понятно, без медицинского жаргона.
Структура:
1. Что происходит с вашим близким (кратко, без осуждения)
2. Как ПРАВИЛЬНО помочь (3–4 конкретных совета)
3. Чего НЕ делать (3 пункта)
4. Когда обращаться к специалисту
Язык: русский, тёплый тон. До 280 слов."""

    user = f"""Близкий человек: риск игровой зависимости уровень {level} (скор {score}/100).
Объясни что это значит и как правильно поддержать."""

    result = await _call_groq(system, user, max_tokens=500)
    if result:
        return result
    return (
        f"Уровень риска вашего близкого: {level} ({score}/100).\n\n"
        "Как помочь: говорите спокойно без обвинений, предложите совместно обратиться за помощью, контролируйте совместный бюджет.\n\n"
        "Чего не делать: не давайте деньги в долг, не угрожайте, не замалчивайте проблему.\n\n"
        "⚠️ Добавьте GROQ_API_KEY для развёрнутого AI-объяснения."
    )


async def psychiatrist_summary(score: float, level: str, patterns: list, gambling_total: float) -> str:
    """Клиническая сводка для психиатра/нарколога."""
    system = """Ты составляешь клиническую сводку для психиатра или нарколога на основе финансово-поведенческих данных.
Используй профессиональную клиническую терминологию.
Структура:
1. Анамнез (финансовое поведение)
2. Выявленные поведенческие маркеры патологического гемблинга (DSM-5 критерии)
3. Количественные показатели
4. Предварительная оценка степени зависимости
5. Рекомендации для специалиста
Язык: русский, клинический стиль. До 320 слов."""

    patterns_text = "\n".join(f"- {p['description']}" for p in patterns) or "—"
    user = f"""Данные пациента (финансово-поведенческий анализ):
- Скор риска: {score}/100, уровень: {level}
- Расходы на азартные игры: {gambling_total:,.0f} ₸
- Поведенческие паттерны:
{patterns_text}

Составь клиническую сводку для специалиста."""

    result = await _call_groq(system, user, max_tokens=600)
    if result:
        return result
    return (
        f"Клиническая сводка (предварительная):\n\n"
        f"Риск-скор: {score}/100, уровень: {level}\n"
        f"Расходы: {gambling_total:,.0f} ₸\n\n"
        f"Паттерны:\n" + "\n".join(f"• {p['description']}" for p in patterns) +
        "\n\n⚠️ Добавьте GROQ_API_KEY для полной AI-сводки."
    )


async def chat_response(user_message: str, score: float, level: str) -> str:
    """AI-чат поддержки пользователя."""
    system = f"""Ты — AI-ассистент поддержки платформы GambleGuard.
Контекст: пользователь имеет уровень риска {level} (скор {score}/100).
Твоя роль: поддержать, не осудить, дать конкретный совет.
- Если человек в кризисе → направь на горячую линию 150 (Казахстан)
- Если просит информацию → дай полезные факты о лудомании
- Если хочет помощи → предложи конкретные шаги
Отвечай только на русском. Кратко и по делу. До 200 слов."""

    result = await _call_groq(system, user_message, max_tokens=350)
    if result:
        return result
    return (
        "Я здесь, чтобы помочь. Если вам нужна срочная поддержка — позвоните на горячую линию: 150 (бесплатно, Казахстан).\n\n"
        "⚠️ Добавьте GROQ_API_KEY в backend/.env для полноценного AI-чата."
    )
