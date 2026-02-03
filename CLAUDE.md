# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RPS-BCH is a peer-to-peer Rock-Paper-Scissors game with Bitcoin Cash wagers. It uses Vue 3 for the frontend, GunDB for real-time P2P communication, and CashScript smart contracts for on-chain settlement.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with HMR
npm run build        # Production build
npm run preview      # Preview production build
```

Note: No test runner or linter is configured.

## Architecture

### Tech Stack
- **Frontend:** Vue 3 (Composition API) + Pinia + Vue Router
- **Build:** Vite 7.3
- **P2P:** GunDB (relay at https://gundb-relay.onrender.com/gun)
- **Blockchain:** mainnet-js + CashScript (Bitcoin Cash)

### Key Modules

| File | Purpose |
|------|---------|
| `src/lib/gun-manager.js` | GunDB singleton for P2P lobby and match sync |
| `src/lib/wallet-service.js` | BCH wallet creation, import, balance, transactions |
| `src/lib/game-logic.js` | Move encoding, commit/reveal hashes, winner logic |
| `src/stores/game.js` | Pinia store for player and match state |
| `src/contracts/RockPaperScissors.cash` | CashScript contract for on-chain settlement |

### Game Flow

1. **GameLobby.vue** - Player connects wallet, creates/joins match via GunDB
2. **GameRoom.vue** - Four phases: Selecting → Waiting (commit) → Revealing → Result

### Commit-Reveal Protocol

Players commit SHA256(move + secret) to GunDB before revealing. Both must commit before either reveals, preventing cheating.

### Path Aliases

`@/*` maps to `./src/*` (configured in jsconfig.json)

## Notas de desarrollo

- GunDB requiere propiedades planas (no anidadas) para que `.on()` las detecte
- El rol del jugador (A/B) se detecta comparando la dirección de wallet con playerA/playerB del match
