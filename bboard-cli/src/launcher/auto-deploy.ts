/**
 * BhoomiChain — Automated Deployment Script (Preprod)
 *
 * Memory-safe design:
 *   PHASE 1: Start wallet → get address → STOP wallet immediately
 *   PHASE 2: Poll indexer via HTTP (no wallet running, no memory leak)
 *   PHASE 3: Start wallet again only for deployment → get contract address → stop
 *
 * Usage:
 *   npm run auto-deploy
 *   
 *   With pre-funded seed (skip faucet):
 *   $env:BHOOMI_WALLET_SEED="<hex>"; npm run auto-deploy
 *
 *   Skip balance check entirely (already funded):
 *   $env:BHOOMI_SKIP_FAUCET="1"; $env:BHOOMI_WALLET_SEED="<hex>"; npm run auto-deploy
 */

import { WebSocket } from 'ws';
import { setNetworkIdGlobal } from '../config.js';
import { createLogger } from '../logger-utils.js';
import { BBoardAPI, type BBoardProviders, type PrivateStateId } from '../../../api/src/index.js';
import { MidnightWalletProvider } from '../midnight-wallet-provider.js';
import { generateDust } from '../generate-dust.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from '../../../api/src/utils/index.js';
import { BBoardPrivateState } from '../../../contract/src/witnesses.js';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as Rx from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// @ts-expect-error: needed for WebSocket through apollo
globalThis.WebSocket = WebSocket;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PREPROD_ENV = {
    walletNetworkId: 'preprod',
    networkId: 'preprod',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preprod.midnight.network',
    nodeWS: 'wss://rpc.preprod.midnight.network',
    faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
    proofServer: 'http://localhost:6300',
};

const ZK_CONFIG_PATH = path.resolve(__dirname, '..', '..', 'contract', 'src', 'managed', 'bboard');
const PRIVATE_STATE_STORE = 'bboard-private-state';
const LOG_DIR = path.resolve(__dirname, '..', 'logs', 'preprod-remote', `${new Date().toISOString().replace(/:/g, '-')}.log`);

// ── Lightweight balance check via indexer GraphQL (no wallet SDK) ─────────────
async function checkBalanceViaIndexer(walletAddress: string): Promise<bigint> {
    try {
        // Try GraphQL first
        const query = `query { unshieldedAddressBalance(address: "${walletAddress}") { balance } }`;
        const resp = await axios.post(
            PREPROD_ENV.indexer,
            { query },
            { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
        );
        const bal = resp.data?.data?.unshieldedAddressBalance?.balance;
        if (bal !== undefined && bal !== null) return BigInt(bal);
    } catch { /* fall through to REST */ }
    return 0n;
}

// ── Poll indexer via HTTP only — no wallet running ───────────────────────────
async function waitForFundsViaIndexer(
    walletAddress: string,
    maxWaitMs: number,
    logFn: (msg: string) => void,
): Promise<boolean> {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
        const bal = await checkBalanceViaIndexer(walletAddress);
        if (bal > 0n) {
            logFn(`✅ Balance confirmed: ${bal} NIGHT`);
            return true;
        }
        const secsLeft = Math.round((deadline - Date.now()) / 1000);
        logFn(`⏳ Waiting for NIGHT tokens... (${secsLeft}s left, balance still 0)`);
        await new Promise(r => setTimeout(r, 20_000));
    }
    return false;
}

async function checkProofServer(): Promise<boolean> {
    try {
        const resp = await axios.get('http://localhost:6300/health', { timeout: 5000 });
        return resp.status === 200;
    } catch {
        return false;
    }
}

async function getWalletAddress(logger: any, seed: string): Promise<string> {
    logger.info('🔑 PHASE 1: Starting wallet to get address...');
    const walletProvider = await MidnightWalletProvider.build(logger, PREPROD_ENV, seed);
    try {
        await walletProvider.start();
        const state = await Rx.firstValueFrom(walletProvider.wallet.unshielded.state);
        const addr = UnshieldedAddress.codec.encode(getNetworkId(), state.address);
        return addr.toString();
    } finally {
        // CRITICAL: stop wallet immediately so it stops streaming blockchain data
        logger.info('🛑 Stopping wallet (address retrieved — freeing memory)...');
        try { await walletProvider.stop(); } catch { }
        logger.info('✅ Wallet stopped. Memory freed.');
    }
}

async function deployContract(logger: any, seed: string): Promise<string> {
    logger.info('🚀 PHASE 3: Starting wallet for deployment...');
    const walletProvider = await MidnightWalletProvider.build(logger, PREPROD_ENV, seed);
    try {
        await walletProvider.start();

        const initialState = await Rx.firstValueFrom(walletProvider.wallet.unshielded.state);

        const zkConfigProvider = new NodeZkConfigProvider<'mintParcel' | 'transferParcel' | 'approveTransfer' | 'lockCollateral' | 'repayLoan' | 'markDefault' | 'updateDocHash'>(ZK_CONFIG_PATH);
        const providers: BBoardProviders = {
            privateStateProvider: levelPrivateStateProvider<PrivateStateId, BBoardPrivateState>({
                privateStateStoreName: PRIVATE_STATE_STORE,
                signingKeyStoreName: `${PRIVATE_STATE_STORE}-signing-keys`,
                privateStoragePasswordProvider: () => 'Bboard-Test-2026!',
                accountId: seed,
            }),
            publicDataProvider: indexerPublicDataProvider(PREPROD_ENV.indexer, PREPROD_ENV.indexerWS),
            zkConfigProvider,
            proofProvider: httpClientProofProvider(PREPROD_ENV.proofServer, zkConfigProvider),
            walletProvider: walletProvider,
            midnightProvider: walletProvider,
        };

        // Generate dust if needed
        const dustTx = await generateDust(logger, seed, initialState, walletProvider.wallet);
        if (dustTx) logger.info(`Dust generation tx: ${dustTx}`);

        logger.info('📦 Deploying contract — generating ZK proof (2–5 minutes)...');
        const api = await BBoardAPI.deploy(providers, logger);
        const contractAddress = api.deployedContractAddress;

        api.state$.subscribe({ complete: () => { } });
        return contractAddress;
    } finally {
        try { await walletProvider.stop(); } catch { }
    }
}

