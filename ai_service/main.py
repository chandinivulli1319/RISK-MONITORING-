from fastapi import FastAPI
from pydantic import BaseModel
from agent import site_risk_agent

app = FastAPI(title="Site Risk AI Service")


class SiteInput(BaseModel):
    name: str
    latitude: float
    longitude: float
    workers_total: int = 1
    workers_without_helmet: int = 0
    faulty_equipment: list[str] = []
    open_incidents: list[str] = []


@app.get("/")
def home():
    return {"status": "AI service is running"}


@app.post("/analyze")
def analyze(site: SiteInput):
    result = site_risk_agent.invoke({"site": site.model_dump()})
    return {
        "site_name": site.name,
        "weather": result["weather"],
        "score": result["score"],
        "level": result["level"],
        "breakdown": result["breakdown"],
        "hazards": result["hazards"],
        "recommendations": result["recommendations"],
    }