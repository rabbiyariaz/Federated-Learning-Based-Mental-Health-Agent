from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ml.inference.inference_engine import InferenceService
from app.routers import ema, phq, report, study, session, text_entry




app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


print("MAIN FILE LOADED")


app.include_router(ema.router)
app.include_router(phq.router)
app.include_router(report.router)
app.include_router(study.router)
app.include_router(session.router)
app.include_router(text_entry.router)


