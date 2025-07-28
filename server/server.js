// Multiplayer game server with Express + Socket.IO + MongoDB
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";

// Import route handlers and game logic
import gameRoutes from "./routes/game.routes.js";
import playerRoutes from "./routes/player.routes.js";
import { socketHandler } from "./sockets/socketHandler.js";
import { startGameLoop, stopGameLoop } from "./services/gameEngine.service.js";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development
    // origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Enable CORS for all routes
app.use(cors());

// Parse JSON requests
app.use(express.json());

// Set up API routes
app.use("/api/game", gameRoutes); // Game endpoints
app.use("/api/player", playerRoutes); // Player endpoints

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("🧠 New client connected");
  socketHandler(socket, io); // Delegate socket events
});

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    server.listen(process.env.PORT || 3000, () => {
      console.log(
        `🚀 Server running on http://localhost:${process.env.PORT || 3000}`
      );
      startGameLoop(); // Start game engine after server is ready
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully...");
  stopGameLoop(); // Stop game loop first
  server.close(() => {
    console.log("✅ Server closed");
    mongoose.connection.close(false, () => {
      console.log("✅ MongoDB connection closed");
      process.exit(0);
    });
  });
});

process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully...");
  stopGameLoop();
  server.close(() => {
    console.log("✅ Server closed");
    mongoose.connection.close(false, () => {
      console.log("✅ MongoDB connection closed");
      process.exit(0);
    });
  });
});
