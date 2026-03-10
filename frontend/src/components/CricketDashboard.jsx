import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart, Bar, Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { getStatusBg, getStatusColor, calculateImpactScore, calculateClutchScore, calculateConsistencyIndex } from '../utils/analytics';
import Player3DHighlight from './Player3DHighlight';
import { Card, CardContent } from './ui/card';
import ChromaGrid from './ui/ChromaGrid';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from './ui/Chart';
import { getPlayerImage, getApiPlayerImage } from '../utils/playerImages';

const StatItem = ({ label, value, hint }) => (
    <div className="flex flex-col items-start p-2 rounded hover:bg-white/5 transition-colors">
        <span className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">{label}</span>
        <div className="flex items-baseline space-x-1">
            <span className="text-sm font-bold text-white">{value}</span>
            {hint && <span className="text-[8px] text-slate-600 font-medium">{hint}</span>}
        </div>
    </div>
);

const CricketDashboard = ({ players, sport, teamName, selectedPlayer, setSelectedPlayer, prediction, onCompare }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [roleFilter, setRoleFilter] = React.useState('All');

    const filteredPlayers = React.useMemo(() => {
        return players.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'All' || p.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [players, searchTerm, roleFilter]);

    const chromaItems = filteredPlayers.map(player => ({
        id: player.id,
        image: getPlayerImage(player.name, player.id),
        title: player.name,
        subtitle: player.role,
        handle: `#${player.id.toString().slice(-2)}`,
        borderColor: player.id === selectedPlayer?.id ? '#3b82f6' : 'rgba(255,255,255,0.1)',
        gradient: player.id === selectedPlayer?.id
            ? 'linear-gradient(145deg, rgba(59,130,246,0.2), #000)'
            : 'linear-gradient(145deg, rgba(255,255,255,0.05), #000)',
        player: player
    }));

    const radarData = selectedPlayer ? [
        { subject: 'Batting', A: selectedPlayer.battingAvg || 0, fullMark: 100 },
        { subject: 'Bowling', A: (100 - (selectedPlayer.bowlingAvg || 100)) || 0, fullMark: 100 },
        { subject: 'Fitness', A: 100 - selectedPlayer.fatigueScore, fullMark: 100 },
        { subject: 'Impact', A: calculateImpactScore(selectedPlayer), fullMark: 100 },
        { subject: 'Pressure', A: calculateClutchScore(selectedPlayer), fullMark: 100 },
    ] : [];


    const recentFormChartData = selectedPlayer?.last5Performances?.map((val, i) => ({
        match: `M${i + 1}`,
        score: val
    })) || [];

    const recentFormConfig = {
        score: { label: "Score", color: "var(--chart-1)" }
    };

    const getFlagUrl = (name) => {
        if (name === 'West Indies') return '/west indies.png';
        const FLAG_CODES = {
            Afghanistan: 'af', Australia: 'au', Bangladesh: 'bd', England: 'gb-eng',
            India: 'in', 'New Zealand': 'nz', Pakistan: 'pk',
            'South Africa': 'za', 'Sri Lanka': 'lk',
        };
        const code = FLAG_CODES[name];
        return code ? `https://flagcdn.com/w320/${code}.png` : null;
    };
    const flagUrl = getFlagUrl(teamName);

    return (
        <div className="flex flex-col space-y-6">

            {/* ── Team Banner ── */}
            <div className="flex items-center gap-5 px-6 py-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Flag */}
                <div className="flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border border-white/10 shadow-lg bg-slate-800/50 flex items-center justify-center">
                    {flagUrl ? (
                        <img
                            src={flagUrl}
                            alt={teamName}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                    ) : null}
                    <span style={{ display: 'none' }} className="text-3xl flex items-center justify-center w-full h-full">🏏</span>
                </div>
                {/* Name */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-0.5">Cricket · National Team</p>
                    <h2 className="text-3xl font-black text-white leading-none">{teamName}</h2>
                </div>
                {/* Emoji accent */}
                <span className="ml-auto text-4xl opacity-20 select-none">🏏</span>
            </div>

            {/* Player Selection Grid */}
            <div className="w-full relative py-8">
                <div className="flex flex-col items-center mb-12">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">
                            Elite Roster Selection
                        </h3>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-800/50 px-4 py-1 rounded-full border border-white/5">
                        Interactive Tactical Grid: {players.length} Operators Online
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 px-4 w-full max-w-4xl mx-auto">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Find Player..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                    </div>

                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mr-2">Filter</span>
                        <select
                            className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer font-bold appearance-none min-w-[140px]"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="All">All Operators</option>
                            <option value="Batter">Batters</option>
                            <option value="Bowler">Bowlers</option>
                            <option value="All-Rounder">All-Rounders</option>
                            <option value="Wicketkeeper">Wicketkeepers</option>
                        </select>
                    </div>
                </div>

                {filteredPlayers.length > 0 ? (
                    <ChromaGrid
                        items={chromaItems}
                        columns={4}
                        radius={350}
                        onItemClick={(item) => navigate(`/analysis/${sport}/${teamName}/${item.player.id}`)}
                        onAction={(item) => onCompare(item.player)}
                    />
                ) : (
                    <div className="text-center py-20">
                        <p className="text-slate-500 text-sm font-medium italic">Target not found in this sector...</p>
                        <button
                            onClick={() => { setSearchTerm(''); setRoleFilter('All'); }}
                            className="mt-4 text-[10px] text-blue-400 font-bold uppercase tracking-widest border-b border-blue-500/20"
                        >
                            Clear Scanners
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Stats Area */}
                <main className="lg:col-span-3 space-y-6">
                    {selectedPlayer ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass p-6 min-h-[16rem] flex flex-col md:flex-row items-center gap-6 overflow-hidden relative">
                                    <div className="flex-1 w-full h-48 md:h-full relative">
                                        <div className="absolute top-0 left-0 z-10">
                                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Biometric Profile</h4>
                                            <p className="text-2xl font-bold text-white">{selectedPlayer.name}</p>
                                            <button
                                                onClick={() => navigate(`/analysis/${sport}/${teamName}/${selectedPlayer.id}`)}
                                                className="mt-2 px-3 py-1 bg-blue-500/20 border border-blue-500/40 rounded-md text-[10px] font-bold text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase tracking-tighter"
                                            >
                                                Deep AI Analysis →
                                            </button>
                                        </div>
                                        <div className="h-full w-full">
                                            <Player3DHighlight color={selectedPlayer.role === 'Bowler' ? '#ef4444' : '#0ea5e9'} />
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 w-full md:w-48 flex items-center justify-center py-2">
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                            <img
                                                src={getPlayerImage(selectedPlayer.name)}
                                                alt={selectedPlayer.name}
                                                className="relative w-full md:w-40 aspect-square object-cover rounded-2xl shadow-2xl border border-white/10"
                                                loading="lazy"
                                                onError={(e) => { e.target.src = '/images/avatar.jpg'; }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="glass p-6">
                                    <h4 className="text-xs font-bold mb-4 text-blue-400 uppercase tracking-widest">Capability Matrix</h4>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid stroke="#334155" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                                <Radar name="Player" dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="glass p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">Batting Avg</p>
                                    <p className="text-xl font-bold text-white">{selectedPlayer.battingAvg || 'N/A'}</p>
                                </div>
                                <div className="glass p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">Strike Rate</p>
                                    <p className="text-xl font-bold text-white">{selectedPlayer.strikeRate || 'N/A'}</p>
                                </div>
                                <div className="glass p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">Consistency</p>
                                    <p className="text-xl font-bold text-emerald-400">{calculateConsistencyIndex(selectedPlayer).toFixed(0)}%</p>
                                </div>
                                <div className="glass p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">Impact Score</p>
                                    <p className="text-xl font-bold text-indigo-400">{calculateImpactScore(selectedPlayer)}</p>
                                </div>
                            </div>

                            {/* Granular Stats Sections */}
                            <div className="space-y-6">
                                <div className="glass p-6">
                                    <h4 className="text-xs font-bold mb-4 text-blue-400 uppercase tracking-widest flex items-center">
                                        <span className="mr-2">🏏</span> Batting Analysis
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-2">
                                        <StatItem label="Matches" value={selectedPlayer.matchesPlayed} />
                                        <StatItem label="Innings" value={selectedPlayer.inningsPlayed} />
                                        <StatItem label="Runs" value={selectedPlayer.runsScored} />
                                        <StatItem label="High Score" value={selectedPlayer.highestScore} />
                                        <StatItem label="Not Outs" value={selectedPlayer.notOuts || 0} />
                                        <StatItem label="Centuries" value={selectedPlayer.centuries || 0} />
                                        <StatItem label="Fifties" value={selectedPlayer.fifties || 0} />
                                        <StatItem label="Fours" value={selectedPlayer.fours || 0} />
                                        <StatItem label="Sixes" value={selectedPlayer.sixes || 0} />
                                        <StatItem label="Boundary %" value={`${selectedPlayer.boundaryPercentage || 0}%`} />
                                        <StatItem label="Dot Ball %" value={`${selectedPlayer.dotBallPercentage || 0}%`} />
                                        <StatItem label="Powerplay" value={selectedPlayer.powerplayRuns || 0} hint="Runs" />
                                        <StatItem label="Death Overs" value={selectedPlayer.deathOverRuns || 0} hint="Runs" />
                                        <StatItem label="Vs Spin" value={`${selectedPlayer.pitchPerformance?.spinning || 0}%`} />
                                        <StatItem label="Vs Pace" value={`${selectedPlayer.pitchPerformance?.seaming || 0}%`} />
                                    </div>
                                </div>

                                {(selectedPlayer.role === 'Bowler' || selectedPlayer.role === 'All-Rounder') && (
                                    <div className="glass p-6">
                                        <h4 className="text-xs font-bold mb-4 text-red-400 uppercase tracking-widest flex items-center">
                                            <span className="mr-2">🎯</span> Bowling Analysis
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-2">
                                            <StatItem label="Overs" value={selectedPlayer.workloadOvers || 0} />
                                            <StatItem label="Wickets" value={selectedPlayer.wicketsTaken || 0} />
                                            <StatItem label="Economy" value={selectedPlayer.economy || 'N/A'} />
                                            <StatItem label="Avg" value={selectedPlayer.bowlingAvg || 'N/A'} />
                                            <StatItem label="Best Figs" value={selectedPlayer.bestBowling || 'N/A'} />
                                            <StatItem label="5W Hauls" value={selectedPlayer.fiveWickets || 0} />
                                            <StatItem label="Dot Ball %" value={`${selectedPlayer.bowlingDotPercentage || 0}%`} />
                                            <StatItem label="Phase: PP" value={selectedPlayer.ppEconomy || 'N/A'} hint="Econ" />
                                            <StatItem label="Phase: Death" value={selectedPlayer.deathEconomy || 'N/A'} hint="Econ" />
                                        </div>
                                    </div>
                                )}

                                <div className="glass p-6">
                                    <h4 className="text-xs font-bold mb-4 text-emerald-400 uppercase tracking-widest flex items-center">
                                        <span className="mr-2">🧬</span> Fitness & Biometrics
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatItem label="BMI" value={selectedPlayer.bmi || '22.4'} />
                                        <StatItem label="Body Fat" value={`${selectedPlayer.bodyFat || '11.5'}%`} />
                                        <StatItem label="VO2 Max" value={`${selectedPlayer.vo2Max || '68'} ml/kg`} />
                                        <StatItem label="Muscle Mass" value={`${selectedPlayer.muscleMass || '72'}%`} />
                                    </div>
                                </div>

                                <div className="glass p-6">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Recent Form (Last 5 Innings)</h4>
                                        <div className="flex items-center bg-slate-900/80 px-4 py-2 rounded-lg border border-white/5">
                                            <span className="text-indigo-400 font-bold mr-2 text-sm">[</span>
                                            {selectedPlayer.last5Performances?.map((p, i) => (
                                                <React.Fragment key={i}>
                                                    <span className={`text-sm font-black transition-all ${p > 50 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                        {p}
                                                    </span>
                                                    {i < selectedPlayer.last5Performances.length - 1 && <span className="text-slate-600 mr-2">, </span>}
                                                </React.Fragment>
                                            ))}
                                            <span className="text-indigo-400 font-bold ml-2 text-sm">]</span>
                                        </div>
                                    </div>
                                    <div className="min-h-[250px] w-full relative">
                                        <ChartContainer config={recentFormConfig} className="h-full">
                                            <BarChart data={recentFormChartData}>
                                                <CartesianGrid vertical={false} stroke="#1e293b" />
                                                <XAxis
                                                    dataKey="match"
                                                    tickLine={false}
                                                    tickMargin={10}
                                                    axisLine={false}
                                                    tick={{ fill: '#94a3b8' }}
                                                />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                                <Bar
                                                    dataKey="score"
                                                    radius={4}
                                                    fill="var(--color-score)"
                                                >
                                                    {recentFormChartData.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={entry.score > 50 ? 'var(--chart-2)' : 'var(--chart-1)'}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ChartContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </main>

                {/* Prediction & Risk */}
                <aside className="lg:col-span-1 space-y-6">
                    {selectedPlayer && prediction ? (
                        <>
                            <div className={`glass p-6 border-t-4 ${getStatusBg(selectedPlayer.injuryRisk)}`}>
                                <h4 className="text-xs font-bold mb-4 uppercase tracking-widest text-slate-400">Risk Assessment</h4>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] mb-1 font-bold">
                                            <span className="text-slate-500 uppercase">Injury Risk</span>
                                            <span className={getStatusColor(selectedPlayer.injuryRisk)}>{selectedPlayer.injuryRisk}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-1000 ${selectedPlayer.injuryRisk > 60 ? 'bg-red-500' : selectedPlayer.injuryRisk > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                style={{ width: `${selectedPlayer.injuryRisk}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] mb-1 font-bold">
                                            <span className="text-slate-500 uppercase">Metabolic Fatigue</span>
                                            <span className={getStatusColor(selectedPlayer.fatigueScore)}>{selectedPlayer.fatigueScore}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-1000 ${selectedPlayer.fatigueScore > 70 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{ width: `${selectedPlayer.fatigueScore}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass p-6 border-t-4 border-indigo-500 text-center">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">AI Match Forecast</h4>
                                <div className="text-4xl font-bold text-white mb-2">{prediction.probability}%</div>
                                <p className="text-[10px] text-slate-500 uppercase">Success Probability</p>
                                <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-slate-300 italic">
                                    "{prediction.explanation}"
                                </div>
                            </div>
                        </>
                    ) : null}
                </aside>
            </div>
        </div>
    );
};

export default CricketDashboard;
