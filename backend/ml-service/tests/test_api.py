import json
import pytest
from fastapi.testclient import TestClient
from main import app, API_KEY, FEATURES

client = TestClient(app)

def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

def test_predict_no_auth():
    with TestClient(app) as client:
        payload = {
            "features": {f: 1.0 for f in FEATURES}
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 403

def test_predict_invalid_auth():
    with TestClient(app) as client:
        payload = {
            "features": {f: 1.0 for f in FEATURES}
        }
        response = client.post(
            "/predict", 
            json=payload, 
            headers={"X-API-KEY": "wrong_key"}
        )
        assert response.status_code == 403

def test_predict_success():
    with TestClient(app) as client:
        # Construct payload with all required features
        payload = {
            "features": {f: 1.0 for f in FEATURES}
        }
        response = client.post(
            "/predict", 
            json=payload, 
            headers={"X-API-KEY": API_KEY}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "regression_prediction" in data
        assert "classification_prediction" in data
        assert "classification_probability" in data
        assert len(data["classification_probability"]) == 2

def test_predict_missing_feature():
    with TestClient(app) as client:
        # Remove one feature from payload
        payload = {
            "features": {f: 1.0 for f in FEATURES[:-1]}
        }
        response = client.post(
            "/predict", 
            json=payload, 
            headers={"X-API-KEY": API_KEY}
        )
        assert response.status_code == 400
        assert "Missing feature" in response.json()["detail"]

