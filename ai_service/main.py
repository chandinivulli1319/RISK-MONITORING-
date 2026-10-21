import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agent import site_risk_agent, ACTIONS
from hazards import ppe_hazards
from scoring import calculate_site_score

app = FastAPI(title="Site Risk AI Service")


class SiteInput(BaseModel):
    name: str
    latitude: float
    longitude: float
    workers_total: int = 1
    workers_without_helmet: int = 0
    faulty_equipment: list[str] = []
    open_incidents: list[str] = []


class PhotoInput(BaseModel):
    image_path: str            # where the Node server saved the uploaded photo
    workers_total: int = 1


@app.get("/")
def home():
    return {"status": "AI service is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


# Analysis from the details typed in the dashboard (the LangGraph agent)
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


# Analysis from one uploaded photo (a separate flow, shown in its own dashboard tab)
@app.post("/analyze-photo")
def analyze_photo(p: PhotoInput):
    if not os.path.exists(p.image_path):
        raise HTTPException(status_code=404, detail="The uploaded photo could not be found.")

    base, _ = os.path.splitext(p.image_path)
    annotated = base + "_annotated.jpg"
    try:
        from detect import detect_ppe          # loaded here so the service still starts without the model
        detection = detect_ppe(p.image_path, save_to=annotated)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")

    hazards = ppe_hazards(detection)
    workers = max(p.workers_total, detection["people"], 1)
    result = calculate_site_score(hazards, workers)

    seen = []
    for h in result["hazards"]:                 # already sorted, most dangerous first
        if h["category"] not in seen:
            seen.append(h["category"])
    recommendations = [ACTIONS[c] for c in seen if c in ACTIONS] or [
        "No missing protective equipment was detected in this photo."
    ]

    return {
        "detection": detection,
        "score": result["score"],
        "level": result["level"],
        "breakdown": result["breakdown"],
        "hazards": result["hazards"],
        "recommendations": recommendations,
        "annotated_file": os.path.basename(annotated),
    }
