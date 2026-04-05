"""
Seed script — создаёт тестовых пользователей и транзакции.
Запуск: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal, Base
from app.models import User, Transaction, RiskProfile
from app.services.scoring import score_transactions, is_gambling_transaction
from datetime import datetime, timedelta
import random
import json

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Clear existing data
db.query(RiskProfile).delete()
db.query(Transaction).delete()
db.query(User).delete()
db.commit()

GAMBLING_MERCHANTS = ["1xBet KZ", "Olimp Bet", "Fonbet", "Melbet", "Parimatch"]
REGULAR_MERCHANTS = ["Магнум", "Kaspi Pay", "Sulpak", "KFC", "Uber", "Kolesa.kz"]


def make_transactions(user_id, profile="critical"):
    txs = []
    now = datetime.now()

    if profile == "critical":
        # Lots of gambling, night activity, credit-to-bet
        for i in range(40):
            day = now - timedelta(days=random.randint(0, 30))
            hour = random.choice([0, 1, 2, 23, 22] * 3 + list(range(8, 22)))
            merchant = random.choice(GAMBLING_MERCHANTS)
            amount = random.uniform(5000, 50000)
            txs.append(Transaction(
                user_id=user_id,
                date=day.replace(hour=hour, minute=random.randint(0, 59)),
                amount=amount,
                merchant=merchant,
                mcc="7995",
                is_credit=random.random() < 0.3,
                is_gambling=True,
            ))
        # Some regular
        for i in range(15):
            txs.append(Transaction(
                user_id=user_id,
                date=now - timedelta(days=random.randint(0, 30)),
                amount=random.uniform(500, 5000),
                merchant=random.choice(REGULAR_MERCHANTS),
                is_gambling=False,
            ))

    elif profile == "medium":
        for i in range(12):
            txs.append(Transaction(
                user_id=user_id,
                date=now - timedelta(days=random.randint(0, 30)),
                amount=random.uniform(2000, 15000),
                merchant=random.choice(GAMBLING_MERCHANTS),
                mcc="7995",
                is_gambling=True,
            ))
        for i in range(30):
            txs.append(Transaction(
                user_id=user_id,
                date=now - timedelta(days=random.randint(0, 30)),
                amount=random.uniform(1000, 20000),
                merchant=random.choice(REGULAR_MERCHANTS),
                is_gambling=False,
            ))

    elif profile == "low":
        for i in range(2):
            txs.append(Transaction(
                user_id=user_id,
                date=now - timedelta(days=random.randint(0, 30)),
                amount=random.uniform(1000, 3000),
                merchant="Olimp Bet",
                mcc="7995",
                is_gambling=True,
            ))
        for i in range(30):
            txs.append(Transaction(
                user_id=user_id,
                date=now - timedelta(days=random.randint(0, 30)),
                amount=random.uniform(500, 30000),
                merchant=random.choice(REGULAR_MERCHANTS),
                is_gambling=False,
            ))

    return txs


# Create users
users_data = [
    ("asel@test.kz", "Асель Нурланова", "critical"),
    ("daniyar@test.kz", "Данияр Сейткали", "medium"),
    ("aigerim@test.kz", "Айгерим Бекова", "low"),
]

for email, name, profile in users_data:
    user = User(email=email, name=name)
    db.add(user)
    db.commit()
    db.refresh(user)

    txs = make_transactions(user.id, profile)
    for tx in txs:
        db.add(tx)
    db.commit()

    # Score
    result = score_transactions(txs)
    rp = RiskProfile(
        user_id=user.id,
        score=result["score"],
        level=result["level"],
        patterns_triggered=json.dumps(result["patterns"], ensure_ascii=False),
    )
    db.add(rp)
    db.commit()
    print(f"✅ {name} ({email}) — {result['level']} (score: {result['score']})")

db.close()
print("\n✅ База данных инициализирована. Тестовые пользователи:")
print("  asel@test.kz    → CRITICAL")
print("  daniyar@test.kz → MEDIUM")
print("  aigerim@test.kz → LOW")
