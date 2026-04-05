from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json
import csv
import io
from fastapi.responses import StreamingResponse
from app.database import get_db
from app.models import User, RiskProfile, Transaction
from app.services.ml.predict import predict_escalation

analyst_router = APIRouter(prefix="/api/analyst", tags=["analyst"])
ml_router = APIRouter(prefix="/api/ml", tags=["ml"])


@analyst_router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for user in users:
        profile = (
            db.query(RiskProfile)
            .filter(RiskProfile.user_id == user.id)
            .order_by(RiskProfile.created_at.desc())
            .first()
        )
        tx_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
        result.append({
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "risk_score": profile.score if profile else 0,
            "risk_level": profile.level if profile else "LOW",
            "tx_count": tx_count,
            "last_analyzed": profile.created_at.isoformat() if profile and profile.created_at else None,
        })
    result.sort(key=lambda x: x["risk_score"], reverse=True)
    return result


@analyst_router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    users = db.query(User).all()
    profiles = []
    for user in users:
        p = db.query(RiskProfile).filter(RiskProfile.user_id == user.id).order_by(RiskProfile.created_at.desc()).first()
        if p:
            profiles.append(p)

    level_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for p in profiles:
        level_counts[p.level] = level_counts.get(p.level, 0) + 1

    avg_score = sum(p.score for p in profiles) / len(profiles) if profiles else 0

    return {
        "total_users": len(users),
        "analyzed_users": len(profiles),
        "avg_risk_score": round(avg_score, 1),
        "by_level": level_counts,
    }


@analyst_router.get("/export")
def export_csv(db: Session = Depends(get_db)):
    users = db.query(User).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["user_id", "email", "name", "risk_score", "risk_level"])

    for user in users:
        profile = (
            db.query(RiskProfile)
            .filter(RiskProfile.user_id == user.id)
            .order_by(RiskProfile.created_at.desc())
            .first()
        )
        writer.writerow([
            user.id, user.email, user.name,
            profile.score if profile else 0,
            profile.level if profile else "LOW"
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gambleguard_export.csv"}
    )


@ml_router.get("/predict/escalation/{user_id}")
def predict_risk_escalation(user_id: int, db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    result = predict_escalation(transactions)
    return result
