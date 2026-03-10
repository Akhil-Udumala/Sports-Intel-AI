/**
 * Sports Intel AI — Firebase Cloud Functions
 *
 * Endpoints:
 *   POST /checkCoachLogin    – Check whether a user can take the coach role for a team
 *   POST /admin/sendWarning  – Admin-only: send a warning to a pending coach request
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

/* ─────────────────────────────────────────────────────────────
 * POST /checkCoachLogin
 * Body: { userId, userEmail, teamId }
 * Returns: { allowed: boolean, reason?: string }
 * ───────────────────────────────────────────────────────────── */
exports.checkCoachLogin = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        const { userId, userEmail, teamId, discipline } = req.body;

        if (!userId || !teamId) {
            return res.status(400).json({ allowed: false, reason: "Missing userId or teamId" });
        }

        try {
            // Count active coaches for THIS SPECIFIC TEAM
            const coachSnap = await db
                .collection("coaches")
                .where("teamId", "==", teamId)
                .where("status", "==", "active")
                .get();

            const activeCount = coachSnap.size;

            // Check if already registered on this team
            const alreadyIn = coachSnap.docs.some(d => d.data().userId === userId);
            if (alreadyIn) {
                const existing = coachSnap.docs.find(d => d.data().userId === userId);
                await existing.ref.update({ lastLogin: admin.firestore.FieldValue.serverTimestamp() });
                return res.status(200).json({ allowed: true });
            }

            if (activeCount >= 2) {
                // Slot full — create request + admin notification
                const batch = db.batch();

                const requestRef = db.collection("coach_requests").doc();
                batch.set(requestRef, {
                    userId,
                    userEmail: userEmail || "unknown",
                    teamId,
                    discipline: discipline || "unknown",
                    status: "pending",
                    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                const notifRef = db.collection("admin_notifications").doc();
                batch.set(notifRef, {
                    type: "coach_request",
                    userId,
                    userEmail: userEmail || "unknown",
                    teamId,
                    discipline: discipline || "unknown",
                    requestId: requestRef.id,
                    message: `Coach slot full for "${teamId}" (${discipline}). ${userEmail} has requested the coach role.`,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                await batch.commit();

                return res.status(200).json({
                    allowed: false,
                    reason: `"${teamId}" already has ${activeCount} active coaches (max 2). Your request has been sent to admin for review.`,
                });
            }

            // Register coach to the team
            await db.collection("coaches").add({
                userId,
                userEmail: userEmail || "unknown",
                teamId,
                discipline: discipline || "unknown",
                status: "active",
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.status(200).json({ allowed: true });
        } catch (err) {
            console.error("[checkCoachLogin] Error:", err);
            return res.status(500).json({ allowed: false, reason: "Internal server error." });
        }
    });
});

/* ─────────────────────────────────────────────────────────────
 * POST /admin/sendWarning
 * Requires: Authorization: Bearer <admin-id-token>
 * Body: { requestId, userId, message }
 * Returns: { success: boolean }
 * ───────────────────────────────────────────────────────────── */
exports.adminSendWarning = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        // ── Verify admin identity ──
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized: missing token" });
        }
        const idToken = authHeader.split("Bearer ")[1];
        let callerUid;
        try {
            const decoded = await admin.auth().verifyIdToken(idToken);
            callerUid = decoded.uid;
        } catch (e) {
            return res.status(401).json({ error: "Unauthorized: invalid token" });
        }

        // Verify the caller is an admin (check Firestore users doc)
        const callerDoc = await db.collection("users").doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data().role !== "admin") {
            return res.status(403).json({ error: "Forbidden: caller is not an admin" });
        }

        const { requestId, userId, message } = req.body;
        if (!requestId || !userId || !message) {
            return res.status(400).json({ error: "Missing requestId, userId, or message" });
        }

        try {
            const batch = db.batch();

            // Write user notification
            const notifRef = db.collection("notifications").doc();
            batch.set(notifRef, {
                userId,
                type: "admin_warning",
                title: "Warning from Admin",
                message,
                read: false,
                sentBy: callerUid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update request status to 'warned'
            const reqRef = db.collection("coach_requests").doc(requestId);
            batch.update(reqRef, {
                status: "warned",
                warnedAt: admin.firestore.FieldValue.serverTimestamp(),
                warnedBy: callerUid,
                warningMessage: message,
            });

            await batch.commit();

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error("[adminSendWarning] Error:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    });
});
