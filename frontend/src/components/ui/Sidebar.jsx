import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* ──────────────────────────────────────────────────────────────
   Avatar lookup — mirrors ProfileSetup.jsx
   ────────────────────────────────────────────────────────────── */
const AVATARS = {
    lion: { emoji: '🦁', bg: '#6366f1' },
    eagle: { emoji: '🦅', bg: '#3b82f6' },
    wolf: { emoji: '🐺', bg: '#10b981' },
    bear: { emoji: '🐻', bg: '#a855f7' },
    phoenix: { emoji: '🔥', bg: '#f59e0b' },
    dragon: { emoji: '🐉', bg: '#06b6d4' },
    tiger: { emoji: '🐯', bg: '#f43f5e' },
    panther: { emoji: '🐈‍⬛', bg: '#14b8a6' },
};

/* ──────────────────────────────────────────────────────────────
   Context
   ────────────────────────────────────────────────────────────── */
const SidebarContext = createContext(null);

export const useSidebar = () => {
    const ctx = useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebar must be used inside <SidebarProvider>');
    return ctx;
};

/* ──────────────────────────────────────────────────────────────
   SidebarProvider
   ────────────────────────────────────────────────────────────── */
export const SidebarProvider = ({ children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => { setIsMobile(e.matches); if (e.matches) setOpen(false); };
        handler(mq);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (isMobile) setMobileOpen(o => !o);
                else setOpen(o => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMobile]);

    const toggle = useCallback(() => {
        if (isMobile) setMobileOpen(o => !o);
        else setOpen(o => !o);
    }, [isMobile]);

    const expanded = isMobile ? mobileOpen : open;

    return (
        <SidebarContext.Provider value={{ open, setOpen, mobileOpen, setMobileOpen, isMobile, toggle, expanded }}>
            <div className="flex min-h-screen w-full">
                {children}
            </div>
        </SidebarContext.Provider>
    );
};

/* ──────────────────────────────────────────────────────────────
   ProjectLogo — the blue rounded-square logo like in the screenshot
   ────────────────────────────────────────────────────────────── */
const ProjectLogo = ({ collapsed }) => (
    <div
        className="flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300"
        style={{
            width: collapsed ? 48 : 56,
            height: collapsed ? 48 : 56,
            borderRadius: collapsed ? '50%' : 12,
        }}
    >
        <img
            src="/logo.png"
            alt="Project Logo"
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
            }}
        />
    </div>
);

/* ──────────────────────────────────────────────────────────────
   Sidebar
   ────────────────────────────────────────────────────────────── */
