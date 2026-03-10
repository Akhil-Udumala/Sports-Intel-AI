import { useState, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:8000';
const API_KEY = 'sports_intelligence_secret_key_2026';

export const useDeepIntel = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const performScan = useCallback(async (player, sport = 'football', context = {}) => {
        if (!player) return;

        setLoading(true);
        setError(null);

        // Advanced Mapper: Supports both Football and Cricket by mapping indicators to feature slots
        const features = sport === 'cricket' ? {
            goals: (Number(player.battingAvg) / 3) || 0, // Map Avg to Goals range (0-30)
            assists: (Number(player.strikeRate) / 5) || 0, // Map SR to Assists range
            minutesPlayed: Number(player.inningsPlayed) * 50 || 0,
            crossingAccuracy: Number(player.strikeRate) || 80,
            shootingAccuracy: Number(player.battingAvg) || 80,
            yellowCards: 0,
            fatigueScore: Number(player.fatigueScore) || 20,
            injuryRisk: Number(player.injuryRisk) || 10,
            workloadKM: 5,
            topSpeed: 25,
            sprintCount: 5,
            paceMetric: Number(player.bowlingAvg) ? (100 - Number(player.bowlingAvg)) : 50,
            passingAccuracy: 90,
        } : {
            goals: Number(player.goals) || 0,
            assists: Number(player.assists) || 0,
            minutesPlayed: Number(player.minutesPlayed) || 0,
            crossingAccuracy: Number(player.crossingAccuracy) || 0,
            shootingAccuracy: Number(player.shootingAccuracy) || 0,
            yellowCards: Number(player.yellowCards) || 0,
            fatigueScore: Number(player.fatigueScore) || 0,
            injuryRisk: Number(player.injuryRisk) || 0,
            workloadKM: parseFloat(player.workloadKM) || 0,
            topSpeed: parseFloat(player.topSpeed) || 0,
            sprintCount: Number(player.sprintCount) || 0,
            paceMetric: Number(player.paceMetric) || 0,
            passingAccuracy: Number(player.passingAccuracy) || 0,
            matchesPlayed: Number(player.matchesPlayed) || Number(player.matches) || 20,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': API_KEY,
                },
                body: JSON.stringify({
                    features,
                    context: {
                        sport,
                        name: player.name,
                        role: player.role || player.position,
                        ...context
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`Tactical Scan failed: ${response.statusText}`);
            }

            const result = await response.json();

            // Determine tactical performance level text
            const levels = ['Sub-par Contribution', 'Standard Impact', 'Exceptional Match Flow'];
            const confidence = Math.max(...result.tactical_confidence_scores) * 100;

            setData({
                matchImpactProbability: result.match_impact_probability,
                mlInjuryPrediction: result.ml_injury_prediction,
                tacticalLevel: levels[result.tactical_performance_level] || 'Consistent Output',
                confidence,
                // New Predicted Metrics
                predictedGoals: result.predicted_goals,
                goalProbability: result.goal_probability,
                assistProbability: result.assist_probability,
                predictedRuns: result.predicted_runs,
                predictedSR: result.predicted_sr,
                predictedWickets: result.predicted_wickets,
                predictedEco: result.predicted_eco
            });
        } catch (err) {
            setError(err.message);
            console.error('DeepIntel Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { performScan, loading, error, data };
};
