// Game routes - API endpoints for crash game functionality
import express from "express";
import { placeBet, getGameStatus } from "../controllers/game.controller.js";
import { startNewRound, endRound } from "../services/gameEngine.service.js";

const router = express.Router();

// Place bet endpoint - handles player bet placement
router.post("/bet", placeBet);

// Game status endpoint - for debugging and monitoring
router.get("/status", getGameStatus);

// Manual round start endpoint - for testing/admin use
router.post("/start-round", async (req, res) => {
  try {
    await startNewRound();
    res.json({ msg: "✅ Manual round started" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to start round", error: err.message });
  }
});

// Force crash endpoint - emergency round termination
router.post("/force-crash", async (req, res) => {
  try {
    await endRound();
    res.json({ msg: "🛑 Round crashed manually" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to crash round", error: err.message });
  }
});

// Game history endpoint - returns last 5 completed rounds
router.get("/history", async (req, res) => {
  try {
    // Dynamic import to avoid circular dependency
    const rounds = await import("../models/game.model.js").then(
      ({ GameRound }) =>
        GameRound.find({ is_active: false }) // Get completed rounds only
          .sort({ createdAt: -1 }) // Sort newest first
          .limit(5) // Limit to 5 results
    );
    res.json(rounds);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching history", error: err.message });
  }
});

export default router;
