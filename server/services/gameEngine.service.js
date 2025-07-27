// Game engine service - Fixed parallel save issues and race conditions
import { GameRound } from "../models/game.model.js";
import { generateCrashPoint, generateSeed } from "../utils/fairness.js";
import {
  broadcastGameEvent,
  setLiveMultiplier,
} from "../sockets/socketHandler.js";

// Game state variables
let currentRound = null; // Active round instance
let multiplier = 1; // Current multiplier value
let multiplierInterval = null; // Timer for multiplier updates
let gameLoopInterval = null; // Main game loop timer
let isStartingNewRound = false; // Prevent concurrent round creation
let isEndingRound = false; // Prevent concurrent round ending

/**
 * Start infinite game loop - with proper cleanup and race condition prevention
 */
export const startGameLoop = () => {
  console.log("⏲️ Game loop started");

  // Clear any existing intervals first
  if (gameLoopInterval) {
    clearInterval(gameLoopInterval);
  }
  if (multiplierInterval) {
    clearInterval(multiplierInterval);
  }

  // Start first round immediately
  startNewRound();

  // Check every 3 seconds for any missing rounds (increased from 2s)
  gameLoopInterval = setInterval(() => {
    if (
      (!currentRound || !currentRound.is_active) &&
      !isStartingNewRound &&
      !isEndingRound
    ) {
      console.log("🔄 No active round detected, starting new one...");
      startNewRound();
    }
  }, 3000); // Increased interval to reduce conflicts
};

/**
 * Create and start new game round with race condition prevention
 */
export const startNewRound = async () => {
  if (isStartingNewRound || isEndingRound) {
    console.log("🔄 Round creation already in progress, skipping...");
    return;
  }

  isStartingNewRound = true;

  try {
    // Clear any existing multiplier interval
    if (multiplierInterval) {
      clearInterval(multiplierInterval);
      multiplierInterval = null;
    }

    // Generate unique round identifier
    const round_id = `ROUND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`🟢 Starting new round with ID: ${round_id}`);

    // Generate provably fair crash point
    const seed = generateSeed();
    const crashPoint = generateCrashPoint(seed, round_id);

    // Create new round in database
    currentRound = new GameRound({
      round_id,
      start_time: new Date(),
      crash_point: crashPoint,
      is_active: true,
      bets: [],
    });

    await currentRound.save();
    multiplier = 1; // Reset multiplier to starting value

    // Notify all clients round has started
    broadcastGameEvent("round_start", {
      round_id,
      crashPointHash: seed,
      crashPoint,
    });

    // Start multiplier progression timer
    multiplierInterval = setInterval(async () => {
      // Check if round is still active before updating
      if (!currentRound || !currentRound.is_active || isEndingRound) {
        clearInterval(multiplierInterval);
        return;
      }

      multiplier = parseFloat((multiplier * 1.01).toFixed(2)); // 1% growth per tick
      setLiveMultiplier(multiplier);

      // Check if multiplier reached crash point
      if (multiplier >= crashPoint && !isEndingRound) {
        await endRound();
      } else if (!isEndingRound) {
        broadcastGameEvent("multiplier_update", { multiplier });
      }
    }, 100); // Update every 100ms
  } catch (error) {
    console.error("❌ Error starting new round:", error);
  } finally {
    isStartingNewRound = false;
  }
};

/**
 * End current round with proper race condition and parallel save prevention
 */
export const endRound = async () => {
  if (!currentRound || isEndingRound || !currentRound.is_active) {
    return; // Prevent multiple calls
  }

  isEndingRound = true;

  try {
    // Stop multiplier updates immediately
    if (multiplierInterval) {
      clearInterval(multiplierInterval);
      multiplierInterval = null;
    }

    console.log(`💥 Round crashed at multiplier: ${multiplier}`);

    // ✅ CRITICAL FIX: Reload the document to avoid parallel save errors
    const roundToUpdate = await GameRound.findById(currentRound._id);

    if (!roundToUpdate) {
      console.log("⚠️ Round not found in database, skipping save");
      return;
    }

    // Mark round as inactive
    roundToUpdate.is_active = false;

    // Mark all remaining active bets as lost
    for (let bet of roundToUpdate.bets) {
      if (bet.status === "active") {
        bet.status = "lost";
      }
    }

    // Save with retry logic
    let saveAttempts = 0;
    let saved = false;

    while (!saved && saveAttempts < 3) {
      try {
        await roundToUpdate.save();
        saved = true;
      } catch (error) {
        saveAttempts++;
        if (error.name === "ParallelSaveError" && saveAttempts < 3) {
          console.log(
            `⚠️ Parallel save error, retrying... (attempt ${saveAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms

          // Reload document for retry
          const retryRound = await GameRound.findById(currentRound._id);
          if (retryRound) {
            retryRound.is_active = false;
            for (let bet of retryRound.bets) {
              if (bet.status === "active") {
                bet.status = "lost";
              }
            }
            roundToUpdate = retryRound; // Use fresh document
          }
        } else {
          throw error; // Re-throw if not parallel save error or max attempts reached
        }
      }
    }

    // Broadcast crash event
    broadcastGameEvent("round_crash", {
      multiplier,
      round_id: currentRound.round_id,
    });

    // Clear current round reference
    currentRound = null;

    // Start new round after a delay to prevent immediate conflicts
    setTimeout(() => {
      if (!isStartingNewRound) {
        startNewRound();
      }
    }, 1000); // Increased delay to 1 second
  } catch (error) {
    console.error("❌ Error ending round:", error);
    // Even if there's an error, clear the round and try to start a new one
    currentRound = null;
    setTimeout(() => {
      if (!isStartingNewRound) {
        startNewRound();
      }
    }, 2000);
  } finally {
    isEndingRound = false;
  }
};

/**
 * Graceful shutdown - cleanup all intervals
 */
export const stopGameLoop = () => {
  console.log("🛑 Stopping game loop...");

  if (gameLoopInterval) {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
  }

  if (multiplierInterval) {
    clearInterval(multiplierInterval);
    multiplierInterval = null;
  }

  isStartingNewRound = false;
  isEndingRound = false;
  currentRound = null;

  console.log("✅ Game loop stopped");
};

// Export for cleanup on server shutdown
process.on("SIGINT", () => {
  stopGameLoop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopGameLoop();
  process.exit(0);
});
