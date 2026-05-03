from app.routers import chat
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ml.inference.inference_engine import InferenceService
from app.routers import ema, phq, report, study, session, text_entry, federated

from app.database import Base, engine
import app.models  # noqa: F401 - register ORM models on Base.metadata

Base.metadata.create_all(bind=engine)




app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://confidmind-frontend.onrender.com",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def expose_generated_recovery_code(request: Request, call_next):
    response = await call_next(request)
    recovery_code = getattr(request.state, "generated_recovery_code", None)
    if recovery_code:
        response.headers["X-Recovery-Code"] = recovery_code
        response.headers["Access-Control-Expose-Headers"] = "X-Recovery-Code"
    return response

service = None


@app.get("/health")
def health():
    return {"status": "ok"}

# Second endpoint(dummy check for the predict endpoint)

class PredictRequest(BaseModel):
    text: str

@app.post("/predict")
def predict(req: PredictRequest):
    global service
    if service is None:
        service = InferenceService()  # load ONLY when endpoint is used
    text = req.text.strip()
    return service.run(text)

app.include_router(chat.router)
app.include_router(ema.router)
app.include_router(phq.router)
app.include_router(report.router)
app.include_router(study.router)
app.include_router(session.router)
app.include_router(text_entry.router)
app.include_router(federated.router)


