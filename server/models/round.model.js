// Round model - Enhanced MongoDB schema for crash game rounds with provably fair data
import mongoose from "mongoose";

// Bet schema - individual player bet with outcome tracking
const betSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Reference to Player model
  usdAmount: Number, // Bet amount in USD
  cryptoAmount: Number, // Bet amount in cryptocurrency
  currency: String, // Crypto currency type (BTC, ETH, etc.)
  multiplierAtCashout: Number, // Multiplier when cashed out (null if not cashed)
  outcome: String, // Final bet result: 'won' or 'lost'
});

// Round schema - complete game round with provably fair verification data
const roundSchema = new mongoose.Schema(
  {
    roundId: String, // Unique round identifier
    crashPoint: Number, // Final crash multiplier
    seed: String, // Random seed for provably fair verification
    hash: String, // Hash of seed+roundId for transparency
    bets: [betSchema], // Array of all bets placed in this round
    startTime: Date, // When round started
    endTime: Date, // When round ended/crashed
  },
  { timestamps: true } // Auto-add createdAt and updatedAt fields
);

export const Round = mongoose.model("Round", roundSchema);
