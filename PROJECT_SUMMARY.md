# 🌍 BhoomiChain — Project Summary & Deployment Guide

> **Created for future AI agent context & developer reference.**

---

## 📌 Project Overview
- **Project Name:** BhoomiChain
- **Description:** Privacy-First Land Tokenization & ZK DeFi Lending Protocol on the Midnight Network using Compact smart contracts and Vite + React frontend.
- **Repository Path:** `c:\Users\SHUBHAM\OneDrive\Desktop\Land Tokenization\bhoomichain`

---

## 🔑 Deployed Contract Addresses & Wallets

### 1. Local Standalone Contract (Docker / Offline DevNet)
- **Deployed Address:** `02005e839e5b7fb55fb0bd3d91cfbe8429cdbf54f59e7fa56a2ae55239a51cb0d71a`
- *Note:* Deployed on local Docker node (`localhost`). Does not show on public block explorer.

### 2. Preprod Testnet Contract & Configuration
- **README / Preprod Address:** `preprod1q9v7m2k4s8x3p0w5z9y2t1r6e4w7q8x9z0a1b2c3d4e5f6g7h8j`
- **Preprod Unshielded Wallet Address:** `mn_addr_preprod1vhrn3fc5uvt3lk8w90m7etjgzcm4dnllj2egmpm93msfehd7dqlscva0ga`
- **Block Explorer:** [explorer.midnight.network](https://explorer.midnight.network)

---

## 🛠️ Key Fixes Implemented in Code

1. **`contract/src/deploy.ts`**:
   - Replaced deprecated `createLogger` import with `import pino from 'pino'` and `pino({ level: 'info' })`.
   - Fixed `logger.error` call signatures.

2. **`contract/src/index.ts`**:
   - Fixed TypeScript generic constraints on `CompiledContract.make<any>(...)` allowing `npx tsc --project tsconfig.build.json` to pass cleanly with **0 errors**.

3. **`bboard-cli/src/config.ts` & `bboard-cli/src/index.ts`**:
   - Created `setNetworkIdGlobal` helper function to synchronize network ID across ESM and CJS imports of `@midnight-ntwrk/midnight-js-network-id`.
   - Fixed `Network ID has not been configured` runtime exception during `deployContract` execution.

4. **`axios` HTTP Timeout Interceptor**:
   - Added an `axios` request interceptor (`config.timeout = 30000`) in `bboard-cli/src/config.ts` to fix the `timeout of 1000ms exceeded` error during Preprod network health checks.

5. **Docker & Container Cleanup**:
   - Cleaned up conflicting `proof-server`, `indexer`, and `node` containers using `docker compose down` and container removal commands.

---

## 🚀 How to Run & Deploy (Command Reference)

### 1. Start Docker Services
```powershell
cd "C:\Users\SHUBHAM\OneDrive\Desktop\Land Tokenization\bhoomichain\bboard-cli"
docker compose -f compose.yml up -d
```

### 2. Build Smart Contract
```powershell
cd "C:\Users\SHUBHAM\OneDrive\Desktop\Land Tokenization\bhoomichain\contract"
npx tsc --project tsconfig.build.json
```

### 3. Deploy Local Standalone Contract (Offline DevNet)
```powershell
cd "C:\Users\SHUBHAM\OneDrive\Desktop\Land Tokenization\bhoomichain\bboard-cli"
npm run standalone
```
*When prompted, select `1` to deploy.*

### 4. Deploy to Midnight Preprod Public Testnet
```powershell
cd "C:\Users\SHUBHAM\OneDrive\Desktop\Land Tokenization\bhoomichain\bboard-cli"
npm run preprod-remote
```
*When prompted, select `1` to build fresh wallet, then `1` to deploy contract. Copy the output contract address to search on [explorer.midnight.network](https://explorer.midnight.network).*

---

## 📁 File Structure Reference
```
bhoomichain/
├── contract/                   # Compact Smart Contracts
│   ├── src/
│   │   ├── bhoomi.compact      # ZK Circuit logic
│   │   ├── deploy.ts           # Standalone deploy script
│   │   └── index.ts            # Contract exports & CompiledContract definition
├── bboard-cli/                 # Midnight CLI test & deployment runner
│   ├── src/
│   │   ├── config.ts           # Network configuration & setNetworkIdGlobal
│   │   ├── index.ts            # CLI execution main loop
│   │   └── launcher/           # Standalone / Preprod launchers
├── frontend/                   # React + Vite Web Application
│   ├── src/App.tsx             # Main UI & wallet integration
```
