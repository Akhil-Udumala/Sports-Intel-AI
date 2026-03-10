import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import './Auth.css';

/* ─── Google SVG ───────────────────────────────────────────────── */
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

/* ─── Role switcher config ─────────────────────────────────────── */
const ROLES = {
    coach: {
        icon: '🏆',
        label: 'Coach',
        title: 'Welcome Back, Coach',
        subtitle: 'Sign in to access the Sports Intelligence dashboard',
        signupTitle: 'Join as a Coach',
        signupSubtitle: 'Create your account to start analysing your team',
        badge: 'Coach Portal',
        placeholder: 'coach@example.com',
        btnClass: 'btn-coach',
        badgeClass: 'badge-coach',
        cardClass: 'card-coach',
        footerClass: 'coach-footer-link',
    },

};

/* ─── Main Component ───────────────────────────────────────────── */
const Auth = () => {
    const navigate = useNavigate();
    const { login, signup, googleSignIn } = useAuth();

    const mode = 'coach';
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const cfg = ROLES[mode];

    /* After auth, check role and redirect */
    const postAuthRedirect = async (firebaseUser) => {
        // Check if the user has admin role in Firestore
        try {
            let snap = await getDoc(doc(db, 'users', firebaseUser.uid));
            let data = snap.exists() ? snap.data() : null;

            if (!data || data.role !== 'admin') {
                snap = await getDoc(doc(db, 'coaches', firebaseUser.uid));
                data = snap.exists() ? snap.data() : null;
            }

            const firestoreRole = data?.role || null;
            const profileDone = data?.profileSetupComplete === true;

            // Coach flow — if somehow they are admin, send them to admin anyway
            if (firestoreRole === 'admin') {
                navigate(profileDone ? '/admin' : '/profile-setup');
            } else {
                // Bootstrap a coaches/{uid} doc if needed & redirect
                if (!snap.exists() || !data?.role) {
                    await setDoc(doc(db, 'coaches', firebaseUser.uid), { 
                        role: 'coach', 
                        setupComplete: false,
                        joinedAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    }, { merge: true });
                } else {
                    // Update lastLogin for existing coach
                    await setDoc(doc(db, 'coaches', firebaseUser.uid), {
                        lastLogin: new Date().toISOString()
                    }, { merge: true });
                }
                navigate(profileDone ? '/select-discipline' : '/profile-setup');
            }
        } catch (err) {
            console.error('[Auth] Firestore Sync Error:', err);
            setError(`Authentication successful, but could not sync with database: ${err.message}. Please check your Firestore Security Rules.`);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let result;
            if (isLogin) {
                result = await login(email, password);
            } else {
                result = await signup(email, password);
                // For new admin sign-ups, mark intent in Firestore
                if (mode === 'admin') {
                    await setDoc(doc(db, 'users', result.user.uid), {
                        role: 'admin',
                        setupComplete: true,
                        createdAt: new Date().toISOString(),
                    }, { merge: true });
                }
            }
            await postAuthRedirect(result.user);
        } catch (err) {
            setError(err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        setLoading(true);
        try {
            const result = await googleSignIn();
            await postAuthRedirect(result.user);
        } catch (err) {
            setError(err.message.replace('Firebase: ', '').trim());
            setLoading(false);
        }
    };



    return (
        <div className={`auth-page-body mode-${mode}`}>
            {/* Split background */}
            <div className="bg-container">
                <div className="bg-half bg-cricket" />
                <div className="bg-half bg-football" />
            </div>
            <div className="bg-overlay" />

            <div className="login-wrapper">

                {/* ── Project Title Header ── */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                        Sports Intel AI
                    </h1>
                </div>

                {/* ── Card ── */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        className={`login-card ${cfg.cardClass}`}
                    >
                        {/* Role badge */}
                        <div className={`role-badge ${cfg.badgeClass}`}>
                            <span>{cfg.icon}</span>
                            {cfg.badge}
                        </div>

                        {/* Header */}
                        <div className="login-header">
                            <h2>{isLogin ? cfg.title : cfg.signupTitle}</h2>
                            <p>{isLogin ? cfg.subtitle : cfg.signupSubtitle}</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="auth-error-message"
                            >
                                {error}
                            </motion.div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="form-control"
                                    placeholder={cfg.placeholder}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="form-control"
                                    placeholder="••••••••"
                                    required
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`btn-primary ${cfg.btnClass}`}
                            >
                                {loading
                                    ? 'Verifying…'
                                    : isLogin
                                        ? `Sign In as ${cfg.label}`
                                        : `Create ${cfg.label} Account`}
                            </button>
                        </form>

                        {/* Google sign-in — available on both coach and admin tabs */}
                        <>
                            <div className="divider"><span>or continue with</span></div>
                            <div>
                                <button onClick={handleGoogle} type="button" className="btn-google" disabled={loading}>
                                    <GoogleIcon />
                                    Continue with Google
                                </button>
                            </div>
                        </>



                        {/* Toggle login/signup */}
                        <div className="login-footer">
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                type="button"
                                onClick={() => { setIsLogin(l => !l); setError(''); }}
                                className={cfg.footerClass}
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Auth;
