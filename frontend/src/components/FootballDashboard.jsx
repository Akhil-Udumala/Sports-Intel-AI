import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    Radar, RadarChart, PolarGrid, PolarAngleAxis
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
import { useDeepIntel } from '../hooks/useDeepIntel';

const StatItem = ({ label, value, hint }) => (
    <div className="flex flex-col items-start p-2 rounded hover:bg-white/5 transition-colors">
        <span className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">{label}</span>
        <div className="flex items-baseline space-x-1">
            <span className="text-sm font-bold text-white">{value}</span>
            {hint && <span className="text-[8px] text-slate-600 font-medium">{hint}</span>}
        </div>
    </div>
);

const FootballDashboard = ({ players, sport, teamName, selectedPlayer, setSelectedPlayer, prediction, onCompare }) => {
    const navigate = useNavigate();
    const { performScan, loading: aiLoading, error: aiError, data: aiData } = useDeepIntel();

    const [searchTerm, setSearchTerm] = React.useState('');
    const [positionFilter, setPositionFilter] = React.useState('All');

    const filteredPlayers = React.useMemo(() => {
        return players.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPosition = positionFilter === 'All' || p.position === positionFilter;
            return matchesSearch && matchesPosition;
        });
    }, [players, searchTerm, positionFilter]);

    const chromaItems = filteredPlayers.map(player => ({
        id: player.id,
        image: getPlayerImage(player.name, player.id),
        title: player.name,
        subtitle: player.position,
        handle: `#${player.id.toString().slice(-2)}`,
        borderColor: player.id === selectedPlayer?.id ? '#6366f1' : 'rgba(255,255,255,0.1)',
        gradient: player.id === selectedPlayer?.id
            ? 'linear-gradient(145deg, rgba(99,102,241,0.2), #000)'
            : 'linear-gradient(145deg, rgba(255,255,255,0.05), #000)',
        player: player
    }));

    const radarData = selectedPlayer ? [
        { subject: 'Offense', A: (selectedPlayer.goals + selectedPlayer.assists) * 2, fullMark: 100 },
        { subject: 'Passing', A: selectedPlayer.passingAccuracy || 0, fullMark: 100 },
        { subject: 'Pace', A: selectedPlayer.paceMetric || 0, fullMark: 100 },
        { subject: 'Impact', A: calculateImpactScore(selectedPlayer), fullMark: 100 },
        { subject: 'Physical', A: 100 - selectedPlayer.fatigueScore, fullMark: 100 },
    ] : [];

    const workloadData = selectedPlayer ? [
        { name: 'Squad Avg', val: 10.5 },
        { name: 'Player Dist', val: parseFloat(selectedPlayer.workloadKM) / 4 },
    ] : [];

    const performanceChartData = selectedPlayer ? [
        { category: "Player", goals: selectedPlayer.goals, assists: selectedPlayer.assists, keyPasses: parseFloat(selectedPlayer.keyPasses) || 0 },
        { category: "Squad Avg", goals: 12, assists: 6, keyPasses: 1.5 }
    ] : [];

    const chartConfig = {
        goals: { label: "Goals", color: "var(--chart-1)" },
        assists: { label: "Assists", color: "var(--chart-2)" },
        keyPasses: { label: "Key Passes", color: "var(--chart-3)" }
    };

    const getFlagUrl = (name) => {
        const FLAG_CODES = {
            Argentina: 'ar', Brazil: 'br', France: 'fr', Germany: 'de',
            Portugal: 'pt', Spain: 'es', England: 'gb-eng',
            Italy: 'it', Netherlands: 'nl', Croatia: 'hr',
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
                    <span style={{ display: 'none' }} className="text-3xl flex items-center justify-center w-full h-full">⚽</span>
                </div>
                {/* Name */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-0.5">Football · National Team</p>
                    <h2 className="text-3xl font-black text-white leading-none">{teamName}</h2>
                </div>
                {/* Emoji accent */}
                <span className="ml-auto text-4xl opacity-20 select-none">⚽</span>
            </div>

            {/* Player Selection Grid */}
            <div className="w-full relative py-8">
                <div className="flex flex-col items-center mb-12">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">
                            Squad Selection Matrix
                        </h3>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-800/50 px-4 py-1 rounded-full border border-white/5">
                        Tactical Execution: {players.length} Operators In-Field
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 px-4 w-full max-w-4xl mx-auto">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Find Operator..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-12 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                    </div>

                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mr-2">Role</span>
                        <select
                            className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer font-bold appearance-none min-w-[140px]"
                            value={positionFilter}
                            onChange={(e) => setPositionFilter(e.target.value)}
                        >
                            <option value="All">All Positions</option>
                            <option value="Forward">Forwards</option>
                            <option value="Midfielder">Midfielders</option>
                            <option value="Defender">Defenders</option>
                            <option value="Goalkeeper">Goalkeepers</option>
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
                        <p className="text-slate-500 text-sm font-medium italic">Signal lost: no matches found...</p>
                        <button
                            onClick={() => { setSearchTerm(''); setPositionFilter('All'); }}
                            className="mt-4 text-[10px] text-indigo-400 font-bold uppercase tracking-widest border-b border-indigo-500/20"
                        >
                            Reset Scanners
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
                                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Tactical Telemetry</h4>
                                            <p className="text-2xl font-bold text-white">{selectedPlayer.name}</p>
                                            <button
                                                onClick={() => navigate(`/analysis/${sport}/${teamName}/${selectedPlayer.id}`)}
                                                className="mt-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-md text-[10px] font-bold text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all uppercase tracking-tighter"
                                            >
                                                Neural Analysis →
                                            </button>
                                        </div>
                                        <div className="h-full w-full">
                                            <Player3DHighlight color="#6366f1" />
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 w-full md:w-48 flex items-center justify-center py-2">
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
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
                                    <h4 className="text-xs font-bold mb-4 text-indigo-400 uppercase tracking-widest">Performance Matrix</h4>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid stroke="#334155" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                                <Radar name="Player" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="glass p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Pass Acc</p>
                                    <p className="text-xl font-bold text-white">{selectedPlayer.passingAccuracy}%</p>
                                </div>
                                <div className="glass p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Pace</p>
                                    <p className="text-xl font-bold text-white">{selectedPlayer.paceMetric}</p>
                                </div>
                                <div className="glass p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Consistency</p>
                                    <p className="text-xl font-bold text-emerald-400">{calculateConsistencyIndex(selectedPlayer).toFixed(0)}%</p>
                                </div>
                                <div className="glass p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Impact Score</p>
                                    <p className="text-xl font-bold text-indigo-400">{calculateImpactScore(selectedPlayer)}</p>
                                </div>
                            </div>

                            {/* Granular Stats Sections */}
                            <div className="space-y-6">
                                <div className="glass p-6">
                                    <h4 className="text-xs font-bold mb-4 text-indigo-400 uppercase tracking-widest flex items-center">
                                        <span className="mr-2">⚽</span> Technical Performance
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-2">
                                        <StatItem label="Matches" value={selectedPlayer.matches || 24} />
                                        <StatItem label="Minutes" value={selectedPlayer.minutesPlayed || 0} />
                                        <StatItem label="Goals" value={selectedPlayer.goals || 0} />
                                        <StatItem label="Assists" value={selectedPlayer.assists || 0} />
                                        <StatItem label="Key Passes" value={selectedPlayer.keyPasses || 1.8} hint="/90" />
                                        <StatItem label="Pass Acc" value={`${selectedPlayer.passingAccuracy || 0}%`} />
                                        <StatItem label="Cross Acc" value={`${selectedPlayer.crossingAccuracy || 72}%`} />
                                        <StatItem label="Shots On" value={selectedPlayer.shotsOnTarget || 12} hint="Total" />
                                        <StatItem label="Shot Acc" value={`${selectedPlayer.shootingAccuracy || 65}%`} />
                                        <StatItem label="Yellow" value={selectedPlayer.yellowCards || 2} />
                                    </div>
                                </div>

                                <div className="glass p-6">
                                    <h4 className="text-xs font-bold mb-4 text-amber-400 uppercase tracking-widest flex items-center">
                                        <span className="mr-2">⚡</span> Physical & Locomotive
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2">
                                        <StatItem label="Workload" value={`${selectedPlayer.workloadKM || 0} KM`} />
                                        <StatItem label="Top Speed" value={`${selectedPlayer.topSpeed || 32.4} KM/H`} />
                                        <StatItem label="Sprints" value={selectedPlayer.sprintCount || 45} hint="per match" />
                                        <StatItem label="Recovery" value={`${selectedPlayer.recoveryTime || 48}H`} />
                                    </div>
                                </div>

                                <div className="glass p-6">
                                    <h4 className="text-xs font-bold mb-4 text-emerald-400 uppercase tracking-widest flex items-center">
                                        <span className="mr-2">🧬</span> Clinical Biometrics
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatItem label="BMI" value={selectedPlayer.bmi || '21.8'} />
                                        <StatItem label="Body Fat" value={`${selectedPlayer.bodyFat || '9.5'}%`} />
                                        <StatItem label="VO2 Max" value={`${selectedPlayer.vo2Max || '72'} ml/kg`} />
                                        <StatItem label="Muscle Mass" value={`${selectedPlayer.muscleMass || '78'}%`} />
                                    </div>
                                </div>

                                <div className="glass p-6">
                                    <h4 className="text-xs font-bold mb-4 text-indigo-400 uppercase tracking-widest">Interactive Performance Analytics</h4>
                                    <div className="min-h-[350px] w-full relative">
                                        <ChartContainer config={chartConfig} className="h-full">
                                            <BarChart data={performanceChartData}>
                                                <CartesianGrid vertical={false} stroke="#1e293b" />
                                                <XAxis
                                                    dataKey="category"
                                                    tickLine={false}
                                                    tickMargin={10}
                                                    axisLine={false}
                                                    tick={{ fill: '#94a3b8' }}
                                                />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                                <ChartLegend content={<ChartLegendContent />} />
                                                <Bar dataKey="goals" fill="var(--color-goals)" radius={4} />
                                                <Bar dataKey="assists" fill="var(--color-assists)" radius={4} />
                                                <Bar dataKey="keyPasses" fill="var(--color-keyPasses)" radius={4} />
                                            </BarChart>
                                        </ChartContainer>
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-4">Real-time Comparative Metrics | Goal Contributions & Creativity</p>
                                </div>

                                <div className="glass p-6">
                                    <h4 className="text-xs font-bold mb-4 text-indigo-400 uppercase tracking-widest">Match Load (KM covered per game)</h4>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={workloadData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis dataKey="name" stroke="#94a3b8" />
                                                <YAxis stroke="#94a3b8" />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                                />
                                                <Bar dataKey="val" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                                    {workloadData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 1 ? '#6366f1' : '#334155'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="glass p-6">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Recent Form (Last 5 Matches)</h4>
                                        <div className="flex items-center bg-slate-900/80 px-4 py-2 rounded-lg border border-white/5">
                                            <span className="text-indigo-400 font-bold mr-2 text-sm">[</span>
                                            {selectedPlayer.last5Matches?.map((m, i) => (
                                                <React.Fragment key={i}>
                                                    <span className={`text-sm font-black transition-all ${m > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                        {m}
                                                    </span>
                                                    {i < selectedPlayer.last5Matches.length - 1 && <span className="text-slate-600 mr-2">, </span>}
                                                </React.Fragment>
                                            ))}
                                            <span className="text-indigo-400 font-bold ml-2 text-sm">]</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Match Performance: Goals / Contributions per Game</p>
                                </div>
                            </div>
                        </>
                    ) : null}
                </main>

                {/* AI Decision Hub */}
                <aside className="lg:col-span-1 space-y-6">
                    {selectedPlayer && prediction ? (
                        <>
                            <div className={`glass p-6 border-t-4 ${getStatusBg(selectedPlayer.injuryRisk)}`}>
                                <h4 className="text-xs font-bold mb-4 uppercase tracking-widest text-slate-400">Physical Integrity</h4>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] mb-1 font-bold">
                                            <span className="text-slate-500 uppercase">Injury Prob</span>
                                            <span className={getStatusColor(selectedPlayer.injuryRisk)}>{selectedPlayer.injuryRisk}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-1000 ${selectedPlayer.injuryRisk > 60 ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${selectedPlayer.injuryRisk}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] mb-1 font-bold">
                                            <span className="text-slate-500 uppercase">Metabolic Load</span>
                                            <span className={getStatusColor(selectedPlayer.fatigueScore)}>{selectedPlayer.fatigueScore}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-1000 ${selectedPlayer.fatigueScore > 70 ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${selectedPlayer.fatigueScore}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass p-6 border-t-4 border-indigo-500 text-center">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tactical Forecast</h4>
                                <div className="text-4xl font-bold text-indigo-400 mb-2">{prediction.probability}%</div>
                                <p className="text-[10px] text-slate-500 uppercase">Success Probability</p>
                                <div className="mt-4 p-3 bg-indigo-500/10 rounded-lg text-xs text-emerald-200 italic">
                                    "{prediction.explanation}"
                                </div>
                            </div>

                            <div className="glass p-6 border-t-4 border-emerald-500 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2">
                                    <span className="flex h-2 w-2">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${aiLoading ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${aiLoading ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                    </span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Deep AI Engine</h4>

                                {aiData ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="text-left">
                                                <p className="text-2xl font-black text-white">{aiData.matchImpactProbability.toFixed(1)}%</p>
                                                <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Match Impact Probability</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-amber-400">{aiData.mlInjuryPrediction.toFixed(1)}%</p>
                                                <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">ML Injury Risk</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/20 text-left">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">{aiData.tacticalLevel}</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <p className="text-[8px] text-slate-500 uppercase">Analysis Confidence</p>
                                                <p className="text-[8px] text-indigo-400 font-bold">{aiData.confidence.toFixed(0)}%</p>
                                            </div>
                                            <div className="w-full bg-slate-800/50 rounded-full h-1 mt-1 overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                                    style={{ width: `${aiData.confidence}%` }}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => performScan(selectedPlayer)}
                                            className="w-full py-1.5 border border-white/5 hover:bg-white/5 text-slate-400 text-[8px] font-bold uppercase rounded transition-all"
                                        >
                                            Refresh Neural Analysis
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-[9px] text-slate-400 italic">Predict next-match performance and data-driven injury probability using the Python Neural Engine.</p>
                                        <button
                                            onClick={() => performScan(selectedPlayer)}
                                            disabled={aiLoading}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <span className="w-2 h-2 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    Synthesizing Telemetry...
                                                </>
                                            ) : (
                                                'Initialize Performance Forecast'
                                            )}
                                        </button>
                                    </div>
                                )}
                                {aiError && <p className="mt-2 text-[8px] text-red-400 font-bold uppercase">{aiError}</p>}
                            </div>
                        </>
                    ) : null}
                </aside>
            </div>
        </div>
    );
};

export default FootballDashboard;
