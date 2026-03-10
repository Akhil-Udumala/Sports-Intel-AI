import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, setDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

/**
 * Checks whether a coach slot is available for a specific team.
 * Business rule: max 2 active coaches per team.
 *
 * Called ONLY when a coach selects a team (not at discipline selection).
 *
 * @param {string} userId
 * @param {string} userEmail
 * @param {string} teamId   - The specific team (e.g. "India", "Brazil")
 * @param {string} discipline - The sport discipline ("cricket" | "football")
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function checkCoachLogin(userId, userEmail, teamId, discipline) {
    if (!userId || !teamId) {
        return { allowed: false, reason: 'Missing userId or teamId.' };
    }

    try {
        // 1. Count currently active coaches for this EXACT team
        const coachesRef = collection(db, 'coaches');
        const slotQuery = query(
            coachesRef,
            where('teamId', '==', teamId),
            where('status', '==', 'active')
        );
        const slotSnap = await getDocs(slotQuery);
        const activeCount = slotSnap.size;

        // Check if this user is already one of the active coaches for this team
        const alreadyInTeam = slotSnap.docs.some(d => d.id === userId || d.data().userId === userId);

        if (alreadyInTeam) {
            // They're already registered here — just update lastLogin
            const existingDoc = slotSnap.docs.find(d => d.id === userId || d.data().userId === userId);
            await updateDoc(existingDoc.ref, { lastLogin: serverTimestamp() });
            return { allowed: true };
        }

        if (activeCount >= 2) {
            // ── Slot full: create coach_request + admin notification ──
            await addDoc(collection(db, 'coach_requests'), {
                userId,
                userEmail: userEmail || 'unknown',
                teamId,
                discipline: discipline || 'unknown',
                status: 'pending',
                requestedAt: serverTimestamp(),
            });

            await addDoc(collection(db, 'admin_notifications'), {
                type: 'coach_request',
                userId,
                userEmail: userEmail || 'unknown',
                teamId,
                discipline: discipline || 'unknown',
                message: `Coach slot full for team "${teamId}" (${discipline}). ${userEmail} is requesting the coach role.`,
                read: false,
                createdAt: serverTimestamp(),
            });

            return {
                allowed: false,
                reason: `"${teamId}" already has ${activeCount} active coaches (max 2). Your request has been sent to the admin for review.`,
            };
        }

        // ── Slot available: register this coach to the team ──
        await setDoc(doc(db, 'coaches', userId), {
            userId,
            userEmail: userEmail || 'unknown',
            teamId,
            discipline: discipline || 'unknown',
            status: 'active',
            joinedAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
        }, { merge: true });

        // Notify admin of new coach signup (only if they weren't already in the team, which is handled in the if(alreadyInTeam) block above)
        await addDoc(collection(db, 'admin_notifications'), {
            type: 'new_coach',
            userId,
            userEmail: userEmail || 'unknown',
            teamId,
            discipline: discipline || 'unknown',
            message: `New Coach Signed Up: ${userEmail} joined ${teamId} (${discipline}).`,
            read: false,
            createdAt: serverTimestamp(),
        });

        return { allowed: true };
    } catch (err) {
        console.error('[checkCoachLogin] Error:', err);
        return { allowed: false, reason: 'Internal error during coach slot check.' };
    }
}
