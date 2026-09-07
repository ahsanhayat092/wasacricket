import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { executeTournamentBrain } from "./tournament-brain";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function Trigger: onMatchWritten
 * Fires whenever any match in `matches/{matchId}` is created, updated, or completed.
 * Automatically runs the Central Tournament Brain if match status is COMPLETED or result changed.
 */
export const onMatchWritten = onDocumentWritten("matches/{matchId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  // If match was deleted, nothing to recalculate
  if (!after) {
    return;
  }

  const tournamentId = after.tournamentId;
  if (!tournamentId) {
    console.log(`[TournamentBrain] Match ${event.params.matchId} has no tournamentId. Skipping.`);
    return;
  }

  // Detect if relevant match state changed:
  // 1. Match marked as COMPLETED
  // 2. Winner, scores, or status changed
  const statusChanged = before?.status !== after.status;
  const winnerChanged = before?.winningTeamId !== after.winningTeamId;
  const stageChanged = before?.stage !== after.stage;

  if (statusChanged || winnerChanged || stageChanged || after.status === "COMPLETED") {
    console.log(
      `[TournamentBrain] Match ${event.params.matchId} updated in tournament ${tournamentId}. Executing brain...`,
    );
    try {
      const result = await executeTournamentBrain(db, tournamentId);
      console.log(`[TournamentBrain] Completed successfully for ${tournamentId}:`, result);
    } catch (err: any) {
      console.error(`[TournamentBrain] Error executing brain for ${tournamentId}:`, err?.message || err);
    }
  }
});

/**
 * Cloud Function Trigger: onInningsWritten
 * Fires whenever an innings document in `innings/{inningsId}` is updated.
 * Syncs match score totals if needed.
 */
export const onInningsWritten = onDocumentWritten("innings/{inningsId}", async (event) => {
  const after = event.data?.after.data();
  if (!after) return;

  const matchId = after.matchId;
  if (!matchId) return;

  // If innings is marked completed, ensure the parent match gets re-evaluated
  if (after.isCompleted) {
    const matchSnap = await db.collection("matches").doc(matchId).get();
    if (matchSnap.exists) {
      const matchData = matchSnap.data();
      if (matchData?.tournamentId && matchData.status === "COMPLETED") {
        try {
          await executeTournamentBrain(db, matchData.tournamentId);
        } catch (err: any) {
          console.error(`[TournamentBrain] Error sync on innings written:`, err?.message || err);
        }
      }
    }
  }
});

/**
 * HTTPS Endpoint: syncTournament
 * Usage: GET or POST /syncTournament?tournamentId=XYZ
 * Allows Mobile or Web to trigger an immediate authoritative audit and bracket synchronization.
 */
export const syncTournament = onRequest({ cors: true }, async (req, res) => {
  const tournamentId = (req.query.tournamentId as string) || req.body?.tournamentId;

  if (!tournamentId) {
    res.status(400).json({ error: "Missing tournamentId parameter" });
    return;
  }

  try {
    const result = await executeTournamentBrain(db, tournamentId);
    res.status(200).json({
      success: true,
      tournamentId,
      result,
    });
  } catch (err: any) {
    console.error(`[TournamentBrain] syncTournament failed:`, err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || "Failed to execute tournament brain",
    });
  }
});
