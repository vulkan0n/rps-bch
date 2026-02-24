# RPS×BCH

A peer-to-peer Rock, Paper, Scissors game where players wager real **Bitcoin Cash**. No server, no accounts, no intermediaries — just connect a wallet and play.

## How it works

1. **Connect a wallet** — create a new one in-browser or import an existing one via WIF private key.
2. **Create or join a game** — publish a match with a BCH bet amount to the lobby, or accept one from another player.
3. **Play** — both players commit their move as a hash before revealing it, preventing cheating.
4. **Get paid** — the winner receives the BCH directly. In case of a draw, each player gets their bet back.

All match state is synchronized in real time between peers. No central server handles game logic or funds.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 (Composition API) + Pinia + Vue Router |
| Build tool | Vite |
| P2P sync | GunDB (decentralized real-time database) |
| Blockchain | Bitcoin Cash (mainnet) |
| BCH library | mainnet-js |

## Commit-reveal protocol

To prevent a player from choosing their move after seeing the opponent's, moves are committed as `SHA256(move + secret)` before being revealed. Both players must commit before either can reveal, making cheating impossible.

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build for production

```bash
npm run build
npm run preview
```
