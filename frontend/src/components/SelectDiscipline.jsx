import React from "react";
import "./SelectDiscipline.css";
import { useAuth } from "../context/AuthContext";

/**
 * SelectDiscipline — Step 1 of the coach onboarding flow.
 * No coach-slot check happens here — the check fires at team selection.
 * AppRoutes already redirects locked coaches before this renders.
 */
export default function SelectDiscipline({ onChoose }) {
    const { logout } = useAuth();

    return (
        <div className="discipline-body">
            <div className="bg-shape shape-blue"></div>
            <div className="bg-shape shape-green"></div>

            {/* Logout button — top right */}
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

            <div className="selection-container">
                <header className="selection-header">
                    <h1>Select Your Discipline</h1>
                    <p>Choose your sport — you will be permanently assigned to the team you pick next.</p>
                </header>

                <div className="cards-wrapper">
                    <article
                        onClick={() => onChoose && onChoose('cricket')}
                        className="sport-card cricket"
                    >
                        <div className="sport-icon">🏏</div>
                        <h2>Cricket Coach</h2>
                        <p>Analyze batting/bowling averages, overs workload, and pitch impact.</p>
                        <button className="btn-select btn-cricket">Choose Cricket</button>
                    </article>

                    <article
                        onClick={() => onChoose && onChoose('football')}
                        className="sport-card football"
                    >
                        <div className="sport-icon">⚽</div>
                        <h2>Football Coach</h2>
                        <p>Track goals/assists, player heatmaps, and physical workload.</p>
                        <button className="btn-select btn-football">Choose Football</button>
                    </article>
                </div>

                <p className="text-[11px] text-slate-500 uppercase tracking-widest text-center mt-10 font-bold">
                    ⚠ Your discipline and team cannot be changed after selection
                </p>
            </div>
        </div>
    );
}
