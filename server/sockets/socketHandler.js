// Socket handler for real-time crash game events
import { Player } from "../models/player.model.js";
import { GameRound } from "../models/game.model.js";
import { Transaction } from "../models/transaction.model.js";

// Global references for socket communication
let ioRef = null;              // Socket.IO instance reference
let currentMultiplier = 1;     // Live multiplier from game engine

export const socketHandler = (socket, io) => {
  ioRef = io;                  // Store io reference for broadcasting

  console.log("📡 New client connected:", socket.id);

  // Handle player cashout requests
  socket.on("cashout", async ({ username }) => {
    try {
      // Find player in database
      const player = await Player.findOne({ username });
      if (!player) return socket.emit("error", { msg: "Player not found" });

      // Get current active game round
      const round = await GameRound.findOne({ is_active: true }).sort({
        createdAt: -1,
      });
      if (!round) return socket.emit("error", { msg: "No active round" });

      // Find player's active bet in current round
      const bet = round.bets.find(
        (b) =>
          b.player.toString() === player._id.toString() && b.status === "active"
      );

      if (!bet)
        return socket.emit("error", { msg: "No active bet to cash out" });

      // Calculate payout amounts
      const payoutCrypto = parseFloat(
        (bet.crypto_amount * currentMultiplier).toFixed(8)
      );
      const priceAtTime = bet.usd_amount / bet.crypto_amount; // Original crypto price
      const usdPayout = parseFloat((payoutCrypto * priceAtTime).toFixed(2));

      // Update player's wallet balance
      const wallet = player.wallets.find((w) => w.currency === bet.currency);
      wallet.balance += payoutCrypto;

      // Mark bet as cashed out
      bet.status = "cashed_out";
      bet.multiplier_at_cashout = currentMultiplier;

      // Save changes to database
      await player.save();
      await round.save();

      // Record transaction for audit trail
      await Transaction.create({
        player: player._id,
        usd_amount: usdPayout,
        crypto_amount: payoutCrypto,
        currency: bet.currency,
        transaction_type: "cashout",
        transaction_hash: `tx_${Date.now()}_${Math.floor(
          Math.random() * 1000
        )}`,
        price_at_time: priceAtTime,
      });

      // Broadcast cashout to all connected clients
      io.emit("player_cashout", {
        username,
        currency: bet.currency,
        payoutCrypto,
        usd_equivalent: usdPayout,
        multiplier: currentMultiplier,
      });
    } catch (err) {
      console.error("❌ Cashout Error:", err);
      socket.emit("error", { msg: "Cashout failed", error: err.message });
    }
  });
};

// Update multiplier from game engine
export const setLiveMultiplier = (m) => {
  currentMultiplier = m;
};

// Broadcast game events to all clients
export const broadcastGameEvent = (event, payload) => {
  if (ioRef) {
    ioRef.emit(event, payload);
  }
};
