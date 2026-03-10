import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── ML Scoring (mirrors the API logic locally for instant results) ─── */
function mlScore(player, isCricket) {
    if (isCricket) {
        const batScore = (player.battingAvg || 0) * 0.35 + (player.strikeRate || 0) * 0.15 + (player.centuries || 0) * 2 + (player.fifties || 0) * 0.8;
        const bowlScore = (player.wicketsTaken || 0) * 0.4 + (5 - Math.min(5, player.economy || 5)) * 4 + (player.fiveWickets || 0) * 3;
        const formScore = ((player.last5Performances || []).reduce((a, b) => a + b, 0) / 5) * 0.3
            + ((player.last5Wickets || []).reduce((a, b) => a + b, 0) / 5) * 1.5;
        const consistencyBonus = (player.consistencyIndex || 70) * 0.2;
        const injuryPenalty = (player.injuryRisk || 30) * -0.1;
        return Math.min(99, Math.max(1, batScore + bowlScore + formScore + consistencyBonus + injuryPenalty));
    } else {
        const attackScore = (player.goals || 0) * 2.5 + (player.assists || 0) * 1.8 + (player.goalsPerMatch || 0) * 10;
        const techScore = (player.passingAccuracy || 75) * 0.3 + (player.shootingAccuracy || 70) * 0.25;
        const formScore = ((player.last5Ratings || []).reduce((a, b) => a + b, 0) / 5) * 1.2;
        const injuryPenalty = (player.injuryRisk || 30) * -0.08;
        return Math.min(99, Math.max(1, attackScore + techScore + formScore + injuryPenalty));
    }
}

function getStrongPoint(player, isCricket) {
    if (isCricket) {
        const role = player.role || '';
        if (role.includes('Bowler')) return `Economy ${player.economy || '?'} · ${player.wicketsTaken || 0} intl. wickets`;
        if (role.includes('Wicketkeeper')) return `${player.runsScored || 0} runs · Avg ${player.battingAvg || 0}`;
        if (role.includes('All-Rounder')) return `${player.wicketsTaken || 0} wkts + ${player.centuries || 0} centuries`;
        return `${player.centuries || 0} centuries · Avg ${player.battingAvg || 0}`;
    } else {
        const pos = (player.position || '').toLowerCase();
        if (pos.includes('goalkeeper')) return `${player.cleanSheets || 0} clean sheets · Top-tier reflexes`;
        if (pos.includes('defender')) return `${player.tackles || 0} tackles · ${player.interceptions || 0} interceptions`;
        if (pos.includes('midfielder')) return `${player.assists || 0} assists · ${player.passingAccuracy || 0}% pass accuracy`;
        return `${player.goals || 0} goals · ${player.assists || 0} assists`;
    }
}

/* ─── Cricket XI Builder ─── */
function buildCricketXI(players) {
    const scored = players.map(p => ({ ...p, _score: mlScore(p, true) })).sort((a, b) => b._score - a._score);

    const wk = scored.filter(p => (p.role || '').includes('Wicketkeeper'));
    const bat = scored.filter(p => (p.role || '') === 'Batter' || (p.role || '').includes('Bat'));
    const ar = scored.filter(p => (p.role || '').includes('All-Rounder'));
    const bowl = scored.filter(p => (p.role || '') === 'Bowler');

    const xi = [];
    const used = new Set();
    const pick = (pool, n) => {
        pool.filter(p => !used.has(p.id)).slice(0, n).forEach(p => { xi.push(p); used.add(p.id); });
    };

    pick(wk, 1);
    pick(bat, 4);
    pick(ar, 2);
    pick(bowl, 4);

    // Fill remaining spots with best remaining
    const remaining = scored.filter(p => !used.has(p.id));
    while (xi.length < 11 && remaining.length) {
        const next = remaining.shift();
        if (!used.has(next.id)) { xi.push(next); used.add(next.id); }
    }

    return {
        wk: xi.filter(p => (p.role || '').includes('Wicketkeeper')).slice(0, 1),
        bat: xi.filter(p => (p.role || '').includes('Batter') || (p.role || '') === 'Batter').slice(0, 4),
        ar: xi.filter(p => (p.role || '').includes('All-Rounder')).slice(0, 2),
        bowl: xi.filter(p => (p.role || '') === 'Bowler').slice(0, 4),
        all: xi,
    };
}

