from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers.auth import router as auth_router
from app.routers.transactions import router as tx_router
from app.routers.risk import router as risk_router
from app.routers.ai_router import router as ai_router
from app.routers.contacts_sos import contacts_router, sos_router
from app.routers.analyst_ml import analyst_router, ml_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GambleGuard API",
    description="AI-платформа раннего выявления игровой зависимости",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(tx_router)
app.include_router(risk_router)
app.include_router(ai_router)
app.include_router(contacts_router)
app.include_router(sos_router)
app.include_router(analyst_router)
app.include_router(ml_router)


@app.get("/")
def root():
    return {"message": "GambleGuard API", "docs": "/docs", "version": "1.0.0"}
