import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import "./App.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Color profit/loss for dashboard
function plColor(num) {
  if (num > 0) return "#23b26d";
  if (num < 0) return "#e04b4b";
  return "#222";
}

function App() {
  // --- Auth/User
  const [inputUsername, setInputUsername] = useState("");
  const [username, setUsername] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  // --- Socket Connection State (✅ ADDED)
  const [socketId, setSocketId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  // --- Game State
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [gamePhase, setGamePhase] = useState("waiting");

  // --- Betting & UI
  const [betAmount, setBetAmount] = useState("");
  const [betCurrency, setBetCurrency] = useState("BTC");
  const [status, setStatus] = useState("");
  const [betActive, setBetActive] = useState(false);
  const [betInfo, setBetInfo] = useState(null);
  const [lastPL, setLastPL] = useState(null);

  // --- Data
  const [wallet, setWallet] = useState({
    BTC: "0.0000000000",
    ETH: "0.0000000000",
  });
  const [gameHistory, setGameHistory] = useState([]);
  const [txHistory, setTxHistory] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [showGameHistory, setShowGameHistory] = useState(false);

  // Timer for next round
  const [nextRoundTime, setNextRoundTime] = useState(null);
  const [secondsToNextRound, setSecondsToNextRound] = useState(null);

  // --- Fetch wallet for new user or update
  const fetchWallet = async (user) => {
    try {
      const res = await axios.get(`${API_URL}/player/wallet/${user}`);
      const btc = res.data.wallets?.find((w) => w.currency === "BTC");
      const eth = res.data.wallets?.find((w) => w.currency === "ETH");
      setWallet({
        BTC: btc ? Number(btc.balance).toFixed(10) : "0.0000000000",
        ETH: eth ? Number(eth.balance).toFixed(10) : "0.0000000000",
      });
    } catch {
      setWallet({
        BTC: "0.0000000000",
        ETH: "0.0000000000",
      });
    }
  };

  // --- Socket + events with connection status tracking (✅ UPDATED)
  useEffect(() => {
    if (!authenticated) return;

    const s = io(SOCKET_URL);
    setSocket(s);

    // ✅ Enhanced connection handler with socket ID
    s.on("connect", () => {
      setConnectionStatus("Connected");
      setSocketId(s.id);
      setStatus(`✅ Connected to server! Socket ID: ${s.id}`);
      setGamePhase("waiting");

      // Set a default 5s timer until first round
      const now = Date.now();
      setNextRoundTime(now + 5000);
      setSecondsToNextRound(5);
    });

    // ✅ Enhanced disconnect handler
    s.on("disconnect", () => {
      setConnectionStatus("Disconnected");
      setSocketId("");
      setStatus("❌ Disconnected from server");
      setGamePhase("waiting");
    });

    s.on("round_start", (data) => {
      setStatus("Round started! Place your bet.");
      setLastPL(null);
      setNextRoundTime(null);
      setSecondsToNextRound(null);
      setCurrentMultiplier(1.0);
      setGamePhase("betting");
    });

    s.on("multiplier_update", (data) => {
      setCurrentMultiplier(data.multiplier);
      setGamePhase("flying");
      if (betActive) {
        setStatus(`Flying at ${data.multiplier}x - Cash out anytime!`);
      } else {
        setStatus(`Round is flying at ${data.multiplier}x`);
      }
    });

    s.on("round_crash", async (data) => {
      if (data.multiplier) {
        setCurrentMultiplier(data.multiplier);
      }
      setGamePhase("crashed");

      let crashMultiplier = "unknown";
      try {
        const { data: historyData } = await axios.get(
          `${API_URL}/game/history`
        );
        if (Array.isArray(historyData) && historyData.length > 0) {
          const lastRound =
            historyData[0].is_active && historyData.length > 1
              ? historyData[1]
              : historyData[0];
          crashMultiplier =
            lastRound && lastRound.crash_point !== undefined
              ? `${lastRound.crash_point}x`
              : "unknown";
        }
      } catch {
        crashMultiplier = "unknown";
      }

      setStatus(`Round crashed at ${crashMultiplier}`);

      const now = Date.now();
      setNextRoundTime(now + 5000);
      setSecondsToNextRound(5);

      if (betInfo) {
        setLastPL({
          value: -betInfo.amount,
          label: "Crashed! Lost bet.",
        });
        setBetActive(false);
        setBetInfo(null);
      }
      fetchWallet(username);
    });

    s.on("player_cashout", (payload) => {
      let profit = null;
      if (betInfo && typeof payload.usd_equivalent === "number") {
        profit = payload.usd_equivalent - Number(betInfo.amount);
      }

      setLastPL({
        value: profit ?? 0,
        label: profit > 0 ? "Profit" : profit < 0 ? "Loss" : "Break-even",
      });

      setStatus(
        `Cashed out: ${payload.payoutCrypto ?? ""} ${
          payload.currency ?? ""
        } ($${payload.usd_equivalent ?? "?"})`
      );
      setBetActive(false);
      setBetInfo(null);
      fetchWallet(username);
    });

    s.on("error", (err) => setStatus("Error: " + err.msg));

    // ✅ Enhanced cleanup
    return () => {
      s.disconnect();
      setSocket(null);
      setSocketId("");
      setConnectionStatus("Disconnected");
    };
  }, [authenticated, betInfo, username, betActive]);

  // --- Countdown effect
  useEffect(() => {
    let timer;
    if (nextRoundTime) {
      timer = setInterval(() => {
        const left = Math.max(
          0,
          Math.ceil((nextRoundTime - Date.now()) / 1000)
        );
        setSecondsToNextRound(left);
        if (left <= 0) {
          setNextRoundTime(null);
          setSecondsToNextRound(null);
        }
      }, 250);
    }
    return () => clearInterval(timer);
  }, [nextRoundTime]);

  // --- REST API actions
  const fetchGameHist = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/game/history`);
      setGameHistory(Array.isArray(data) ? data : []);
    } catch {
      setGameHistory([]);
    }
  };

  const fetchTxHist = async () => {
    try {
      const { data } = await axios.get(
        `${API_URL}/player/transactions/${username}`
      );
      setTxHistory(Array.isArray(data) ? data : []);
    } catch {
      setTxHistory([]);
    }
  };

  const registerUser = async (e) => {
    e.preventDefault();
    if (!inputUsername) return setStatus("Enter username to register.");

    try {
      await axios.post(`${API_URL}/player/create`, {
        username: inputUsername,
      });
      setUsername(inputUsername);
      setAuthenticated(true);
      setStatus("Registered as " + inputUsername);
      fetchWallet(inputUsername);
      setShowGameHistory(false);
      setShowTxHistory(false);
    } catch (err) {
      setStatus(
        "Registration error: " + (err.response?.data?.msg || err.message)
      );
    }
  };

  const loginUser = async (e) => {
    e.preventDefault();
    if (!inputUsername)
      return setStatus("Enter your registered username to login.");

    setUsername(inputUsername);
    setAuthenticated(true);
    setStatus("Logged in as " + inputUsername);
    fetchWallet(inputUsername);
    setShowGameHistory(false);
    setShowTxHistory(false);
  };

  const placeBet = async (e) => {
    e.preventDefault();
    setStatus("Placing bet...");

    if (!betAmount || isNaN(betAmount) || betAmount <= 0)
      return setStatus("Enter valid USD amount.");

    try {
      await axios.post(`${API_URL}/game/bet`, {
        username,
        usd_amount: Number(betAmount),
        currency: betCurrency,
      });

      setStatus(`Bet placed: $${betAmount} in ${betCurrency}`);
      setBetActive(true);
      setBetInfo({
        amount: Number(betAmount),
        currency: betCurrency,
        time: Date.now(),
      });
      setLastPL(null);
      fetchWallet(username);
      setShowGameHistory(false);
      setShowTxHistory(false);
    } catch (err) {
      setStatus("Bet error: " + (err.response?.data?.msg || err.message));
      setBetActive(false);
    }
  };

  const cashout = (e) => {
    e.preventDefault();
    if (!betActive) return setStatus("No active bet to cash out.");

    if (socket) {
      socket.emit("cashout", { username });
      setStatus("Cashout requested...");
    }
  };

  const logout = () => {
    if (socket) socket.disconnect();
    setInputUsername("");
    setUsername("");
    setAuthenticated(false);
    setBetAmount("");
    setBetCurrency("BTC");
    setWallet({
      BTC: "0.0000000000",
      ETH: "0.0000000000",
    });
    setStatus("Logged out.");
    setLastPL(null);
    setBetInfo(null);
    setBetActive(false);
    setGameHistory([]);
    setTxHistory([]);
    setShowGameHistory(false);
    setShowTxHistory(false);
    setNextRoundTime(null);
    setSecondsToNextRound(null);
    setCurrentMultiplier(1.0);
    setGamePhase("waiting");
    setSocketId("");
    setConnectionStatus("Disconnected");
  };

  // ✅ Socket Connection Status Display Component
  function ConnectionStatus() {
    return (
      <div
        className="connection-status"
        style={{
          padding: "10px",
          margin: "10px 0",
          border: "1px solid #ddd",
          borderRadius: "5px",
          backgroundColor:
            connectionStatus === "Connected" ? "#d4edda" : "#f8d7da",
        }}
      >
        <div style={{ fontWeight: "bold" }}>
          🔌 Socket Status:
          <span
            style={{
              marginLeft: "10px",
              color: connectionStatus === "Connected" ? "#155724" : "#721c24",
            }}
          >
            {connectionStatus}
          </span>
        </div>
        {socketId && (
          <div style={{ fontSize: "14px", marginTop: "5px", color: "#666" }}>
            Socket ID: <code>{socketId}</code>
          </div>
        )}
      </div>
    );
  }

  // Conditional Multiplier Display - Only show when bet is active
  function MultiplierDisplay() {
    if (!betActive) return null;

    return (
      <div className="multiplier-display">
        <h2>Live Multiplier</h2>
        <div
          className="multiplier-value"
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color:
              gamePhase === "flying"
                ? "#00ff88"
                : gamePhase === "crashed"
                ? "#ff4757"
                : "#ffa500",
          }}
        >
          {currentMultiplier.toFixed(2)}x
        </div>
        <div className="game-phase">
          Status: <strong>{gamePhase.toUpperCase()}</strong>
        </div>
        {betInfo && (
          <div
            className="potential-win"
            style={{ marginTop: "10px", fontSize: "18px" }}
          >
            Potential Win:{" "}
            <strong>${(betInfo.amount * currentMultiplier).toFixed(2)}</strong>
          </div>
        )}
      </div>
    );
  }

  function WalletView() {
    return (
      <div>
        <h3>💰 Wallet</h3>
        <p>BTC: {wallet.BTC}</p>
        <p>ETH: {wallet.ETH}</p>
      </div>
    );
  }

  function GameHistoryView() {
    if (!showGameHistory) return null;

    return (
      <div className="history-section">
        <h3>🎮 Game History</h3>
        {gameHistory.length === 0 ? (
          <p>No game history available</p>
        ) : (
          <div className="history-list">
            {gameHistory.slice(0, 10).map((round, index) => (
              <div key={round._id || index} className="history-item">
                <div>
                  <strong>
                    Round #{round.round_id?.slice(-6) || "Unknown"}
                  </strong>
                </div>
                <div>
                  Crashed at:{" "}
                  <span style={{ color: "#ff4757", fontWeight: "bold" }}>
                    {round.crash_point ? `${round.crash_point}x` : "N/A"}
                  </span>
                </div>
                <div>Players: {round.bets?.length || 0}</div>
                <div>
                  {round.createdAt
                    ? new Date(round.createdAt).toLocaleTimeString()
                    : "Unknown time"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function TransactionHistoryView() {
    if (!showTxHistory) return null;

    return (
      <div className="history-section">
        <h3>📋 My Transactions</h3>
        {txHistory.length === 0 ? (
          <p>No transactions yet</p>
        ) : (
          <div className="history-list">
            {txHistory.slice(0, 10).map((tx, index) => (
              <div key={tx._id || index} className="history-item">
                <div>
                  <strong
                    style={{
                      color:
                        tx.transaction_type === "bet" ? "#e04b4b" : "#23b26d",
                    }}
                  >
                    {tx.transaction_type === "bet" ? "📤 BET" : "📥 CASHOUT"}
                  </strong>
                </div>
                <div>Amount: ${Number(tx.usd_amount || 0).toFixed(2)}</div>
                <div>Currency: {tx.currency || "N/A"}</div>
                <div>Crypto: {Number(tx.crypto_amount || 0).toFixed(8)}</div>
                <div>
                  {tx.createdAt
                    ? new Date(tx.createdAt).toLocaleString()
                    : "Unknown time"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="app">
        <h1>🎮 Crash Game</h1>
        <form onSubmit={registerUser}>
          <input
            type="text"
            placeholder="Username"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
          />
          <button type="submit">Register</button>
        </form>
        <form onSubmit={loginUser}>
          <input
            type="text"
            placeholder="Username"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
        <p>Status: {status}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🎮 Crash Game</h1>
        <div>
          <span>Welcome, {username}!</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {/* ✅ Socket Connection Status Display */}
      <ConnectionStatus />

      {/* Multiplier Display - Only shows when bet is active */}
      <MultiplierDisplay />

      <div className="status">Status: {status}</div>

      {secondsToNextRound > 0 && (
        <div className="countdown">Next round in: {secondsToNextRound}s</div>
      )}

      {lastPL && (
        <div style={{ color: plColor(lastPL.value) }}>
          {lastPL.label}:{" "}
          {lastPL.value ? `$${Math.abs(lastPL.value).toFixed(2)}` : ""}
        </div>
      )}

      <div className="main-content">
        <div className="left-panel">
          <WalletView />

          <div className="betting-section">
            <h3>🎯 Place Bet</h3>
            <form onSubmit={placeBet}>
              <input
                type="number"
                placeholder="USD Amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={betActive}
              />
              <select
                value={betCurrency}
                onChange={(e) => setBetCurrency(e.target.value)}
                disabled={betActive}
              >
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
              <button type="submit" disabled={betActive}>
                {betActive ? "Bet Active" : "Place Bet"}
              </button>
            </form>

            {betActive && betInfo && (
              <div className="active-bet">
                <p>
                  Active Bet: ${betInfo.amount} in {betInfo.currency}
                </p>
                <button
                  onClick={cashout}
                  disabled={gamePhase !== "flying"}
                  style={{
                    backgroundColor:
                      gamePhase === "flying" ? "#28a745" : "#6c757d",
                    color: "white",
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: gamePhase === "flying" ? "pointer" : "not-allowed",
                  }}
                >
                  💰 Cash Out at {currentMultiplier.toFixed(2)}x
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="history-buttons">
            <button
              onClick={() => {
                setShowGameHistory(!showGameHistory);
                setShowTxHistory(false);
                if (!showGameHistory) fetchGameHist();
              }}
            >
              {showGameHistory ? "Hide" : "Show"} Game History
            </button>
            <button
              onClick={() => {
                setShowTxHistory(!showTxHistory);
                setShowGameHistory(false);
                if (!showTxHistory) fetchTxHist();
              }}
            >
              {showTxHistory ? "Hide" : "Show"} My Transactions
            </button>
          </div>

          <GameHistoryView />
          <TransactionHistoryView />
        </div>
      </div>
    </div>
  );
}

export default App;
