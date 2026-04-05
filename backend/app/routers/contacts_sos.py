from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import TrustedContact, SOSEvent, RiskProfile, User
import json

contacts_router = APIRouter(prefix="/api/contacts", tags=["contacts"])
sos_router = APIRouter(prefix="/api/sos", tags=["sos"])


class ContactIn(BaseModel):
    name: str
    phone: str
    relation: str


@contacts_router.get("/{user_id}")
def get_contacts(user_id: int, db: Session = Depends(get_db)):
    contacts = db.query(TrustedContact).filter(TrustedContact.user_id == user_id).all()
    return [{"id": c.id, "name": c.name, "phone": c.phone, "relation": c.relation} for c in contacts]


@contacts_router.post("/{user_id}")
def add_contact(user_id: int, body: ContactIn, db: Session = Depends(get_db)):
    contact = TrustedContact(user_id=user_id, name=body.name, phone=body.phone, relation=body.relation)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return {"id": contact.id, "name": contact.name}


@contacts_router.delete("/{user_id}/{contact_id}")
def delete_contact(user_id: int, contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(TrustedContact).filter(
        TrustedContact.id == contact_id, TrustedContact.user_id == user_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Контакт не найден")
    db.delete(contact)
    db.commit()
    return {"deleted": True}


@sos_router.post("/{user_id}/trigger")
def trigger_sos(user_id: int, db: Session = Depends(get_db)):
    profile = (
        db.query(RiskProfile)
        .filter(RiskProfile.user_id == user_id)
        .order_by(RiskProfile.created_at.desc())
        .first()
    )
    score = profile.score if profile else 0

    event = SOSEvent(user_id=user_id, risk_score=score, message="SOS активирован пользователем")
    db.add(event)
    db.commit()

    contacts = db.query(TrustedContact).filter(TrustedContact.user_id == user_id).all()
    return {
        "triggered": True,
        "score": score,
        "contacts_notified": len(contacts),
        "message": f"SOS сигнал отправлен {len(contacts)} контактам"
    }


@sos_router.get("/{user_id}/history")
def sos_history(user_id: int, db: Session = Depends(get_db)):
    events = db.query(SOSEvent).filter(SOSEvent.user_id == user_id).order_by(SOSEvent.triggered_at.desc()).all()
    return [
        {"id": e.id, "triggered_at": e.triggered_at.isoformat(), "risk_score": e.risk_score}
        for e in events
    ]
