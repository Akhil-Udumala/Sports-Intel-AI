import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from './ui/card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from './ui/carousel';
import { useAuth } from '../context/AuthContext';

const ICC_TEAMS = [
    "Afghanistan", "Australia", "Bangladesh", "England", "India",
    "New Zealand", "Pakistan", "South Africa", "Sri Lanka", "West Indies"
];

const FLAG_CODES = {
    "Afghanistan": "af",
    "Australia": "au",
    "Bangladesh": "bd",
    "England": "gb-eng",
    "India": "in",
    "New Zealand": "nz",
    "Pakistan": "pk",
    "South Africa": "za",
    "Sri Lanka": "lk",
    "West Indies": "un",
    "Argentina": "ar",
    "Brazil": "br",
    "France": "fr",
    "Germany": "de",
    "Portugal": "pt",
    "Spain": "es",
    "Italy": "it",
    "Croatia": "hr",
    "Netherlands": "nl"
};

const TeamSelection = ({ sport, onTeamSelected, sportTeams }) => {
    const { logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTeams = useMemo(() => {
        let list = sportTeams;
        if (sport === 'cricket') {
            list = sportTeams.filter(team => ICC_TEAMS.includes(team));
        } else if (sport === 'football') {
            const FIFA_TEAMS = ["Argentina", "Brazil", "France", "Germany", "Portugal", "Spain", "England", "Italy", "Netherlands", "India"];
            list = sportTeams.filter(team => FIFA_TEAMS.includes(team));
        }
        return list.filter(team =>
            team.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort();
    }, [sportTeams, searchQuery, sport]);

    const getFlagUrl = (team) => {
        if (team === 'West Indies') return '/west indies.png';
        const code = FLAG_CODES[team];
        return code ? `https://flagcdn.com/w320/${code === 'gb-eng' ? 'gb-eng.png' : code + '.png'}` : null;
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center p-6 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.2),_transparent)] overflow-hidden">
            {/* Logout — fixed top right */}
            <button
                onClick={() => logout()}
                style={{
                    position: 'fixed', top: '16px', right: '20px', zIndex: 100,
                    fontSize: '11px', fontWeight: 700, color: '#f87171',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                }}
            >
                ⏻ Logout
            </button>
            <div className="max-w-6xl w-full mt-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-5xl font-black text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 uppercase tracking-tighter">
                        Elite Division Selection
                    </h2>
                    <p className="text-slate-400 uppercase tracking-[0.4em] text-xs font-bold mb-8">
                        {sport === 'cricket' ? 'ICC International' : 'FIFA International'} Intelligence
                    </p>

                    <div className="max-w-md mx-auto relative group">
                        <input
                            type="text"
                            placeholder="Search organization..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/80 border border-white/10 text-white px-6 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-lg"
                        />
                    </div>
                </motion.div>

                <div className="relative max-w-4xl mx-auto px-16">
                    <Carousel className="w-full">
                        <CarouselContent className="items-center">
                            {filteredTeams.map((team, index) => (
                                <CarouselItem key={team} className="basis-full flex justify-center py-4">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.05 }}
                                        onClick={() => onTeamSelected(team)}
                                        className="cursor-pointer"
                                    >
                                        <Card className="w-56 bg-slate-900/60 border-white/10 backdrop-blur-xl relative overflow-hidden transition-all hover:border-blue-500/40 p-4 flex flex-col items-center">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />

                                            <div className="w-full h-32 flex items-center justify-center relative mb-4">
                                                <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded" />
                                                {getFlagUrl(team) ? (
                                                    <img
                                                        src={getFlagUrl(team)}
                                                        alt={team}
                                                        className="max-w-full max-h-full object-contain relative z-10 drop-shadow-xl rounded"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <span
                                                    className="text-5xl relative z-10 items-center justify-center"
                                                    style={{ display: getFlagUrl(team) ? 'none' : 'flex' }}
                                                >
                                                    {sport === 'cricket' ? '🏏' : '⚽'}
                                                </span>
                                            </div>

                                            <CardContent className="p-0 text-center relative z-10">
                                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                                    {team}
                                                </h3>
                                                <div className="mt-2 h-1 w-8 bg-blue-500 mx-auto rounded-full" />
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-0 w-12 h-12 bg-white/10 border-white/20 text-white hover:bg-blue-500" />
                        <CarouselNext className="right-0 w-12 h-12 bg-white/10 border-white/20 text-white hover:bg-blue-500" />
                    </Carousel>
                </div>

                <div className="mt-16 text-center">
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.5em] opacity-50">
                        {filteredTeams.length} Active Elite Squads Found
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TeamSelection;
