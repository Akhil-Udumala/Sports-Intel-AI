import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Chart as ChartJS,
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import { calculateImpactScore, calculateConsistencyIndex } from '../utils/analytics';
import { getPlayerImage } from '../utils/playerImages';
import { cricketTeams } from '../data/cricketData';
import { internationalFootballTeams as footballTeams } from '../data/internationalFootballData';
import { useDeepIntel } from '../hooks/useDeepIntel';
import { useAuth } from '../context/AuthContext';
import { logCoachActivity } from '../utils/coachActivityLogger';

ChartJS.register(
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    Tooltip,
    Legend
);

const PlayerComparison = () => {
    const { sport, team1, player1Id, team2, player2Id } = useParams();
    const navigate = useNavigate();
    const { user, userData } = useAuth();

    const p1Intel = useDeepIntel();
    const p2Intel = useDeepIntel();

    const data = useMemo(() => {
        const sourceTeams = sport === 'cricket' ? cricketTeams : footballTeams;
        const p1 = (sourceTeams[team1] || []).find(p => p.id === player1Id);
        const p2 = (sourceTeams[team2] || []).find(p => p.id === player2Id);
        return { p1, p2 };
    }, [sport, team1, player1Id, team2, player2Id]);

    const { p1, p2 } = data;

    const [aiActivated, setAiActivated] = useState(false);

    // useRef guard: prevents React Strict Mode from double-logging on mount
    const compareLogged = React.useRef(false);

    // Log 'compare' activity exactly once when this page mounts
    useEffect(() => {
        if (user && p1 && p2 && !compareLogged.current) {
            compareLogged.current = true;
            logCoachActivity(
                user.uid,
                user.email,
                userData?.teamId || team1,
                'compare',
                {
                    player1: p1.name,
                    player2: p2.name,
                    team1,
                    team2,
                    sport,
                }
            );
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Ref guard for deep_ai logging (prevent duplicate entries on repeated clicks)
    const deepAiLogged = React.useRef(false);

    const handleDeepScan = () => {
        setAiActivated(true);
        p1Intel.performScan(p1, sport);
        p2Intel.performScan(p2, sport);
        // Log Deep AI Engine usage — only once per comparison session
        if (user && p1 && p2 && !deepAiLogged.current) {
            deepAiLogged.current = true;
            logCoachActivity(
                user.uid,
                user.email,
                userData?.teamId || team1,
                'deep_ai',
                {
                    player1: p1.name,
                    player2: p2.name,
                    team1,
                    team2,
                    sport,
                    context: 'comparison',
                }
            );
        }
    };

    // ML Scan only triggered by user
    useEffect(() => {
        if (aiActivated && p1 && p2) {
            p1Intel.performScan(p1, sport);
            p2Intel.performScan(p2, sport);
        }
    }, [p1?.id, p2?.id, sport, aiActivated]);

    if (!p1 || !p2) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Players Not Found</h2>
                    <button onClick={() => navigate(-1)} className="btn btn-p">Go Back</button>
                </div>
            </div>
        );
    }

    const isFootball = sport === 'football';

    // Comparison Score Calculation Logic
    const calculateOverallScore = (player, aiData) => {
        const impact = calculateImpactScore(player);
        const consistency = calculateConsistencyIndex(player);
        const rating = player.rating || 75;
        const aiImpact = aiData?.matchImpactProbability || 50;
        const aiConfidence = aiData?.confidence || 50;

        if (isFootball) {
            return Math.round((rating * 0.4) + (aiImpact * 0.3) + (impact * 0.2) + (aiConfidence * 0.1));
        }
        return Math.round((impact * 0.4) + (consistency * 0.3) + (rating * 0.3));
    };

    // Comparison Mode Logic (Cricket) — using actual role values from data
    const isBatter = (r) => r === 'Batter';
    const isBowler = (r) => r === 'Bowler';
    const isAllRounder = (r) => r === 'All-Rounder';

    const r1 = p1.role;
    const r2 = p2.role;

    // Show batting stats if either player bats (Batter or All-Rounder)
    const showBatting = !isFootball && (
        (isBatter(r1) || isAllRounder(r1)) &&
        (isBatter(r2) || isAllRounder(r2) || isBowler(r2))
    ) || !isFootball && (
        (isBatter(r2) || isAllRounder(r2)) &&
        (isBatter(r1) || isAllRounder(r1) || isBowler(r1))
    );

    // Show bowling stats if either player bowls (Bowler or All-Rounder)
    const showBowling = !isFootball && (
        (isBowler(r1) || isAllRounder(r1)) &&
        (isBowler(r2) || isAllRounder(r2) || isBatter(r2))
    ) || !isFootball && (
        (isBowler(r2) || isAllRounder(r2)) &&
        (isBowler(r1) || isAllRounder(r1) || isBatter(r1))
    );

    // Precise section flags per spec
    // Batting section: Batter vs Batter | Batter vs All-Rounder | All-Rounder vs Batter | All-Rounder vs All-Rounder
    const showBattingSection = !isFootball && (
        (isBatter(r1) || isAllRounder(r1)) && (isBatter(r2) || isAllRounder(r2))
    );
    // Bowling section: Bowler vs Bowler | Bowler vs All-Rounder | All-Rounder vs Bowler | All-Rounder vs All-Rounder
    const showBowlingSection = !isFootball && (
        (isBowler(r1) || isAllRounder(r1)) && (isBowler(r2) || isAllRounder(r2))
    );

    const p1Score = calculateOverallScore(p1, p1Intel.data);
    const p2Score = calculateOverallScore(p2, p2Intel.data);

    const comparisonRadarData = isFootball ? [
        { subject: 'Impact', A: calculateImpactScore(p1), B: calculateImpactScore(p2), fullMark: 100 },
        { subject: 'Consistency', A: calculateConsistencyIndex(p1), B: calculateConsistencyIndex(p2), fullMark: 100 },
        { subject: 'Rating', A: p1.rating || 0, B: p2.rating || 0, fullMark: 100 },
        { subject: 'Passing', A: p1.passingAccuracy || p1.passing || 70, B: p2.passingAccuracy || p2.passing || 70, fullMark: 100 },
        { subject: 'Pace', A: p1.paceMetric || p1.speed || 70, B: p2.paceMetric || p2.speed || 70, fullMark: 100 },
    ] : [
        { subject: 'Impact', A: calculateImpactScore(p1), B: calculateImpactScore(p2), fullMark: 100 },
        { subject: 'Consistency', A: calculateConsistencyIndex(p1), B: calculateConsistencyIndex(p2), fullMark: 100 },
        ...(showBattingSection ? [{ subject: 'BatAvg', A: p1.battingAvg || 0, B: p2.battingAvg || 0, fullMark: 60 }] : []),
        ...(showBattingSection ? [{ subject: 'SR', A: Math.min(100, (p1.strikeRate || 0) / 2), B: Math.min(100, (p2.strikeRate || 0) / 2), fullMark: 100 }] : []),
        ...(showBowlingSection ? [{ subject: 'BowlAvg', A: Math.max(0, 100 - (p1.bowlingAvg || 100)), B: Math.max(0, 100 - (p2.bowlingAvg || 100)), fullMark: 100 }] : []),
        ...(showBowlingSection ? [{ subject: 'Economy', A: Math.max(0, (12 - (p1.economy || 10)) * 10), B: Math.max(0, (12 - (p2.economy || 10)) * 10), fullMark: 120 }] : []),
        { subject: 'Overall', A: p1.rating || 75, B: p2.rating || 75, fullMark: 100 },
    ];

    const StatRow = ({ label, v1, v2, highlight = false }) => (
        <div className={`flex justify-between items-center py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-4 transition-colors ${highlight ? 'bg-indigo-500/5 border-l-4 border-indigo-500' : ''}`}>
            <span className={`text-2xl font-black w-24 ${highlight ? 'text-white' : 'text-indigo-400'}`}>{v1}</span>
            <span className="text-[11px] text-slate-500 uppercase tracking-widest font-black text-center flex-1">{label}</span>
            <span className={`text-2xl font-black w-24 text-right ${highlight ? 'text-white' : 'text-blue-400'}`}>{v2}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#060010] text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest font-bold font-mono">
                        ← Back to Profile
                    </button>
                    <div className="text-center">
                        <h1 className="text-4xl font-black uppercase tracking-[0.4em] mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">Comparative Intel</h1>
                        <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.3em]">Neural Analytics v4.2 Synchronized</p>
                    </div>
                    <button
                        onClick={() => logout()}
                        className="text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-lg transition-all uppercase tracking-widest"
                    >
                        ⏻ Logout
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Visual Comparison Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-12 glass p-8 border-t-2 border-indigo-500/50"
                    >
                        <div className="flex flex-col md:flex-row justify-around items-center gap-8 mb-12 relative">
                            <div className="text-center group">
                                <div className="w-48 h-48 rounded-3xl border-4 border-indigo-500/30 overflow-hidden mb-6 glass p-2 group-hover:border-indigo-500 transition-all duration-500 scale-105 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                                    <img src={getPlayerImage(p1.name, p1.id)} alt={p1.name} className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-2">{p1.name}</h2>
                                <p className="text-sm text-indigo-400 font-bold uppercase tracking-widest">{team1} • {isFootball ? p1.position : p1.role}</p>
                            </div>

                            <div className="text-6xl font-black text-white/5 italic">VS</div>

                            <div className="text-center group">
                                <div className="w-48 h-48 rounded-3xl border-4 border-blue-500/30 overflow-hidden mb-6 glass p-2 group-hover:border-blue-500 transition-all duration-500 scale-105 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                                    <img src={getPlayerImage(p2.name, p2.id)} alt={p2.name} className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-2">{p2.name}</h2>
                                <p className="text-sm text-blue-400 font-bold uppercase tracking-widest">{team2} • {isFootball ? p2.position : p2.role}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="glass bg-black/40 border-white/5 p-8 rounded-3xl">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center">
                                    <span className="w-8 h-px bg-slate-800 mr-4"></span>
                                    Field Telemetry side-by-side
                                    <span className="w-8 h-px bg-slate-800 ml-4"></span>
                                </h3>
                                <div className="space-y-1">
                                    <StatRow label="Overall Comparison Score" v1={p1Score} v2={p2Score} highlight={true} />
                                    {isFootball ? (
                                        <>
                                            <StatRow label="Global Power Rating" v1={p1.rating || 85} v2={p2.rating || 85} />
                                            <StatRow label="Total Match Appearances" v1={p1.matches} v2={p2.matches} />
                                            <StatRow label="Career Goals" v1={p1.goals} v2={p2.goals} />
                                            <StatRow label="Playmaking Assists" v1={p1.assists || 0} v2={p2.assists || 0} />
                                            <StatRow label="Passing Precision" v1={`${p1.passingAccuracy || p1.passing || 70}%`} v2={`${p2.passingAccuracy || p2.passing || 70}%`} />
                                            <StatRow label="Locomotive Velocity" v1={p1.paceMetric || p1.speed || 70} v2={p2.paceMetric || p2.speed || 70} />
                                            <StatRow label="Tactical Workload" v1={p1.workloadKM || '9.5'} v2={p2.workloadKM || '9.5'} />
                                        </>
                                    ) : (
                                        <>
                                            <StatRow label="Global Capability Rating" v1={p1.rating ?? '—'} v2={p2.rating ?? '—'} />
                                            <StatRow label="Impact Index" v1={calculateImpactScore(p1)} v2={calculateImpactScore(p2)} />
                                            <StatRow label="Innings Played" v1={p1.inningsPlayed ?? '—'} v2={p2.inningsPlayed ?? '—'} />

                                            {/* ── BATTING SECTION ── */}
                                            {showBattingSection && (
                                                <>
                                                    <div className="py-3 px-4 mt-2">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.25em] bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">🏏 Batting Stats</span>
                                                    </div>
                                                    <StatRow label="Batting Average" v1={p1.battingAvg ?? '—'} v2={p2.battingAvg ?? '—'} />
                                                    <StatRow label="Strike Rate" v1={p1.strikeRate ?? '—'} v2={p2.strikeRate ?? '—'} />
                                                    <StatRow label="Runs Scored" v1={p1.runsScored ?? '—'} v2={p2.runsScored ?? '—'} />
                                                    <StatRow label="Highest Score" v1={p1.highestScore ?? '—'} v2={p2.highestScore ?? '—'} />
                                                    <StatRow label="Fifties" v1={p1.fifties ?? '—'} v2={p2.fifties ?? '—'} />
                                                    <StatRow label="Centuries" v1={p1.centuries ?? '—'} v2={p2.centuries ?? '—'} />
                                                </>
                                            )}

                                            {/* ── BOWLING SECTION ── */}
                                            {showBowlingSection && (
                                                <>
                                                    <div className="py-3 px-4 mt-2">
                                                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.25em] bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">⚡ Bowling Stats</span>
                                                    </div>
                                                    <StatRow label="Wickets Taken" v1={p1.wicketsTaken ?? '—'} v2={p2.wicketsTaken ?? '—'} />
                                                    <StatRow label="Bowling Average" v1={p1.bowlingAvg ?? '—'} v2={p2.bowlingAvg ?? '—'} />
                                                    <StatRow label="Economy Rate" v1={p1.economy ?? '—'} v2={p2.economy ?? '—'} />
                                                    <StatRow label="5-Wicket Hauls" v1={p1.fiveWickets ?? '—'} v2={p2.fiveWickets ?? '—'} />
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="glass bg-white/[0.03] p-8 rounded-3xl h-[400px]">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Comparison Chart</h3>
                                    <Radar
                                        data={{
                                            labels: comparisonRadarData.map(d => d.subject),
                                            datasets: [
                                                {
                                                    label: p1.name,
                                                    data: comparisonRadarData.map(d => d.A),
                                                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                                                    borderColor: '#6366f1',
                                                    borderWidth: 2,
                                                    pointBackgroundColor: '#6366f1',
                                                },
                                                {
                                                    label: p2.name,
                                                    data: comparisonRadarData.map(d => d.B),
                                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                                    borderColor: '#3b82f6',
                                                    borderWidth: 2,
                                                    pointBackgroundColor: '#3b82f6',
                                                }
                                            ]
                                        }}
                                        options={{
                                            scales: {
                                                r: {
                                                    grid: { color: 'rgba(255,255,255,0.05)' },
                                                    angleLines: { color: 'rgba(255,255,255,0.05)' },
                                                    suggestedMin: 0,
                                                    suggestedMax: 100,
                                                    ticks: { display: false },
                                                    pointLabels: { color: '#64748b', font: { size: 10, weight: 'bold' } }
                                                }
                                            },
                                            plugins: {
                                                legend: {
                                                    labels: { color: '#fff', font: { family: "'Bebas Neue', sans-serif", size: 12 } }
                                                }
                                            },
                                            maintainAspectRatio: false
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* AI Activation Section */}
                        {!aiActivated ? (
                            <div className="mt-16 glass bg-indigo-500/5 p-12 rounded-3xl border border-indigo-500/20 text-center relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30"></div>
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                                        <div className="w-10 h-10 bg-indigo-500 rounded-full animate-pulse blur-md opacity-50 absolute"></div>
                                        <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-4">Deep AI Engine</h3>
                                    <p className="text-slate-400 text-sm max-w-xl mx-auto italic mb-10 leading-relaxed">
                                        Analyze biomechanical telemetry and secondary performance vectors.
                                        Activate neural processing for predictive match impact and tactical forecasting.
                                    </p>
                                    <button
                                        onClick={handleDeepScan}
                                        className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] rounded-full transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] transform hover:-translate-y-1"
                                    >
                                        Initialize Neural Analysis
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                                {/* ML Prediction Section */}
                                <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    <div className="lg:col-span-8 glass p-8 rounded-3xl bg-indigo-500/[0.02]">
                                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-8">AI Predictor Matrix (Intelligence Insights)</h3>
                                        <div className="h-[300px]">
                                            <Bar
                                                data={{
                                                    labels: ['Match Impact Prob.', 'Injury Risk (Inv)', 'AI Confidence'],
                                                    datasets: [
                                                        {
                                                            label: p1.name,
                                                            data: [
                                                                p1Intel.data?.matchImpactProbability || 0,
                                                                100 - (p1Intel.data?.mlInjuryPrediction || 0),
                                                                p1Intel.data?.confidence || 0
                                                            ],
                                                            backgroundColor: '#6366f1',
                                                            borderRadius: 8,
                                                        },
                                                        {
                                                            label: p2.name,
                                                            data: [
                                                                p2Intel.data?.matchImpactProbability || 0,
                                                                100 - (p2Intel.data?.mlInjuryPrediction || 0),
                                                                p2Intel.data?.confidence || 0
                                                            ],
                                                            backgroundColor: '#3b82f6',
                                                            borderRadius: 8,
                                                        }
                                                    ]
                                                }}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    scales: {
                                                        y: {
                                                            beginAtZero: true,
                                                            max: 100,
                                                            grid: { color: 'rgba(255,255,255,0.05)' },
                                                            ticks: { color: '#64748b' }
                                                        },
                                                        x: {
                                                            grid: { display: false },
                                                            ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }
                                                        }
                                                    },
                                                    plugins: {
                                                        legend: { display: false }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-4 flex flex-col gap-4">
                                        <div className="glass p-6 border-l-4 border-emerald-500 bg-emerald-500/5">
                                            <h4 className="text-[10px] text-emerald-400 uppercase font-black mb-1">P1 Tactical Level</h4>
                                            <p className="text-xl font-bold text-white">{p1Intel.data?.tacticalLevel || 'Calculating...'}</p>
                                        </div>
                                        <div className="glass p-6 border-l-4 border-blue-500 bg-blue-500/5">
                                            <h4 className="text-[10px] text-blue-400 uppercase font-black mb-1">P2 Tactical Level</h4>
                                            <p className="text-xl font-bold text-white">{p2Intel.data?.tacticalLevel || 'Calculating...'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Final Recommendation */}
                                <div className="mt-12 glass p-10 border-t-4 border-white/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                        <span className="text-8xl font-black italic">RECOMMENDATION</span>
                                    </div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.4em] mb-6 flex items-center">
                                        <div className="w-12 h-px bg-white/20 mr-4"></div>
                                        Strategic Selection Verdict
                                        <div className="w-12 h-px bg-white/20 ml-4"></div>
                                    </h3>

                                    <div className="flex flex-col md:flex-row items-center gap-8">
                                        <div className="text-center group">
                                            <div className={`w-32 h-32 rounded-full border-4 ${p1Score >= p2Score ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]' : 'border-white/10'} overflow-hidden mb-4 glass p-1 transition-all`}>
                                                <img src={getPlayerImage(p1Score >= p2Score ? p1.name : p2.name, p1Score >= p2Score ? p1.id : p2.id)} alt="Best choice" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Recommended Operator</div>
                                            <div className="text-2xl font-black text-white uppercase">{p1Score >= p2Score ? p1.name : p2.name}</div>
                                        </div>

                                        <div className="flex-1">
                                            <div className="text-xl text-slate-300 leading-relaxed font-medium italic mb-4">
                                                {p1Score > p2Score
                                                    ? `Deep Intelligence synthesis identifies ${p1.name} as the superior tactical choice. With an overall Comparison Score of ${p1Score} vs ${p2Score}, ${p1.name} demonstrates a ${Math.abs(p1Score - p2Score)}% technical superiority in the current simulation.`
                                                    : `Digital biometric analysis confirms ${p2.name} as the mathematically optimal selection. Surpassing ${p1.name} with a Comparison Score of ${p2Score}, the data highlights superior output stability and a higher peak potential.`
                                                }
                                            </div>

                                            {/* Detailed Competitive Advantages */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                {(p1Score >= p2Score ? [
                                                    { label: 'Statistical Edge', value: isFootball ? (p1.rating > p2.rating ? `${p1.name} (+${p1.rating - p2.rating} Rating)` : `${p1.name} (Higher Efficiency)`) : (p1.battingAvg > p2.battingAvg ? `${p1.name} (+${(p1.battingAvg - p2.battingAvg).toFixed(1)} Avg)` : `${p1.name} (Higher Impact)`) },
                                                    { label: 'ML Impact Forecast', value: isFootball ? (p1Intel.data?.matchImpactProbability > p2Intel.data?.matchImpactProbability ? 'Higher Match Influence' : 'Greater Tactical Depth') : (calculateImpactScore(p1) > calculateImpactScore(p2) ? 'Peak Clutch Factor' : 'Sustained Match Load') },
                                                    { label: 'Risk Assessment', value: isFootball ? (p1Intel.data?.mlInjuryPrediction < p2Intel.data?.mlInjuryPrediction ? 'Lower Injury Risk' : 'Greater Resilience') : 'Optimal Physical Profile' },
                                                    { label: 'Consistency Index', value: calculateConsistencyIndex(p1) > calculateConsistencyIndex(p2) ? 'Superior Reliability' : 'High Performance Floor' }
                                                ] : [
                                                    { label: 'Statistical Edge', value: isFootball ? (p2.rating > p1.rating ? `${p2.name} (+${p2.rating - p1.rating} Rating)` : `${p2.name} (Higher Efficiency)`) : (p2.battingAvg > p1.battingAvg ? `${p2.name} (+${(p2.battingAvg - p1.battingAvg).toFixed(1)} Avg)` : `${p2.name} (Higher Impact)`) },
                                                    { label: 'ML Impact Forecast', value: isFootball ? (p2Intel.data?.matchImpactProbability > p1Intel.data?.matchImpactProbability ? 'Higher Match Influence' : 'Greater Tactical Depth') : (calculateImpactScore(p2) > calculateImpactScore(p1) ? 'Peak Clutch Factor' : 'Sustained Match Load') },
                                                    { label: 'Risk Assessment', value: isFootball ? (p2Intel.data?.mlInjuryPrediction < p1Intel.data?.mlInjuryPrediction ? 'Lower Injury Risk' : 'Greater Resilience') : 'Optimal Physical Profile' },
                                                    { label: 'Consistency Index', value: calculateConsistencyIndex(p2) > calculateConsistencyIndex(p1) ? 'Superior Reliability' : 'High Performance Floor' }
                                                ]).map((adv, idx) => (
                                                    <div key={idx} className="flex items-center space-x-2 text-[10px] text-slate-400 uppercase tracking-widest bg-white/[0.03] p-3 rounded-lg border border-white/5">
                                                        <span className="text-indigo-500 font-bold">●</span>
                                                        <span className="font-bold text-slate-500">{adv.label}:</span>
                                                        <span className="text-white">{adv.value}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-8 p-4 bg-indigo-500/10 border-l-4 border-indigo-500 rounded-r-lg">
                                                <h4 className="text-[10px] text-indigo-400 uppercase font-black mb-2 tracking-[0.2em]">Final Strategy Recommendation</h4>
                                                <p className="text-sm text-slate-300">
                                                    Deploy <span className="text-white font-bold">{p1Score >= p2Score ? p1.name : p2.name}</span> as the primary operator. The {isFootball ? 'ML neural cluster' : 'statistical analysis hub'} identifies a significant advantage in {isFootball ? 'tactical positioning and match influence' : 'all-round technical proficiency and consistency'}.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                <footer className="mt-12 text-center text-slate-600 text-[10px] uppercase tracking-[0.4em] pb-12">
                    Advanced Comparison Engine | Neural Cluster Alpha-7 | {new Date().getFullYear()}
                </footer>
            </div>
        </div>
    );
};

export default PlayerComparison;
