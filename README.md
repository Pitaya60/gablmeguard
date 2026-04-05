# 🛡️ GambleGuard

AI-платформа раннего выявления игровой зависимости.  
**Хакатон AI for Government · Казахстан 2025 · Команда Rassolonik**

---

## Быстрый старт

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Groq API ключ (бесплатно на groq.com → API Keys)
echo "GROQ_API_KEY=gsk_ВАШ_КЛЮЧ" > .env

# Создать БД + тестовые данные + предобучить ML-модель
python seed.py

uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Тестовые аккаунты (seed.py)

| Email | Уровень риска |
|-------|--------------|
| `asel@test.kz` | CRITICAL |
| `daniyar@test.kz` | MEDIUM |
| `aigerim@test.kz` | LOW |

---

## AI-стек — детально

### 1. Rule-based Scoring Engine (6 паттернов)

Файл: `backend/app/services/scoring.py`

| Паттерн | Вес | Триггер |
|---------|-----|---------|
| `night_gambling` | +15 | >30% ставок между 23:00–05:00 |
| `repeated_topups` | +20 | 3+ ставок в один день |
| `spending_spike` | +20 | Суммы ставок выросли в ×1.8+ |
| `high_gambling_share` | +25 | Gambling > 25% всех расходов |
| `credit_to_bet` | +20 | Кредит → ставка в течение 24 ч |
| `loss_chasing` | +15 | Признаки отыгрыша потерь |

**Уровни:** LOW (0–24) · MEDIUM (25–49) · HIGH (50–74) · CRITICAL (75–100)

Каждый вывод содержит `description` — человекочитаемое объяснение сработавшего паттерна.

---

### 2. ML — predict_risk_escalation (scikit-learn)

Файл: `backend/app/services/ml/predict.py`

**Модель:** `sklearn.Pipeline` → `StandardScaler` + `GradientBoostingClassifier`

**8 признаков (features):**
1. `gambling_share` — доля расходов на gambling
2. `night_ratio` — доля ночных транзакций
3. `max_per_day_norm` — макс. ставок в день / 10
4. `credit_bet_ratio` — кредит→ставка / 5
5. `amount_trend` — линейный тренд роста сумм
6. `frequency_norm` — кол-во gambling транзакций / 50
7. `avg_amount_ratio` — средняя ставка / средний чек × 10
8. `unique_days_norm` — уникальных дней gambling / 30

**Обучение:** 3000 синтетических записей, сгенерированных из реалистичных поведенческих распределений.

**Качество:** ROC-AUC **0.878 ±0.008** (5-fold cross-validation)

**Выход:**
- `escalation_probability` — вероятность эскалации за 30 дней
- `verdict` — МИНИМАЛЬНЫЙ / НИЗКИЙ / УМЕРЕННЫЙ / ВЫСОКИЙ
- `feature_importances` — важность каждого признака из GBM
- `feature_values` — значения признаков для данного пользователя

Модель сохраняется в `escalation_model.pkl` и переиспользуется между запусками.

---

### 3. LLM — Llama 3.1 8B via Groq API

Файл: `backend/app/services/ai/explainers.py`

**Модель:** `llama-3.1-8b-instant` (бесплатный tier Groq)  
**Fallback:** `llama3-8b-8192` (если первая недоступна)

**5 AI-функций:**

| Эндпоинт | Промпт | Аудитория |
|----------|--------|-----------|
| `POST /api/ai/risk-explain/{id}` | Объяснение риска + 3 совета | Пользователь |
| `POST /api/ai/recovery-plan/{id}` | 30-дневный план восстановления | Пользователь |
| `POST /api/ai/family-explain/{id}` | Что делать / чего не делать | Близкие |
| `POST /api/ai/psychiatrist-summary/{id}` | Клиническая сводка (DSM-5) | Психиатр |
| `POST /api/ai/chat/{id}` | Поддерживающий диалог | Пользователь |

**Режим без ключа:** все функции работают с rule-based fallback. Платформа полностью функциональна без Groq API — только без персонализированных LLM-текстов.

**Проверка статуса AI:** `GET /api/ai/status`

---

## API Endpoints

```
POST /api/auth/login
GET  /api/auth/user/{id}

POST /api/transactions/upload/{id}    # CSV или JSON
GET  /api/transactions/list/{id}

POST /api/risk/analyze/{id}           # Запуск rule-based scoring
GET  /api/risk/profile/{id}           # Последний профиль
GET  /api/risk/history/{id}           # История скоров

POST /api/ai/risk-explain/{id}        # Llama 3.1: объяснение риска
POST /api/ai/recovery-plan/{id}       # Llama 3.1: план восстановления
POST /api/ai/family-explain/{id}      # Llama 3.1: для близких
POST /api/ai/psychiatrist-summary/{id}# Llama 3.1: для врача
POST /api/ai/chat/{id}                # Llama 3.1: чат поддержки
GET  /api/ai/status                   # Статус AI-подключения

GET  /api/ml/predict/escalation/{id}  # sklearn GBM предсказание

POST /api/contacts/{id}               # Trusted Circle
POST /api/sos/{id}/trigger            # Активация SOS
GET  /api/analyst/users               # Панель аналитика
GET  /api/analyst/export              # Экспорт CSV
```

---

## Формат входных данных

```json
[
  {
    "date": "2024-11-03T23:45:00",
    "amount": 15000,
    "merchant": "1xBet KZ",
    "mcc": "7995",
    "is_credit": false
  }
]
```

MCC коды gambling: `7993`, `7994`, `7995`  
Демо-файл: `data/demo_transactions.json`

---

## Стек

| Компонент | Технология |
|-----------|-----------|
| Backend | Python 3.11 · FastAPI · SQLAlchemy · SQLite |
| Frontend | Next.js 14 · TypeScript · Tailwind CSS · Recharts |
| LLM | Llama 3.1 8B · Groq API (бесплатно) |
| ML | scikit-learn · GradientBoostingClassifier · StandardScaler |
| Scoring | Rule-based engine · 6 паттернов с весами |

---

MIT License · Команда Rassolonik
