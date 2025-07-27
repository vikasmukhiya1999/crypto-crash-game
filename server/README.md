# Crash Game Backend

Real-time multiplayer crash game with provably fair gameplay, crypto wallets, and live multiplier updates.

## Features

- Provably fair crash point generation using cryptographic hashing
- Real-time gameplay with Socket.IO
- BTC/ETH wallet management with USD conversion
- Live crypto price integration (CoinGecko API)
- Complete transaction history

## Quick Start

**Prerequisites:** Node.js 18+, MongoDB

```bash
npm install
npm run dev
```

**Environment Setup:** Create `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/crash-game
COINGECKO_API=https://api.coingecko.com/api/v3/simple/price
PORT=3000
```

## API Documentation

**Base URL:** `http://localhost:3000/api`

### Player Management

#### Create Player

```http
POST /player/create
Content-Type: application/json

{
  "username": "player123"
}
```

**Success Response (201):**
```json
{
  "_id": "64a1b2c3d4e5f6789abcdef0",
  "username": "player123",
  "wallets": [
    { "currency": "BTC", "balance": 0 },
    { "currency": "ETH", "balance": 0 }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (400):**
```json
{
  "msg": "Username already exists"
}
```

#### Get Wallet Balance

```http
GET /player/wallet/player123
```

**Success Response (200):**
```json
{
  "username": "player123",
  "wallets": [
    {
      "currency": "BTC",
      "balance": 0.00023456,
      "usd_value": "10.25"
    },
    {
      "currency": "ETH",
      "balance": 0.00456789,
      "usd_value": "15.75"
    }
  ]
}
```

**Error Response (404):**
```json
{
  "msg": "Player not found"
}
```

#### Get Transaction History

```http
GET /player/transactions/player123
```

**Success Response (200):**
```json
[
  {
    "_id": "64a1b2c3d4e5f6789abcdef1",
    "player": "64a1b2c3d4e5f6789abcdef0",
    "usd_amount": 10,
    "crypto_amount": 0.00023456,
    "currency": "BTC",
    "transaction_type": "bet",
    "transaction_hash": "tx_1705312200000_456",
    "price_at_time": 42650.50,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "64a1b2c3d4e5f6789abcdef2",
    "player": "64a1b2c3d4e5f6789abcdef0",
    "usd_amount": 25.50,
    "crypto_amount": 0.00987654,
    "currency": "ETH",
    "transaction_type": "cashout",
    "transaction_hash": "tx_1705312260000_789",
    "price_at_time": 2584.75,
    "createdAt": "2024-01-15T10:31:00.000Z",
    "updatedAt": "2024-01-15T10:31:00.000Z"
  }
]
```

### Game Operations

#### Place Bet

```http
POST /game/bet
Content-Type: application/json

{
  "username": "player123",
  "usd_amount": 10.00,
  "currency": "BTC"
}
```

**Success Response (200):**
```json
{
  "msg": "Bet placed successfully",
  "usd_amount": 10,
  "cryptoAmount": 0.00023456,
  "currency": "BTC",
  "round_id": "ROUND-1705312200000"
}
```

**Error Responses:**

*Player not found (404):*
```json
{
  "msg": "Player not found"
}
```

*Insufficient balance (400):*
```json
{
  "msg": "Insufficient balance"
}
```

*Invalid currency (400):*
```json
{
  "msg": "Unsupported currency"
}
```

*Round not active (400):*
```json
{
  "msg": "Round not active or already bet placed"
}
```

#### Get Game History

```http
GET /game/history
```

**Success Response (200):**
```json
[
  {
    "_id": "64a1b2c3d4e5f6789abcdef3",
    "round_id": "ROUND-1705312200000",
    "start_time": "2024-01-15T10:30:00.000Z",
    "crash_point": 2.45,
    "is_active": false,
    "bets": [
      {
        "player": "64a1b2c3d4e5f6789abcdef0",
        "usd_amount": 10,
        "crypto_amount": 0.00023456,
        "currency": "BTC",
        "multiplier_at_cashout": 2.1,
        "status": "cashed_out"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:32:30.000Z",
    "duration_ms": 150000
  }
]
```

#### Start New Round (Testing)

```http
POST /game/start-round
```

**Success Response (200):**
```json
{
  "msg": "✅ Manual round started"
}
```

**Error Response (500):**
```json
{
  "msg": "Failed to start round",
  "error": "Round already active"
}
```

#### Force Crash (Testing)

```http
POST /game/force-crash
```

**Success Response (200):**
```json
{
  "msg": "🛑 Round crashed manually"
}
```

**Error Response (500):**
```json
{
  "msg": "Failed to crash round",
  "error": "No active round found"
}
```

## WebSocket Events

### Client Events

- `cashout` - Request cashout with username

### Server Events

- `round_start` - New round begins
- `multiplier_update` - Live multiplier updates
- `round_crash` - Round ends with crash point
- `player_cashout` - Player successfully cashed out

## Provably Fair System

The game uses cryptographic hashing to ensure fairness:

1. **Random Seed Generation** - 32-character hex string created for each round
2. **Hash Creation** - Seed + Round ID processed through SHA-256
3. **Crash Point Calculation** - Hash converted to multiplier (1.01x - 100x)

**Why It's Fair:**

- Outcomes determined before round starts
- Impossible to predict or manipulate
- Anyone can verify results using the same algorithm
- Complete transparency and mathematical proof

## Price Integration

- **Source:** CoinGecko API (BTC/ETH prices)
- **Caching:** 10-second intervals to reduce API calls
- **Conversion:** USD amounts converted to crypto for betting
- **Audit Trail:** Price snapshots stored with each transaction

## Project Structure

```
server/
├── controllers/     # API request handlers
├── models/         # MongoDB schemas
├── routes/         # API route definitions
├── services/       # Game engine & price fetching
├── sockets/        # WebSocket event handling
├── utils/          # Provably fair algorithms
├── seed/           # Database seeding
└── server.js       # Main application entry point
```
