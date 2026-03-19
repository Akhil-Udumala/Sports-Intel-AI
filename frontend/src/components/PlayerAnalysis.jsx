import React, { useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler,
    Tooltip,
    Legend,
    BarElement
} from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import { cricketTeams } from '../data/cricketData';
import { internationalFootballTeams as footballTeams } from '../data/internationalFootballData';
import { calculateImpactScore, calculateConsistencyIndex } from '../utils/analytics';
import { generatePrediction } from '../utils/prediction';
import { useDeepIntel } from '../hooks/useDeepIntel';
import { useAuth } from '../context/AuthContext';
import { logCoachActivity } from '../utils/coachActivityLogger';
import './PlayerAnalysis.css';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler,
    Tooltip,
    Legend,
    BarElement
);

const PlayerAnalysis = () => {
    const { sport, teamName, playerId } = useParams();
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    const { performScan, loading: aiLoading, error: aiError, data: aiData } = useDeepIntel();

    const [showCompareSelect, setShowCompareSelect] = React.useState(false);
    const [compareTeam, setCompareTeam] = React.useState('');
    const [comparePlayerId, setComparePlayerId] = React.useState('');

    // Deep AI Engine State
    const [aiActivated, setAiActivated] = React.useState(false);
    const [opponentTeam, setOpponentTeam] = React.useState('');
    const [venue, setVenue] = React.useState('');
    const [pitchType, setPitchType] = React.useState('');

    const player = useMemo(() => {
        const teams = sport === 'cricket' ? cricketTeams : footballTeams;
        const teamPlayers = teams[teamName] || [];
        return teamPlayers.find(p => p.id === playerId);
    }, [sport, teamName, playerId]);

    const handleDeepScan = () => {
        if (sport === 'cricket' && (!opponentTeam || !venue || !pitchType)) {
            alert('Please select all match conditions for analysis.');
            return;
        }
        setAiActivated(true);
        performScan(player, sport, { opponentTeam, venue, pitchType });

        // ── Log Deep AI Engine usage ──
        if (user && player) {
            logCoachActivity(
                user.uid,
                user.email,
                userData?.teamId || teamName,
                'deep_ai',
                {
                    playerName: player.name,
                    sport,
                    teamName,
                    opponentTeam: opponentTeam || 'N/A',
                    venue: venue || 'N/A',
                    pitchType: pitchType || 'N/A',
                    context: 'player_analysis',
                }
            );
        }
    };

    useEffect(() => {
        setAiActivated(false);
    }, [playerId, sport]);

    const analysis = useMemo(() => {
        if (!player) return null;

        const impact = calculateImpactScore(player);
        const consistency = calculateConsistencyIndex(player);
        const form = player.last5Performances
            ? (player.last5Performances.reduce((a, b) => a + b, 0) / player.last5Performances.length)
            : (player.last5Matches
                ? (player.last5Matches.reduce((a, b) => a + b, 0) / player.last5Matches.length) * 100
                : 50);

        const calculatedRating = sport === 'football'
            ? (player.rating || Math.min(99, Math.round((player.goals * 0.8) + (player.assists * 0.5) + (player.passingAccuracy * 0.4) + (player.paceMetric * 0.2))))
            : (player.battingAvg || 0);

        const prediction = generatePrediction(player, "Upcoming Opponent", "Neutral Venue");

        // Define radar points based on role
        let radarPoints = [];
        if (sport === 'cricket') {
            const isBowler = player.role === 'Bowler';
            const isAllRounder = player.role === 'All-Rounder';

            if (isBowler) {
                radarPoints = [
                    consistency,
                    Math.max(0, 100 - (player.fatigueScore || 0)),
                    Math.max(0, 100 - (player.economy || 7) * 9),
                    Math.min(100, ((player.wicketsTaken || 0) / (player.inningsPlayed || 1)) * 50),
                    impact
                ];
            } else if (isAllRounder) {
                radarPoints = [
                    consistency,
                    Math.max(0, 100 - (player.fatigueScore || 0)),
                    Math.min(100, (player.battingAvg || 0) * 1.5),
                    Math.max(0, 100 - (player.economy || 7) * 9),
                    impact,
                    Math.min(100, (player.strikeRate || 0) / 1.6),
                ];
            } else {
                // Batsman
                radarPoints = [
                    consistency,
                    Math.max(0, 100 - (player.fatigueScore || 0)),
                    Math.min(100, (player.battingAvg || 0) * 1.5),
                    Math.min(100, (player.strikeRate || 0) / 1.6),
                    impact
                ];
            }
        } else {
            // Football
            radarPoints = [
                player.skill || 70,
                player.speed || 70,
                player.stamina || 70,
                player.passing || 70,
                100 - player.fatigueScore,
                consistency
            ];
        }

        const result = {
            overall_score: impact,
            total_runs: player.runsScored || player.goals || 0,
            batting_average: sport === 'football' ? calculatedRating : (player.battingAvg || 0),
            strike_rate: sport === 'football' ? Math.round(form) : (player.strikeRate || 0),
            highest_score: sport === 'football' ? (player.highestMatchScore || 0) : (player.highestScore || 0),
            assists: player.assists || 0,
            fifties: player.fifties || 0,
            hundreds: player.centuries || 0,
            catches: player.role === 'Wicketkeeper' ? 45 : 12, // Estimated
            not_outs: player.notOuts || 0,
            wickets: player.wicketsTaken || 0,
            bowling_average: player.bowlingAvg || 0,
            economy: player.economy || 0,
            five_wickets: player.fiveWickets || 0,
            fitness_score: Math.max(0, 100 - (player.fatigueScore || 0)),
            boundary_pct: player.boundaryPercentage || 0,
            consistency_index: Math.round(consistency),
            form_index: Math.round(form > 5 ? form : form * 20),
            impact_score: impact,
            injury_risk: player.injuryRisk || 0,
            fatigue_prob: player.fatigueScore || 0,
            next_match_score: prediction.probability,
            next_runs_pred: prediction.predictedRuns || 0,
            next_wickets_pred: prediction.predictedWickets || 0,
            innings: sport === 'cricket' ? (player.inningsPlayed || 0) : (player.matchesPlayed || 0),
            matches: player.matches || player.matchesPlayed || 0,
            trend: (sport === 'football'
                ? (player.last5Goals || [0, 0, 0, 0, 0])
                : (player.role === 'Bowler' ? (player.last5Wickets || [1, 2, 0, 1, 3]) : (player.last5Performances || [0, 0, 0, 0, 0]))
            ).slice(-5),
            radar_points: radarPoints,
            ml_pred_prob: aiActivated && aiData ? Math.round(aiData.matchImpactProbability) : 0,
            ml_injury_prob: aiActivated && aiData ? Math.round(aiData.mlInjuryPrediction) : player.injuryRisk || 0,
            ml_tactical_level: aiActivated && aiData ? aiData.tacticalLevel : 'Consistent Output',
            ml_goals_pred: aiActivated && aiData ? (aiData.predictedGoals || Math.round((player.goals || 0) / (player.matchesPlayed || 1) * 1.5)) : 0,
            ml_goal_prob: aiActivated && aiData ? (aiData.goalProbability || 35) : 0,
            ml_assist_prob: aiActivated && aiData ? (aiData.assistProbability || 25) : 0,
            ml_confidence: aiActivated && aiData ? Math.round(aiData.confidence) : 0,

            // Cricket Specific ML Predictions
            ml_runs_pred: aiActivated && aiData ? (aiData.predictedRuns || Math.round((player.battingAvg || 30) * 1.2)) : 0,
            ml_sr_pred: aiActivated && aiData ? (aiData.predictedSR || Math.round((player.strikeRate || 80) * 1.05)) : 0,
            ml_wickets_pred: aiActivated && aiData ? (aiData.predictedWickets || (['Batter', 'Wicketkeeper'].includes(player.role) ? 0 : 2)) : 0,
            ml_eco_pred: aiActivated && aiData ? (aiData.predictedEco || (player.economy || 5.5)) : 0,
        };

        const round2 = (num) => typeof num === 'number' ? Math.round(num * 100) / 100 : num;
        for (const key in result) {
            if (Array.isArray(result[key])) {
                result[key] = result[key].map(round2);
            } else {
                result[key] = round2(result[key]);
            }
        }
        return result;
    }, [player, sport, aiData]);

    if (!player || !analysis) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Player Not Found</h2>
                    <Link to="/" className="btn btn-p">Return Home</Link>
                </div>
            </div>
        );
    }

    const trendData = {
        labels: ['M-5', 'M-4', 'M-3', 'M-2', 'M-1'],
        datasets: [{
            label: sport === 'football' ? 'Goals Scored' : (player.role === 'Bowler' ? 'Wickets' : 'Runs'),
            data: analysis.trend,
            borderColor: '#00E5FF',
            backgroundColor: 'rgba(0,229,255,0.08)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00E5FF',
            pointRadius: 5
        }]
    };

    const trendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9CA3AF' } },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#9CA3AF', stepSize: 1 },
                min: 0,
                max: sport === 'football'
                    ? Math.max(3, ...(player.last5Goals || [0])) + 1
                    : (player.role === 'Bowler' ? Math.max(5, ...analysis.trend) + 1 : 150)
            }
        }
    };

    const radarData = {
        labels: sport === 'cricket'
            ? (player.role === 'Bowler'
                ? ['Consistency', 'Fitness', 'Avg Economy', 'Avg Wickets', 'Impact']
                : (player.role === 'All-Rounder'
                    ? ['Consistency', 'Fitness', 'Batting Avg', 'Economy', 'Impact', 'Strike Rate']
                    : ['Consistency', 'Fitness', 'Average', 'Strike Rate', 'Impact']))
            : ['Skill', 'Speed', 'Stamina', 'Passing', 'Fitness', 'Consistency'],
        datasets: [{
            label: player.name,
            data: analysis.radar_points,
            borderColor: '#00E5FF',
            backgroundColor: 'rgba(0,229,255,0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#00E5FF'
        }]
    };

    const radarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                grid: { color: 'rgba(255,255,255,0.06)' },
                ticks: { display: false, backdropColor: 'transparent' },
                pointLabels: { color: '#9CA3AF', font: { size: 11, family: 'Inter' } },
                min: 0,
                max: 100,
                angleLines: { color: 'rgba(255,255,255,0.1)' }
            }
        },
        plugins: {
            legend: { labels: { color: '#9CA3AF', font: { size: 11 } } }
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white">
            <div className="analysis-container">
                <div className="breadcrumb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Link to="/">Home</Link> ›
                        <Link to={`/dashboard/${sport}/${teamName}`}>{sport === 'cricket' ? 'Cricket' : 'Football'} Dashboard</Link> ›
                        <span>{player.name}</span>
                    </div>
                    <button
                        onClick={() => logout()}
                        style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                        ⏻ Logout
                    </button>
                </div>

                {/* Hero */}
                <div className="analysis-hero">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                                {sport === 'cricket' ? '🏏 Cricket' : '⚽ Football'} Player Analysis
                            </div>
                            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '42px', letterSpacing: '2px', marginBottom: '8px', lineHeight: '1' }}>
                                {player.name}
                            </h2>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span className="badge bb">{player.role || player.position}</span>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>🌍 {teamName}</span>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>{analysis.matches} {sport === 'cricket' ? 'Innings' : 'Apps'}</span>
                            </div>
                        </div>

                        <div>
                            <button
                                onClick={() => setShowCompareSelect(true)}
                                className="btn btn-p"
                                style={{ background: 'linear-gradient(90deg, #6366f1, #3b82f6)', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)' }}
                            >
                                ⚔️ Compare Player
                            </button>
                        </div>
                    </div>
                </div>

                {showCompareSelect && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="card"
                        style={{ marginBottom: '24px', border: '1px solid var(--p)', background: 'rgba(14, 165, 233, 0.05)', overflow: 'hidden' }}
                    >
                        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Select Opponent for Comparison</span>
                            <button onClick={() => setShowCompareSelect(false)} style={{ fontSize: '12px', opacity: 0.5 }}>✕ Close</button>
                        </div>

                        {/* Team Selection Carousel */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>1. Select Country</label>
                            <div className="carousel-container" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {Object.keys(sport === 'cricket' ? cricketTeams : footballTeams)
                                    .filter(t => sport === 'football' ? true : [
                                        'Australia', 'South Africa', 'Pakistan', 'Sri Lanka', 'New Zealand', 'India', 'England', 'West Indies', 'Bangladesh', 'Afghanistan'
                                    ].includes(t))
                                    .map(t => (
                                        <motion.div
                                            key={t}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                setCompareTeam(t);
                                                setComparePlayerId('');
                                            }}
                                            style={{
                                                minWidth: '120px',
                                                padding: '12px',
                                                background: compareTeam === t ? 'var(--p)' : 'rgba(255,255,255,0.05)',
                                                borderRadius: '10px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                border: compareTeam === t ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                transition: 'background 0.3s'
                                            }}
                                        >
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: compareTeam === t ? '#fff' : 'var(--txt)' }}>{t}</div>
                                        </motion.div>
                                    ))}
                            </div>
                        </div>

                        {/* Player Selection Carousel */}
                        <AnimatePresence>
                            {compareTeam && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{ marginBottom: '20px' }}
                                >
                                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>2. Select Player</label>
                                    <div className="carousel-container" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
                                        {(sport === 'cricket' ? cricketTeams : footballTeams)[compareTeam]
                                            .filter(p => {
                                                if (p.id === player.id) return false;
                                                if (sport !== 'cricket') return true;
                                                const role = player.role || '';
                                                if (role === 'Batsman') return (p.role === 'Batsman' || p.role === 'All-Rounder');
                                                if (role === 'Bowler') return (p.role === 'Bowler' || p.role === 'All-Rounder');
                                                return true; // All-Rounders can compare with any role
                                            })
                                            .map(p => (
                                                <motion.div
                                                    key={p.id}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setComparePlayerId(p.id)}
                                                    style={{
                                                        minWidth: '150px',
                                                        padding: '12px',
                                                        background: comparePlayerId === p.id ? 'var(--p)' : 'rgba(255,255,255,0.05)',
                                                        borderRadius: '10px',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        border: comparePlayerId === p.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                        transition: 'background 0.3s'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{p.name}</div>
                                                    <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>{p.role || p.position}</div>
                                                </motion.div>
                                            ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                                disabled={!comparePlayerId}
                                onClick={() => {
                                    navigate(`/compare/${sport}/${teamName}/${playerId}/${compareTeam}/${comparePlayerId}`);
                                }}
                                className="btn btn-p"
                                style={{
                                    opacity: comparePlayerId ? 1 : 0.5,
                                    padding: '12px 30px',
                                    borderRadius: '30px',
                                    background: 'linear-gradient(90deg, #6366f1, #3b82f6)',
                                    boxShadow: comparePlayerId ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
                                }}
                            >
                                Start Head-to-Head Comparison
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Core Stats Row */}
                <div className="metric-row">
                    <div className="metric">
                        <div className="metric-v" style={{ color: '#A5B4FC' }}>{analysis.matches}</div>
                        <div className="metric-l">Matches</div>
                    </div>
                    {sport === 'cricket' && (
                        <div className="metric">
                            <div className="metric-v" style={{ color: '#C7D2FE' }}>{analysis.innings}</div>
                            <div className="metric-l">Innings</div>
                        </div>
                    )}

                    {(sport !== 'cricket' || (player.role !== 'Bowler')) && (
                        <>
                            <div className="metric">
                                <div className="metric-v" style={{ color: 'var(--p)' }}>{analysis.total_runs}</div>
                                <div className="metric-l">{sport === 'cricket' ? 'Total Runs' : 'Total Goals'}</div>
                            </div>
                            <div className="metric">
                                <div className="metric-v" style={{ color: '#FF6B35' }}>{analysis.batting_average}</div>
                                <div className="metric-l">{sport === 'cricket' ? 'Batting Avg' : 'Performance Rating'}</div>
                            </div>
                            <div className="metric">
                                <div className="metric-v" style={{ color: 'var(--green)' }}>{analysis.strike_rate}</div>
                                <div className="metric-l">{sport === 'cricket' ? 'Strike Rate' : 'Form Index (%)'}</div>
                            </div>
                            <div className="metric">
                                <div className="metric-v">{analysis.highest_score}</div>
                                <div className="metric-l">{sport === 'cricket' ? 'Highest Score*' : 'Highest Match Score'}</div>
                            </div>
                            {sport === 'cricket' && (
                                <>
                                    <div className="metric">
                                        <div className="metric-v" style={{ color: '#FCD34D' }}>{analysis.hundreds}</div>
                                        <div className="metric-l">Centuries</div>
                                    </div>
                                    <div className="metric">
                                        <div className="metric-v" style={{ color: '#FBBF24' }}>{analysis.fifties}</div>
                                        <div className="metric-l">Fifties</div>
                                    </div>
                                </>
                            )}
                            {sport === 'football' && (
                                <div className="metric">
                                    <div className="metric-v" style={{ color: 'var(--p)' }}>{analysis.assists}</div>
                                    <div className="metric-l">Total Assists</div>
                                </div>
                            )}
                        </>
                    )}

                    {sport === 'cricket' && (player.role === 'Bowler' || player.role === 'All-Rounder') && (
                        <>
                            <div className="metric">
                                <div className="metric-v" style={{ color: 'var(--a)' }}>{analysis.wickets}</div>
                                <div className="metric-l">Wickets</div>
                            </div>
                            <div className="metric">
                                <div className="metric-v">{analysis.bowling_average}</div>
                                <div className="metric-l">Bowling Avg</div>
                            </div>
                            <div className="metric">
                                <div className="metric-v" style={{ color: 'var(--green)' }}>{analysis.economy}</div>
                                <div className="metric-l">Economy Rate</div>
                            </div>
                            <div className="metric">
                                <div className="metric-v">{analysis.five_wickets}</div>
                                <div className="metric-l">5-Wicket Hauls*</div>
                            </div>
                        </>
                    )}

                    <div className="metric">
                        <div className="metric-v" style={{ color: 'var(--green)' }}>{analysis.fitness_score}</div>
                        <div className="metric-l">Fitness Score</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="g2">
                    <div className="card">
                        <div className="card-title">📈 Performance Trend (Last 5 Matches)</div>
                        <div style={{ height: '220px', width: '100%' }}>
                            <Line data={trendData} options={trendOptions} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-title">🕸️ Capability Radar</div>
                        <div style={{ height: '220px', width: '100%' }}>
                            <Radar data={radarData} options={radarOptions} />
                        </div>
                    </div>
                </div>

                {/* Advanced Metrics */}
                <div className="g3">
                    <div className="card">
                        <div className="card-title">📊 Advanced Indices</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--muted)' }}>Consistency Index</span>
                                    <strong style={{ color: 'var(--p)' }}>{analysis.consistency_index}/100</strong>
                                </div>
                                <div className="prog"><div className="prog-fill" style={{ width: `${analysis.consistency_index}%`, background: 'var(--p)' }}></div></div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--muted)' }}>Form Index</span>
                                    <strong style={{ color: 'var(--green)' }}>{analysis.form_index}/100</strong>
                                </div>
                                <div className="prog"><div className="prog-fill" style={{ width: `${analysis.form_index}%`, background: 'var(--green)' }}></div></div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--muted)' }}>Player Impact Score</span>
                                    <strong style={{ color: '#FF6B35' }}>{analysis.impact_score}/100</strong>
                                </div>
                                <div className="prog"><div className="prog-fill" style={{ width: `${analysis.impact_score}%`, background: 'var(--s)' }}></div></div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--muted)' }}>Fitness Score</span>
                                    <strong style={{ color: analysis.fitness_score > 80 ? 'var(--green)' : analysis.fitness_score > 60 ? 'var(--yellow)' : 'var(--red)' }}>
                                        {analysis.fitness_score}/100
                                    </strong>
                                </div>
                                <div className="prog">
                                    <div
                                        className="prog-fill"
                                        style={{
                                            width: `${analysis.fitness_score}%`,
                                            background: analysis.fitness_score > 80 ? 'var(--green)' : analysis.fitness_score > 60 ? 'var(--yellow)' : 'var(--red)'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title">⚠️ Risk Assessment</div>
                        <div className="risk-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600' }}>Injury Risk</span>
                                <span style={{
                                    fontSize: '24px',
                                    fontFamily: "'Bebas Neue', sans-serif",
                                    color: analysis.ml_injury_prob > 70 ? 'var(--red)' : analysis.ml_injury_prob > 40 ? 'var(--yellow)' : 'var(--green)'
                                }}>
                                    {analysis.ml_injury_prob}%
                                </span>
                            </div>
                            <div className="prog" style={{ height: '8px' }}>
                                <div
                                    className="prog-fill"
                                    style={{
                                        width: `${analysis.ml_injury_prob}%`,
                                        background: analysis.ml_injury_prob > 70 ? 'var(--red)' : analysis.ml_injury_prob > 40 ? 'var(--yellow)' : 'var(--green)'
                                    }}
                                ></div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
                                {analysis.ml_injury_prob > 70 ? '⚠️ High risk (ML Predicted) — rest recommended' : analysis.ml_injury_prob > 40 ? '🟡 Moderate risk (ML Predicted) — monitor closely' : '✅ Low risk — fit to play'}
                            </div>
                        </div>
                        <div className="risk-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600' }}>Fatigue Probability</span>
                                <span style={{
                                    fontSize: '24px',
                                    fontFamily: "'Bebas Neue', sans-serif",
                                    color: analysis.fatigue_prob > 70 ? 'var(--red)' : analysis.fatigue_prob > 40 ? 'var(--yellow)' : 'var(--green)'
                                }}>
                                    {analysis.fatigue_prob}%
                                </span>
                            </div>
                            <div className="prog" style={{ height: '8px' }}>
                                <div
                                    className="prog-fill"
                                    style={{
                                        width: `${analysis.fatigue_prob}%`,
                                        background: analysis.fatigue_prob > 70 ? 'var(--red)' : analysis.fatigue_prob > 40 ? 'var(--yellow)' : 'var(--green)'
                                    }}
                                ></div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
                                {analysis.fatigue_prob > 70 ? '😴 High fatigue — rotation advised' : analysis.fatigue_prob > 40 ? '😐 Moderate fatigue — manage workload' : '💪 Fresh — ready for action'}
                            </div>
                        </div>
                    </div>

                    {/* Deep AI Engine Box */}
                    <div className="next-card" style={{ gridColumn: sport === 'football' ? 'span 1' : 'span 1' }}>
                        <div className="card-title" style={{ color: '#00E5FF', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="pulse-dot"></div> Deep AI Engine (v5.0)
                            </span>
                            {aiLoading && <span className="animate-pulse text-[10px] uppercase font-bold text-indigo-400">Synthesizing Telemetry...</span>}
                        </div>

                        {!aiActivated ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {sport === 'cricket' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Match Conditions</label>
                                            <select
                                                value={opponentTeam}
                                                onChange={(e) => setOpponentTeam(e.target.value)}
                                                className="ai-select"
                                            >
                                                <option value="">Against Which Team?</option>
                                                {Object.keys(cricketTeams).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <select
                                                value={venue}
                                                onChange={(e) => setVenue(e.target.value)}
                                                className="ai-select"
                                            >
                                                <option value="">Venue</option>
                                                <option value="Home">Home Ground</option>
                                                <option value="Away">Away Ground</option>
                                                <option value="Neutral">Neutral Venue</option>
                                            </select>
                                            <select
                                                value={pitchType}
                                                onChange={(e) => setPitchType(e.target.value)}
                                                className="ai-select"
                                            >
                                                <option value="">Pitch Type</option>
                                                <option value="Flat">Flat (High Score)</option>
                                                <option value="Spinning">Spinning</option>
                                                <option value="Seaming">Green/Seaming</option>
                                                <option value="Dusty">Dusty/Dry</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
                                    Initialize neural analysis to predict future performance metrics based on historical telemetry, player form, and environmental variables.
                                </p>

                                <button
                                    onClick={handleDeepScan}
                                    className="scan-btn"
                                >
                                    Initialize Neural Analysis
                                </button>
                            </div>
                        ) : (
                            <div className="ai-results-grid">
                                {sport === 'football' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="ai-stat-box full">
                                            <div className="ai-stat-label">goals he will score</div>
                                            <div className="ai-stat-value" style={{ color: '#00E5FF' }}>{analysis.ml_goals_pred}</div>
                                        </div>
                                        <div className="ai-stat-box">
                                            <div className="ai-stat-label">goal probability</div>
                                            <div className="ai-stat-value">{analysis.ml_goal_prob}%</div>
                                        </div>
                                        <div className="ai-stat-box">
                                            <div className="ai-stat-label">assist probability</div>
                                            <div className="ai-stat-value">{analysis.ml_assist_prob}%</div>
                                        </div>
                                        <div className="ai-stat-box">
                                            <div className="ai-stat-label">impact probability</div>
                                            <div className="ai-stat-value" style={{ color: '#6366f1' }}>{analysis.ml_pred_prob}%</div>
                                        </div>
                                        <div className="ai-stat-box">
                                            <div className="ai-stat-label">AI confidence</div>
                                            <div className="ai-stat-value" style={{ color: '#10b981' }}>{analysis.ml_confidence}%</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {(player.role === 'Batter' || player.role === 'All-Rounder' || player.role === 'Wicketkeeper') && (
                                            <>
                                                <div className="ai-stat-box">
                                                    <div className="ai-stat-label">expected strike-rate</div>
                                                    <div className="ai-stat-value" style={{ color: '#00E5FF' }}>{analysis.ml_sr_pred}</div>
                                                </div>
                                                <div className="ai-stat-box">
                                                    <div className="ai-stat-label">expected runs he'll score</div>
                                                    <div className="ai-stat-value" style={{ color: '#00E5FF' }}>{analysis.ml_runs_pred}</div>
                                                </div>
                                            </>
                                        )}
                                        {(player.role === 'Bowler' || player.role === 'All-Rounder') && (
                                            <>
                                                <div className="ai-stat-box">
                                                    <div className="ai-stat-label">expected economy</div>
                                                    <div className="ai-stat-value" style={{ color: '#fb923c' }}>{analysis.ml_eco_pred}</div>
                                                </div>
                                                <div className="ai-stat-box">
                                                    <div className="ai-stat-label">expected wickets</div>
                                                    <div className="ai-stat-value" style={{ color: '#fb923c' }}>{analysis.ml_wickets_pred}</div>
                                                </div>
                                            </>
                                        )}
                                        <div className="ai-stat-box">
                                            <div className="ai-stat-label">impact probability</div>
                                            <div className="ai-stat-value" style={{ color: '#6366f1' }}>{analysis.ml_pred_prob}%</div>
                                        </div>
                                        <div className="ai-stat-box">
                                            <div className="ai-stat-label">AI confidence</div>
                                            <div className="ai-stat-value" style={{ color: '#10b981' }}>{analysis.ml_confidence}%</div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setAiActivated(false)}
                                    style={{
                                        marginTop: '12px',
                                        width: '100%',
                                        padding: '8px',
                                        fontSize: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.5)',
                                        borderRadius: '4px'
                                    }}
                                >
                                    Reset Neural Analysis
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Football-only detailed stats ── */}
                {sport === 'football' && (
                    <>
                        {/* Technical Performance */}
                        <div className="card" style={{ marginTop: '0' }}>
                            <div className="card-title">⚽ Technical Performance</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                                {[
                                    { label: 'Appearances', value: player.matches },
                                    { label: 'Minutes Played', value: player.minutesPlayed ? `${player.minutesPlayed.toLocaleString()}` : '—' },
                                    { label: 'Goals', value: player.goals },
                                    { label: 'Assists', value: player.assists },
                                    { label: 'Key Passes /90', value: player.keyPasses },
                                    { label: 'Pass Accuracy', value: `${player.passingAccuracy}%` },
                                    { label: 'Cross Accuracy', value: `${player.crossingAccuracy}%` },
                                    { label: 'Shots on Target', value: player.shotsOnTarget },
                                    { label: 'Shot Accuracy', value: `${player.shootingAccuracy}%` },
                                    { label: 'Yellow Cards', value: player.yellowCards },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Physical & Locomotive */}
                        <div className="card">
                            <div className="card-title">⚡ Physical &amp; Locomotive</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                                {[
                                    { label: 'Top Speed', value: `${player.topSpeed} km/h`, color: '#fbbf24' },
                                    { label: 'Sprint Speed (FIFA)', value: player.sprintSpeed, color: '#fbbf24' },
                                    { label: 'Acceleration', value: player.acceleration, color: '#fb923c' },
                                    { label: 'Workload/Game', value: `${player.workloadKM} KM`, color: '#34d399' },
                                    { label: 'Sprints/Match', value: player.sprintCount, color: '#34d399' },
                                    { label: 'Recovery Time', value: `${Math.round(player.recoveryTime)}H`, color: '#60a5fa' },
                                    { label: 'Stamina (FIFA)', value: player.stamina, color: '#34d399' },
                                    { label: 'Strength (FIFA)', value: player.strength, color: '#a78bfa' },
                                    { label: 'Agility (FIFA)', value: player.agility, color: '#f472b6' },
                                    { label: 'Balance (FIFA)', value: player.balance, color: '#38bdf8' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                                        <span style={{ fontSize: '18px', fontWeight: '800', color: color || '#fff', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Clinical Biometrics */}
                        <div className="card">
                            <div className="card-title">🧬 Clinical Biometrics</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                                {[
                                    { label: 'BMI', value: player.bmi },
                                    { label: 'Body Fat %', value: `${player.bodyFat}%` },
                                    { label: 'VO₂ Max', value: `${player.vo2Max} ml/kg` },
                                    { label: 'Muscle Mass %', value: `${player.muscleMass}%` },
                                    { label: 'Injury Risk', value: `${player.injuryRisk}%`, color: player.injuryRisk > 60 ? 'var(--red)' : player.injuryRisk > 35 ? 'var(--yellow)' : 'var(--green)' },
                                    { label: 'Fatigue Score', value: `${player.fatigueScore}%`, color: player.fatigueScore > 60 ? 'var(--red)' : player.fatigueScore > 35 ? 'var(--yellow)' : 'var(--green)' },
                                    { label: 'Reactions (FIFA)', value: player.reactions, color: '#a78bfa' },
                                    { label: 'Fitness Score', value: `${analysis.fitness_score}/100`, color: analysis.fitness_score > 75 ? 'var(--green)' : 'var(--yellow)' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                                        <span style={{ fontSize: '18px', fontWeight: '800', color: color || '#fff', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FIFA Technical Attributes */}
                        <div className="card">
                            <div className="card-title">🎮 FIFA Technical Attributes</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                                {(player.position === 'Goalkeeper'
                                    ? [
                                        { label: 'GK Diving', value: player.gkDiving, max: 99 },
                                        { label: 'GK Handling', value: player.gkHandling, max: 99 },
                                        { label: 'GK Reflexes', value: player.gkReflexes, max: 99 },
                                        { label: 'Reactions', value: player.reactions, max: 99 },
                                        { label: 'Stamina', value: player.stamina, max: 99 },
                                        { label: 'Strength', value: player.strength, max: 99 },
                                    ]
                                    : [
                                        { label: 'Finishing', value: player.finishing, max: 99 },
                                        { label: 'Dribbling', value: player.dribbling, max: 99 },
                                        { label: 'Vision', value: player.vision, max: 99 },
                                        { label: 'Short Passing', value: player.shortPassing, max: 99 },
                                        { label: 'Long Passing', value: player.longPassing, max: 99 },
                                        { label: 'Crossing', value: player.crossing, max: 99 },
                                        { label: 'Heading Acc.', value: player.headingAccuracy, max: 99 },
                                        { label: 'Positioning', value: player.positioning, max: 99 },
                                        ...(player.position === 'Defender' || player.standingTackle > 60 ? [
                                            { label: 'Standing Tackle', value: player.standingTackle, max: 99 },
                                            { label: 'Sliding Tackle', value: player.slidingTackle, max: 99 },
                                            { label: 'Marking', value: player.marking, max: 99 },
                                        ] : []),
                                    ]
                                ).map(({ label, value, max }) => {
                                    const pct = Math.round((value / max) * 100);
                                    const col = pct >= 85 ? '#34d399' : pct >= 70 ? '#fbbf24' : '#f87171';
                                    return (
                                        <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                                                <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '9px' }}>{label}</span>
                                                <strong style={{ color: col }}>{value}</strong>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Summary */}
                <div className="card">
                    <div className="card-title">📋 Player Summary & Recommendation</div>
                    <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'rgba(255,255,255,0.7)' }}>
                        <strong style={{ color: '#fff' }}>{player.name}</strong> is a {player.role || player.position} from {teamName},
                        with {analysis.innings} professional appearances.
                        {sport === 'cricket' ? (
                            <>
                                Batting average of <strong style={{ color: '#fff' }}>{analysis.batting_average}</strong> with a strike rate of <strong style={{ color: '#fff' }}>{analysis.strike_rate}</strong>.
                                {analysis.wickets > 0 && (
                                    <> Bowling economy of <strong style={{ color: '#fff' }}>{analysis.economy}</strong> with {analysis.wickets} wickets at an average of {analysis.bowling_average}.</>
                                )}
                            </>
                        ) : (
                            <> Performance rating stands at <strong style={{ color: '#fff' }}>{analysis.batting_average}</strong> with {analysis.total_runs} goals and {analysis.assists} assists over {analysis.innings} matches.</>
                        )}
                        <br /><br />
                        <strong style={{ color: analysis.injury_risk > 70 ? 'var(--red)' : analysis.injury_risk > 40 ? 'var(--yellow)' : 'var(--green)' }}>
                            Injury Risk: {analysis.injury_risk}%
                        </strong> —
                        {analysis.injury_risk > 70 ? ' Rest is strongly recommended before the next fixture.' : analysis.injury_risk > 40 ? ' Moderate risk; careful workload management advised.' : ' Player is fit and ready for selection.'}
                        Fatigue probability stands at {analysis.fatigue_prob}%.
                        {sport === 'football' && (
                            <> Predicted tactical performance: <strong style={{ color: 'var(--p)' }}>{analysis.ml_tactical_level}</strong> with an impact probability of {analysis.ml_pred_prob}%.</>
                        )}
                    </div>
                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <Link to={`/dashboard/${sport}/${teamName}`} className="btn btn-s">← Back to Dashboard</Link>
                    </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px' }}>* Estimated values based on career statistics. Advanced metrics modelled via AI Neural Engine.</div>
            </div>
        </div>
    );
};

export default PlayerAnalysis;
