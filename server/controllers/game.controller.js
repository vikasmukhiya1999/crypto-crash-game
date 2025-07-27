// Game controller - handles bet placement logic with validation and wallet management
import { Player } from "../models/player.model.js";
import { GameRound } from "../models/game.model.js";
import { Transaction } from "../models/transaction.model.js";
import { getCryptoPrice } from "../services/price.service.js";

// Helper function to find active round with retry logic
const findActiveRound = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    const round = await GameRound.findOne({ is_active: true }).sort({
      createdAt: -1,
    });

    if (round) return round;

    // Wait 200ms and try again
    console.log(`🔄 Retry ${i + 1}: No active round found, waiting...`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
};

export const placeBet = async (req, res) => {
  const { username, usd_amount, currency } = req.body;

  // Validate supported currencies
  if (!["BTC", "ETH"].includes(currency)) {
    return res.status(400).json({ msg: "Unsupported currency" });
  }

  try {
    // Find player in database
    const player = await Player.findOne({ username });
    if (!player) return res.status(404).json({ msg: "Player not found" });

    // Get current active round with retry logic
    const round = await findActiveRound();

    // Debug logging for round status
    console.log("🔍 Debug - Round found:", !!round);
    console.log("🔍 Debug - Round active:", round?.is_active);
    console.log("🔍 Debug - Existing bets:", round?.bets?.length || 0);
    console.log(
      "🔍 Debug - Player has bet:",
      round?.bets?.some((b) => b.player.toString() === player._id.toString())
    );

    // Check if round exists
    if (!round) {
      return res.status(400).json({ msg: "No active round available" });
    }

    // Check if player hasn't already bet in this round
    const existingBet = round.bets.some(
      (b) => b.player.toString() === player._id.toString()
    );
    if (existingBet) {
      return res
        .status(400)
        .json({ msg: "You have already placed a bet in this round" });
    }

    // Fetch current crypto prices
    const prices = await getCryptoPrice(["bitcoin", "ethereum"]);
    const price = currency === "BTC" ? prices.bitcoin.usd : prices.ethereum.usd;

    // Debug logging for bet amount validation
    console.log(
      "🧪 Debug: usd_amount from body →",
      usd_amount,
      typeof usd_amount
    );
    const cleanUsdAmount = parseFloat(usd_amount);
    console.log("🧪 Debug: cleanUsdAmount →", cleanUsdAmount);
    console.log("🧪 Debug: Fetched price for", currency, "→", price);

    // Validate price and bet amount
    if (!price || isNaN(cleanUsdAmount) || cleanUsdAmount <= 0) {
      return res
        .status(400)
        .json({ msg: "Invalid bet amount or crypto price" });
    }

    // Convert USD to crypto amount
    const cryptoAmount = parseFloat((cleanUsdAmount / price).toFixed(8));
    console.log("🧪 Debug: cryptoAmount →", cryptoAmount);

    // Validate crypto conversion result
    if (!cryptoAmount || isNaN(cryptoAmount)) {
      return res.status(400).json({ msg: "Invalid crypto conversion" });
    }

    // Check player's wallet balance
    const wallet = player.wallets.find((w) => w.currency === currency);
    if (!wallet || wallet.balance < cryptoAmount) {
      return res.status(400).json({ msg: "Insufficient balance" });
    }

    // Deduct bet amount from player's wallet
    wallet.balance = parseFloat((wallet.balance - cryptoAmount).toFixed(8));
    await player.save();

    // Add bet to current round
    round.bets.push({
      player: player._id,
      usd_amount: cleanUsdAmount,
      crypto_amount: cryptoAmount,
      currency,
      status: "active",
    });

    await round.save();

    // Record transaction for audit trail
    await Transaction.create({
      player: player._id,
      usd_amount: cleanUsdAmount,
      crypto_amount: cryptoAmount,
      currency,
      transaction_type: "bet",
      transaction_hash: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      price_at_time: price,
    });

    // Return success response
    res.status(200).json({
      msg: "Bet placed successfully",
      usd_amount: cleanUsdAmount,
      cryptoAmount,
      currency,
      round_id: round.round_id,
    });
  } catch (err) {
    console.error("[BET ERROR]", err);
    res.status(500).json({ msg: "Bet placement error", error: err.message });
  }
};

// Add game status endpoint for debugging
export const getGameStatus = async (req, res) => {
  try {
    const activeRound = await GameRound.findOne({ is_active: true });
    const allRounds = await GameRound.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      hasActiveRound: !!activeRound,
      roundId: activeRound?.round_id,
      betCount: activeRound?.bets?.length || 0,
      roundActive: activeRound?.is_active,
      startTime: activeRound?.start_time,
      crashPoint: activeRound?.crash_point,
      recentRounds: allRounds.map((r) => ({
        round_id: r.round_id,
        is_active: r.is_active,
        crash_point: r.crash_point,
        bet_count: r.bets.length,
      })),
    });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Error fetching game status", error: err.message });
  }
};
