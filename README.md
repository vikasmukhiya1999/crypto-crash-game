# 🎯 Crypto Crash Game

> **Real-time multiplayer crash game with provably fair gameplay and cryptocurrency betting**

## ✨ Features

🎲 **Fair Algo** - Cryptographic hash-based crash point generation
💰 **Crypto Wallets** - BTC/ETH betting with real-time USD conversion
⚡ **Real-time Gameplay** - Live multiplier updates via Socket.IO
📊 **Live Prices** - CoinGecko API integration
📈 **Complete History** - Transaction and game round tracking

## 🚀 Quick Start

**Test the game:** Use username `elon` on the [live demo](https://crypto-crash-game947.netlify.app/)

```bash
# Clone & Install
git clone https://github.com/vikasmukhiya1999/crypto-crash-game.git

cd crypto-crash-game

# Backend
cd server && npm install && npm run dev

# Frontend
cd client && npm install && npm run dev
```

## ⚙️ Environment Setup

### Server (.env) # server/.env

```bash
PORT=3000
MONGO_URI=your_mongodb_connection_string
API_KEY=your_coinmarketcap_api_key
NODE_ENV=development
FRONTEND_URL=your_frontend_url
```

### Client (.env) # client/.env

```bash
VITE_SOCKET_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api
```

## 🎮 How It Works

1. **Place Bet** - Choose BTC/ETH amount during betting phase
2. **Watch Multiplier** - Live multiplier increases in real-time
3. **Cash Out** - Click before crash to win (bet × multiplier)
4. **Crash** - Game ends randomly, uncashed bets lost

## 🛠️ Tech Stack

**Frontend:** React + Vite + Socket.IO Client
**Backend:** Node.js + Express + Socket.IO
**Database:** MongoDB
**APIs:** CoinMarketCap (crypto prices)

## 📚 Documentation

For detailed information checkout:

- [`client/README.md`](client/README.md) - Frontend implementation
- [`server/README.md`](server/README.md) - Backend API \& WebSocket docs

## 🔐 Fair Algorithm

Each round uses cryptographic hashing to ensure fairness:

- Random seed → SHA-256 hash → Crash multiplier
- Transparent, verifiable, impossible to manipulate

**🎯 Start playing:** [crypto-crash-game947.netlify.app](https://crypto-crash-game947.netlify.app/) |

**Test user:**
under username type `elon` and test the application
