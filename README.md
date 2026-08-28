# BhoomiChain 🌍

[![CI](https://github.com/YOUR_GITHUB_USERNAME/bhoomichain/actions/workflows/ci.yaml/badge.svg)](https://github.com/YOUR_GITHUB_USERNAME/bhoomichain/actions/workflows/ci.yaml)
[![Midnight Network](https://img.shields.io/badge/Network-Midnight%20Preprod-7C3AED)](https://midnight.network)
[![Compact](https://img.shields.io/badge/Language-Compact-0EA5E9)](https://docs.midnight.network/develop/tutorial/building/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green)](LICENSE)

> **Privacy-first Land Tokenization & DeFi Lending on the Midnight Network**  
> Land valuations stay **100% private** via Zero-Knowledge witnesses — only the owner can prove their land's value, without ever exposing it on-chain.

🐦 **X (Twitter):** [@BhoomiChainApp](https://x.com/BhoomiChainApp)  
🌐 **Live Demo:** [bhoomichain.vercel.app](https://bhoomichain.vercel.app)  
📄 **Contract Address (Preprod):** `contract1qv8zqx...f9d3` on Midnight Preprod  
🔍 **Block Explorer:** [explorer.midnight.network/contract/contract1qv8zqx...f9d3](https://explorer.midnight.network)

---

## 📋 Table of Contents

- [What is BhoomiChain?](#what-is-bhoomichain)
- [Why Midnight Network?](#why-midnight-network)
- [Architecture](#architecture)
- [Smart Contract Circuits](#smart-contract-circuits)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Usage Guide](#usage-guide)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment Evidence](#deployment-evidence)
- [Contributing](#contributing)

---

## 🏡 What is BhoomiChain?

BhoomiChain is a **decentralized land tokenization and DeFi lending protocol** built on the [Midnight Network](https://midnight.network) using the **Compact** smart contract language.

### 🔑 Key Features

| Feature | Description |
|---|---|
| 🗺️ **Land NFTs** | Mint verified land parcels as unique tokens (like ERC-721) |
| 🔒 **ZK Collateral** | Lock parcels as collateral — land value stays **private** |
| 💰 **DeFi Lending** | Get loans up to 80% LTV against your tokenized land |
| 🔑 **Private Valuations** | Land value is a ZK witness — never exposed on-chain |
| 🔄 **Transfer Deeds** | Transfer land ownership trustlessly on-chain |
| ⚖️ **Default Handling** | Overdue loans handled via admin `markDefault()` circuit |

### 🌟 Key Advantage Over Ethereum

On Ethereum, all data is **public** — anyone can see your land's value, loan amount ratio, and financial position.

On **Midnight + Compact**, the land valuation is a **ZK witness**: a private input that proves the loan is correctly calculated **without revealing the actual value** to anyone — including miners.

---

## 🌙 Why Midnight Network?

| Ethereum | Midnight Network (BhoomiChain) |
|---|---|
| Land value visible on-chain | Land value is a **ZK witness** (fully private) |
| `mapping(address => uint)` | `Map<Bytes<32>, Uint>` in Compact ledger |
| `msg.sender` | `publicKey(localSecretKey())` — ZK-derived identity |
| Solidity `require()` | Compact `assert()` with ZK proofs |
| Gas fees for every call | Proof generation + network fees |
| No native privacy | Privacy-by-default via Compact language |

---

## 🏗️ Architecture

```
bhoomichain/
├── contract/                    # Compact smart contract
│   └── src/
│       ├── bhoomi.compact       # Main contract (ZK circuits)
│       └── witnesses.ts         # ZK witness providers
├── frontend/                    # React + TypeScript DApp
│   └── src/
│       ├── App.tsx              # Main app + wallet integration
│       └── index.css            # Midnight Aurora dark theme
├── .github/
│   └── workflows/
│       └── ci.yaml              # CI/CD pipeline
└── docker-compose.yml           # Local Midnight devnet
```

**Flow:**
```
User → Lace/1AM Wallet → Frontend (React) → Compact ZK Circuit → Midnight Preprod Network
                                                    ↑
                               ZK Witness (private land value — never on-chain)
```

---

## ⚡ Smart Contract Circuits

All business logic lives in [`contract/src/bhoomi.compact`](contract/src/bhoomi.compact).

### Ledger State (Public, On-Chain)

```compact
export ledger parcelCount:    Counter;
export ledger parcelOwner:    Map<Field, Bytes<32>>;    // tokenId → owner PK
export ledger parcelStatus:   Map<Field, ParcelStatus>; // VERIFIED/LOCKED/UNLOCKED/DEFAULTED
export ledger parcelDocHash:  Map<Field, Bytes<32>>;    // IPFS document hash
export ledger loanPrincipal:  Map<Field, Uint>;         // disclosed loan amount
export ledger loanDueBlock:   Map<Field, Uint>;         // repayment deadline
```

### ZK Witnesses (Private, Never On-Chain)

```compact
witness localSecretKey(): Bytes<32>;   // User's private key
witness getLandValue(): Uint;          // Land valuation — STAYS PRIVATE
```

### Circuits (Ethereum Equivalent)

| Circuit | Ethereum Equivalent | What it does |
|---|---|---|
| `mintParcel(to, docHash)` | ERC-721 `mint()` | Admin mints a land deed NFT |
| `lockCollateral(id, ltv, block)` | Custom | Lock parcel; value computed via ZK witness |
| `repayLoan(id, amount)` | Custom | Repay loan — auto-unlocks collateral |
| `transferParcel(id, to)` | ERC-721 `transferFrom()` | Transfer land ownership |
| `approveTransfer(id, spender)` | ERC-721 `approve()` | Delegate transfer right |
| `markDefault(id, block)` | Custom | Admin marks overdue loan |
| `updateDocHash(id, hash)` | Custom | Admin updates document hash |

---

## 📁 Project Structure

```
bhoomichain/
├── .github/
│   └── workflows/
│       ├── ci.yaml              # Main CI: compile contract + build frontend
│       └── scan.yaml            # Security scanning
├── contract/
│   ├── src/
│   │   ├── bhoomi.compact       # ← Main Compact smart contract
│   │   ├── bboard.compact       # Bulletin board example
│   │   ├── witnesses.ts         # ZK witness providers for frontend
│   │   └── index.ts             # Contract exports
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main React app
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Dark Midnight Aurora theme
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml           # Local Midnight node + proof server
├── README.md
└── PROPOSAL.md
```

---

## 🔧 Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | v20+ | Frontend & contract tooling |
| npm | v11+ | Package manager |
| Docker Desktop | Latest | Local Midnight devnet |
| Compact compiler | v0.31.1 | Compiles `.compact` files |
| 1AM Wallet / Lace | Latest | Browser wallet for Midnight |

> ⚠️ **Windows users:** Install the Compact toolchain via WSL. The Windows native `compact` command conflicts with the Compact compiler.

---

## 🚀 Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/bhoomichain.git
cd bhoomichain
```

### 2. Install all dependencies

```bash
npm install
```

### 3. Compile the Compact smart contract

```bash
cd contract
npm install
npm run compact   # Compiles bhoomi.compact → generates ZK keys + ZKIR
npm run build     # TypeScript build
cd ..
```

> 💡 The `compact` compiler generates proving/verification keys and zero-knowledge intermediate representation (ZKIR) files used by the frontend.

### 4. Start the local Midnight devnet (optional — for local testing)

```bash
docker-compose up -d
```

This starts:
- Midnight node (local devnet)
- ZK Proof server (`:6300`)
- Indexer service

### 5. Run the frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open **http://localhost:5173** in your browser.

### 6. Connect your wallet

- **With 1AM Wallet / Lace extension:** Click "Connect Wallet" → Select "1AM Wallet / Lace"
- **Without extension:** Click "Connect Wallet" → Select "Demo Mode" to explore all features

---

## 📖 Usage Guide

### Admin: Mint a Land Parcel

1. Connect wallet (admin key required)
2. Click **"+ Mint Demo Deed"**
3. Wallet triggers `mintParcel()` circuit — ZK proof generated
4. Land deed appears in the grid with status **VERIFIED**

### Owner: Use Land as Collateral

1. Find a VERIFIED parcel in your Land Deeds
2. Click **"Use as Collateral"**
3. Wallet triggers `lockCollateral()` circuit:
   - Your land value is computed **privately** via ZK witness
   - Only the **loan amount** (50% LTV) is revealed on-chain
4. Parcel status changes to **LOCKED**

### Owner: Repay Loan & Unlock

1. Find a LOCKED parcel
2. Click **"Repay & Unlock"**
3. Wallet triggers `repayLoan()` circuit
4. Parcel status changes to **UNLOCKED** — collateral freed

### Transfer a Parcel

```
Owner → approveTransfer(parcelId, buyerPK)
Buyer → transferParcel(parcelId, newOwnerPK)
```

---

## 🔄 CI/CD Pipeline

[![CI](https://github.com/YOUR_GITHUB_USERNAME/bhoomichain/actions/workflows/ci.yaml/badge.svg)](https://github.com/YOUR_GITHUB_USERNAME/bhoomichain/actions/workflows/ci.yaml)

The pipeline runs on every `push` and `pull_request` to `main`:

| Job | What it does |
|---|---|
| `compile-contract` | Installs Compact compiler v0.31.1, compiles `bhoomi.compact`, runs contract tests |
| `frontend-check` | TypeScript typecheck + ESLint |
| `build-frontend` | Production Vite build |

**Workflow file:** [`.github/workflows/ci.yaml`](.github/workflows/ci.yaml)

---

## 📊 Deployment Evidence

### Midnight Preprod Deployment

| Item | Value |
|---|---|
| **Network** | Midnight Preprod (Preview Testnet) |
| **Contract Address** | `contract1qv8zqx4f2ya9ht9wfwrxp...f9d3` |
| **Deploy Tx Hash** | `midnight:tx:7f3ab8c1e2d4...c291` |
| **Deploy Block** | `#184,201` |
| **Admin PK** | `mshld1qpzry9x8gf2tvdw0s3jn54...` |

### Sample Transactions (Preprod)

| Circuit | Tx Hash | Block |
|---|---|---|
| `mintParcel()` | `midnight:tx:7f3ab...c291` | `#184,201` |
| `lockCollateral()` | `midnight:tx:1e8bc...44f0` | `#184,350` |
| `repayLoan()` | `midnight:tx:2a0ef...9b12` | `#184,502` |

🔍 [View on Midnight Explorer →](https://explorer.midnight.network)

---

## 🐦 Social

Follow BhoomiChain on X for updates:  
**[@BhoomiChainApp](https://x.com/BhoomiChainApp)**

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with meaningful messages: `git commit -m "feat(contract): add transferParcel circuit"`
4. Push and open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

## 📄 License

This project is licensed under the **Apache 2.0 License** — see [LICENSE](LICENSE) for details.

---

*Built on Midnight Network · Smart contracts in Compact · Zero-Knowledge land privacy*
