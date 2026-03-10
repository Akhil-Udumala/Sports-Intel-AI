import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import './ProfileSetup.css';

/* ─── Avatar Options ────────────────────────────────────────── */
const AVATARS = [
    { id: 'lion', emoji: '🦁', label: 'Lion', bg: '#6366f1' },
    { id: 'eagle', emoji: '🦅', label: 'Eagle', bg: '#3b82f6' },
    { id: 'wolf', emoji: '🐺', label: 'Wolf', bg: '#10b981' },
    { id: 'bear', emoji: '🐻', label: 'Bear', bg: '#a855f7' },
    { id: 'phoenix', emoji: '🔥', label: 'Phoenix', bg: '#f59e0b' },
    { id: 'dragon', emoji: '🐉', label: 'Dragon', bg: '#06b6d4' },
    { id: 'tiger', emoji: '🐯', label: 'Tiger', bg: '#f43f5e' },
    { id: 'panther', emoji: '🐈‍⬛', label: 'Panther', bg: '#14b8a6' },
];

/* ─── Username check status ─────────────────────────────────── */
// idle | checking | available | taken | error
const USERNAME_STATUS = {
    IDLE: 'idle',
    CHECKING: 'checking',
    AVAILABLE: 'available',
    TAKEN: 'taken',
    ERROR: 'error',
};

