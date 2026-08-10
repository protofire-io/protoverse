# PROTO Token

ProtoVerse native ERC-20, modeled on Mini Games’ **TILE** token.

## Contracts

| Contract | Role |
|---|---|
| `ProtoToken` | ERC-20 `PROTO` with restricted minter |
| `ProtoTreasury` | Buy, deposit/escrow, withdraw, stake, swap, demo rewards |

### Parity with TILE / TileManager

| Mini Games | ProtoVerse |
|---|---|
| `buyTile()` | `buyProto()` — 1 native wei → 1 PROTO wei |
| `claimTile()` | `claimPlayReward()` (demo capped) |
| `swapTileForRose()` | `swapProtoForNative()` / **`swapProtoForUsdc()`** |
| Play escrow | `deposit()` / `withdrawPlayCredits()` or operator `release()` |
| Future stake | `stake()` / `unstake()` |

### USDC / USDT swap

- Rate default: **1 PROTO = 1 USDC** and **1 PROTO = 1 USDT** (`usdcPerProto` / `usdtPerProto = 1e6`)
- `swapUsdcForProto` / `buyProtoWithUsdc` — mint PROTO from USDC
- `swapProtoForUsdc` — pay from treasury USDC liquidity
- `swapUsdtForProto` / `buyProtoWithUsdt` — mint PROTO from USDT
- `swapProtoForUsdt` — pay from treasury USDT liquidity
- Local deploy uses `MockUSDC` + `MockUSDT` (6 decimals) and seeds 100k of each into the treasury
- Polygon: set `USDC_ADDRESS` and `USDT_ADDRESS` before `deploy:polygon` / `deploy:amoy`

### Item shop (PROTO only)

| Contract | Role |
|---|---|
| `ProtoItems` | ERC-1155 cosmetics / game items |
| `ProtoShop` | Listings + `buy(itemId, qty)` paid in **PROTO only** |

Deploy seeds starter cosmetics grouped by video game (Hold’em, Blackjack, ProtoVerse).

## Commands

```bash
npm install
npx hardhat compile
npx hardhat test
# terminal A
npx hardhat node
# terminal B
npm run deploy:local
```

Deploy writes addresses to:

- `deployments/<network>.json`
- `client/src/contracts/addresses.json`

Polygon:

```bash
DEPLOYER_PRIVATE_KEY=0x... POLYGON_RPC_URL=... npm run deploy:polygon
# or Amoy testnet
DEPLOYER_PRIVATE_KEY=0x... npm run deploy:amoy
```

## In-game rate

`1 PROTO = 1000 chips` (`CHIPS_PER_PROTO` in `config.js`).

Lobby flow: **Buy → Deposit** (credits bankroll) → sit at tables → **Withdraw** (debits bankroll + unlocks escrow).
