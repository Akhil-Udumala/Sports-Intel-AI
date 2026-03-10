import os
import json
import logging
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
# API key is loaded from the ML_API_KEY environment variable.
API_KEY = os.getenv("ML_API_KEY", "sports_intelligence_secret_key_2026")
API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# Load Schema
with open('feature_schema.json', 'r') as f:
    SCHEMA = json.load(f)
    FEATURES = SCHEMA['features']

# Initialize App
app = FastAPI(title="Sports Intelligence Tactical Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Lazy Model Loading with In-Memory Cache
# ---------------------------------------------------------------------------
# Models are NOT loaded at startup. Instead, they are loaded on the first
# request that needs them and then cached for the rest of the container's
# lifecycle. This reduces cold-start time and memory usage.
# ---------------------------------------------------------------------------
MODEL_CACHE: Dict[str, object] = {}
PLAYER_STATS: Dict = {}


def get_model(model_name: str):
    """Load a model lazily from disk and cache it in memory.

    On the first call for a given model_name the .joblib file is read from
    the models/ directory. Subsequent calls return the cached object.
    """
    if model_name not in MODEL_CACHE:
        logger.info("Loading model: %s", model_name)
        try:
            MODEL_CACHE[model_name] = joblib.load(f"models/{model_name}.joblib")
        except FileNotFoundError:
            raise HTTPException(
                status_code=503,
                detail=f"Model '{model_name}' not found. Please run train.py first.",
            )
    return MODEL_CACHE[model_name]


@app.on_event("startup")
async def startup_event():
    """Load lightweight data at startup — models are loaded lazily."""
    try:
        with open('player_context_stats.json', 'r') as f:
            global PLAYER_STATS
            PLAYER_STATS = json.load(f)
        logger.info("Historical context stats loaded.")
    except Exception as e:
        logger.warning("No historical stats found: %s", e)

# Dependency for API Key
async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key == API_KEY:
        return api_key
    raise HTTPException(status_code=403, detail="Could not validate API Key")

class PlayerData(BaseModel):
    features: Dict[str, float]
    context: Dict[str, str] = {}


class BatchPredictionRequest(BaseModel):
    """Request body for the /predict/batch endpoint."""
    players: List[PlayerData]

class TacticalResponse(BaseModel):
    match_impact_probability: float
    ml_injury_prediction: float
    tactical_performance_level: int
    tactical_confidence_scores: List[float]
    # Prediction Metrics
    predicted_goals: int = 0
    goal_probability: float = 0
    assist_probability: float = 0
    predicted_runs: int = 0
    predicted_sr: int = 0
    predicted_wickets: int = 0
    predicted_eco: float = 0
    confidence: float = 0

def get_context_stats(player_name, context):
    stats = PLAYER_STATS.get(player_name, {})
    opp = context.get('opponentTeam', '')
    venue_type = context.get('venue', 'Neutral')
    pitch = context.get('pitchType', 'Flat')
    
    res = {"runs": [], "wickets": [], "sr": [], "eco": []}
    
    # 1. Opponent History
    opp_data = stats.get('opponents', {}).get(opp)
    if opp_data and opp_data['innings'] > 0:
        res['runs'].append(opp_data['runs'] / opp_data['innings'])
        res['wickets'].append(opp_data['wickets'] / opp_data['innings'])
        res['sr'].append((opp_data['runs'] / max(1, opp_data['balls'])) * 100)
    
    # 2. Venue/Ground Category History
    ha_data = stats.get('home_away', {}).get(venue_type)
    if ha_data and ha_data['innings'] > 0:
        res['runs'].append(ha_data['runs'] / ha_data['innings'])
        res['wickets'].append(ha_data['wickets'] / ha_data['innings'])
        res['sr'].append((ha_data['runs'] / max(1, ha_data['balls'])) * 100)

    # 3. Pitch Type History
    pitch_data = stats.get('pitch_types', {}).get(pitch)
    if pitch_data and pitch_data['innings'] > 0:
        res['runs'].append(pitch_data['runs'] / pitch_data['innings'])
        res['wickets'].append(pitch_data['wickets'] / pitch_data['innings'])
        res['sr'].append((pitch_data['runs'] / max(1, pitch_data['balls'])) * 100)
        
    return {k: (sum(v)/len(v) if v else None) for k, v in res.items()}

def calculate_multipliers(context):
    m = {"perf": 1.0, "goal_wick": 1.0, "risk": 1.0}
    
    venue = context.get('venue', 'Neutral')
    if venue == 'Home': m['perf'] *= 1.1
    elif venue == 'Away': m['perf'] *= 0.9
    
    pitch = context.get('pitchType', 'Flat')
    role = context.get('role', '')
    if pitch == 'Spinning':
        if 'Bowler' in role: m['goal_wick'] *= 1.3
        if 'Batsman' in role: m['perf'] *= 0.8
    elif pitch == 'Seaming':
        if 'Bowler' in role: m['goal_wick'] *= 1.2
        if 'Batsman' in role: m['perf'] *= 0.85
    elif pitch == 'Flat':
        if 'Batsman' in role: m['perf'] *= 1.2
        if 'Bowler' in role: m['goal_wick'] *= 0.7
    elif pitch == 'Dusty':
        if 'Bowler' in role: m['goal_wick'] *= 1.15
        if 'Batsman' in role: m['perf'] *= 0.9
        
    opp = context.get('opponentTeam', '')
    strong_teams = ['India', 'Australia', 'England', 'Germany', 'Spain', 'Argentina']
    if opp in strong_teams:
        m['perf'] *= 0.85
        m['goal_wick'] *= 0.8
    
    return m

# ---------------------------------------------------------------------------
# Core prediction logic (shared by /predict and /predict/batch)
# ---------------------------------------------------------------------------
def _run_prediction(data: PlayerData) -> dict:
    """Run prediction for a single player using lazily-loaded models."""
    # Lazy-load all three models (cached after first call)
    performance_model = get_model("performance_model")
    injury_model = get_model("injury_model")
    tactical_model = get_model("tactical_level_model")

    try:
        input_data = [data.features.get(f, 0) for f in FEATURES]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Feature error: {e}")

    df = pd.DataFrame([input_data], columns=FEATURES)

    perf_pred = performance_model.predict(df)[0]
    inj_pred = injury_model.predict(df)[0]
    lvl_pred = tactical_model.predict(df)[0]
    lvl_probs = tactical_model.predict_proba(df)[0].tolist()

    m = calculate_multipliers(data.context)
    adj_perf = min(100, max(0, float(perf_pred) * m['perf']))
    adj_inj = min(100, max(0, float(inj_pred) * m['risk']))

    sport = data.context.get('sport', 'football')
    role = data.context.get('role', '')
    player_name = data.context.get('name', '')

    response = {
        "match_impact_probability": adj_perf,
        "ml_injury_prediction": adj_inj,
        "tactical_performance_level": int(lvl_pred),
        "tactical_confidence_scores": lvl_probs,
        "confidence": max(lvl_probs) * 100
    }

    if sport == 'football':
        # Football Prediction: Based on historical goal-per-match ratio and current form
        g_pm = (data.features.get('goals', 0) / max(1, data.features.get('matchesPlayed', 20)))
        form_factor = (adj_perf / 100) * (data.features.get('shootingAccuracy', 70) / 100)

        response["predicted_goals"] = round(g_pm * 0.8 + form_factor * 1.5 * m['goal_wick'])
        response["goal_probability"] = min(98, round(adj_perf * 0.75 * m['goal_wick'] + (g_pm * 20)))
        response["assist_probability"] = min(95, round(adj_perf * 0.55 + (data.features.get('passingAccuracy', 75) / 4)))
    else:
        # Cricket Hybrid Intelligence
        h_stats = get_context_stats(player_name, data.context)

        if any(r in role for r in ['Batter', 'Batsman', 'All-Rounder', 'Wicketkeeper']):
            avg_base = data.features.get('shootingAccuracy', 30)
            sr_base = data.features.get('crossingAccuracy', 80)
            model_runs = avg_base * m['perf'] * (adj_perf / 80)

            if h_stats['runs'] is not None:
                pred_runs = (h_stats['runs'] * 0.7) + (model_runs * 0.3)
            else:
                pred_runs = model_runs

            response["predicted_runs"] = round(pred_runs)
            response["predicted_sr"] = round(h_stats['sr'] if h_stats['sr'] else (sr_base * m['perf']))

        if any(r in role for r in ['Bowler', 'All-Rounder']):
            model_wickets = 1.8 * m['goal_wick'] * (adj_perf / 70)
            if h_stats['wickets'] is not None:
                pred_wickets = (h_stats['wickets'] * 0.6) + (model_wickets * 0.4)
            else:
                pred_wickets = model_wickets

            response["predicted_wickets"] = round(pred_wickets)
            response["predicted_eco"] = round(float(data.features.get('economy', 5.5)) * (1.1 - (m['goal_wick'] - 1)), 1)

    return response


# ---------------------------------------------------------------------------
# Single prediction endpoint
# ---------------------------------------------------------------------------
@app.post("/predict", response_model=TacticalResponse)
async def predict(data: PlayerData, api_key: str = Depends(get_api_key)):
    return _run_prediction(data)


# ---------------------------------------------------------------------------
# Batch prediction endpoint
# ---------------------------------------------------------------------------
@app.post("/predict/batch")
async def predict_batch(data: BatchPredictionRequest, api_key: str = Depends(get_api_key)):
    """Run predictions for multiple players in a single request.

    Returns a JSON list of TacticalResponse objects in the same order as the
    input players list.
    """
    results: List[dict] = []
    for player in data.players:
        results.append(_run_prediction(player))
    return results

@app.get("/health")
async def health():
    return {"status": "healthy", "cached_models": list(MODEL_CACHE.keys())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
