import mongoose from "mongoose";
import dotenv from "dotenv";
import { Player } from "../models/player.model.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const seedPlayers = async () => {
  await Player.deleteMany({});

  const players = [
    {
      username: "vikas",
      wallets: [
        { currency: "BTC", balance: 0.01 },
        { currency: "ETH", balance: 0.2 },
      ],
    },
    {
      username: "elon",
      wallets: [
        { currency: "BTC", balance: 0.02 },
        { currency: "ETH", balance: 0.1 },
      ],
    },
    {
      username: "satoshi",
      wallets: [
        { currency: "BTC", balance: 0.5 },
        { currency: "ETH", balance: 1 },
      ],
    },
  ];

  await Player.insertMany(players);
  console.log("✅ Sample players created.");
  process.exit();
};

seedPlayers();