async function main() {
    const logger = await createLogger(LOG_DIR);
    const skipFaucet = process.env.BHOOMI_SKIP_FAUCET === '1';

    logger.info('🚀 BhoomiChain Auto-Deploy — Midnight Preprod');
    logger.info(`   Indexer:      ${PREPROD_ENV.indexer}`);
    logger.info(`   Proof Server: ${PREPROD_ENV.proofServer}`);

    // Check proof server
    const proofOk = await checkProofServer();
    if (!proofOk) {
        logger.error('❌ Proof server at localhost:6300 is not reachable!');
        logger.error('   Start it: docker compose -f proof-server-local.yml up -d');
        process.exit(1);
    }
    logger.info('✅ Proof server is running!');

    setNetworkIdGlobal('preprod');

    const seed = process.env.BHOOMI_WALLET_SEED ?? toHex(randomBytes(32));
    logger.info(`💼 Wallet seed: ${seed}`);

    // ── PHASE 1: Get wallet address (wallet started then immediately stopped) ──
    const walletAddress = await getWalletAddress(logger, seed);
    logger.info(`📬 Wallet address: ${walletAddress}`);
    logger.info('');

    // ── PHASE 2: Faucet + lightweight HTTP balance polling ───────────────────
    if (!skipFaucet) {
        logger.info('💰 PHASE 2: Checking balance (no wallet running)...');
        let balance = await checkBalanceViaIndexer(walletAddress);
        logger.info(`   Current balance: ${balance} NIGHT`);

        if (balance === 0n) {
            logger.info('');
            logger.info('════════════════════════════════════════════════════════════');
            logger.info('⚠️  WALLET HAS NO FUNDS');
            logger.info('');
            logger.info('👉 Please fund it MANUALLY in your browser:');
            logger.info(`   URL:     ${PREPROD_ENV.faucet}`);
            logger.info(`   Address: ${walletAddress}`);
            logger.info('');
            logger.info('   Or re-run with BHOOMI_SKIP_FAUCET=1 after funding manually.');
            logger.info('════════════════════════════════════════════════════════════');
            logger.info('');
            logger.info('Polling indexer for balance arrival (no wallet loaded — memory safe)...');

            const funded = await waitForFundsViaIndexer(walletAddress, 12 * 60 * 1000, (m) => logger.info(m));
            if (!funded) {
                logger.warn('⚠️  No funds detected after 12 minutes. Attempting deployment anyway...');
                logger.warn('   If it fails with "insufficient funds", fund the wallet and run:');
                logger.warn(`   $env:BHOOMI_WALLET_SEED="${seed}"; $env:BHOOMI_SKIP_FAUCET="1"; npm run auto-deploy`);
            }
        } else {
            logger.info(`✅ Wallet already funded (${balance} NIGHT) — skipping faucet`);
        }
    } else {
        logger.info('⏩ Skipping faucet check (BHOOMI_SKIP_FAUCET=1)');
    }

    // ── PHASE 3: Deploy (wallet restarted fresh) ─────────────────────────────
    try {
        const contractAddress = await deployContract(logger, seed);

        logger.info('');
        logger.info('🎉🎉🎉 BhoomiChain Contract Successfully Deployed! 🎉🎉🎉');
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info(`  CONTRACT ADDRESS: ${contractAddress}`);
        logger.info(`  Wallet Seed:      ${seed}`);
        logger.info(`  Wallet Address:   ${walletAddress}`);
        logger.info(`  Explorer URL:     https://explorer.midnight.network/contract/${contractAddress}`);
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Prominent stdout print
        console.log('\n');
        console.log('='.repeat(60));
        console.log('CONTRACT ADDRESS: ' + contractAddress);
        console.log('='.repeat(60));
        console.log('\n');

        // Save deployment info
        const deployInfo = {
            network: 'preprod',
            contractAddress,
            walletSeed: seed,
            walletAddress,
            deployedAt: new Date().toISOString(),
            explorerUrl: `https://explorer.midnight.network/contract/${contractAddress}`,
        };
        const outPath = path.resolve(__dirname, '..', '..', '..', '..', 'deployment-info.json');
        fs.writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
        logger.info(`📄 Saved to: ${outPath}`);

    } catch (err) {
        logger.error(`❌ Deployment failed: ${String(err)}`);
        if (err instanceof Error) logger.error(err.stack ?? '');
        console.error('\n❌ Deployment failed:', err);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
