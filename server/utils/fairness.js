// Crypto utilities for generating provably fair crash points
import crypto from "crypto";

// Generate random seed for game round
export const generateSeed = () => {
  return crypto.randomBytes(16).toString("hex"); // 32-character hex string
};

// Calculate crash multiplier using seed + round ID
export const generateCrashPoint = (seed, round_id) => {
  // Create hash from seed + round combination
  const hash = crypto
    .createHash("sha256")
    .update(seed + round_id)      // Combine seed with round ID
    .digest("hex");               // Convert to hex string

  // Convert first 8 hex characters to integer
  const hex = parseInt(hash.slice(0, 8), 16);
  
  const maxCrash = 100;           // Maximum multiplier (100x)
  const crash = (hex % (maxCrash * 100)) / 100; // Scale to 0-100 range

  // Ensure minimum crash point is 1.01x
  return parseFloat(Math.max(1.01, crash).toFixed(2));
};