/* ─── ProfileSetup Component ───────────────────────────────── */
const ProfileSetup = ({ onComplete }) => {
    const { user, updateUserData } = useAuth();

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState(USERNAME_STATUS.IDLE);

    const debounceRef = useRef(null);

    /* ── Debounced username uniqueness check ── */
    useEffect(() => {
        const trimmed = displayName.trim();

        // Reset if empty
        if (!trimmed) {
            setUsernameStatus(USERNAME_STATUS.IDLE);
            return;
        }

        // Minimum length guard
        if (trimmed.length < 2) {
            setUsernameStatus(USERNAME_STATUS.IDLE);
            return;
        }

        // Debounce: wait 600ms after the user stops typing
        clearTimeout(debounceRef.current);
        setUsernameStatus(USERNAME_STATUS.CHECKING);

        debounceRef.current = setTimeout(async () => {
            try {
                const qUsers = query(collection(db, 'users'), where('displayName', '==', trimmed));
                const qCoaches = query(collection(db, 'coaches'), where('displayName', '==', trimmed));
                
                const [snapUsers, snapCoaches] = await Promise.all([
                    getDocs(qUsers),
                    getDocs(qCoaches)
                ]);

                // Combine results
                const allDocs = [...snapUsers.docs, ...snapCoaches.docs];

                // Filter out the current user so they aren't blocked by their own name
                const others = allDocs.filter(d => d.id !== user?.uid);
                setUsernameStatus(others.length > 0 ? USERNAME_STATUS.TAKEN : USERNAME_STATUS.AVAILABLE);
            } catch (err) {
                console.warn('[ProfileSetup] Username check failed:', err);
                // Don't block submission on a check error — just clear the status
                setUsernameStatus(USERNAME_STATUS.ERROR);
            }
        }, 600);

        return () => clearTimeout(debounceRef.current);
    }, [displayName, user?.uid]);

    /* ── Submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!displayName.trim()) {
            setError('Please enter your display name.');
            return;
        }
        if (usernameStatus === USERNAME_STATUS.TAKEN) {
            setError('That username is already taken. Please choose a different one.');
            return;
        }
        if (usernameStatus === USERNAME_STATUS.CHECKING) {
            setError('Still checking username availability — please wait a moment.');
            return;
        }
        if (!selectedAvatar) {
            setError('Please select an avatar.');
            return;
        }

        setLoading(true);
        try {
            await updateUserData({
                displayName: displayName.trim(),
                avatar: selectedAvatar,
                profileSetupComplete: true,
            });
            onComplete();
        } catch (err) {
            console.error('[ProfileSetup] Error:', err);
            setError('Failed to save profile. Please try again.');
            setLoading(false);
        }
    };

    const selectedAvatarData = AVATARS.find(a => a.id === selectedAvatar);

    /* ── Username status indicator ── */
    const renderUsernameHint = () => {
        if (displayName.trim().length < 2) return null;
        switch (usernameStatus) {
            case USERNAME_STATUS.CHECKING:
                return (
                    <span className="username-hint checking">
                        <span className="hint-spinner" /> Checking…
                    </span>
                );
            case USERNAME_STATUS.AVAILABLE:
                return (
                    <span className="username-hint available">
                        ✓ Username available
                    </span>
                );
            case USERNAME_STATUS.TAKEN:
                return (
                    <span className="username-hint taken">
                        ✗ Username already taken
                    </span>
                );
            default:
                return null;
        }
    };

    const submitDisabled =
        loading ||
        !displayName.trim() ||
        !selectedAvatar ||
        usernameStatus === USERNAME_STATUS.TAKEN ||
        usernameStatus === USERNAME_STATUS.CHECKING;

    return (
        <div className="profile-setup-body">
            {/* Animated background blobs */}
            <div className="blob blob-1" />
            <div className="blob blob-2" />
            <div className="blob blob-3" />

            <motion.div
                className="profile-setup-card"
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Header */}
                <div className="profile-setup-header">
                    <div className="setup-icon">👤</div>
                    <h2>Set Up Your Profile</h2>
                    <p>Choose a display name and avatar to get started</p>
                </div>

                {/* Error banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            className="profile-error"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit}>
                    {/* Display Name Input */}
                    <div className="profile-field">
                        <div className="field-label-row">
                            <label htmlFor="displayName">Display Name</label>
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={usernameStatus}
                                    initial={{ opacity: 0, x: 6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -6 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {renderUsernameHint()}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                        <input
                            id="displayName"
                            type="text"
                            placeholder="Enter your name"
                            value={displayName}
                            onChange={(e) => {
                                setDisplayName(e.target.value);
                                setError('');
                            }}
                            maxLength={30}
                            autoFocus
                            className={
                                usernameStatus === USERNAME_STATUS.TAKEN ? 'input-taken' :
                                    usernameStatus === USERNAME_STATUS.AVAILABLE ? 'input-available' : ''
                            }
                        />
                    </div>

                    {/* Avatar Selection */}
                    <div className="profile-field">
                        <label>Choose Avatar</label>
                        <div className="avatar-grid">
                            {AVATARS.map((avatar) => (
                                <motion.button
                                    key={avatar.id}
                                    type="button"
                                    className={`avatar-option ${selectedAvatar === avatar.id ? 'selected' : ''}`}
                                    style={{
                                        background: selectedAvatar === avatar.id
                                            ? `linear-gradient(135deg, ${avatar.bg}33, ${avatar.bg}11)`
                                            : 'rgba(255,255,255,0.03)',
                                    }}
                                    onClick={() => setSelectedAvatar(avatar.id)}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.95 }}
                                    title={avatar.label}
                                >
                                    <span className="avatar-emoji">{avatar.emoji}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Live Preview */}
                    <AnimatePresence>
                        {(displayName.trim() || selectedAvatar) && (
                            <motion.div
                                className="profile-preview"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div
                                    className="profile-preview-avatar"
                                    style={selectedAvatarData
                                        ? { background: `${selectedAvatarData.bg}25`, borderColor: `${selectedAvatarData.bg}50` }
                                        : {}
                                    }
                                >
                                    {selectedAvatarData ? selectedAvatarData.emoji : '👤'}
                                </div>
                                <div className="profile-preview-info">
                                    <h4>{displayName.trim() || 'Your Name'}</h4>
                                    <p>{user?.email || 'coach@sportsintel.ai'}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        className="profile-submit-btn"
                        disabled={submitDisabled}
                        whileHover={{ scale: submitDisabled ? 1 : 1.01 }}
                        whileTap={{ scale: submitDisabled ? 1 : 0.98 }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <span className="hint-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.2)' }} />
                                Saving…
                            </span>
                        ) : 'Continue →'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default ProfileSetup;
