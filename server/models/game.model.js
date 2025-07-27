// Game model - MongoDB schemas for crash game rounds and player bets
import mongoose from "mongoose";

// Bet schema - individual player bet within a round
const betSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Reference to Player model
  usd_amount: Number, // Bet amount in USD
  crypto_amount: Number, // Bet amount in cryptocurrency
  currency: String, // Crypto currency type (BTC, ETH, etc.)
  multiplier_at_cashout: Number, // Multiplier when player cashed out
  status: {
    type: String,
    enum: ["active", "cashed_out", "lost"], // Bet states
    default: "active", // New bets start as active
  },
});

// Round schema - complete game round with multiple bets
const roundSchema = new mongoose.Schema(
  {
    round_id: String, // Unique round identifier
    start_time: Date, // When round began
    crash_point: Number, // Predetermined crash multiplier
    is_active: Boolean, // Whether round is currently running
    bets: [betSchema], // Array of all bets placed in this round
  },
  { timestamps: true } // Auto-add createdAt and updatedAt fields
);

// Virtual field - calculates round duration dynamically
roundSchema.virtual("duration_ms").get(function () {
  if (!this.start_time || !this.updatedAt) return 0;
  return this.updatedAt.getTime() - this.start_time.getTime(); // Duration in milliseconds
});

// Include virtual fields when converting to JSON
roundSchema.set("toJSON", { virtuals: true });

export const GameRound = mongoose.model("GameRound", roundSchema);
