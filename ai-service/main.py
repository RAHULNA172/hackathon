from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from dateutil import parser

app = FastAPI(title="AI Priority Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Keyword Maps ─────────────────────────────────────────────────────────────
# These words in task title/description will BOOST or REDUCE the score
HIGH_KEYWORDS = [
    "urgent", "critical", "asap", "emergency", "immediately", "deadline",
    "blocker", "p0", "p1", "high priority", "must do", "important", "escalate",
    "overdue", "alert", "fix now", "client", "production", "launch", "release"
]

LOW_KEYWORDS = [
    "someday", "maybe", "low priority", "nice to have", "optional", "later",
    "backlog", "when free", "not urgent", "p3", "p4", "minor", "trivial",
    "whenever", "no rush", "future"
]
# ──────────────────────────────────────────────────────────────────────────────

class PriorityRequest(BaseModel):
    deadline: str
    businessImpact: int
    effortFactor: int
    title: str = ""
    description: str = ""

class PriorityResponse(BaseModel):
    priorityScore: float
    priorityLabel: str
    keywordDetected: str = ""

@app.post("/calculate-priority", response_model=PriorityResponse)
def calculate_priority(req: PriorityRequest):
    # 1. Deadline urgency
    try:
        deadline_date = parser.parse(req.deadline, ignoretz=True)
        now = datetime.now()
        days_to_deadline = max(1.0, (deadline_date - now).days + ((deadline_date - now).seconds / 86400.0))
        deadline_urgency = min(10.0, 10.0 / days_to_deadline)
    except Exception:
        deadline_urgency = 5.0

    # 2. Base formula: (0.5 x DeadlineUrgency) + (0.3 x BusinessImpact) + (0.2 x EffortFactor)
    score = (0.5 * deadline_urgency) + (0.3 * req.businessImpact) + (0.2 * req.effortFactor)

    # 3. Keyword detection in title + description
    combined_text = f"{req.title} {req.description}".lower()
    keyword_found = ""
    forced_label = None

    for kw in HIGH_KEYWORDS:
        if kw in combined_text:
            score += 2.5  # boost score for high-priority keywords
            keyword_found = kw
            forced_label = "High"
            break

    for kw in LOW_KEYWORDS:
        if kw in combined_text:
            score -= 2.0  # reduce score for low-priority keywords
            keyword_found = kw
            forced_label = "Low"  # FORCE Low — overrides even high deadline urgency
            break

    score = round(score, 2)

    # 4. Keyword FORCES the label, otherwise calculate from score
    if forced_label:
        label = forced_label
    elif score >= 6.0:
        label = "High"
    elif score >= 3.0:
        label = "Medium"
    else:
        label = "Low"

    return PriorityResponse(
        priorityScore=score,
        priorityLabel=label,
        keywordDetected=keyword_found
    )

@app.get("/")
def root():
    return {
        "service": "AI Priority Engine",
        "status": "running",
        "keywords": {
            "high_priority_keywords": HIGH_KEYWORDS,
            "low_priority_keywords": LOW_KEYWORDS
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)