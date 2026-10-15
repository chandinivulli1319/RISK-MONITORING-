def detect_hazards(site, weather):
    """Look at the site data and weather and return a list of hazards."""
    hazards = []

    if site["workers_without_helmet"] > 0:
        hazards.append({
            "category": "worker_safety", "severity": "high",
            "description": f"{site['workers_without_helmet']} workers without helmets",
            "likelihood": 4, "workers_affected": site["workers_without_helmet"],
        })

    for eq in site["faulty_equipment"]:
        hazards.append({"category": "equipment", "severity": "high",
                        "description": f"{eq} is faulty"})

    for inc in site["open_incidents"]:
        hazards.append({"category": "incident", "severity": "medium",
                        "description": f"Open incident: {inc}"})

    if weather["wind_speed"] >= 40:
        hazards.append({"category": "environment", "severity": "critical",
                        "description": f"High wind: {weather['wind_speed']} km/h",
                        "likelihood": 4, "workers_affected": site["workers_total"]})

    if weather["precipitation"] > 5:
        hazards.append({"category": "environment", "severity": "medium",
                        "description": "Heavy rain: slippery surfaces"})

    if weather["temperature"] >= 38:
        hazards.append({"category": "environment", "severity": "high",
                        "description": f"Extreme heat: {weather['temperature']} C"})

    return hazards
def ppe_hazards(d):
    """Convert PPE detection counts into hazards for the risk score."""
    hazards = []
    rules = [
        ("no_helmet", "high", 4, "workers detected without helmets"),
        ("no_goggle", "medium", 3, "workers detected without eye protection"),
        ("no_gloves", "medium", 3, "workers detected without gloves"),
        ("no_boots", "medium", 3, "workers detected without safety boots"),
    ]
    for key, severity, likelihood, text in rules:
        n = d.get(key, 0)
        if n > 0:
            hazards.append({
                "category": "worker_safety", "severity": severity,
                "description": f"{n} {text}",
                "likelihood": likelihood, "workers_affected": n,
            })
    return hazards