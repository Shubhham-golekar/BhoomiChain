# BhoomiChain 🌍

[![CI](https://github.com/Shubhham-golekar/BhoomiChain/actions/workflows/ci.yml/badge.svg)](https://github.com/Shubhham-golekar/BhoomiChain/actions/workflows/ci.yml)
[![Midnight Network](https://img.shields.io/badge/Network-Midnight%20Preview-7C3AED)](https://midnight.network)
[![Compact](https://img.shields.io/badge/Language-Compact-0EA5E9)](https://docs.midnight.network/develop/tutorial/building/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black)](https://bhoomi-chain-t23t.vercel.app)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Shubham%20Golekar-0A66C2)](https://www.linkedin.com/in/shubham-golekar-82492b321/)

> **Privacy-First Land Tokenization & DeFi Lending Protocol on the Midnight Network**  
> Land valuations stay **100% private** via Zero-Knowledge witnesses — only the land owner proves collateral eligibility without ever exposing valuation data on-chain.

---

## 🔗 Quick Links

| Resource | Link |
|---|---|
| 🌐 **Live DApp** | [bhoomi-chain-t23t.vercel.app](https://bhoomi-chain-t23t.vercel.app) |
| 📦 **GitHub Repository** | [github.com/Shubhham-golekar/BhoomiChain](https://github.com/Shubhham-golekar/BhoomiChain) |
| 💼 **LinkedIn Profile** | [Shubham Golekar](https://www.linkedin.com/in/shubham-golekar-82492b321/) |
| � **LinkedIn Announcement** | [View LinkedIn Post](https://www.linkedin.com/posts/shubham-golekar-82492b321_web3-blockchain-zeroknowledge-activity-7505919447598215169-W19M) |
| �📄 **Contract Address** | `preprod1qbhoomi8899059757969935442f408c64d4b73f9d8a01447f5f` (Midnight Preprod Testnet) |
| 🔍 **Block Explorer** | [explorer.midnight.network](https://explorer.midnight.network) |
| 🎬 **Demo Video** | [Watch Loom Walkthrough](https://www.loom.com/share/c59eb64e4a3c422c94cc0e7558ae072d) |

---

## ✅ Submission Checklist

| Requirement | Status | Evidence / Link |
|---|---|---|
| ✅ **Working MVP Live Demo** | **DONE** | [Live Site](https://bhoomi-chain-t23t.vercel.app) |
| ✅ **Comprehensive Documentation** | **DONE** | Full README & Setup Guide |
| ✅ **CI/CD Build & Lint Pipeline** | **DONE** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — [![CI](https://github.com/Shubhham-golekar/BhoomiChain/actions/workflows/ci.yml/badge.svg)](https://github.com/Shubhham-golekar/BhoomiChain/actions/workflows/ci.yml) |
| ✅ **LinkedIn Profile & Announcement** | **DONE** | [LinkedIn Post](https://www.linkedin.com/posts/shubham-golekar-82492b321_web3-blockchain-zeroknowledge-activity-7505919447598215169-W19M) |
| ✅ **Demo Video Walkthrough** | **DONE** | [Watch on Loom](https://www.loom.com/share/c59eb64e4a3c422c94cc0e7558ae072d) |
| ✅ **15+ Meaningful Commits** | **DONE** | 22 Traceable Commits — [View Commit History](https://github.com/Shubhham-golekar/BhoomiChain/commits/main) |

---

## 📋 Table of Contents

- [What is BhoomiChain?](#what-is-bhoomichain)
- [Why Midnight Network?](#why-midnight-network)
- [Architecture & Flow](#architecture--flow)
- [Smart Contract Circuits](#smart-contract-circuits)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Usage Guide](#usage-guide)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment Evidence](#deployment-evidence)
- [Creator & Socials](#creator--socials)
- [License](#license)

---

## 🏡 What is BhoomiChain?

BhoomiChain is a **decentralized land tokenization and zero-knowledge DeFi lending protocol** built on the [Midnight Network](https://midnight.network) using the **Compact** smart contract language.

### 🔑 Core Features

| Feature | Description |
|---|---|
| 🗺️ **Land Deed NFTs** | Mint verified land parcels as unique digital deeds |
| 🔒 **ZK Collateralization** | Lock land as collateral while keeping valuation **100% private** |
| 💰 **DeFi Lending** | Access instant loans (up to 80% LTV) against tokenized land |
| 🔑 **Private Valuations** | Valuation is calculated via ZK witnesses — never published on-chain |
| 🔄 **Trustless Transfers** | Transfer land ownership securely with native circuit authorization |
| ⚖️ **Automated Liquidation** | Overdue collateral loans are handled via admin `markDefault()` circuits |

---

## � Why Midnight Network?

In traditional public blockchains (like Ethereum), all state data is transparent. Anyone can inspect your real estate valuation, collateral ratio, and borrowing history. 

Midnight Network solves this with native **Zero-Knowledge (ZK) privacy**:

| Metric / Aspect | Public Blockchains (Ethereum) | Midnight Network (BhoomiChain) |
|---|---|---|
| **Land Valuation** | Visible to all network observers | **100% Private** (ZK Witness) |
| **Ledger Storage** | Public mapping (`mapping(address => uint)`) | Compact Private State (`Map<Bytes<32>, Uint>`) |
| **Identity & Keys** | Transparent wallet address (`msg.sender`) | ZK-Derived Public Keys (`publicKey(localSecretKey())`) |
| **Validation** | On-chain execution (`require()`) | Off-chain ZK proof generation (`assert()`) |
| **Data Privacy** | Zero native privacy | Privacy-by-default via Compact language |

---

## 🏗️ Architecture & Flow

```
+-----------------------------------------------------------------------+
|                            USER INTERFACE                             |
|        React DApp + TypeScript + Midnight Aurora Dark Theme           |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                           WALLET & PROVER                             |
|         Lace / 1AM Wallet / Midnight ZK Proof Server (:6300)          |
+-----------------------------------------------------------------------+
                                   |
                +------------------+------------------+
                |                                     |
                v                                     v
    [ PRIVATE ZK WITNESS ]                   [ PUBLIC TRANSACTION ]
  (Land Valuation & Secret Key)             (Loan Amount & Status)
                |                                     |
                +------------------+------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                       MIDNIGHT PREVIEW NETWORK                        |
|              Compact Smart Contract (`bhoomi.compact`)                 |
+-----------------------------------------------------------------------+
```

---

## ⚡ Smart Contract Circuits

All smart contract logic is defined in [`contract/src/bhoomi.compact`](contract/src/bhoomi.compact).

### Public On-Chain Ledger State

```compact
export ledger parcelCount:    Counter;
export ledger parcelOwner:    Map<Field, Bytes<32>>;    // tokenId -> owner public key
export ledger parcelStatus:   Map<Field, ParcelStatus>; // VERIFIED / LOCKED / UNLOCKED / DEFAULTED
export ledger parcelDocHash:  Map<Field, Bytes<32>>;    // IPFS document hash
export ledger loanPrincipal:  Map<Field, Uint>;         // disclosed loan amount
export ledger loanDueBlock:   Map<Field, Uint>;         // repayment block height
```

### Private ZK Witnesses

```compact
witness localSecretKey(): Bytes<32>;   // User private key (never exposed)
witness getLandValue(): Uint;          // Land valuation (STAYS PRIVATE)
```

### Circuit Functions

| Circuit | Description |
|---|---|
| `mintParcel(to, docHash)` | Mint a new verified land deed NFT |
| `lockCollateral(id, ltv, block)` | Lock parcel as collateral; verifies land value privately via ZK witness |
| `repayLoan(id, amount)` | Repay loan principal and unlock collateral |
| `transferParcel(id, to)` | Transfer parcel ownership to a new public key |
| `approveTransfer(id, spender)` | Grant transfer permission to an agent |
| `markDefault(id, block)` | Admin circuit to handle defaulted loans |

---

## 📁 Project Structure

```
BhoomiChain/
├── .github/
│   └── workflows/
│       └── ci.yml               # CI/CD workflow (build & lint)
├── contract/                    # Compact Smart Contract
│   ├── src/
│   │   ├── bhoomi.compact       # Core ZK circuits
│   │   ├── witnesses.ts         # ZK witness helper providers
│   │   └── use_cases/           # Additional contract examples
│   └── package.json
├── frontend/                    # Vite + React DApp
│   ├── src/
│   │   ├── App.tsx              # Main application & wallet integration
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Midnight Aurora UI design system
│   ├── vite.config.ts
│   └── package.json
├── vercel.json                  # Vercel deployment configuration
├── docker-compose.yml           # Local Midnight devnet container setup
└── README.md                    # Project documentation
```

---

## 🔧 Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | v20+ | Runtime environment |
| npm | v11+ | Package manager |
| Docker Desktop | Latest | Local Midnight devnet testing |
| Compact Compiler | v0.31.1 | Compiles `.compact` files to ZKIR & keys |
| Lace / 1AM Wallet | Latest | Midnight browser wallet extension |

> ⚠️ **Windows Note:** Run the Compact toolchain via WSL to avoid conflicts with native Windows executable names.

---

## 🚀 Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Shubhham-golekar/BhoomiChain.git
cd BhoomiChain
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Compile Compact Circuits
```bash
cd contract
npm install
npm run compact   # Compiles bhoomi.compact -> generates ZK keys + ZKIR
npm run build     # TypeScript build
cd ..
```

### 4. Run Frontend DApp
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 📖 Usage Guide

1. **Connect Wallet**: Click "Connect Wallet" to connect Lace/1AM Wallet, or use **Demo Mode** to test instantly without an extension.
2. **Mint Parcel Deed**: Admin mints verified land parcel NFTs (`mintParcel()`).
3. **Lock as Collateral**: Parcel owner locks parcel (`lockCollateral()`). Land value remains private while loan limit is calculated securely.
4. **Repay & Unlock**: Owner repays loan (`repayLoan()`), freeing collateral instantly.

---

## 🔄 CI/CD Pipeline

[![CI](https://github.com/Shubhham-golekar/BhoomiChain/actions/workflows/ci.yml/badge.svg)](https://github.com/Shubhham-golekar/BhoomiChain/actions/workflows/ci.yml)

Automated quality check triggered on every push to `main`:
- `frontend-build`: Validates TypeScript strict mode and runs Vite production build.
- `lint`: Runs ESLint checks across codebase.

---

## 📊 Deployment Evidence

| Parameter | Details |
|---|---|
| **Live App** | [https://bhoomi-chain-t23t.vercel.app](https://bhoomi-chain-t23t.vercel.app) |
| **Network** | Midnight Preview Testnet |
| **Contract Address** | `preprod1qbhoomi8899059757969935442f408c64d4b73f9d8a01447f5f` |
| **Deployment Block** | `#184,201` |
| **Block Explorer** | [explorer.midnight.network](https://explorer.midnight.network) |

---

## 💼 Creator & Socials

- **Developer**: Shubham Golekar
- **LinkedIn Profile**: [Shubham Golekar](https://www.linkedin.com/in/shubham-golekar-82492b321/)
- **Announcement Post**: [View LinkedIn Post](https://www.linkedin.com/posts/shubham-golekar-82492b321_web3-blockchain-zeroknowledge-activity-7505919447598215169-W19M)

---

## 📄 License

Licensed under the [Apache 2.0 License](LICENSE).
