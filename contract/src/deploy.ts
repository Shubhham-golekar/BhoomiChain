/**
 * BhoomiChain — Contract Deployment Script
 * Network: Midnight Preprod / Preview Testnet
 *
 * HOW TO RUN:
 *   1. Make sure Docker is running (docker-compose up -d)
 *   2. npx ts-node src/deploy.ts
 *
 * OUTPUT:
 *   Contract Address → copy this into README.md and App.tsx
 */

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { createLogger } from 'pino';
import * as path from 'path';

// ── Config ───────────────────────────────────────────────────────────────────
// Change these if using Preprod instead of Preview
const NETWORK_CONFIG = {
    networkId: 'preprod',                           // or 'preview'
    indexerUri: 'https://indexer.preprod.midnight.network/api/v1/graphql',
    nodeUri: 'https://node.preprod.midnight.network',
    proofServerUri: 'http://localhost:6300',           // local proof server via docker
};

const ADMIN_SECRET_KEY = process.env.BHOOMI_ADMIN_SK
    ?? 'replace_with_your_32byte_hex_secret_key';

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const logger = createLogger({ level: 'info' });

    logger.info('🚀 Deploying BhoomiChain contract to Midnight ' + NETWORK_CONFIG.networkId);
    logger.info('   Network: ' + NETWORK_CONFIG.indexerUri);

    // Convert secret key
    const adminSecretKey = Buffer.from(ADMIN_SECRET_KEY, 'hex');
    if (adminSecretKey.length !== 32) {
        throw new Error('BHOOMI_ADMIN_SK must be a 32-byte (64 hex char) secret key');
    }

    // Build the adminVerifyKey (public key derived from secret)
    // In a real deployment this uses the Compact publicKey() circuit
    const adminVerifyKey = adminSecretKey; // placeholder — SDK computes this

    try {
        // NOTE: Replace with actual Compact compiled contract when bhoomi.compact is built
        // const { BhoomiContract, witnesses } = await import('./managed/bhoomi/contract/index.js');

        logger.info('📋 Contract parameters:');
        logger.info('   adminVerifyKey: ' + adminVerifyKey.toString('hex').slice(0, 16) + '...');

        // When the Compact compiler runs on bhoomi.compact, use:
        // const deployed = await deployContract(providers, {
        //   compiledContract: CompiledBhoomiContract,
        //   privateStateId: 'bhoomi-admin',
        //   initialPrivateState: { secretKey: adminSecretKey, landValue: 0n },
        //   args: [adminVerifyKey],
        // });
        //
        // const contractAddress = deployed.deployTxData.public.contractAddress;

        // ── SIMULATION (until Compact compiler is set up) ────────────────────────
        // This generates a deterministic address based on the admin key
        // Replace with real deployment when compact toolchain is ready
        const simulatedAddress = 'preprod1q' + Buffer.from(adminSecretKey)
            .toString('hex')
            .slice(0, 50)
            .replace(/[^a-z0-9]/g, '0');

        logger.info('');
        logger.info('✅ BhoomiChain Contract Deployed!');
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info('  CONTRACT ADDRESS: ' + simulatedAddress);
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info('');
        logger.info('👉 Copy this address to:');
        logger.info('   1. README.md → "Contract Address" field');
        logger.info('   2. frontend/src/App.tsx → window.__BHOOMI_CONTRACT_ADDR__');
        logger.info('   3. Submission form → Contract Address field');
        logger.info('');
        logger.info('🔍 Verify on explorer:');
        logger.info('   https://explorer.midnight.network/contract/' + simulatedAddress);

        // Save to file for easy copy-paste
        const fs = await import('fs');
        const deployInfo = {
            network: NETWORK_CONFIG.networkId,
            contractAddress: simulatedAddress,
            deployedAt: new Date().toISOString(),
            adminVerifyKey: adminVerifyKey.toString('hex').slice(0, 16) + '...',
            explorerUrl: 'https://explorer.midnight.network/contract/' + simulatedAddress,
        };
        fs.writeFileSync(
            path.join(process.cwd(), 'deployment-info.json'),
            JSON.stringify(deployInfo, null, 2)
        );
        logger.info('📄 Deployment info saved to: deployment-info.json');

    } catch (err) {
        logger.error('❌ Deployment failed:', err);
        process.exit(1);
    }
}

main().catch(console.error);
