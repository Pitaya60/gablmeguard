from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    transactions = relationship("Transaction", back_populates="user")
    risk_profiles = relationship("RiskProfile", back_populates="user")
    trusted_contacts = relationship("TrustedContact", back_populates="user")
    sos_events = relationship("SOSEvent", back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime)
    amount = Column(Float)
    merchant = Column(String)
    mcc = Column(String, nullable=True)
    is_credit = Column(Boolean, default=False)
    is_gambling = Column(Boolean, default=False)
    user = relationship("User", back_populates="transactions")


class RiskProfile(Base):
    __tablename__ = "risk_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Float, default=0)
    level = Column(String, default="LOW")
    patterns_triggered = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="risk_profiles")


class TrustedContact(Base):
    __tablename__ = "trusted_contacts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    phone = Column(String)
    relation = Column(String)
    user = relationship("User", back_populates="trusted_contacts")


class SOSEvent(Base):
    __tablename__ = "sos_events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    triggered_at = Column(DateTime, default=datetime.utcnow)
    risk_score = Column(Float)
    message = Column(Text, nullable=True)
    user = relationship("User", back_populates="sos_events")


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    doctor_name = Column(String)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