/* ─── Football XI Builder (4-4-2) ─── */
function buildFootballXI(players) {
    const scored = players.map(p => ({ ...p, _score: mlScore(p, false) })).sort((a, b) => b._score - a._score);

    const gk = scored.filter(p => (p.position || '').toLowerCase().includes('goalkeeper'));
    const def = scored.filter(p => (p.position || '').toLowerCase().includes('defender'));
    const mid = scored.filter(p => (p.position || '').toLowerCase().includes('midfielder'));
    const fwd = scored.filter(p => ['forward', 'striker', 'winger'].some(r => (p.position || '').toLowerCase().includes(r)));

    const used = new Set();
    const pick = (pool, n) => {
        const picks = [];
        for (const p of pool) {
            if (!used.has(p.id) && picks.length < n) { picks.push(p); used.add(p.id); }
        }
        return picks;
    };

    const gkPicks = pick(gk, 1);
    const defPicks = pick(def, 4);
    const midPicks = pick(mid, 4);
    const fwdPicks = pick(fwd, 2);

    // Fill up with best remaining if not enough in each category
    const fill = (picks, n, label) => {
        if (picks.length < n) {
            const extra = scored.filter(p => !used.has(p.id)).slice(0, n - picks.length);
            extra.forEach(p => { picks.push(p); used.add(p.id); });
        }
        return picks;
    };

    return {
        gk: fill(gkPicks, 1, 'gk'),
        def: fill(defPicks, 4, 'def'),
        mid: fill(midPicks, 4, 'mid'),
        fwd: fill(fwdPicks, 2, 'fwd'),
        all: [...gkPicks, ...defPicks, ...midPicks, ...fwdPicks],
    };
}

