// Player routes - API endpoints for player management and transactions
import express from "express";
import { createPlayer, getWallet } from "../controllers/player.controller.js";
import { Transaction } from "../models/transaction.model.js";
import { Player } from "../models/player.model.js";

const router = express.Router();

// Create new player account
router.post("/create", createPlayer);

// Get player's wallet balance and info
router.get("/wallet/:username", getWallet);

// Get player's transaction history
router.get("/transactions/:username", async (req, res) => {
  try {
    // Find player by username from URL parameter
    const player = await Player.findOne({ username: req.params.username });
    if (!player) return res.status(404).json({ msg: "Player not found" });

    // Fetch all transactions for this player, newest first
    const txns = await Transaction.find({ player: player._id }).sort({
      createdAt: -1, // Sort by creation date, descending
    });
    res.json(txns);
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Error fetching transactions", error: err.message });
  }
});

export default router;