export const Sidebar = ({
    children,
    projectName = 'Sports Intel AI',
    projectSub = 'Sports AI',
    userDisplayName,
    userEmail,
    userAvatar,    // avatar id like 'lion', 'eagle'
    onEditProfile,
    onLogout,
}) => {
    const { open, mobileOpen, setMobileOpen, isMobile, toggle, expanded } = useSidebar();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    // Close user menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const avatarData = AVATARS[userAvatar] || null;
    const avatarEmoji = avatarData?.emoji || userDisplayName?.[0]?.toUpperCase() || '?';
    const avatarBg = avatarData?.bg || '#6366f1';

    /* ── Header content ── */
    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0">
                <ProjectLogo collapsed={!expanded} />
                {expanded && (
                    <div className="min-w-0 flex flex-col justify-center">
                        <h1 className="text-[15px] font-bold text-white leading-tight truncate">{projectName}</h1>
                        {projectSub && <p className="text-[11px] text-slate-400 leading-tight truncate mt-[2px]">{projectSub}</p>}
                    </div>
                )}
            </div>
            {expanded && (
                <svg className="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 15l5 5 5-5" />
                    <path d="M7 9l5-5 5 5" />
                </svg>
            )}
        </div>
    );

    /* ── Footer content (user) ── */
    const footerContent = (
        <div className="relative" ref={userMenuRef}>
            <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition-all group"
            >
                {/* Avatar */}
                <div
                    className="shrink-0 flex items-center justify-center rounded-full text-base transition-all duration-300"
                    style={{
                        width: expanded ? 36 : 32,
                        height: expanded ? 36 : 32,
                        background: `linear-gradient(135deg, ${avatarBg}55, ${avatarBg}22)`,
                        border: `2px solid ${avatarBg}60`,
                    }}
                >
                    {avatarEmoji}
                </div>
                {expanded && (
                    <>
                        <div className="min-w-0 flex-1 text-left flex flex-col justify-center">
                            <p className="text-[14px] font-semibold text-white truncate leading-tight">{userDisplayName || 'User'}</p>
                            <p className="text-[11px] text-slate-400 truncate leading-tight mt-[2px]">{userEmail}</p>
                        </div>
                        <svg className="w-4 h-4 text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 15l5 5 5-5" />
                            <path d="M7 9l5-5 5 5" />
                        </svg>
                    </>
                )}
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
                <div
                    className="absolute bottom-full mb-2 bg-[#111827] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn"
                    style={{
                        left: expanded ? 0 : -8,
                        width: expanded ? '100%' : 200,
                    }}
                >
                    {onEditProfile && (
                        <button
                            onClick={() => { setUserMenuOpen(false); onEditProfile(); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Edit Profile
                        </button>
                    )}
                    {onLogout && (
                        <button
                            onClick={() => { setUserMenuOpen(false); onLogout(); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Logout
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    /* ── Toggle button ── */
    const toggleBtn = (
        <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
            aria-label="Toggle Sidebar"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
        </button>
    );

    /* ── Mobile overlay ── */
    if (isMobile) {
        return (
            <>
                {mobileOpen && (
                    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                )}
                <aside
                    className="fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0a0a0f] border-r border-white/5 shadow-2xl transition-transform duration-300 ease-in-out"
                    style={{ width: '17rem', transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
                >
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        {headerContent}
                    </div>
                    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 sidebar-scrollbar">{children}</nav>
                    <div className="p-3 border-t border-white/5">{footerContent}</div>
                </aside>
            </>
        );
    }

    /* ── Desktop ── */
    return (
        <aside
            className="sticky top-0 h-screen flex flex-col bg-[#0a0a0f] border-r border-white/5 transition-[width] duration-300 ease-in-out z-30 shrink-0"
            style={{ width: open ? '16rem' : '4.5rem' }}
        >
            {/* Header row: logo */}
            <div className="flex items-center justify-between p-3 border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ProjectLogo collapsed={!open} />
                    {open && (
                        <div className="min-w-0 flex flex-col justify-center pl-1">
                            <h1 className="text-[15px] font-bold text-white leading-tight truncate">{projectName}</h1>
                            {projectSub && <p className="text-[11px] text-slate-400 leading-tight truncate mt-[2px]">{projectSub}</p>}
                        </div>
                    )}
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 sidebar-scrollbar">{children}</nav>

            {/* Footer: user */}
            <div className="p-2 border-t border-white/5">{footerContent}</div>
        </aside>
    );
};

/* ──────────────────────────────────────────────────────────────
   SidebarInset — main content beside the sidebar
   ────────────────────────────────────────────────────────────── */
export const SidebarInset = ({ children }) => (
    <main className="flex-1 flex flex-col min-w-0">
        {children}
    </main>
);

/* ──────────────────────────────────────────────────────────────
   SidebarTrigger — toggle button for top toolbar
   ────────────────────────────────────────────────────────────── */
export const SidebarTrigger = ({ className = '' }) => {
    const { toggle } = useSidebar();
    return (
        <button
            onClick={toggle}
            className={`p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all ${className}`}
            aria-label="Toggle Sidebar"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
        </button>
    );
};

/* ──────────────────────────────────────────────────────────────
   SidebarGroup
   ────────────────────────────────────────────────────────────── */
export const SidebarGroup = ({ label, children }) => {
    const { expanded } = useSidebar();

    return (
        <div className="px-2 py-2">
            {label && expanded && (
                <p className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em]">
                    {label}
                </p>
            )}
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────────
   SidebarItem
   ────────────────────────────────────────────────────────────── */
export const SidebarItem = ({
    icon,
    label,
    to,
    onClick,
    active: activeProp,
    badge,
    badgeColor = 'indigo',
    chevron = false,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { expanded, isMobile, setMobileOpen } = useSidebar();

    const isActive = activeProp !== undefined ? activeProp : (to && location.pathname === to);

    const badgeColors = {
        indigo: 'bg-indigo-500 text-white',
        red: 'bg-red-500 text-white',
        yellow: 'bg-yellow-500 text-black',
        green: 'bg-green-500 text-white',
    };

    const handleClick = () => {
        if (onClick) onClick();
        else if (to) navigate(to);
        if (isMobile) setMobileOpen(false);
    };

    return (
        <button
            onClick={handleClick}
            className={`
                w-full flex items-center gap-3 rounded-lg text-[14px] font-medium transition-all duration-200
                ${expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
                ${isActive
                    ? 'bg-white/[0.06] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }
            `}
            title={!expanded ? label : undefined}
        >
            <span className="text-[17px] flex-shrink-0 w-5 text-center leading-none">{icon}</span>
            {expanded && (
                <>
                    <span className="truncate flex-1 text-left">{label}</span>
                    {badge !== undefined && badge !== null && badge !== 0 && (
                        <span className={`text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1.5 ${badgeColors[badgeColor]}`}>
                            {badge}
                        </span>
                    )}
                    {chevron && (
                        <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    )}
                </>
            )}
        </button>
    );
};

/* ──────────────────────────────────────────────────────────────
   SidebarSeparator
   ────────────────────────────────────────────────────────────── */
export const SidebarSeparator = () => (
    <div className="mx-3 my-2 border-t border-white/5" />
);

export default {
    SidebarProvider,
    Sidebar,
    SidebarInset,
    SidebarTrigger,
    SidebarGroup,
    SidebarItem,
    SidebarSeparator,
    useSidebar,
};
