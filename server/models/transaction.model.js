// Transaction model - MongoDB schema for tracking all player financial transactions
import mongoose from "mongoose";

// Transaction schema - records all bet and cashout operations
const transactionSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Reference to Player model
    usd_amount: Number, // Transaction amount in USD
    crypto_amount: Number, // Transaction amount in cryptocurrency
    currency: String, // Crypto currency type (BTC, ETH, etc.)
    transaction_type: { type: String, enum: ["bet", "cashout"] }, // Transaction category
    transaction_hash: String, // Unique transaction identifier for audit trail
    price_at_time: Number, // Crypto price when transaction occurred
  },
  { timestamps: true } // Auto-add createdAt and updatedAt fields
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
