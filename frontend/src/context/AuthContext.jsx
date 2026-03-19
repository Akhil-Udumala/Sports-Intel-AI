import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    GoogleAuthProvider,
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
} from 'firebase/firestore';
import { checkCoachLogin } from '../utils/checkCoachLogin';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);

    /* ── Auth helpers ── */
    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const signup = (email, password) => createUserWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);
    const googleSignIn = () => signInWithPopup(auth, new GoogleAuthProvider());

    /* ── Auth state listener ── */
    useEffect(() => {
        const timer = setTimeout(() => { if (loading) setLoading(false); }, 1500);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            clearTimeout(timer);
            setUser(currentUser);

            if (currentUser) {
                let data = null;
                try {
                    let snap = await getDoc(doc(db, 'users', currentUser.uid));
                    if (snap.exists() && snap.data().role === 'admin') {
                        data = snap.data();
                    } else {
                        snap = await getDoc(doc(db, 'coaches', currentUser.uid));
                        if (snap.exists()) data = snap.data();
                    }
                } catch {
                    const local = localStorage.getItem(`user_${currentUser.uid}`);
                    if (local) data = JSON.parse(local);
                }
                setUserData(data || { role: null, setupComplete: false });
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return () => { clearTimeout(timer); unsubscribe(); };
    }, []);

    /* ── Per-user notifications listener ── */
    useEffect(() => {
        if (!user) { setNotifications([]); return; }
        let unsub;
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid)
            );
            unsub = onSnapshot(q, snap => {
                const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Client-side sort by createdAt descending
                results.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || new Date(a.createdAt).getTime() || 0;
                    const timeB = b.createdAt?.seconds || new Date(b.createdAt).getTime() || 0;
                    return timeB - timeA;
                });
                setNotifications(results);
            }, () => { });
        } catch { /* ignore */ }
        return () => unsub && unsub();
    }, [user]);

    /* ── updateUserData ── */
    const updateUserData = async (newData) => {
        const updated = { ...userData, ...newData };
        setUserData(updated);
        if (user) {
            localStorage.setItem(`user_${user.uid}`, JSON.stringify(updated));
            const col = updated.role === 'admin' ? 'users' : 'coaches';
            setDoc(doc(db, col, user.uid), updated, { merge: true })
                .catch(e => console.warn('Firestore sync failed:', e));
        }
    };

    /**
     * requestCoachRole — called when a coach selects a team.
     *
     * Rules:
     *  - If coach already has a locked teamId → denied (use their existing team).
     *  - Otherwise calls checkCoachLogin(teamId) to verify slot availability.
     *  - If allowed → permanently locks coach to discipline + teamId in Firestore.
     *
     * @param {string} teamId      - Specific team name (e.g. "India")
     * @param {string} discipline  - "cricket" | "football"
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    const requestCoachRole = async (teamId, discipline) => {
        if (!user) return { allowed: false, reason: 'Not authenticated.' };

        // Already locked to a team — cannot change
        if (userData?.teamId && userData.teamId !== teamId) {
            return {
                allowed: false,
                reason: `You are already assigned to "${userData.teamId}" (${userData.discipline}). Coaches cannot switch teams.`,
            };
        }

        // Already on this exact team — just let them through
        if (userData?.teamId === teamId) {
            return { allowed: true };
        }

        // New request — check slot
        const result = await checkCoachLogin(user.uid, user.email, teamId, discipline);

        if (result.allowed) {
            // Permanently lock this coach to the team + discipline
            await updateUserData({
                role: 'coach',
                teamId,
                discipline,
                coachApproved: true,
                lockedAt: new Date().toISOString(),
            });
        }

        return result;
    };

    const value = {
        user,
        userData,
        loading,
        notifications,
        login,
        signup,
        logout,
        googleSignIn,
        updateUserData,
        requestCoachRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
