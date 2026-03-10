import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Logs a coach action to the `coach_activity` Firestore collection.
 * The Admin Dashboard reads this collection in real-time to populate the Activity Log.
 *
 * @param {string} coachId    - Firebase UID of the coach
 * @param {string} coachEmail - Coach's email
 * @param {string} teamId     - The team the coach is assigned to
 * @param {'predict'|'compare'|'selection'|'deep_ai'} action
 * @param {object} meta       - Extra context (playerName, player1/2, sport, etc.)
 */
export async function logCoachActivity(coachId, coachEmail, teamId, action, meta = {}) {
    if (!coachId || !action) return;

    // Never log admin activity — when the admin is in "Check Project" inspect mode,
    // their actions should be invisible to the Activity Log.
    if (sessionStorage.getItem('adminInspecting') === 'true') return;

    // Build a human-readable description for the admin dashboard
    const description = buildDescription(action, meta);

    try {
        await addDoc(collection(db, 'coach_activity'), {
            coachId,
            coachEmail: coachEmail || 'unknown',
            teamId: teamId || 'unknown',
            action,
            description,
            meta,
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        // Non-blocking — never crash the UI over a logging failure
        console.warn('[logCoachActivity] Failed to log:', err.message);
    }
}

/* ── Build human-readable description ──────────────────────── */
function buildDescription(action, meta) {
    switch (action) {
        case 'predict':
            return meta.playerName
                ? `Ran performance prediction for ${meta.playerName} (${meta.sport || ''})`
                : 'Ran a player performance prediction';

        case 'compare':
            if (meta.player1 && meta.player2) {
                return `Compared ${meta.player1} (${meta.team1 || ''}) vs ${meta.player2} (${meta.team2 || ''})`;
            }
            return `Compared players in ${meta.sport || ''}`;

        case 'selection':
            return meta.teamName
                ? `Generated Selection Recommendation for ${meta.teamName} (${meta.sport || ''})`
                : 'Generated a team Selection Recommendation';

        case 'deep_ai':
            if (meta.context === 'comparison') {
                return `Used Deep AI Engine to compare ${meta.player1 || '?'} vs ${meta.player2 || '?'}`;
            }
            if (meta.playerName) {
                const cond = meta.opponentTeam && meta.opponentTeam !== 'N/A'
                    ? ` vs ${meta.opponentTeam} at ${meta.venue}`
                    : '';
                return `Deep AI prediction for ${meta.playerName}${cond}`;
            }
            return 'Ran Deep AI Engine analysis';

        default:
            return `Action: ${action}`;
    }
}
