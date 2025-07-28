# Crash Game Client

A real-time cryptocurrency crash game built with React, Vite, and Socket.IO.

## Socket.IO Implementation

This client uses Socket.IO for real-time communication with the game server to handle:

### Real-time Events

- **`round_start`** - New game round begins, enables betting
- **`round_crash`** - Game crashes at multiplier, processes losses
- **`player_cashout`** - Player successfully cashes out, calculates profits
- **`error`** - Server error messages

### Socket Connection

```javascript
const socket = io(VITE_SOCKET_URL);
```

The socket connects when a user authenticates and handles:
- Automatic reconnection
- Real-time game state updates
- Player cashout requests via `socket.emit("cashout", { username })`

### Environment Variables

Create a `.env` file:

```
VITE_SOCKET_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api
```

## Features

- **Real-time Betting**: Place bets in BTC/ETH during active rounds
- **Live Cashouts**: Cash out before the crash via Socket.IO
- **Wallet Management**: Real-time balance updates
- **Game History**: View past rounds and crash points
- **Transaction History**: Track betting activity

## Quick Start

```bash
npm install
npm run dev
```

The app connects to the Socket.IO server for real-time game events and uses REST API calls for user management and betting operations.