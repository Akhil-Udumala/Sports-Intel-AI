// Utility to process predictions (simulated AI)
export const generatePrediction = (player, opponent, venue, pitchType = 'flat') => {
    const baseConfidence = 85;

    // Multi-faceted prediction logic
    const performanceProb = calculatePerformanceProbability(player, opponent, venue, pitchType);
    const injuryRiskDetail = calculateInjuryRisk(player);
    const fatigueDetail = calculateFatigue(player);
    const venueImpact = calculateVenueImpact(player, venue, pitchType);

    let explanation = "";
    if (player.fatigueScore > 70) {
        explanation = `${player.name} is showing significant fatigue (${player.fatigueScore}%). ${fatigueDetail.advice}`;
    } else if (player.injuryRisk > 50) {
        explanation = `${player.name} has a high injury risk (${player.injuryRisk}%). ${injuryRiskDetail.recommendation}`;
    } else {
        explanation = `${player.name} is in peak physical condition. ${venueImpact.summary} against ${opponent}.`;
    }

    return {
        probability: performanceProb,
        confidence: baseConfidence + (player.matchesPlayed > 50 ? 5 : 0),
        injuryRisk: player.injuryRisk,
        explanation,
        fatigue: fatigueDetail,
        venuePerformance: venueImpact.score,
        predictedRuns: player.role === 'Batsman' || player.role === 'All-Rounder' ? Math.floor(player.battingAvg * (performanceProb / 75)) : null,
        predictedWickets: player.role === 'Bowler' || player.role === 'All-Rounder' ? (player.bowlingAvg < 25 ? 2 : 1) : null
    };
};

const calculatePerformanceProbability = (player, opponent, venue, pitchType) => {
    let prob = 70; // Base
    if (player.last5Performances) {
        const recentForm = player.last5Performances.reduce((a, b) => a + b, 0) / player.last5Performances.length;
        prob += recentForm > 40 ? 10 : -5;
    }
    if (player.pitchPerformance && player.pitchPerformance[pitchType]) {
        prob += player.pitchPerformance[pitchType] > 80 ? 5 : -5;
    }
    return Math.min(95, Math.max(40, prob));
};

const calculateInjuryRisk = (player) => {
    return {
        score: player.injuryRisk,
        recommendation: player.injuryRisk > 40 ? "High workload detected. Recommend rotation." : "Cleared for full intensity."
    };
};

const calculateFatigue = (player) => {
    return {
        score: player.fatigueScore,
        advice: player.fatigueScore > 60 ? "Recovery sessions prioritized." : "Optimal energy levels."
    };
};

const calculateVenueImpact = (player, venue, pitchType) => {
    const score = player.pitchPerformance ? player.pitchPerformance[pitchType] || 70 : 70;
    return {
        score,
        summary: score > 80 ? "Historical excellence at similar venues" : "Standard performance expectations"
    };
};
