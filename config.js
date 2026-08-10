const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './server/config/local.env' });
}

module.exports = {
  PORT: process.env.PORT || 5001,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  NODE_ENV: process.env.NODE_ENV,
  INITIAL_CHIPS_AMOUNT: 100000,
  TURN_TIMEOUT_MS: 15000,
  BOT_THINK_MS: 800,
  BJ_SHOE_DECKS: 6,
  SNG_BUYIN: 1000,
  SNG_STACK: 5000,
  MTT_BUYIN: 1000,
  MTT_STACK: 5000,
  CASH_TABLES: [
    { id: 1, name: 'Neon Micro', limit: 10000, maxPlayers: 5, minBet: 25 },
    { id: 2, name: 'Velvet Mid', limit: 50000, maxPlayers: 5, minBet: 100 },
    { id: 3, name: 'Black Diamond', limit: 100000, maxPlayers: 5, minBet: 250 },
  ],
  BLACKJACK_TABLES: [
    { id: 101, name: 'Ace Lounge', minBet: 10, maxBet: 500 },
    { id: 102, name: 'High Limit Pit', minBet: 50, maxBet: 2000 },
  ],  
  // PROTO token economy (1 PROTO = CHIPS_PER_PROTO in-game chips)
  CHIPS_PER_PROTO: Number(process.env.CHIPS_PER_PROTO) || 1000,
  PROTO_TOKEN_ADDRESS: process.env.PROTO_TOKEN_ADDRESS || '',
  PROTO_TREASURY_ADDRESS: process.env.PROTO_TREASURY_ADDRESS || '',
  PROTO_CHAIN_ID: Number(process.env.PROTO_CHAIN_ID) || 31337,
  PROTO_DEMO_MODE: process.env.PROTO_DEMO_MODE !== 'false',
  USDC_ADDRESS: process.env.USDC_ADDRESS || '',
  USDT_ADDRESS: process.env.USDT_ADDRESS || '',
  // Image file service
  IMAGE_MAX_BYTES: Number(process.env.IMAGE_MAX_BYTES) || 5 * 1024 * 1024,
  PUBLIC_API_URL: process.env.PUBLIC_API_URL || '',
  // IPFS — pin uploads to Pinata and/or local Kubo
  // IPFS_PROVIDER: auto | pinata | kubo | none
  IPFS_PROVIDER: process.env.IPFS_PROVIDER || 'auto',
  IPFS_ENABLED: process.env.IPFS_ENABLED === 'true',
  IPFS_API_URL: process.env.IPFS_API_URL || '',
  IPFS_GATEWAY_URL: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs',
  PINATA_JWT: process.env.PINATA_JWT || '',
};