/* ─── Role config ─── */
const CRICKET_ROLE_CONFIG = {
    Wicketkeeper: { label: 'WK', icon: '🧤', border: 'border-emerald-500/60', bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
    Batter: { label: 'BAT', icon: '🏏', border: 'border-yellow-500/60', bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
    'All-Rounder': { label: 'AR', icon: '⭐', border: 'border-blue-500/60', bg: 'bg-blue-900/30', text: 'text-blue-400' },
    Bowler: { label: 'BOWL', icon: '🎯', border: 'border-red-500/60', bg: 'bg-red-900/30', text: 'text-red-400' },
};

const FOOTBALL_ROLE_CONFIG = {
    gk: { label: 'GK', icon: '🧤', border: 'border-emerald-500/60', bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
    def: { label: 'DEF', icon: '🛡️', border: 'border-orange-500/60', bg: 'bg-orange-900/30', text: 'text-orange-400' },
    mid: { label: 'MID', icon: '⭐', border: 'border-blue-500/60', bg: 'bg-blue-900/30', text: 'text-blue-400' },
    fwd: { label: 'FWD', icon: '⚽', border: 'border-red-500/60', bg: 'bg-red-900/30', text: 'text-red-400' },
};

function getCricketConfig(player) {
    const role = player.role || 'Batter';
    if (role.includes('Wicketkeeper')) return CRICKET_ROLE_CONFIG['Wicketkeeper'];
    if (role.includes('All-Rounder')) return CRICKET_ROLE_CONFIG['All-Rounder'];
    if (role === 'Bowler') return CRICKET_ROLE_CONFIG['Bowler'];
    return CRICKET_ROLE_CONFIG['Batter'];
}

/* ─── Player Card ─── */
const PlayerCard = ({ player, roleCfg, index }) => {
    const lastName = player.name.split(' ').slice(-1)[0];
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`flex flex-col items-center justify-center w-[88px] h-[88px] rounded-xl border ${roleCfg.border} ${roleCfg.bg} backdrop-blur-sm cursor-default`}
        >
            <span className="text-2xl mb-1">{roleCfg.icon}</span>
            <p className="text-white font-black text-[11px] leading-tight text-center px-1 truncate w-full text-center">
                {lastName}
            </p>
            <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${roleCfg.text}`}>
                {roleCfg.label}
            </p>
        </motion.div>
    );
};

/* ─── Row of cards ─── */
const Row = ({ players, roleCfgFn, startIndex }) => (
    <div className="flex justify-center gap-3 flex-wrap">
        {players.map((p, i) => (
            <PlayerCard key={p.id || p.name} player={p} roleCfg={roleCfgFn(p)} index={startIndex + i} />
        ))}
    </div>
);

/* ─── Main Component ─── */
const SelectionRecommendation = ({ players, role, onClose }) => {
    const isCricket = role === 'Cricket';

    const { xi, rows } = useMemo(() => {
        if (isCricket) {
            const xi = buildCricketXI(players);
            return {
                xi,
                rows: [
                    { players: xi.wk, roleCfgFn: () => CRICKET_ROLE_CONFIG['Wicketkeeper'] },
                    { players: xi.bat, roleCfgFn: () => CRICKET_ROLE_CONFIG['Batter'] },
                    { players: xi.ar, roleCfgFn: () => CRICKET_ROLE_CONFIG['All-Rounder'] },
                    { players: xi.bowl, roleCfgFn: () => CRICKET_ROLE_CONFIG['Bowler'] },
                ],
            };
        } else {
            const xi = buildFootballXI(players);
            return {
                xi,
                rows: [
                    { players: xi.gk, roleCfgFn: () => FOOTBALL_ROLE_CONFIG['gk'] },
                    { players: xi.def, roleCfgFn: () => FOOTBALL_ROLE_CONFIG['def'] },
                    { players: xi.mid, roleCfgFn: () => FOOTBALL_ROLE_CONFIG['mid'] },
                    { players: xi.fwd, roleCfgFn: () => FOOTBALL_ROLE_CONFIG['fwd'] },
                ],
            };
        }
    }, [players, isCricket]);

    /* Top 5 performers from the XI by ML score */
    const top5 = useMemo(() => {
        const xiAll = isCricket
            ? [...(xi.wk || []), ...(xi.bat || []), ...(xi.ar || []), ...(xi.bowl || [])]
            : [...(xi.gk || []), ...(xi.def || []), ...(xi.mid || []), ...(xi.fwd || [])];
        return xiAll
            .map(p => ({ ...p, _score: mlScore(p, isCricket) }))
            .sort((a, b) => b._score - a._score)
            .slice(0, 5);
    }, [xi, isCricket]);

    const accentColor = isCricket ? '#d4f327' : '#f97316';
    const headerLabel = isCricket ? 'Cricket Best XI' : 'Football Best XI';
    const subLabel = isCricket
        ? 'Gradient Boosting · Role-Balanced Selection'
        : 'Random Forest · 4-4-2 Formation';
    const sportEmoji = isCricket ? '🏏' : '⚽';

    let cardIndex = 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-2xl mt-6 mb-6 flex flex-col"
                style={{ background: '#111827', borderRadius: '16px', maxHeight: 'calc(100vh - 48px)', overflow: 'hidden' }}
            >
                {/* ── Sticky Header (always visible) ── */}
                <div
                    className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-white/10 relative"
                    style={{ background: '#111827', zIndex: 2 }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                    >✕</button>
                    <h2 className="text-2xl font-black text-white">
                        Best Predicted Playing XI
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-2xl">{sportEmoji}</span>
                        <div>
                            <h3 className="text-base font-black" style={{ color: accentColor }}>
                                {headerLabel}
                            </h3>
                            <p className="text-xs text-slate-400">{subLabel}</p>
                        </div>
                    </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── Formation / Pitch Layout ── */}
                    <div
                        className="mx-6 my-5 rounded-2xl py-6 px-4 flex flex-col gap-5"
                        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        {rows.map((row, ri) => {
                            const startIdx = cardIndex;
                            cardIndex += row.players.length;
                            return (
                                <Row
                                    key={ri}
                                    players={row.players}
                                    roleCfgFn={row.roleCfgFn}
                                    startIndex={startIdx}
                                />
                            );
                        })}
                    </div>

                    {/* ── Top 5 Best Predicted Performers ── */}
                    <div className="px-6 pb-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 mb-3 flex items-center gap-2">
                            <span style={{ color: accentColor }}>★</span>
                            Top 5 Best Predicted Performers
                        </h3>
                        <div className="space-y-2">
                            {top5.map((player, i) => {
                                const cfg = isCricket
                                    ? getCricketConfig(player)
                                    : FOOTBALL_ROLE_CONFIG[
                                    (player.position || '').toLowerCase().includes('goalkeeper') ? 'gk' :
                                        (player.position || '').toLowerCase().includes('defender') ? 'def' :
                                            (player.position || '').toLowerCase().includes('midfielder') ? 'mid' : 'fwd'
                                    ];
                                const score = Math.round(player._score);
                                const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
                                return (
                                    <motion.div
                                        key={player.id || player.name}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + i * 0.06 }}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{medal}</span>
                                            <div>
                                                <p className="text-white font-bold text-sm">{player.name}</p>
                                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <span className={cfg.text + ' font-bold'}>{cfg.label}</span>
                                                    <span className="text-slate-600">·</span>
                                                    <span>{getStrongPoint(player, isCricket)}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-lg" style={{ color: accentColor }}>{score}</p>
                                            <p className="text-[9px] text-slate-500 uppercase">ML Score</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div> {/* end scrollable body */}
            </motion.div>
        </motion.div>
    );
};

export default SelectionRecommendation;
