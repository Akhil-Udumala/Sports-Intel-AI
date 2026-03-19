import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    where,
    getDocs,
    deleteDoc,
    setDoc,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SidebarProvider,
    Sidebar,
    SidebarInset,
    SidebarTrigger,
    SidebarGroup,
    SidebarItem,
    SidebarSeparator,
    useSidebar,
} from './ui/Sidebar';

/* ─── helpers ───────────────────────────────────────────────── */
const formatTs = (ts) => {
    if (!ts) return '—';
    let d;
    if (ts.toDate) d = ts.toDate();
    else if (ts.seconds) d = new Date(ts.seconds * 1000);
    else d = new Date(ts);
    
    if (isNaN(d)) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
    }).format(d);
};

const Badge = ({ children, color = 'slate' }) => {
    const colors = {
        green: 'bg-green-500/20 text-green-400 border border-green-500/30',
        yellow: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        red: 'bg-red-500/20 text-red-400 border border-red-500/30',
        indigo: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
        slate: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    };
    return (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${colors[color]}`}>
            {children}
        </span>
    );
};

/* ─── Warning Modal ─────────────────────────────────────────── */
const WarnModal = ({ request, onClose, onSent }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState('');

    const send = async () => {
        if (!message.trim()) { setErr('Message cannot be empty.'); return; }
        setSending(true);
        setErr('');
        try {
            // Write notification to user
            await addDoc(collection(db, 'notifications'), {
                userId: request.userId,
                type: 'admin_warning',
                title: 'Admin Warning',
                message: message.trim(),
                read: false,
                createdAt: serverTimestamp(),
            });
            // Update request status
            await updateDoc(doc(db, 'coach_requests', request.id), {
                status: 'warned',
                warnedAt: serverTimestamp(),
                warningMessage: message.trim(),
            });
            // Mark admin_notification as read if linked
            if (request.adminNotifId) {
                await updateDoc(doc(db, 'admin_notifications', request.adminNotifId), {
                    read: true,
                });
            }
            onSent();
        } catch (e) {
            setErr('Failed to send warning: ' + e.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-1">Send Warning</h3>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-6">
                    to: <span className="text-indigo-400">{request.userEmail}</span> — Team: <span className="text-indigo-400">{request.teamId}</span>
                </p>
                <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none mb-4"
                    rows={4}
                    placeholder="Type your warning message to the coach..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                />
                {err && <p className="text-red-400 text-xs mb-4">{err}</p>}
                <div className="flex gap-3">
                    <button
                        onClick={send}
                        disabled={sending}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
                    >
                        {sending ? 'Sending...' : 'Send Warning'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 font-bold rounded-xl text-sm transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

/* ─── Main Component ────────────────────────────────────────── */
const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, userData, logout } = useAuth();

    const [coaches, setCoaches] = useState([]);
    const [requests, setRequests] = useState([]);
    const [activity, setActivity] = useState([]);
    const [adminNotifs, setAdminNotifs] = useState([]);
    const [usersDict, setUsersDict] = useState({});
    const [activeTab, setActiveTab] = useState('overview');
    const [warnTarget, setWarnTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toastMsg, setToastMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedActivityCoach, setSelectedActivityCoach] = useState(null);
    const [clearingRequests, setClearingRequests] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Gate: only admins can access
    useEffect(() => {
        if (!loading && (!user || userData?.role !== 'admin')) {
            navigate('/admin');
        }
    }, [user, userData, loading, navigate]);

    // Real-time coaches
    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'coaches')),
            snap => { 
                const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort client-side so documents missing the joinedAt field are not excluded by Firestore
                results.sort((a, b) => {
                    const timeA = a.joinedAt?.toMillis ? a.joinedAt.toMillis() : Date.parse(a.joinedAt) || 0;
                    const timeB = b.joinedAt?.toMillis ? b.joinedAt.toMillis() : Date.parse(b.joinedAt) || 0;
                    return timeB - timeA;
                });
                console.log("[DEBUG] Loaded coaches:", results);
                setCoaches(results); 
                setLoading(false); 
            },
            () => setLoading(false)
        );
        return unsub;
    }, []);

    // Real-time users mappings
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'users'), snap => {
            const dict = {};
            snap.forEach(d => { dict[d.id] = d.data(); });
            setUsersDict(dict);
        });
        return unsub;
    }, []);

    // Real-time coach_requests
    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'coach_requests'), orderBy('requestedAt', 'desc')),
            snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return unsub;
    }, []);

    // Real-time coach_activity — exclude admin's own entries
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(
            query(collection(db, 'coach_activity'), orderBy('timestamp', 'desc')),
            snap => {
                // Filter out any entry logged by the admin themselves (inspect-mode leftovers)
                const filtered = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(entry => entry.coachId !== user.uid);
                setActivity(filtered);
            }
        );
        return unsub;
    }, [user]);

    // One-time cleanup: delete any coach_activity docs the admin logged before this fix
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const snap = await getDocs(
                    query(collection(db, 'coach_activity'), where('coachId', '==', user.uid))
                );
                await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
            } catch (_) {
                // Non-blocking
            }
        })();
    }, [user]);

    // Real-time admin_notifications
    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc')),
            snap => setAdminNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return unsub;
    }, []);

    /* Derived stats */
    const activeCoachCount = coaches.filter(c => c.status === 'active').length;
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const teamCounts = coaches
        .filter(c => c.status === 'active')
        .reduce((acc, c) => { acc[c.teamId] = (acc[c.teamId] || 0) + 1; return acc; }, {});
    const unreadNotifs = adminNotifs.filter(n => !n.read).length;

    const clearAllRequests = async () => {
        setClearingRequests(true);
        try {
            const snap = await getDocs(collection(db, 'coach_requests'));
            await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
            setToastMsg('All requests cleared successfully.');
            setShowClearConfirm(false);
            setTimeout(() => setToastMsg(''), 3000);
        } catch (e) {
            setToastMsg('Error clearing requests: ' + e.message);
        } finally {
            setClearingRequests(false);
        }
    };

    // --- Analytics Logic ---
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const threeDaysAgoStart = todayStart - (3 * 24 * 60 * 60 * 1000);

    const getTs = (item) => item.timestamp?.toMillis ? item.timestamp.toMillis() : Date.parse(item.timestamp) || 0;

    const activityToday = activity.filter(a => getTs(a) >= todayStart);
    const activity3Days = activity.filter(a => getTs(a) >= threeDaysAgoStart);

    const featureNameMap = {
        deep_ai: '🤖 DEEP AI',
        predict: '📈 PREDICT',
        compare: '⚔️ COMPARE',
        selection: '📋 SELECTION'
    };

    // Get most used action
    const getMostUsedAction = (arr) => {
        if (arr.length === 0) return { action: 'None', count: 0 };
        const counts = arr.reduce((acc, item) => {
            const act = item.action || 'Unknown';
            const mappedAct = featureNameMap[act] || act.toUpperCase();
            acc[mappedAct] = (acc[mappedAct] || 0) + 1;
            return acc;
        }, {});
        const max = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a);
        return { action: max[0], count: max[1] };
    };

    const mostUsedToday = getMostUsedAction(activityToday);
    const mostUsed3Days = getMostUsedAction(activity3Days);

    // Get top coach
    const getTopCoach = (arr) => {
        if (arr.length === 0) return { id: 'None', email: 'None', count: 0 };
        const counts = arr.reduce((acc, item) => {
            // Prefer coachId if available, fallback to email if old logs
            const cid = item.coachId || item.coachEmail || 'Unknown';
            acc[cid] = (acc[cid] || 0) + 1;
            return acc;
        }, {});
        const max = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a);
        return { id: max[0], email: max[0], count: max[1] };
    };

    const [analyticsTimeframe, setAnalyticsTimeframe] = useState('today');
    const [showActivitiesList, setShowActivitiesList] = useState(false);

    const analyticsData = analyticsTimeframe === 'today' ? {
        total: activityToday.length,
        mostUsed: mostUsedToday,
        topCoach: getTopCoach(activityToday)
    } : {
        total: activity3Days.length,
        mostUsed: mostUsed3Days,
        topCoach: getTopCoach(activity3Days)
    };
    // -----------------------

    const toast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3500);
    };

    const markNotifRead = async (id) => {
        try { await updateDoc(doc(db, 'admin_notifications', id), { read: true }); }
        catch (e) { console.warn(e); }
    };

    const clearAllNotifs = async () => {
        try {
            await Promise.all(adminNotifs.map(n => deleteDoc(doc(db, 'admin_notifications', n.id))));
            toast('All alerts cleared!');
        } catch (e) {
            console.error('Failed to clear alerts:', e);
            toast('Failed to clear alerts');
        }
    };

    const handleApproveRequest = async (r) => {
        try {
            const batch = [];
            // Update the user's coach record
            await setDoc(doc(db, 'coaches', r.userId), {
                userId: r.userId,
                userEmail: r.userEmail,
                teamId: r.teamId,
                discipline: r.discipline,
                status: 'active',
                joinedAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            }, { merge: true });

            // Send notification to user
            await addDoc(collection(db, 'notifications'), {
                userId: r.userId,
                type: 'admin_approval',
                title: 'Request Approved',
                message: `Your request to join team ${r.teamId} has been approved!`,
                read: false,
                createdAt: serverTimestamp(),
            });

            // Update request status
            await updateDoc(doc(db, 'coach_requests', r.id), {
                status: 'approved',
                approvedAt: serverTimestamp(),
            });

            toast(`Request for ${r.userEmail} approved!`);
        } catch (e) {
            console.error('Approval failed:', e);
            toast('Failed to approve request: ' + e.message);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'coaches', label: `Coaches` },
        { id: 'requests', label: `Requests ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
        { id: 'activity', label: 'Activity Log' },
        { id: 'notifications', label: `Notifications ${unreadNotifs > 0 ? `(${unreadNotifs})` : ''}` },
    ];

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <SidebarProvider defaultOpen={true}>
            {/* ── Toast ── */}
            <AnimatePresence>
                {toastMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -40 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-green-500 text-white text-sm font-bold px-6 py-3 rounded-full shadow-2xl"
                    >
                        ✓ {toastMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Warn Modal ── */}
            {warnTarget && (
                <WarnModal
                    request={warnTarget}
                    onClose={() => setWarnTarget(null)}
                    onSent={() => { setWarnTarget(null); toast('Warning sent successfully!'); }}
                />
            )}

            {/* ── Delete Modal ── */}
            {deleteTarget && (
                <DeleteModal
                    coach={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={() => { setDeleteTarget(null); toast('Coach removed successfully!'); }}
                />
            )}

            {/* ── Sidebar ── */}
            <Sidebar
                projectName="Sports Intel AI"
                userDisplayName={userData?.displayName || 'Admin'}
                userEmail={user?.email}
                userAvatar={userData?.avatar}
                onEditProfile={() => navigate('/profile-setup')}
                onLogout={() => logout().then(() => navigate('/auth'))}
            >
                <SidebarGroup label="Dashboard">
                    <SidebarItem
                        icon="📊"
                        label="Overview"
                        active={activeTab === 'overview'}
                        onClick={() => { setActiveTab('overview'); setSelectedActivityCoach(null); setShowActivitiesList(false); }}
                    />
                    <SidebarItem
                        icon="📈"
                        label="Analytics"
                        active={activeTab === 'analytics'}
                        onClick={() => { setActiveTab('analytics'); setSelectedActivityCoach(null); setShowActivitiesList(false); }}
                    />
                    <SidebarItem
                        icon="👥"
                        label="Coaches"
                        active={activeTab === 'coaches'}
                        onClick={() => { setActiveTab('coaches'); setSelectedActivityCoach(null); setShowActivitiesList(false); }}
                    />
                    <SidebarItem
                        icon="📝"
                        label="Requests"
                        active={activeTab === 'requests'}
                        badge={pendingCount > 0 ? pendingCount : null}
                        badgeColor="yellow"
                        onClick={() => { setActiveTab('requests'); setSelectedActivityCoach(null); }}
                    />
                </SidebarGroup>
                <SidebarSeparator />
                <SidebarGroup label="Monitoring">
                    <SidebarItem
                        icon="📋"
                        label="Activity Log"
                        active={activeTab === 'activity'}
                        onClick={() => { setActiveTab('activity'); setSelectedActivityCoach(null); }}
                    />
                    <SidebarItem
                        icon="🔔"
                        label="Notifications"
                        active={activeTab === 'notifications'}
                        badge={unreadNotifs > 0 ? unreadNotifs : null}
                        badgeColor="red"
                        onClick={() => { setActiveTab('notifications'); setSelectedActivityCoach(null); }}
                    />
                </SidebarGroup>
            </Sidebar>

            {/* ── Main Content ── */}
            <SidebarInset>
                <div className="min-h-screen bg-[#0a0a1a] text-white">
                    {/* ── Top bar ── */}
                    <header className="sticky top-0 z-40 bg-[#0a0a1a]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger />
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">
                                {tabs.find(t => t.id === activeTab)?.label || 'Overview'}
                            </h2>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 font-black text-2xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 pointer-events-none">
                            Sports Intel AI
                        </div>
                        <div className="z-50 relative pointer-events-auto">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Enable admin inspect mode so ProtectedRoute doesn't redirect back to /admin
                                    sessionStorage.setItem('adminInspecting', 'true');
                                    navigate('/select-discipline');
                                }}
                                className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-xs font-bold text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"
                            >
                                Check Project
                            </button>
                        </div>
                    </header>

                    <div className="max-w-7xl mx-auto px-4 py-8">
                        {/* ── Stats Row ── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Total Coaches', value: coaches.length, icon: '👥', color: 'from-indigo-600/20 to-indigo-900/20', border: 'border-indigo-500/30' },
                                { label: 'Active Coaches', value: activeCoachCount, icon: '✅', color: 'from-green-600/20 to-green-900/20', border: 'border-green-500/30' },
                                { label: 'Pending Requests', value: pendingCount, icon: '⏳', color: 'from-yellow-600/20 to-yellow-900/20', border: 'border-yellow-500/30' },
                                { label: 'Activity Logs', value: activity.length, icon: '📋', color: 'from-blue-600/20 to-blue-900/20', border: 'border-blue-500/30' },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.07 }}
                                    className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-2xl p-5 backdrop-blur`}
                                >
                                    <div className="text-3xl mb-2">{stat.icon}</div>
                                    <div className="text-3xl font-black text-white">{stat.value}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* ── Tab Content ── */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* OVERVIEW */}
                                {activeTab === 'overview' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Per-Team Coach Counts */}
                                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col h-full">
                                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Per-Team Coach Counts</h2>
                                            {Object.keys(teamCounts).length === 0 ? (
                                                <p className="text-slate-600 text-sm italic">No active coaches yet.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {Object.entries(teamCounts).sort((a, b) => b[1] - a[1]).map(([team, count]) => (
                                                        <div key={team} className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span className="font-bold text-white">{team}</span>
                                                                    <span className={`font-bold ${count >= 2 ? 'text-red-400' : 'text-green-400'}`}>
                                                                        {count}/2 {count >= 2 && '⚠ FULL'}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-white/5 rounded-full h-2">
                                                                    <div
                                                                        className={`h-2 rounded-full transition-all ${count >= 2 ? 'bg-red-500' : 'bg-green-500'}`}
                                                                        style={{ width: `${(count / 2) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Recent Admin Notifications */}
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                                            <div className="flex items-center justify-between mb-5">
                                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Admin Alerts</h2>
                                                {adminNotifs.length > 0 && (
                                                    <button
                                                        onClick={clearAllNotifs}
                                                        className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                            {adminNotifs.length === 0 ? (
                                                <p className="text-slate-600 text-sm italic">No notifications yet.</p>
                                            ) : (
                                                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                                    {adminNotifs.slice(0, 8).map(n => (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => markNotifRead(n.id)}
                                                            className={`p-3 rounded-xl text-sm cursor-pointer transition-all ${!n.read
                                                                ? 'bg-indigo-500/10 border border-indigo-500/30'
                                                                : 'bg-white/[0.02] border border-white/5'
                                                                }`}
                                                        >
                                                            <p className="text-slate-300">{n.message}</p>
                                                            <p className="text-[10px] text-slate-600 mt-1">{formatTs(n.createdAt)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            </div>
                                        </div>
                                )}

                                {/* ANALYTICS */}
                                {activeTab === 'analytics' && (
                                    <div className="space-y-6">
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                                            <div className="flex items-center justify-between mb-5">
                                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <span className="text-indigo-400">📊</span> Analytics Overview
                                                </h2>
                                                {/* Timeframe Toggle */}
                                                <div className="flex bg-black/40 rounded-lg p-1">
                                                    <button
                                                        onClick={() => { setAnalyticsTimeframe('today'); setShowActivitiesList(false); }}
                                                        className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-widest transition-all ${analyticsTimeframe === 'today' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                                                    >
                                                        Today
                                                    </button>
                                                    <button
                                                        onClick={() => { setAnalyticsTimeframe('3days'); setShowActivitiesList(false); }}
                                                        className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-widest transition-all ${analyticsTimeframe === '3days' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                                                    >
                                                        Past 3 Days
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div 
                                                    onClick={() => setShowActivitiesList(!showActivitiesList)}
                                                    className={`rounded-xl p-4 border transition-all cursor-pointer ${showActivitiesList ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/50' : 'bg-black/20 border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.02]'}`}
                                                >
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex justify-between">
                                                        Total Activities <span>{showActivitiesList ? '↑' : '↓'} View</span>
                                                    </div>
                                                    <div className="text-2xl font-black text-white">{analyticsData.total}</div>
                                                </div>
                                                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Most Used Feature</div>
                                                    <div className="text-sm font-bold text-indigo-400 truncate" title={analyticsData.mostUsed.action}>
                                                        {analyticsData.mostUsed.action}
                                                    </div>
                                                    {analyticsData.mostUsed.count > 0 && (
                                                        <div className="text-[10px] text-slate-500 mt-1">{analyticsData.mostUsed.count} uses</div>
                                                    )}
                                                </div>
                                                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Most Active Coach</div>
                                                    <div className="text-sm font-bold text-white truncate" title={analyticsData.topCoach.email}>
                                                        {(() => {
                                                            if (analyticsData.topCoach.id === 'None') return 'None';
                                                            const c = coaches.find(coach => coach.id === analyticsData.topCoach.id || coach.userId === analyticsData.topCoach.id);
                                                            return c?.displayName || usersDict[analyticsData.topCoach.id]?.displayName || analyticsData.topCoach.email.split('@')[0] || 'Unknown';
                                                        })()}
                                                    </div>
                                                    {analyticsData.topCoach.count > 0 && (
                                                        <div className="text-[10px] text-slate-500 mt-1">{analyticsData.topCoach.count} activities</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expandable Activities List */}
                                            <AnimatePresence>
                                                {showActivitiesList && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-6 border-t border-white/5 pt-6 overflow-hidden"
                                                    >
                                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                                            {analyticsTimeframe === 'today' ? 'Today\'s Activity' : 'Past 3 Days Activity'}
                                                        </h3>
                                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                                            {(analyticsTimeframe === 'today' ? activityToday : activity3Days).length === 0 ? (
                                                                <p className="text-slate-600 text-xs italic">No activities found.</p>
                                                            ) : (
                                                                (analyticsTimeframe === 'today' ? activityToday : activity3Days).map((act, i) => (
                                                                    <div key={i} className="flex flex-col gap-1 p-3 bg-black/40 border border-white/5 rounded-lg">
                                                                        <div className="flex justify-between items-start">
                                                                            <span className="text-xs font-bold text-indigo-400">{featureNameMap[act.action] || act.action?.toUpperCase()}</span>
                                                                            <span className="text-[10px] text-slate-500">{formatTs(act.timestamp)}</span>
                                                                        </div>
                                                                        <div className="text-sm text-slate-300">{act.description}</div>
                                                                        <div className="text-[10px] text-slate-500">Coach: <span className="text-slate-400">{act.coachEmail || act.coachId}</span> (Team: {act.teamId})</div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                )}

                                {/* COACHES LIST */}
                                {activeTab === 'coaches' && (
                                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
                                        <div className="p-6 border-b border-white/5">
                                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">All Registered Coaches</h2>
                                        </div>
                                        {coaches.length === 0 ? (
                                            <div className="p-12 text-center text-slate-600 italic">No coaches registered yet.</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5">
                                                            <th className="text-left p-4">Username</th>
                                                            <th className="text-left p-4">Email</th>
                                                            <th className="text-left p-4 shadow-sm">Coach ID</th>
                                                            <th className="text-left p-4">Team</th>
                                                            <th className="text-left p-4">Discipline</th>
                                                            <th className="text-left p-4">Status</th>
                                                            <th className="text-left p-4">Joined</th>
                                                            <th className="text-left p-4">Last Login</th>
                                                            <th className="text-left p-4">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {coaches.map(c => (
                                                            <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                                <td className="p-4">
                                                                    <div className="font-bold text-white text-sm tracking-wide">
                                                                        {c.displayName || usersDict[c.userId]?.displayName || c.userEmail?.split('@')[0] || 'Unknown'}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-sm text-slate-300">
                                                                    {c.userEmail || '—'}
                                                                </td>
                                                                <td className="p-4 text-[10px] text-slate-500 font-mono">
                                                                    {c.userId || c.id || '—'}
                                                                </td>
                                                                <td className="p-4 text-sm text-slate-300">{c.teamId}</td>
                                                                <td className="p-4 text-sm text-slate-400 capitalize">{c.discipline || '—'}</td>
                                                                <td className="p-4">
                                                                    <Badge color={c.status === 'active' ? 'green' : c.status === 'suspended' ? 'red' : 'slate'}>
                                                                        {c.status}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-4 text-[11px] text-slate-500">{c.joinedAt ? formatTs(c.joinedAt) : (usersDict[c.userId]?.createdAt ? formatTs(usersDict[c.userId].createdAt) : 'Mar 9, 2026, 9:24 AM')}</td>
                                                                <td className="p-4 text-[11px] text-slate-500">{c.lastLogin ? formatTs(c.lastLogin) : (usersDict[c.userId]?.lastLogin ? formatTs(usersDict[c.userId].lastLogin) : (usersDict[c.userId]?.createdAt ? formatTs(usersDict[c.userId].createdAt) : 'Mar 9, 2026, 9:24 AM'))}</td>
                                                                <td className="p-4">
                                                                    <button
                                                                        onClick={() => setDeleteTarget(c)}
                                                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold text-[10px] rounded-lg transition-all uppercase tracking-widest"
                                                                    >
                                                                        🗑 Delete
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* PENDING REQUESTS */}
                                {activeTab === 'requests' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-4">
                                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Coach Role Requests</h2>
                                                <Badge color={pendingCount > 0 ? 'yellow' : 'green'}>{pendingCount} pending</Badge>
                                            </div>
                                            {requests.length > 0 && (
                                                <button
                                                    onClick={() => setShowClearConfirm(true)}
                                                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-bold text-[10px] rounded-lg transition-all uppercase tracking-widest flex items-center gap-2"
                                                >
                                                    🗑 Clear All
                                                </button>
                                            )}
                                        </div>
                                        {requests.length === 0 ? (
                                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-12 text-center text-slate-600 italic">
                                                No coach requests yet.
                                            </div>
                                        ) : (
                                            requests.map(r => (
                                                <motion.div
                                                    key={r.id}
                                                    layout
                                                    className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                                >
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-white">{r.userEmail}</span>
                                                            <Badge color={
                                                                r.status === 'pending' ? 'yellow'
                                                                    : r.status === 'warned' ? 'red'
                                                                        : r.status === 'approved' ? 'green'
                                                                            : 'slate'
                                                            }>
                                                                {r.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400">
                                                            Team: <span className="text-white font-bold">{r.teamId}</span>
                                                            &nbsp;·&nbsp; Requested: {formatTs(r.requestedAt)}
                                                        </p>
                                                        {r.warningMessage && (
                                                            <p className="text-[11px] text-yellow-400 bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                                                                ⚠ Warning sent: "{r.warningMessage}"
                                                            </p>
                                                        )}
                                                    </div>
                                                    {r.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setWarnTarget(r)}
                                                                className="px-5 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold text-xs rounded-xl transition-all uppercase tracking-widest whitespace-nowrap"
                                                            >
                                                                Send Warning
                                                            </button>
                                                            <button
                                                                onClick={() => handleApproveRequest(r)}
                                                                className="px-5 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-xs rounded-xl transition-all uppercase tracking-widest whitespace-nowrap"
                                                            >
                                                                Approve
                                                            </button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* ACTIVITY LOG */}
                                {activeTab === 'activity' && (() => {
                                    // Derive unique coaches who have activity
                                    const coachMap = {};
                                    activity.forEach(a => {
                                        if (!coachMap[a.coachId]) {
                                            coachMap[a.coachId] = {
                                                coachId: a.coachId,
                                                coachEmail: a.coachEmail,
                                                teamId: a.teamId,
                                                logs: [],
                                            };
                                        }
                                        coachMap[a.coachId].logs.push(a);
                                    });
                                    const coachList = Object.values(coachMap);

                                    const actionMeta = {
                                        predict: { dot: 'bg-indigo-500', badge: 'indigo', icon: '🔮' },
                                        compare: { dot: 'bg-blue-500', badge: 'indigo', icon: '⚔️' },
                                        selection: { dot: 'bg-green-500', badge: 'green', icon: '📋' },
                                        deep_ai: { dot: 'bg-cyan-400', badge: 'slate', icon: '🤖' },
                                    };

                                    // selectedActivityCoach is stored in component state (added below)
                                    const selectedCoach = coachList.find(c => c.coachId === selectedActivityCoach);

                                    return (
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
                                            {/* Header */}
                                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {selectedCoach && (
                                                        <button
                                                            onClick={() => setSelectedActivityCoach(null)}
                                                            className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                                                        >
                                                            ← Back
                                                        </button>
                                                    )}
                                                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                        {selectedCoach ? (
                                                            <span>
                                                                <span className="text-white">{selectedCoach.coachEmail}</span>
                                                                <span className="text-slate-600 ml-2">— Activity Log</span>
                                                            </span>
                                                        ) : 'Coach Activity Log'}
                                                    </h2>
                                                </div>
                                                <span className="text-[10px] text-slate-600">
                                                    {selectedCoach
                                                        ? `${selectedCoach.logs.length} entries`
                                                        : `${coachList.length} coaches · ${activity.length} total entries`}
                                                </span>
                                            </div>

                                            {activity.length === 0 ? (
                                                <div className="p-12 text-center text-slate-600 italic">No activity recorded yet.</div>
                                            ) : !selectedCoach ? (
                                                /* ── COACH LIST PANEL ── */
                                                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                                                    {coachList.map(coach => {
                                                        const actionCounts = coach.logs.reduce((acc, log) => {
                                                            acc[log.action] = (acc[log.action] || 0) + 1;
                                                            return acc;
                                                        }, {});
                                                        const lastAction = coach.logs[0]; // Already ordered desc

                                                        return (
                                                            <motion.div
                                                                key={coach.coachId}
                                                                layout
                                                                onClick={() => setSelectedActivityCoach(coach.coachId)}
                                                                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-all group"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    {/* Avatar */}
                                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border border-indigo-500/20 flex items-center justify-center text-sm font-black text-indigo-300 flex-shrink-0">
                                                                        {coach.coachEmail?.[0]?.toUpperCase() || '?'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                                                                            {coach.coachEmail}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                            {coach.teamId && (
                                                                                <span className="text-[10px] text-slate-500">• {coach.teamId}</span>
                                                                            )}
                                                                            {/* Mini action badges */}
                                                                            {Object.entries(actionCounts).map(([action, count]) => {
                                                                                const am = actionMeta[action] || { icon: '•', badge: 'slate' };
                                                                                return (
                                                                                    <span key={action} className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
                                                                                        {am.icon} {action} ×{count}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                        {lastAction && (
                                                                            <p className="text-[10px] text-slate-600 mt-1">
                                                                                Last: {formatTs(lastAction.timestamp)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-right">
                                                                        <div className="text-2xl font-black text-white">{coach.logs.length}</div>
                                                                        <div className="text-[9px] text-slate-600 uppercase tracking-widest">actions</div>
                                                                    </div>
                                                                    <span className="text-slate-600 group-hover:text-indigo-400 transition-colors text-lg">›</span>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* ── SELECTED COACH LOGS PANEL ── */
                                                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                                                    {selectedCoach.logs.map(a => {
                                                        const am = actionMeta[a.action] || { dot: 'bg-slate-500', badge: 'slate', icon: '•' };
                                                        return (
                                                            <div key={a.id} className="p-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors">
                                                                <div className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${am.dot}`} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                        <Badge color={am.badge}>
                                                                            {am.icon} {a.action}
                                                                        </Badge>
                                                                        {a.teamId && <span className="text-[10px] text-slate-500">• {a.teamId}</span>}
                                                                    </div>
                                                                    {a.description && (
                                                                        <p className="text-[12px] text-slate-300 leading-relaxed">{a.description}</p>
                                                                    )}
                                                                    <p className="text-[10px] text-slate-700 mt-1">{formatTs(a.timestamp)}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}


                                {/* ADMIN NOTIFICATIONS */}
                                {activeTab === 'notifications' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Admin Notifications</h2>
                                            {unreadNotifs > 0 && (
                                                <span className="text-[10px] font-bold text-yellow-400">{unreadNotifs} unread</span>
                                            )}
                                        </div>
                                        {adminNotifs.length === 0 ? (
                                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-12 text-center text-slate-600 italic">
                                                No admin notifications yet.
                                            </div>
                                        ) : (
                                            adminNotifs.map(n => (
                                                <motion.div
                                                    key={n.id}
                                                    layout
                                                    onClick={() => markNotifRead(n.id)}
                                                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${!n.read
                                                        ? 'bg-indigo-500/5 border-indigo-500/30 hover:bg-indigo-500/10'
                                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-xl mt-0.5">{n.type === 'coach_request' ? '🧑‍💼' : '📢'}</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm text-white font-medium">{n.message}</p>
                                                            <p className="text-[10px] text-slate-600 mt-1">{formatTs(n.createdAt)}</p>
                                                        </div>
                                                        {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1 animate-pulse flex-shrink-0" />}
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </SidebarInset>

            {/* Clear All Confirmation Modal */}
            <AnimatePresence>
                {showClearConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[#0f172a] border border-red-500/30 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Clear All Requests?</h3>
                            <p className="text-slate-400 text-sm mb-8">
                                This will permanently delete all <span className="text-white font-bold">{requests.length}</span> coach requests. This action cannot be undone.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={clearAllRequests}
                                    disabled={clearingRequests}
                                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                >
                                    {clearingRequests ? 'Clearing...' : 'Yes, Delete All'}
                                </button>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-black uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </SidebarProvider>
    );
};

export default AdminDashboard;
