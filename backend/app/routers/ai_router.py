from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
from app.database import get_db
from app.models import Transaction, RiskProfile
from app.services.scoring import score_transactions
from app.services.ai import explainers

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _get_profile_data(user_id: int, db: Session) -> tuple:
    """Возвращает (score, level, patterns, gambling_total) из последнего профиля."""
    profile = (
        db.query(RiskProfile)
        .filter(RiskProfile.user_id == user_id)
        .order_by(RiskProfile.created_at.desc())
        .first()
    )
    if profile:
        patterns = json.loads(profile.patterns_triggered or "[]")
        # Получаем gambling_total из транзакций
        from app.models import Transaction as Tx
        from app.services.scoring import is_gambling_transaction
        txs = db.query(Tx).filter(Tx.user_id == user_id).all()
        gambling_total = sum(tx.amount for tx in txs if is_gambling_transaction(tx) and not tx.is_credit)
        return profile.score, profile.level, patterns, gambling_total

    # Нет профиля — считаем на лету
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    result = score_transactions(transactions)
    return result["score"], result["level"], result["patterns"], result.get("gambling_total", 0)


@router.post("/risk-explain/{user_id}")
async def ai_risk_explain(user_id: int, db: Session = Depends(get_db)):
    score, level, patterns, gambling_total = _get_profile_data(user_id, db)
    text = await explainers.explain_risk(score, level, patterns, gambling_total)
    return {"explanation": text, "score": score, "level": level, "groq_used": not text.startswith("⚠️")}


@router.post("/recovery-plan/{user_id}")
async def ai_recovery_plan(user_id: int, db: Session = Depends(get_db)):
    score, level, patterns, _ = _get_profile_data(user_id, db)
    text = await explainers.recovery_plan(score, level, patterns)
    return {"plan": text, "score": score, "level": level}


@router.post("/family-explain/{user_id}")
async def ai_family_explain(user_id: int, db: Session = Depends(get_db)):
    score, level, _, _ = _get_profile_data(user_id, db)
    text = await explainers.family_explain(score, level)
    return {"explanation": text}


@router.post("/psychiatrist-summary/{user_id}")
async def ai_psychiatrist(user_id: int, db: Session = Depends(get_db)):
    score, level, patterns, gambling_total = _get_profile_data(user_id, db)
    text = await explainers.psychiatrist_summary(score, level, patterns, gambling_total)
    return {"summary": text}


class ChatMessage(BaseModel):
    message: str


@router.post("/chat/{user_id}")
async def ai_chat(user_id: int, body: ChatMessage, db: Session = Depends(get_db)):
    score, level, _, _ = _get_profile_data(user_id, db)
    reply = await explainers.chat_response(body.message, score, level)
    return {"reply": reply}


@router.get("/status")
async def ai_status():
    """Проверяет доступность Groq API."""
    import os
    from dotenv import load_dotenv
    load_dotenv(override=True)
    key = os.getenv("GROQ_API_KEY", "").strip()
    return {
        "groq_configured": bool(key),
        "model": "llama-3.1-8b-instant",
        "fallback": "rule-based scoring",
        "message": "Groq API подключён" if key else "GROQ_API_KEY не задан — работает rule-based режим",
    }
