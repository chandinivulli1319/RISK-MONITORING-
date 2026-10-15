import numpy as np
import pandas as pd

# Severity words -> numbers on a 1-5 scale
SEVERITY_SCALE = {"low": 1, "medium": 3, "high": 4, "critical": 5}

# How much each hazard category matters (1.0 = most important).
# Later you can replace these with weights learned from OSHA data.
CATEGORY_WEIGHT = {
    "worker_safety": 1.0,
    "incident": 0.9,
    "equipment": 0.85,
    "environment": 0.8,
    "inspection": 0.7,
}

LEVELS = ["Low", "Medium", "High", "Critical"]
BOUNDARIES = [25, 50, 75]   # <25 Low, 25-49 Medium, 50-74 High, 75+ Critical


def calculate_site_score(hazards, workers_total=1):
    if not hazards:
        return {"score": 0, "level": "Low", "breakdown": {}, "hazards": []}

    df = pd.DataFrame(hazards)

    # Fill in optional columns with sensible defaults
    if "likelihood" not in df:
        df["likelihood"] = 3
    if "workers_affected" not in df:
        df["workers_affected"] = 0
    df["likelihood"] = df["likelihood"].fillna(3)
    df["workers_affected"] = df["workers_affected"].fillna(0)

    # 1) Convert words to numbers
    df["severity_num"] = df["severity"].map(SEVERITY_SCALE)

    # 2) Risk matrix: severity x likelihood, scaled to 0-1
    base = df["severity_num"] * df["likelihood"] / 25

    # 3) Exposure: more workers affected -> factor closer to 1.0 (range 0.6-1.0)
    share = np.clip(df["workers_affected"] / max(workers_total, 1), 0, 1)
    exposure = 0.6 + 0.4 * share

    # 4) Category importance
    weight = df["category"].map(CATEGORY_WEIGHT).fillna(0.7)

    df["risk"] = np.clip(base * exposure * weight, 0, 1)

    # 5) Combine: every extra hazard raises the score, but it can never pass 100
    combined = 1 - np.prod(1 - df["risk"].to_numpy())
    score = int(round(100 * combined))

    level = LEVELS[int(np.digitize(score, BOUNDARIES))]

    # 6) Breakdown by category (for the dashboard chart)
    contribution = df.groupby("category")["risk"].sum()
    contribution = (contribution / contribution.sum() * 100).round(1)

    ordered = df.sort_values("risk", ascending=False)
    return {
        "score": score,
        "level": level,
        "breakdown": contribution.to_dict(),
        "hazards": ordered[["category", "severity", "description", "risk"]]
                   .round(3).to_dict("records"),
    }


def evaluate_scoring():
    """Check the scoring against cases where we know the sensible answer."""
    H = lambda c, s, d, l=3, w=0: {"category": c, "severity": s,
                                    "description": d, "likelihood": l, "workers_affected": w}
    cases = pd.DataFrame([
        {"name": "No hazards", "hazards": [], "expected": "Low"},
        {"name": "One minor inspection delay",
         "hazards": [H("inspection", "low", "Inspection slightly late")], "expected": "Low"},
        {"name": "Faulty equipment only",
         "hazards": [H("equipment", "high", "Mixer faulty")], "expected": "Medium"},
        {"name": "Missing helmets + faulty equipment",
         "hazards": [H("worker_safety", "high", "No helmets", 4, 6),
                     H("equipment", "high", "Mixer faulty")], "expected": "High"},
        {"name": "No harness at height + high wind + crane",
         "hazards": [H("worker_safety", "critical", "No harness", 5, 5),
                     H("environment", "critical", "High wind with crane", 4, 10),
                     H("equipment", "high", "Crane overdue service", 3)], "expected": "Critical"},
    ])
    cases["score"] = cases["hazards"].apply(lambda h: calculate_site_score(h, 40)["score"])
    cases["predicted"] = cases["hazards"].apply(lambda h: calculate_site_score(h, 40)["level"])
    cases["correct"] = cases["expected"] == cases["predicted"]
    print(cases[["name", "score", "expected", "predicted", "correct"]].to_string(index=False))
    print(f"\nAgreement with expected levels: {np.mean(cases['correct']) * 100:.0f}%")


if __name__ == "__main__":
    evaluate_scoring()