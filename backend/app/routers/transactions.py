from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
import csv
import io
from app.database import get_db
from app.models import Transaction, User
from app.services.scoring import is_gambling_transaction

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


class TransactionIn(BaseModel):
    date: str
    amount: float
    merchant: str
    mcc: Optional[str] = None
    is_credit: bool = False


@router.post("/upload/{user_id}")
async def upload_transactions(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    content = await file.read()
    transactions_data = []

    if file.filename.endswith(".json"):
        transactions_data = json.loads(content)
    elif file.filename.endswith(".csv"):
        reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
        for row in reader:
            transactions_data.append({
                "date": row.get("date", ""),
                "amount": float(row.get("amount", 0)),
                "merchant": row.get("merchant", ""),
                "mcc": row.get("mcc", None),
                "is_credit": row.get("is_credit", "false").lower() == "true",
            })
    else:
        raise HTTPException(status_code=400, detail="Поддерживаются только CSV и JSON файлы")

    # Delete old transactions
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()

    added = 0
    for tx_data in transactions_data:
        try:
            date_str = tx_data.get("date", "")
            if "T" in date_str:
                date = datetime.fromisoformat(date_str.replace("Z", ""))
            else:
                date = datetime.strptime(date_str, "%Y-%m-%d")
            tx = Transaction(
                user_id=user_id,
                date=date,
                amount=float(tx_data.get("amount", 0)),
                merchant=str(tx_data.get("merchant", "")),
                mcc=tx_data.get("mcc"),
                is_credit=bool(tx_data.get("is_credit", False)),
            )
            tx.is_gambling = is_gambling_transaction(tx)
            db.add(tx)
            added += 1
        except Exception:
            continue

    db.commit()
    return {"added": added, "message": f"Загружено {added} транзакций"}


@router.get("/list/{user_id}")
def list_transactions(user_id: int, db: Session = Depends(get_db)):
    txs = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.date.desc()).limit(100).all()
    return [
        {
            "id": tx.id,
            "date": tx.date.isoformat() if tx.date else None,
            "amount": tx.amount,
            "merchant": tx.merchant,
            "mcc": tx.mcc,
            "is_credit": tx.is_credit,
            "is_gambling": tx.is_gambling,
        }
        for tx in txs
    ]
