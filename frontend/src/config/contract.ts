/**
 * BhoomiChain — Contract Configuration
 * 
 * ⚠️  FILL IN YOUR REAL CONTRACT ADDRESS HERE after deploying bhoomi.compact
 *     Run: cd contract && npx ts-node src/deploy.ts
 *     Then copy the address from deployment-info.json
 * 
 * Explorer verification:
 *   https://explorer.midnight.network/contract/<CONTRACT_ADDRESS>
 */

// ── UPDATE THIS AFTER DEPLOYMENT ──────────────────────────────────────────────
export const BHOOMI_CONTRACT_ADDRESS =
    (window as any).__BHOOMI_CONTRACT_ADDR__   // injected at runtime (prod)
    ?? import.meta.env.VITE_CONTRACT_ADDRESS   // from .env file (local dev)
    ?? 'NOT_DEPLOYED';                         // fallback — shows "not deployed" badge

// ── Network ───────────────────────────────────────────────────────────────────
export const BHOOMI_NETWORK_ID =
    import.meta.env.VITE_NETWORK_ID ?? 'preprod';

// ── Explorer base URL ─────────────────────────────────────────────────────────
export const EXPLORER_BASE =
    BHOOMI_NETWORK_ID === 'mainnet'
        ? 'https://explorer.midnight.network'
        : `https://explorer.${BHOOMI_NETWORK_ID}.midnight.network`;

/** Full explorer link for the deployed contract */
export const CONTRACT_EXPLORER_URL =
    BHOOMI_CONTRACT_ADDRESS !== 'NOT_DEPLOYED'
        ? `${EXPLORER_BASE}/contract/${BHOOMI_CONTRACT_ADDRESS}`
        : null;

/** Short display version of the address (for UI) */
export const CONTRACT_ADDRESS_SHORT =
    BHOOMI_CONTRACT_ADDRESS !== 'NOT_DEPLOYED'
        ? `${BHOOMI_CONTRACT_ADDRESS.slice(0, 14)}…${BHOOMI_CONTRACT_ADDRESS.slice(-8)}`
        : 'Not Deployed Yet';

export const IS_CONTRACT_DEPLOYED = BHOOMI_CONTRACT_ADDRESS !== 'NOT_DEPLOYED';
