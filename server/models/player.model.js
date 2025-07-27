// Player model - MongoDB schema for player accounts and crypto wallets
import mongoose from "mongoose";

// Wallet schema - individual cryptocurrency wallet for a player
const walletSchema = new mongoose.Schema({
  currency: { type: String, enum: ["BTC", "ETH"], required: true }, // Supported crypto types
  balance: { type: Number, required: true, default: 0 },             // Crypto balance amount
});

// Player schema - main player account with multiple wallets
const playerSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true }, // Unique player identifier
    wallets: [walletSchema],                                   // Array of crypto wallets
  },
  { timestamps: true }  // Auto-add createdAt and updatedAt fields
);

export const Player = mongoose.model("Player", playerSchema);
