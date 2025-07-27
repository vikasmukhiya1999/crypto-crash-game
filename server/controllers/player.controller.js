// Player controller - handles player account creation and wallet management
import { Player } from "../models/player.model.js";
import { getCryptoPrice } from "../services/price.service.js";

// Create new player account with default crypto wallets
export const createPlayer = async (req, res) => {
  const { username } = req.body;
  try {
    // Check if username already exists
    const existing = await Player.findOne({ username });
    if (existing)
      return res.status(400).json({ msg: "Username already exists" });

    // Create new player with BTC and ETH wallets (0 balance)
    const player = new Player({
      username,
      wallets: [
        { currency: "BTC", balance: 0 },
        { currency: "ETH", balance: 0 },
      ],
    });

    // Save to database
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    res.status(500).json({ msg: "Error creating player", error: err.message });
  }
};

// Get player's wallet balances with USD conversion
export const getWallet = async (req, res) => {
  const { username } = req.params;
  try {
    // Find player by username
    const player = await Player.findOne({ username });
    if (!player) return res.status(404).json({ msg: "Player not found" });

    // Fetch current crypto prices
    const prices = await getCryptoPrice(["bitcoin", "ethereum"]);

    // Convert crypto balances to USD values
    const walletWithUSD = player.wallets.map((w) => {
      const price =
        w.currency === "BTC" ? prices.bitcoin.usd : prices.ethereum.usd;
      return {
        currency: w.currency,
        balance: w.balance,
        usd_value: (w.balance * price).toFixed(2),
      };
    });

    // Return player data with USD-converted wallets
    res.json({ username: player.username, wallets: walletWithUSD });
  } catch (err) {
    res.status(500).json({ msg: "Error fetching wallet", error: err.message });
  }
};
