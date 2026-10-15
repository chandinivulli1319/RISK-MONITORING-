from typing import TypedDict
from langgraph.graph import StateGraph, END

from weather import get_weather
from hazards import detect_hazards
from scoring import calculate_site_score


# The "state" is the notebook the agent carries from step to step.
class SiteState(TypedDict, total=False):
    site: dict
    weather: dict
    hazards: list
    score: int
    level: str
    breakdown: dict
    recommendations: list


ACTIONS = {
    "worker_safety": "Enforce PPE checks at the site entrance and pause work until protection is worn.",
    "equipment": "Take faulty or overdue equipment out of service and schedule maintenance.",
    "incident": "Finish investigating open incidents and brief all crews on the findings.",
    "inspection": "Schedule the overdue inspection today and record the result.",
    "environment": "Adjust the work plan for the weather: pause crane work in strong wind, hydrate crews in heat.",
}


# Each step (node) takes the state and returns only what it adds.
def weather_step(state: SiteState):
    site = state["site"]
    return {"weather": get_weather(site["latitude"], site["longitude"])}


def hazard_step(state: SiteState):
    return {"hazards": detect_hazards(state["site"], state["weather"])}


def score_step(state: SiteState):
    result = calculate_site_score(state["hazards"], state["site"]["workers_total"])
    return {
        "score": result["score"],
        "level": result["level"],
        "breakdown": result["breakdown"],
        "hazards": result["hazards"],   # now sorted, with a risk value each
    }


def recommend_step(state: SiteState):
    if not state["hazards"]:
        return {"recommendations": ["No hazards detected. Continue routine monitoring."]}
    seen = []
    for h in state["hazards"]:               # already sorted most dangerous first
        if h["category"] not in seen:
            seen.append(h["category"])
    return {"recommendations": [ACTIONS[c] for c in seen if c in ACTIONS]}


# Connect the steps in order: weather -> hazards -> score -> recommend
graph = StateGraph(SiteState)
graph.add_node("weather", weather_step)
graph.add_node("hazards", hazard_step)
graph.add_node("score", score_step)
graph.add_node("recommend", recommend_step)

graph.set_entry_point("weather")
graph.add_edge("weather", "hazards")
graph.add_edge("hazards", "score")
graph.add_edge("score", "recommend")
graph.add_edge("recommend", END)

site_risk_agent = graph.compile()