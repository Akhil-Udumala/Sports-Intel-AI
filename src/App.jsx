import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import SelectDiscipline from './components/SelectDiscipline';
import TeamSelection from './components/TeamSelection';
import CricketDashboard from './components/CricketDashboard';
import FootballDashboard from './components/FootballDashboard';
import PlayerComparison from './components/PlayerComparison';
import SelectionRecommendation from './components/SelectionRecommendation';
import PlayerAnalysis from './components/PlayerAnalysis';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import { cricketTeams } from './data/cricketData';
import { internationalFootballTeams as footballTeams } from './data/internationalFootballData';
import { generatePrediction } from './utils/prediction';
import { logCoachActivity } from './utils/coachActivityLogger';
import {
    SidebarProvider,
    Sidebar,
    SidebarInset,
    SidebarTrigger,
    SidebarGroup,
    SidebarItem,
    SidebarSeparator,
} from './components/ui/Sidebar';

/* ─── Notification Bell ─────────────────────────────────────── */
const NotificationBell = () => {
    const { notifications } = useAuth();
    const [open, setOpen] = useState(false);
    const unread = (notifications || []).filter(n => !n.read);

    if (!notifications?.length) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
            >
                <span className="text-lg">🔔</span>
                {unread.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                        {unread.length}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 top-12 w-80 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-white/5 text-xs font-black text-slate-400 uppercase tracking-widest">
                        Notifications
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                        {notifications.map(n => (
                            <div key={n.id} className={`p-4 ${!n.read ? 'bg-indigo-500/5' : ''}`}>
                                <p className="text-sm font-bold text-white">{n.title || n.type}</p>
                                <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── DashboardWrapper ──────────────────────────────────────────── */
const DashboardWrapper = () => {
    const { sport, teamName } = useParams();
    const { userData, logout, user } = useAuth();
    const navigate = useNavigate();
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [showRecommendation, setShowRecommendation] = useState(false);

    // Coaches locked to a different team should not access this dashboard
    // Admin in inspect mode bypasses this lock
    const isAdmin = userData?.role === 'admin';
    const isLockedElsewhere = !isAdmin && userData?.teamId && userData.teamId !== teamName;
    useEffect(() => {
        if (isLockedElsewhere) {
            navigate(`/dashboard/${userData.discipline}/${userData.teamId}`, { replace: true });
        }
    }, [isLockedElsewhere]);

    useEffect(() => {
        if (selectedPlayer) {
            const result = generatePrediction(selectedPlayer, 'Next Opponent', 'Home Venue');
            setPrediction(result);
            if (user && userData) {
                logCoachActivity(user.uid, user.email, userData.teamId || teamName, 'predict', {
                    playerName: selectedPlayer.name, sport, teamName,
                });
            }
        } else {
            setPrediction(null);
        }
    }, [selectedPlayer]);

    const isCricket = sport === 'cricket';
    const teams = isCricket ? cricketTeams : footballTeams;
    const players = teams[teamName] || [];

    if (!teamName || !players.length) {
        return <Navigate to={`/select-team/${sport}`} />;
    }

    const handleShowRecommendation = () => {
        setShowRecommendation(true);
        if (user && userData) {
            logCoachActivity(user.uid, user.email, userData.teamId || teamName, 'selection', { sport, teamName });
        }
    };

    return (
        <SidebarProvider defaultOpen={true}>
            <Sidebar
                projectName="Sports Intel AI"
                projectSub={`${teamName} | ${isCricket ? 'Cricket' : 'Football'}`}
                userDisplayName={userData?.displayName || 'Coach'}
                userEmail={user?.email}
                userAvatar={userData?.avatar}
                onEditProfile={() => navigate('/profile-setup')}
                onLogout={logout}
            >
                <SidebarGroup label="Navigation">
                    <SidebarItem
                        icon="🏕️"
                        label="Team Dashboard"
                        to={`/dashboard/${sport}/${teamName}`}
                        active={true}
                    />
                </SidebarGroup>
                <SidebarSeparator />
                <SidebarGroup label="Analysis">
                    <SidebarItem
                        icon="✨"
                        label="Selection Reco."
                        onClick={handleShowRecommendation}
                    />
                </SidebarGroup>
                {userData?.role === 'admin' && (
                    <>
                        <SidebarSeparator />
                        <SidebarGroup label="Admin">
                            <SidebarItem
                                icon="⚙️"
                                label="Admin Panel"
                                to="/admin"
                            />
                        </SidebarGroup>
                    </>
                )}
            </Sidebar>

            <SidebarInset>
                <div className="min-h-screen bg-[#0f172a] text-white">
                    <header className="glass sticky top-4 z-50 mx-4 px-6 py-4 flex justify-between items-center shadow-2xl border border-white/5">
                        <div className="flex items-center space-x-4">
                            <SidebarTrigger />
                            <div>
                                <h1 className="text-2xl font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 leading-tight">
                                    Sports Intel AI
                                </h1>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                                    {teamName} | {isCricket ? 'Cricket' : 'Football'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <NotificationBell />
                            <button
                                onClick={handleShowRecommendation}
                                className="hidden md:block px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-xs font-bold text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
                            >
                                Selection Recommendation
                            </button>
                            {userData?.role === 'admin' && (
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-400 hover:bg-purple-500 hover:text-white transition-all"
                                >
                                    Admin Panel
                                </button>
                            )}
                            <button
                                onClick={logout}
                                className="bg-slate-800/50 hover:bg-red-500/20 p-2 px-4 rounded-lg transition-all border border-slate-700 text-xs font-bold"
                            >
                                Logout
                            </button>
                        </div>
                    </header>

                    <main className="p-4 md:p-8 max-w-screen-2xl mx-auto space-y-8">
                        {isCricket ? (
                            <CricketDashboard
                                players={players}
                                sport={sport}
                                teamName={teamName}
                                selectedPlayer={selectedPlayer}
                                setSelectedPlayer={setSelectedPlayer}
                                prediction={prediction}
                                onCompare={() => {
                                    if (user && userData) {
                                        logCoachActivity(user.uid, user.email, userData.teamId || teamName, 'compare', { sport, teamName });
                                    }
                                }}
                            />
                        ) : (
                            <FootballDashboard
                                players={players}
                                sport={sport}
                                teamName={teamName}
                                selectedPlayer={selectedPlayer}
                                setSelectedPlayer={setSelectedPlayer}
                                prediction={prediction}
                                onCompare={() => {
                                    if (user && userData) {
                                        logCoachActivity(user.uid, user.email, userData.teamId || teamName, 'compare', { sport, teamName });
                                    }
                                }}
                            />
                        )}
                    </main>

                    {showRecommendation && (
                        <SelectionRecommendation
                            players={players}
                            role={isCricket ? 'Cricket' : 'Football'}
                            onClose={() => setShowRecommendation(false)}
                        />
                    )}

                    <footer className="p-8 text-center text-slate-600 text-[10px] uppercase tracking-[0.2em]">
                        AI-Powered Sports Intelligence Pro | Decision Support Neural Engine v4.0
                    </footer>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
};

/* ─── Admin Inspect Banner ──────────────────────────────────── */
const AdminInspectBanner = () => {
    const navigate = useNavigate();
    const isInspecting = sessionStorage.getItem('adminInspecting') === 'true';
    if (!isInspecting) return null;
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-purple-950/95 border border-purple-500/50 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl shadow-purple-900/50">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-[11px] font-black text-purple-300 uppercase tracking-[0.2em]">⚙ Admin Inspect Mode</span>
            <button
                onClick={() => {
                    sessionStorage.removeItem('adminInspecting');
                    navigate('/admin');
                }}
                className="ml-2 text-[10px] font-black text-white bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all"
            >
                ← Admin Panel
            </button>
        </div>
    );
};

/* ─── ProtectedRoute ────────────────────────────────────────── */
const ProtectedRoute = ({ children, requireRole = false, requireAdmin = false }) => {
    const { user, userData, loading } = useAuth();
    const isAdminInspecting = sessionStorage.getItem('adminInspecting') === 'true';

    if (loading) return null;
    if (!user) return <Navigate to="/auth" />;

    // Admin trying to reach an admin-only route — allow
    if (requireAdmin && userData?.role !== 'admin') {
        return <Navigate to={userData?.teamId ? `/dashboard/${userData?.discipline}/${userData?.teamId}` : '/select-discipline'} />;
    }

    // Admin trying to reach a coach route — only block if NOT in inspect mode
    if (!requireAdmin && userData?.role === 'admin' && !isAdminInspecting) {
        return <Navigate to="/admin" />;
    }

    // Require a role to exist (coach) for protected coach routes
    // Admin in inspect mode bypasses this
    if (requireRole && (!userData || !userData.role) && userData?.role !== 'admin') {
        return <Navigate to="/select-discipline" />;
    }

    return children;
};

/* ─── AppRoutes ─────────────────────────────────────────────── */
const AppRoutes = () => {
    const { user, userData, loading, updateUserData } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // Check if profile setup is complete
    const needsProfileSetup = user && userData && !userData.profileSetupComplete;

    // Coaches already locked to a team → go straight to their dashboard
    const isLockedCoach = user && userData?.role === 'coach' && userData?.teamId && userData?.discipline;
    const lockedDashboard = isLockedCoach
        ? `/dashboard/${userData.discipline}/${userData.teamId}`
        : null;

    return (
        <Routes>
            <Route path="/auth" element={!user ? <Auth /> : (
                needsProfileSetup
                    ? <Navigate to="/profile-setup" />
                    : userData?.role === 'admin'
                        ? <Navigate to="/admin" />
                        : isLockedCoach
                            ? <Navigate to={lockedDashboard} />
                            : <Navigate to="/select-discipline" />
            )} />

            {/* Profile Setup — appears after auth but before everything else */}
            <Route path="/profile-setup" element={
                !user ? <Navigate to="/auth" /> :
                    !needsProfileSetup ? (
                        userData?.role === 'admin'
                            ? <Navigate to="/admin" />
                            : isLockedCoach
                                ? <Navigate to={lockedDashboard} />
                                : <Navigate to="/select-discipline" />
                    ) : (
                        <ProfileSetup onComplete={() => {
                            if (userData?.role === 'admin') {
                                navigate('/admin');
                            } else if (isLockedCoach) {
                                navigate(lockedDashboard);
                            } else {
                                navigate('/select-discipline');
                            }
                        }} />
                    )
            } />

            {/* Discipline selection — redirect admins to /admin (unless inspecting), locked coaches to dashboard */}
            <Route path="/select-discipline" element={
                <ProtectedRoute>
                    {needsProfileSetup
                        ? <Navigate to="/profile-setup" />
                        : isLockedCoach
                            ? <Navigate to={lockedDashboard} />
                            : <>
                                <AdminInspectBanner />
                                <SelectDiscipline onChoose={(role) => {
                                    // Admin inspect: don't overwrite admin role in Firestore
                                    if (userData?.role !== 'admin') {
                                        updateUserData({ role: 'coach' });
                                    }
                                    navigate(`/select-team/${role}`);
                                }} />
                            </>
                    }
                </ProtectedRoute>
            } />

            {/* Team selection — skip if coach is already locked */}
            <Route path="/select-team/:sport" element={
                <ProtectedRoute requireRole>
                    {isLockedCoach
                        ? <Navigate to={lockedDashboard} />
                        : <><AdminInspectBanner /><TeamSelectionWrapper adminMode={userData?.role === 'admin'} /></>
                    }
                </ProtectedRoute>
            } />

            <Route path="/dashboard/:sport/:teamName" element={
                <ProtectedRoute requireRole>
                    <><AdminInspectBanner /><DashboardWrapper /></>
                </ProtectedRoute>
            } />

            <Route path="/analysis/:sport/:teamName/:playerId" element={
                <ProtectedRoute requireRole>
                    <><AdminInspectBanner /><PlayerAnalysis /></>
                </ProtectedRoute>
            } />

            <Route path="/compare/:sport/:team1/:player1Id/:team2/:player2Id" element={
                <ProtectedRoute requireRole>
                    <><AdminInspectBanner /><PlayerComparison /></>
                </ProtectedRoute>
            } />

            {/* Admin route */}
            <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                    {needsProfileSetup ? <Navigate to="/profile-setup" /> : <AdminDashboard />}
                </ProtectedRoute>
            } />

            <Route path="/" element={
                !user ? <LandingPage />
                    : needsProfileSetup ? <Navigate to="/profile-setup" />
                        : userData?.role === 'admin' ? <Navigate to="/admin" />
                            : isLockedCoach ? <Navigate to={lockedDashboard} />
                                : <Navigate to="/select-discipline" />
            } />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

/* ─── TeamSelectionWrapper ────────────────────────────────────
 * This is where the per-team coach-slot check fires.
 * ─────────────────────────────────────────────────────────── */
const TeamSelectionWrapper = ({ adminMode = false }) => {
    const { sport } = useParams();
    const navigate = useNavigate();
    const { requestCoachRole } = useAuth();
    const [blockMsg, setBlockMsg] = useState('');
    const [checking, setChecking] = useState(false);

    const sportTeamsList = sport === 'cricket'
        ? Object.keys(cricketTeams)
        : Object.keys(footballTeams);

    const handleTeamSelected = async (team) => {
        setBlockMsg('');
        // Admin in inspect mode: skip slot check, go straight to dashboard
        if (adminMode) {
            navigate(`/dashboard/${sport}/${team}`);
            return;
        }
        setChecking(true);
        const result = await requestCoachRole(team, sport);
        if (result.allowed) {
            navigate(`/dashboard/${sport}/${team}`);
        } else {
            setBlockMsg(result.reason);
        }
        setChecking(false);
    };

    return (
        <div>
            {/* Block message banner */}
            {blockMsg && (
                <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
                    <div className="max-w-lg w-full bg-[#0f172a] border border-yellow-500/40 rounded-2xl p-5 shadow-2xl flex items-start gap-4">
                        <span className="text-2xl mt-0.5">⚠️</span>
                        <div>
                            <p className="font-bold text-yellow-300 text-sm mb-1">Team Slot Full</p>
                            <p className="text-yellow-400/80 text-[13px] leading-relaxed">{blockMsg}</p>
                        </div>
                        <button
                            onClick={() => setBlockMsg('')}
                            className="ml-auto text-slate-500 hover:text-white text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Checking spinner overlay */}
            {checking && (
                <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 text-center">
                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm text-slate-400 uppercase tracking-widest font-bold">Checking coach slots…</p>
                    </div>
                </div>
            )}

            <TeamSelection
                sport={sport}
                sportTeams={sportTeamsList}
                onTeamSelected={handleTeamSelected}
            />
        </div>
    );
};

/* ─── App ───────────────────────────────────────────────────── */
function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
