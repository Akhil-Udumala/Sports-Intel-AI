import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split

def generate_tactical_data(num_samples=1000):
    np.random.seed(42)
    with open('feature_schema.json', 'r') as f:
        schema = json.load(f)
        features = schema['features']

    data = {}
    for feature in features:
        if 'Accuracy' in feature:
            data[feature] = np.random.uniform(50, 95, num_samples)
        elif 'Score' in feature or 'Risk' in feature:
            data[feature] = np.random.uniform(0, 100, num_samples)
        elif 'KM' in feature:
             data[feature] = np.random.uniform(8, 14, num_samples)
        elif 'Speed' in feature:
             data[feature] = np.random.uniform(25, 38, num_samples)
        elif 'goals' in feature or 'assists' in feature:
             data[feature] = np.random.randint(0, 30, num_samples)
        elif 'minutes' in feature:
             data[feature] = np.random.randint(500, 3000, num_samples)
        elif 'Cards' in feature:
             data[feature] = np.random.randint(0, 10, num_samples)
        else:
            data[feature] = np.random.uniform(60, 98, num_samples)

    df = pd.DataFrame(data)
    
    # 1. Regression: Match Impact Probability (0-100)
    # Influenced by goals, assists, accuracy, and inversely by fatigue
    df['match_impact_probability'] = (
        (df['goals'] * 1.5 + df['assists'] * 1.0 + df['passingAccuracy'] * 0.4) - (df['fatigueScore'] * 0.2)
    )
    df['match_impact_probability'] = np.clip(df['match_impact_probability'], 40, 98) + np.random.normal(0, 2, num_samples)
    
    # 2. Regression: ML Injury Prediction (0-100)
    # Highly influenced by previous injuryRisk, fatigue, and workload
    df['ml_injury_prediction'] = (
        (df['injuryRisk'] * 0.5 + df['fatigueScore'] * 0.4 + df['workloadKM'] * 2.0)
    )
    df['ml_injury_prediction'] = np.clip(df['ml_injury_prediction'], 5, 95) + np.random.normal(0, 5, num_samples)
    
    # 3. Classification: Tactical Performance Level (0: Sub-par, 1: Standard, 2: Exceptional)
    df['tactical_performance_level'] = 1
    df.loc[df['match_impact_probability'] < 60, 'tactical_performance_level'] = 0
    df.loc[df['match_impact_probability'] > 85, 'tactical_performance_level'] = 2
    
    return df, features

def train_models():
    df, features = generate_tactical_data()
    X = df[features]
    
    # Performance Regression
    y_perf = df['match_impact_probability']
    perf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    perf_model.fit(X, y_perf)
    
    # Injury Regression
    y_inj = df['ml_injury_prediction']
    inj_model = RandomForestRegressor(n_estimators=100, random_state=42)
    inj_model.fit(X, y_inj)
    
    # Tactical Level Classification
    y_lvl = df['tactical_performance_level']
    lvl_model = RandomForestClassifier(n_estimators=100, random_state=42)
    lvl_model.fit(X, y_lvl)
    
    # Save models
    os.makedirs('models', exist_ok=True)
    joblib.dump(perf_model, 'models/performance_model.joblib')
    joblib.dump(inj_model, 'models/injury_model.joblib')
    joblib.dump(lvl_model, 'models/tactical_level_model.joblib')
    
    print("Tactical performance models trained and saved.")

if __name__ == "__main__":
    train_models()
