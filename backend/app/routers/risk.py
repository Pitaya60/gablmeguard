from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from app.database import get_db
from app.models import Transaction, RiskProfile, User
from app.services.scoring import score_transactions

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.post("/analyze/{user_id}")
def analyze_risk(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    result = score_transactions(transactions)

    profile = RiskProfile(
        user_id=user_id,
        score=result["score"],
        level=result["level"],
        patterns_triggered=json.dumps(result["patterns"], ensure_ascii=False),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return {
        "profile_id": profile.id,
        "score": result["score"],
        "level": result["level"],
        "patterns": result["patterns"],
        "gambling_tx_count": result["gambling_tx_count"],
        "total_tx_count": result["total_tx_count"],
        "gambling_total": result["gambling_total"],
        "gambling_share": result["gambling_share"],
        "total_spending": result["total_spending"],
    }


@router.get("/profile/{user_id}")
def get_risk_profile(user_id: int, db: Session = Depends(get_db)):
    profile = (
        db.query(RiskProfile)
        .filter(RiskProfile.user_id == user_id)
        .order_by(RiskProfile.created_at.desc())
        .first()
    )
    if not profile:
        return {
            "score": 0, "level": "LOW", "patterns": [],
            "gambling_tx_count": 0, "gambling_total": 0,
            "gambling_share": 0, "total_spending": 0,
        }
    return {
        "profile_id": profile.id,
        "score": profile.score,
        "level": profile.level,
        "patterns": json.loads(profile.patterns_triggered or "[]"),
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }


@router.get("/history/{user_id}")
def get_risk_history(user_id: int, db: Session = Depends(get_db)):
    profiles = (
        db.query(RiskProfile)
        .filter(RiskProfile.user_id == user_id)
        .order_by(RiskProfile.created_at.asc())
        .all()
    )
    return [
        {
            "score": p.score,
            "level": p.level,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in profiles
    ]
