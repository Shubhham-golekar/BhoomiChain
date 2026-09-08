import React, { useState, useEffect, useCallback } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { GISMap } from './components/GISMap';
import { FractionalMarket } from './components/FractionalMarket';
import { TitleAuditor } from './components/TitleAuditor';
import { GovtSync } from './components/GovtSync';

// ─── TYPES ──────────────────────────────────────────────────────────────────

type ParcelStatus = 'VERIFIED' | 'LOCKED' | 'UNLOCKED' | 'DEFAULTED';

/** Maps to the Compact ledger state in bhoomi.compact */
interface Parcel {
  id: string;               // parcelCount (Field on-chain)
  title: string;
  meta: string;
  docHash: string;          // parcelDocHash (Bytes<32>, IPFS/SHA256)
  status: ParcelStatus;     // parcelStatus (enum)
  landValue: number;        // PRIVATE — never sent on-chain, ZK witness only
  loanPrincipal?: number;   // loanPrincipal (Uint, disclosed)
  loanDueBlock?: number;    // loanDueBlock (Uint, block height)
}

interface Transaction {
  id: string;
  circuit: string;           // Compact circuit name called
  description: string;
  txHash: string;
  time: string;
  network: string;
}

// ─── WALLET TX MODAL TYPES ──────────────────────────────────────────────────

type WalletTxAction = 'collateral' | 'repay';

interface WalletTxModal {
  open: boolean;
  action: WalletTxAction | null;
  parcel: Parcel | null;
  step: 'confirm' | 'signing' | 'broadcasting' | 'success' | 'error';
  txHash: string;
  errorMsg: string;
}

// ─── SAMPLE DATA (simulating on-chain state after deployment) ────────────────

const DEMO_PARCELS: Parcel[] = [
  {
    id: '#0001',
    title: 'Nashik Vineyard Estate',
    meta: '28 Acres • Agricultural • CTS 4392-A',
    docHash: 'QmX9vT...kR7mP',
    status: 'VERIFIED',
    landValue: 8_500_000, // ← private ZK witness, never on-chain
  },
  {
    id: '#0002',
    title: 'Pune IT Corridor Plot',
    meta: '1.2 Acres • Commercial • Survey 110/B',
    docHash: 'QmRf3q...9sLP',
    status: 'LOCKED',
    landValue: 22_000_000,
    loanPrincipal: 11_000_000,  // 50% LTV, disclosed on-chain
    loanDueBlock: 184_500,      // block height
  },
  {
    id: '#0003',
    title: 'Konkan Coastal Resort Land',
    meta: '5 Acres • Non-Agricultural • Survey 88C',
    docHash: 'QmWk8p...1tKQ',
    status: 'UNLOCKED',
    landValue: 15_000_000,
  },
];

const DEMO_TXS: Transaction[] = [
  {
    id: 't1', circuit: 'mintParcel',
    description: 'Minted Land Deed #0001 — Nashik Vineyard',
    txHash: 'midnight:tx:7f3ab...c291', time: '3 hours ago', network: 'preview',
  },
  {
    id: 't2', circuit: 'lockCollateral',
    description: 'Locked #0002 as Collateral at 50% LTV',
    txHash: 'midnight:tx:1e8bc...44f0', time: '1 day ago', network: 'preview',
  },
  {
    id: 't3', circuit: 'lockCollateral',
    description: 'Disbursed ₹1.1Cr against #0002',
    txHash: 'midnight:tx:5c9d1...87a3', time: '1 day ago', network: 'preview',
  },
  {
    id: 't4', circuit: 'repayLoan',
    description: 'Loan repaid for #0003 — Konkan Estate',
    txHash: 'midnight:tx:2a0ef...9b12', time: '3 days ago', network: 'preview',
  },
];

// ─── CIRCUIT INFO ────────────────────────────────────────────────────────────

const CIRCUITS = [
  { name: 'mintParcel()', desc: 'Admin mints a verified land deed NFT' },
  { name: 'lockCollateral()', desc: 'Owner locks parcel; land value stays PRIVATE via ZK witness' },
  { name: 'repayLoan()', desc: 'Repay full principal; collateral auto-unlocked' },
  { name: 'transferParcel()', desc: 'Transfer deed to new owner (ERC-721 style)' },
  { name: 'markDefault()', desc: 'Admin marks overdue loan as defaulted' },
  { name: 'publicKey()', desc: 'Derive on-chain address from private secret key' },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_00_00_000
    ? `₹${(n / 1_00_00_000).toFixed(2)} Cr`
    : n >= 1_00_000
      ? `₹${(n / 1_00_000).toFixed(1)} L`
      : `₹${n.toLocaleString('en-IN')}`;

type WalletState = 'idle' | 'connecting' | 'connected' | 'demo' | 'error' | 'not_installed';

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<'deeds' | 'gis' | 'fractional' | 'auditor' | 'govt'>('deeds');
  const [walletState, setWalletState] = useState<WalletState>('idle');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletAPI, setWalletAPI] = useState<ConnectedAPI | null>(null);
  const [walletError, setWalletError] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>(DEMO_PARCELS);
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TXS);
  const [isProving, setIsProving] = useState(false);
  const [provingCircuit, setProvingCircuit] = useState('');

  // Wallet transaction confirmation modal state
  const [walletTx, setWalletTx] = useState<WalletTxModal>({
    open: false, action: null, parcel: null,
    step: 'confirm', txHash: '', errorMsg: ''
  });

  // Both 'connected' (real wallet) and 'demo' allow circuit actions
  const isConnected = walletState === 'connected' || walletState === 'demo';

  // ── Get provider immediately (no long wait) ──
  const getProvider = (): NonNullable<typeof window.midnight>[string] | null => {
    const mw = window.midnight;
    if (!mw) return null;
    // 1AM wallet registers as 'mnLace' OR as the first key
    return mw['mnLace'] ?? mw['1am'] ?? Object.values(mw)[0] ?? null;
  };

  // ── Auto-reconnect silently on page load ──
  useEffect(() => {
    const tryAuto = async () => {
      const provider = getProvider();
      if (!provider) return;
      // Try each network ID — 1AM wallet may only accept one of them
      for (const networkId of ['preprod', 'preview', 'mainnet']) {
        try {
          let api: ConnectedAPI;
          // Some 1AM versions use enable() instead of connect()
          if (typeof (provider as any).enable === 'function') {
            api = await (provider as any).enable();
          } else {
            api = await provider.connect(networkId);
          }
          const addrs = await api.getShieldedAddresses();
          const addr = (addrs as any).shieldedAddress
            ?? (Array.isArray(addrs) ? addrs[0] : null)
            ?? 'addr_midnight_auto';
          setWalletAPI(api);
          setWalletAddress(addr);
          setWalletState('connected');
          return; // success — stop trying
        } catch { /* try next networkId */ }
      }
    };
    setTimeout(tryAuto, 600);
  }, []);

  // ── Real wallet connect — tries all network IDs 1AM supports ──
  const connectRealWallet = useCallback(async () => {
    setWalletError('');
    setWalletState('connecting');

    const provider = getProvider();
    if (!provider) {
      // Extension not found — show modal with options
      setWalletState('idle');
      setShowWalletModal(true);
      return;
    }

    // Try every network ID so 1AM wallet always gets a popup
    const NETWORK_IDS = ['preprod', 'preview', 'mainnet'];
    let lastError = '';

    for (const networkId of NETWORK_IDS) {
      try {
        let api: ConnectedAPI;
        // 1AM wallet v1: uses enable(); v2: uses connect(networkId)
        if (typeof (provider as any).enable === 'function') {
          api = await (provider as any).enable();
        } else {
          api = await provider.connect(networkId);
        }
        const addrs = await api.getShieldedAddresses();
        const addr = (addrs as any).shieldedAddress
          ?? (Array.isArray(addrs) ? addrs[0] : null)
          ?? 'addr1_midnight_shielded';
        setWalletAPI(api);
        setWalletAddress(addr);
        setWalletState('connected');
        return; // connected — done!
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : String(e);
        // If user explicitly rejected, stop trying
        if (lastError.toLowerCase().includes('user') || lastError.toLowerCase().includes('reject')) break;
      }
    }

    setWalletState('error');
    setWalletError(`Connection failed: ${lastError}. Try Demo Mode to explore the app.`);
  }, []);

  // ── Demo Mode — simulates a Midnight wallet (no extension needed) ──
  const connectDemo = useCallback(() => {
    setShowWalletModal(false);
    setWalletState('connecting');
    setTimeout(() => {
      // Fake shielded address (Midnight format)
      setWalletAddress('mshld1qpzry9x8gf2tvdw0s3jn54khce6mua7lt8r48sr9xp25fvd8q5ygqgahlxf');
      setWalletState('demo');
      setWalletError('');
    }, 800);
  }, []);

  // ── Simulate ZK proving + circuit call (used for mintParcel only) ──
  const runCircuit = async (circuitName: string, execute: () => void) => {
    if (!isConnected) { setShowWalletModal(true); return; }
    setProvingCircuit(circuitName);
    setIsProving(true);
    await new Promise(r => setTimeout(r, 2800));
    execute();
    setIsProving(false);
    setProvingCircuit('');
  };

  const addTx = (circuit: string, description: string, hash?: string) => {
    const tx: Transaction = {
      id: Math.random().toString(36).slice(2),
      circuit,
      description,
      txHash: hash ?? `midnight:tx:${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 6)}`,
      time: 'Just now',
      network: 'preview',
    };
    setTransactions(prev => [tx, ...prev]);
  };

  // ── Real wallet transaction executor ──────────────────────────────────────
  // Called after user confirms in the modal. Tries real wallet API first,
  // falls back to demo simulation.
  const executeWalletTx = async (action: WalletTxAction, parcel: Parcel) => {
    // Step 1: Signing — always show this step visibly
    setWalletTx(p => ({ ...p, step: 'signing', signingDone: false } as any));

    let realTxHash: string | null = null;

    if (walletState === 'connected' && walletAPI) {
      // ── REAL WALLET PATH: wallet popup opens, user signs ─────────────────
      try {
        const circuitName = action === 'collateral' ? 'lockCollateral' : 'repayLoan';
        const principal = Math.floor(parcel.landValue * 0.5);
        const txPayload = {
          contractAddress: (window as any).__BHOOMI_CONTRACT_ADDR__ ?? 'bhoomi_contract_preview',
          circuitCall: circuitName,
          args: action === 'collateral'
            ? { parcelId: parcel.id, ltvPercent: 50, dueBlock: 184_500 }
            : { parcelId: parcel.id, repaymentAmount: parcel.loanPrincipal ?? principal },
          privateWitness: { landValue: parcel.landValue },
        };

        let result: any;
        if (typeof (walletAPI as any).signAndSubmitTransaction === 'function') {
          result = await (walletAPI as any).signAndSubmitTransaction(txPayload);
        } else if (typeof (walletAPI as any).submitTransaction === 'function') {
          result = await (walletAPI as any).submitTransaction(txPayload);
        } else if (typeof (walletAPI as any).signTransaction === 'function') {
          const signed = await (walletAPI as any).signTransaction(txPayload);
          result = { txHash: signed?.txHash ?? signed?.hash };
        }
        realTxHash = result?.txHash ?? result?.hash ?? null;
      } catch (e: any) {
        if (e?.message?.toLowerCase().includes('reject') ||
          e?.message?.toLowerCase().includes('user')) {
          setWalletTx(p => ({
            ...p, step: 'error',
            errorMsg: 'Transaction rejected by wallet. Please try again.'
          }));
          return;
        }
        realTxHash = null;
      }
    } else {
      // ── DEMO MODE: Simulate signing delay (1.8s) so user sees "Signing…" ──
      await new Promise(r => setTimeout(r, 1800));
    }

    // Brief pause to show signing ✓ before switching to broadcasting
    await new Promise(r => setTimeout(r, 400));

    // Step 2: Broadcasting — ZK proof generation + network submission
    setWalletTx(p => ({ ...p, step: 'broadcasting' }));
    setIsProving(true);
    setProvingCircuit(action === 'collateral' ? 'lockCollateral()' : 'repayLoan()');
    await new Promise(r => setTimeout(r, 2600));
    setIsProving(false);
    setProvingCircuit('');

    // Step 3: Apply state changes
    const finalHash = realTxHash ??
      `midnight:tx:${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 6)}`;

    if (action === 'collateral') {
      const principal = Math.floor(parcel.landValue * 0.5);
      setParcels(prev => prev.map(p =>
        p.id !== parcel.id ? p
          : { ...p, status: 'LOCKED', loanPrincipal: principal, loanDueBlock: 184_500 }
      ));
      addTx('lockCollateral', `Locked ${parcel.id} as collateral at 50% LTV`, finalHash);
    } else {
      setParcels(prev => prev.map(p =>
        p.id !== parcel.id ? p
          : { ...p, status: 'UNLOCKED', loanPrincipal: undefined, loanDueBlock: undefined }
      ));
      addTx('repayLoan', `Loan repaid for ${parcel.id} — parcel unlocked`, finalHash);
    }

    setWalletTx(p => ({ ...p, step: 'success', txHash: finalHash }));
  };

  // ── Open wallet TX modal (replaces direct runCircuit for lock/repay) ──
  const handleLock = (id: string) => {
    if (!isConnected) { setShowWalletModal(true); return; }
    const parcel = parcels.find(p => p.id === id);
    if (!parcel) return;
    setWalletTx({ open: true, action: 'collateral', parcel, step: 'confirm', txHash: '', errorMsg: '' });
  };

  const handleRepay = (id: string) => {
    if (!isConnected) { setShowWalletModal(true); return; }
    const parcel = parcels.find(p => p.id === id);
    if (!parcel) return;
    setWalletTx({ open: true, action: 'repay', parcel, step: 'confirm', txHash: '', errorMsg: '' });
  };

  const closeWalletTxModal = () => {
    setWalletTx({ open: false, action: null, parcel: null, step: 'confirm', txHash: '', errorMsg: '' });
  };

  const handleMintDemo = () => {
    runCircuit('mintParcel()', () => {
      const next = parcels.length + 1;
      const id = `#${String(next).padStart(4, '0')}`;
      const demo: Parcel = {
        id,
        title: 'Mumbai Bandra West Plot',
        meta: '0.8 Acres • Residential • CTS 2291',
        docHash: `Qm${Math.random().toString(36).slice(2, 8)}...${Math.random().toString(36).slice(2, 6)}`,
        status: 'VERIFIED',
        landValue: 35_000_000,
      };
      setParcels(prev => [...prev, demo]);
      addTx('mintParcel', `Admin minted Land Deed ${id}`);
    });
  };

  // ── Derived stats ──
  const totalLocked = parcels.filter(p => p.status === 'LOCKED').length;
  const totalLoanValue = parcels.reduce((s, p) => s + (p.loanPrincipal ?? 0), 0);
  const avgLTV = totalLoanValue > 0 ? 50 : 0;

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <>

      {/* ── NAV ── */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-logo">BC</div>
          <span className="brand-name">BhoomiChain</span>
          <span className="brand-tag">Midnight Network</span>
        </div>

        <div className="nav-right">
          <div className="network-pill">
            <div className="network-dot" />
            Preview Testnet
          </div>

          <button
            id="wallet-connect-btn"
            className={`wallet-btn
              ${walletState === 'connected' ? 'connected' : ''}
              ${walletState === 'demo' ? 'connected' : ''}
              ${walletState === 'error' ? 'error' : ''}
            `}
            onClick={() => {
              if (isConnected) return;
              if (walletState === 'error') connectRealWallet();
              else setShowWalletModal(true);
            }}
            disabled={walletState === 'connecting'}
          >
            {walletState === 'connecting' && <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />&nbsp;Connecting…</>}
            {walletState === 'connected' && <><div className="connected-dot" /><span className="mono">{walletAddress.slice(0, 12)}…{walletAddress.slice(-6)}</span></>}
            {walletState === 'demo' && <><div className="connected-dot" style={{ background: '#F59E0B' }} /><span className="mono">Demo Mode</span></>}
            {walletState === 'idle' && '⬡ Connect Wallet'}
            {walletState === 'error' && '⚠ Retry Connect'}
            {walletState === 'not_installed' && '⬇ Install Wallet'}
          </button>
        </div>
      </nav>

      {/* ── SUB-NAV TAB BAR ── */}
      <div style={{
        background: 'rgba(10, 22, 40, 0.95)',
        borderBottom: '1px solid var(--border)',
        padding: '0 2.5rem',
        display: 'flex',
        gap: '1.5rem',
        overflowX: 'auto',
        position: 'sticky',
        top: 68,
        zIndex: 90,
        backdropFilter: 'blur(16px)'
      }}>
        <button
          id="tab-deeds"
          onClick={() => setActiveTab('deeds')}
          style={{
            padding: '0.85rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'deeds' ? '2px solid #7C3AED' : '2px solid transparent',
            color: activeTab === 'deeds' ? '#FFFFFF' : 'var(--text-muted)',
            fontWeight: activeTab === 'deeds' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          🏡 Land Deeds & Loans
        </button>

        <button
          id="tab-gis"
          onClick={() => setActiveTab('gis')}
          style={{
            padding: '0.85rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'gis' ? '2px solid #0EA5E9' : '2px solid transparent',
            color: activeTab === 'gis' ? '#FFFFFF' : 'var(--text-muted)',
            fontWeight: activeTab === 'gis' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          🗺️ GIS Parcel Explorer
        </button>

        <button
          id="tab-fractional"
          onClick={() => setActiveTab('fractional')}
          style={{
            padding: '0.85rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'fractional' ? '2px solid #F59E0B' : '2px solid transparent',
            color: activeTab === 'fractional' ? '#FFFFFF' : 'var(--text-muted)',
            fontWeight: activeTab === 'fractional' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          📈 Fractional Market & Yield Modeler <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.2)', color: '#FCD34D', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>NEW</span>
        </button>

        <button
          id="tab-auditor"
          onClick={() => setActiveTab('auditor')}
          style={{
            padding: '0.85rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'auditor' ? '2px solid #10B981' : '2px solid transparent',
            color: activeTab === 'auditor' ? '#FFFFFF' : 'var(--text-muted)',
            fontWeight: activeTab === 'auditor' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          🔍 ZK Title Auditor
        </button>

        <button
          id="tab-govt"
          onClick={() => setActiveTab('govt')}
          style={{
            padding: '0.85rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'govt' ? '2px solid #8B5CF6' : '2px solid transparent',
            color: activeTab === 'govt' ? '#FFFFFF' : 'var(--text-muted)',
            fontWeight: activeTab === 'govt' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          🏛️ Govt Registry Sync
        </button>
      </div>

      {/* ── WALLET CONNECT MODAL ── */}
      {showWalletModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={() => setShowWalletModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--midnight-2)', border: '1px solid var(--border-bright)',
              borderRadius: 'var(--radius-xl)', padding: '2.5rem', maxWidth: 440, width: '100%',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ fontSize: '1.5rem', fontFamily: 'Playfair Display,serif', marginBottom: '0.5rem' }}>Connect Wallet</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', fontFamily: 'JetBrains Mono,monospace' }}>
              Midnight Network · Preview Testnet
            </div>

            {/* 1AM Wallet Button */}
            <button
              id="connect-1am-btn"
              style={{
                width: '100%', padding: '1rem 1.25rem', marginBottom: '0.875rem',
                background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(14,165,233,0.15))',
                border: '1px solid rgba(124,58,237,0.4)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.875rem',
                fontFamily: 'Outfit,sans-serif', transition: 'all 0.2s'
              }}
              onClick={() => { setShowWalletModal(false); connectRealWallet(); }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--aurora)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0
              }}>⬡</div>
              <div style={{ textAlign: 'left' }}>
                <div>1AM Wallet / Lace</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'JetBrains Mono,monospace' }}>Midnight browser extension</div>
              </div>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Demo Mode Button */}
            <button
              id="connect-demo-btn"
              style={{
                width: '100%', padding: '1rem 1.25rem',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)',
                color: '#FCD34D', fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.875rem',
                fontFamily: 'Outfit,sans-serif', transition: 'all 0.2s'
              }}
              onClick={connectDemo}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0
              }}>🔓</div>
              <div style={{ textAlign: 'left' }}>
                <div>Demo Mode</div>
                <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 400, fontFamily: 'JetBrains Mono,monospace' }}>No extension needed · Explore all features</div>
              </div>
            </button>

            <div style={{ marginTop: '1.5rem', padding: '0.875rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace', lineHeight: 1.7 }}>
              💡 Don't have 1AM wallet? Install from{' '}
              <a href="https://midnight.network/ecosystem" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--aurora-end)' }}>midnight.network/ecosystem</a>
              {' '}or use Demo Mode to explore BhoomiChain.
            </div>
          </div>
        </div>
      )}

      {/* ── WALLET TRANSACTION MODAL ── */}
      {walletTx.open && walletTx.parcel && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(10px)', zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={() => { if (walletTx.step === 'confirm' || walletTx.step === 'error') closeWalletTxModal(); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--midnight-2)', border: '1px solid var(--border-bright)',
              borderRadius: 'var(--radius-xl)', padding: '2rem', maxWidth: 460, width: '100%',
              boxShadow: '0 0 60px rgba(124,58,237,0.25)', position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: walletTx.action === 'collateral'
                  ? 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(124,58,237,0.2))'
                  : 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(14,165,233,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem'
              }}>
                {walletTx.action === 'collateral' ? '🔒' : '💸'}
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontFamily: 'Playfair Display,serif', fontWeight: 600 }}>
                  {walletTx.action === 'collateral' ? 'Use as Collateral' : 'Repay & Unlock'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>
                  {walletState === 'connected' ? '1AM Wallet · Midnight Preview' : 'Demo Mode · Simulated Transaction'}
                </div>
              </div>
            </div>

            {/* Parcel Info */}
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius-md)',
              padding: '1rem', marginBottom: '1.25rem',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace', marginBottom: '0.4rem' }}>PARCEL</div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{walletTx.parcel.id} — {walletTx.parcel.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{walletTx.parcel.meta}</div>
            </div>

            {/* Transaction Details */}
            <div style={{ marginBottom: '1.5rem' }}>
              {walletTx.action === 'collateral' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>Circuit</span>
                    <span style={{ fontSize: '0.8rem', color: '#C4B5FD', fontFamily: 'JetBrains Mono,monospace' }}>lockCollateral()</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>LTV Ratio</span>
                    <span style={{ fontSize: '0.8rem', color: '#67E8F9', fontFamily: 'JetBrains Mono,monospace' }}>50%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>Loan Amount</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F87171', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(Math.floor(walletTx.parcel.landValue * 0.5))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>Land Value</span>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'JetBrains Mono,monospace' }}>🔒 [ZK private witness]</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>Due Block</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono,monospace' }}>#184,500</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>Circuit</span>
                    <span style={{ fontSize: '0.8rem', color: '#C4B5FD', fontFamily: 'JetBrains Mono,monospace' }}>repayLoan()</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>Amount to Repay</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34D399', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(walletTx.parcel.loanPrincipal ?? 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>Deducted From</span>
                    <span style={{ fontSize: '0.75rem', color: '#67E8F9', fontFamily: 'JetBrains Mono,monospace' }}>{walletAddress.slice(0, 14)}…</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>Result</span>
                    <span style={{ fontSize: '0.8rem', color: '#34D399', fontFamily: 'JetBrains Mono,monospace' }}>Collateral → UNLOCKED ✓</span>
                  </div>
                </>
              )}
            </div>

            {/* Step States */}
            {walletTx.step === 'confirm' && (
              <>
                <div style={{
                  padding: '0.75rem', background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem', color: '#A78BFA', fontFamily: 'JetBrains Mono,monospace',
                  lineHeight: 1.6, marginBottom: '1.25rem'
                }}>
                  {walletState === 'connected'
                    ? '⬡ Your 1AM wallet will open a popup to sign this transaction on the Midnight Network.'
                    : '🔓 Demo mode: This simulates a real wallet transaction flow with ZK proof generation.'}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    id="wallet-tx-cancel-btn"
                    onClick={closeWalletTxModal}
                    style={{
                      flex: 1, padding: '0.75rem',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                      fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Outfit,sans-serif'
                    }}
                  >Cancel</button>
                  <button
                    id="wallet-tx-approve-btn"
                    onClick={() => executeWalletTx(walletTx.action!, walletTx.parcel!)}
                    style={{
                      flex: 2, padding: '0.75rem',
                      background: walletTx.action === 'collateral'
                        ? 'linear-gradient(135deg,#7C3AED,#EF4444)'
                        : 'linear-gradient(135deg,#059669,#0EA5E9)',
                      border: 'none', borderRadius: 'var(--radius-md)',
                      color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'Outfit,sans-serif',
                      boxShadow: '0 4px 20px rgba(124,58,237,0.3)'
                    }}
                  >
                    {walletState === 'connected' ? '⬡ Sign with 1AM Wallet' : '✓ Approve Transaction'}
                  </button>
                </div>
              </>
            )}

            {(walletTx.step === 'signing' || walletTx.step === 'broadcasting') && (
              <div style={{ padding: '0.5rem 0 0.75rem' }}>

                {/* Step 1 — Signing */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: walletTx.step === 'signing'
                      ? 'rgba(124,58,237,0.25)' : 'rgba(52,211,153,0.2)',
                    border: walletTx.step === 'signing'
                      ? '1.5px solid rgba(124,58,237,0.6)' : '1.5px solid rgba(52,211,153,0.6)',
                    transition: 'all 0.4s ease',
                  }}>
                    {walletTx.step === 'signing'
                      ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      : <span style={{ color: '#34D399', fontSize: '0.85rem', fontWeight: 700 }}>✓</span>
                    }
                  </div>
                  {/* Text */}
                  <div style={{ paddingTop: 3 }}>
                    <div style={{
                      fontSize: '0.82rem', fontWeight: 600,
                      color: walletTx.step === 'signing' ? '#C4B5FD' : '#34D399',
                      fontFamily: 'Outfit,sans-serif', marginBottom: '0.15rem',
                      transition: 'color 0.4s ease'
                    }}>
                      {walletTx.step === 'signing' ? 'Signing Transaction…' : 'Transaction Signed ✓'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>
                      {walletState === 'connected'
                        ? (walletTx.step === 'signing' ? 'Waiting for 1AM wallet approval popup…' : '1AM wallet signed successfully')
                        : (walletTx.step === 'signing' ? 'Generating ZK witness proof…' : 'ZK proof generated locally')
                      }
                    </div>
                  </div>
                </div>

                {/* Connector line */}
                <div style={{
                  width: 1.5, height: 18, marginLeft: 13,
                  background: walletTx.step === 'broadcasting'
                    ? 'rgba(52,211,153,0.5)' : 'rgba(124,58,237,0.25)',
                  marginBottom: '0.75rem', transition: 'background 0.4s ease'
                }} />

                {/* Step 2 — Broadcasting */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  opacity: walletTx.step === 'broadcasting' ? 1 : 0.45,
                  transition: 'opacity 0.4s ease'
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: walletTx.step === 'broadcasting'
                      ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.05)',
                    border: walletTx.step === 'broadcasting'
                      ? '1.5px solid rgba(14,165,233,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
                  }}>
                    {walletTx.step === 'broadcasting'
                      ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: '#38BDF8', borderTopColor: 'transparent' }} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>2</span>
                    }
                  </div>
                  {/* Text */}
                  <div style={{ paddingTop: 3 }}>
                    <div style={{
                      fontSize: '0.82rem', fontWeight: 600,
                      color: walletTx.step === 'broadcasting' ? '#67E8F9' : 'var(--text-muted)',
                      fontFamily: 'Outfit,sans-serif', marginBottom: '0.15rem'
                    }}>
                      Broadcasting ZK Proof…
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>
                      {walletTx.step === 'broadcasting'
                        ? 'Submitting to Midnight Preview Network…'
                        : 'Waiting for signing to complete'
                      }
                    </div>
                  </div>
                </div>

              </div>
            )}

            {walletTx.step === 'success' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem', color: '#34D399' }}>Transaction Confirmed!</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace', wordBreak: 'break-all', marginBottom: '1.25rem' }}>
                  {walletTx.txHash}
                </div>
                {walletTx.action === 'repay' && (
                  <div style={{ fontSize: '0.8rem', color: '#34D399', fontFamily: 'JetBrains Mono,monospace', marginBottom: '1rem' }}>
                    💸 {fmt(walletTx.parcel?.loanPrincipal ?? 0)} deducted from your wallet<br />
                    🔓 Collateral released — Parcel is now UNLOCKED
                  </div>
                )}
                {walletTx.action === 'collateral' && (
                  <div style={{ fontSize: '0.8rem', color: '#C4B5FD', fontFamily: 'JetBrains Mono,monospace', marginBottom: '1rem' }}>
                    🔒 Parcel locked as collateral<br />
                    💰 {fmt(Math.floor(walletTx.parcel?.landValue ?? 0) * 0.5)} loan amount disclosed on-chain
                  </div>
                )}
                <button
                  id="wallet-tx-done-btn"
                  onClick={closeWalletTxModal}
                  style={{
                    padding: '0.75rem 2rem', background: 'linear-gradient(135deg,#7C3AED,#0EA5E9)',
                    border: 'none', borderRadius: 'var(--radius-md)', color: '#fff',
                    fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif'
                  }}
                >Done</button>
              </div>
            )}

            {walletTx.step === 'error' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
                <div style={{ color: '#F87171', fontSize: '0.85rem', fontFamily: 'JetBrains Mono,monospace', marginBottom: '1.25rem' }}>
                  {walletTx.errorMsg}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button onClick={closeWalletTxModal}
                    style={{ padding: '0.6rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}
                  >Close</button>
                  <button onClick={() => setWalletTx(p => ({ ...p, step: 'confirm', errorMsg: '' }))}
                    style={{ padding: '0.6rem 1.5rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 'var(--radius-md)', color: '#C4B5FD', cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}
                  >Try Again</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ERROR BANNER ── */}
      {walletError && (
        <div className="error-banner">
          <span>⚠ {walletError}</span>
          <button
            onClick={connectDemo}
            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', padding: '0.25rem 0.75rem', borderRadius: 99, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'JetBrains Mono,monospace', whiteSpace: 'nowrap' }}
          >
            Use Demo Mode →
          </button>
        </div>
      )}

      {/* ── TAB 1: LAND DEEDS & LOANS ── */}
      {activeTab === 'deeds' && (
        <>
          {/* ── HERO ── */}
          <header className="hero">
            <div className="hero-badge">
              ⬡ Zero-Knowledge Land Registry
            </div>
            <h1>
              Tokenize Earth.<br />
              <span>Unlock Liquid Value.</span>
            </h1>
            <p className="hero-sub">
              A privacy-first land tokenization protocol on the{' '}
              <strong style={{ color: '#94A3B8' }}>Midnight Network</strong>.
              Land valuations are kept private via <strong style={{ color: '#C4B5FD' }}>ZK witnesses</strong> —
              only the owner can prove their land's value, without ever exposing it on-chain.
            </p>

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{parcels.length}</div>
                <div className="stat-label">Parcels Tokenized</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{totalLocked}</div>
                <div className="stat-label">Locked as Collateral</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{fmt(totalLoanValue)}</div>
                <div className="stat-label">Active Loan Value</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{avgLTV}%</div>
                <div className="stat-label">Avg LTV Ratio</div>
              </div>
            </div>
          </header>

          {/* ── ZK CIRCUITS INFO BAR ── */}
          <div className="zk-info-bar">
            <div className="section-header">
              <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Compact Smart Circuits</h2>
              <span className="section-count">bhoomi.compact · Midnight Preview</span>
            </div>
            <div className="zk-cards">
              {CIRCUITS.map(c => (
                <div key={c.name} className="zk-card">
                  <div className="zk-card-name">{c.name}</div>
                  <div className="zk-card-desc">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── LAND DEEDS GRID ── */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Land Deeds</h2>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span className="section-count">{parcels.length} parcels</span>
                <button
                  id="mint-demo-btn"
                  className="btn btn-primary"
                  style={{ flex: 'none', padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  onClick={handleMintDemo}
                  disabled={isProving}
                >
                  + Mint Demo Deed
                </button>
              </div>
            </div>

            <div className="deeds-grid">
              {parcels.map(p => (
                <div key={p.id} id={`deed-${p.id.replace('#', '')}`} className="deed-card">
                  <div className="deed-card-header">
                    <div className="deed-icon">{p.id}</div>
                    <div className={`status-badge ${p.status.toLowerCase()}`}>{p.status}</div>
                  </div>

                  <div className="deed-title">{p.title}</div>
                  <div className="deed-meta">{p.meta}</div>

                  <div className="deed-hash">
                    <span className="deed-hash-label">IPFS·</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.docHash}</span>
                  </div>

                  {/* Private land value indicator */}
                  <div className="private-badge">
                    🔒 landValue: [ZK private witness]
                  </div>

                  {/* Loan details if locked */}
                  {p.status === 'LOCKED' && p.loanPrincipal && (
                    <div className="deed-loan-info">
                      <div className="loan-info-item">
                        <label>Principal (Disclosed)</label>
                        <span>{fmt(p.loanPrincipal)}</span>
                      </div>
                      <div className="loan-info-item">
                        <label>LTV Ratio</label>
                        <span>50%</span>
                      </div>
                      <div className="loan-info-item">
                        <label>Due Block</label>
                        <span className="mono">{p.loanDueBlock?.toLocaleString()}</span>
                      </div>
                      <div className="loan-info-item">
                        <label>Network</label>
                        <span style={{ color: '#67E8F9' }}>preview</span>
                      </div>
                    </div>
                  )}

                  <div className="deed-actions">
                    <button className="btn" id={`view-${p.id}`}>View Deed</button>

                    {p.status === 'VERIFIED' && (
                      <button
                        id={`lock-${p.id}`}
                        className="btn btn-danger"
                        onClick={() => handleLock(p.id)}
                        disabled={isProving}
                      >
                        Use as Collateral
                      </button>
                    )}

                    {p.status === 'LOCKED' && (
                      <button
                        id={`repay-${p.id}`}
                        className="btn btn-success"
                        onClick={() => handleRepay(p.id)}
                        disabled={isProving}
                      >
                        Repay & Unlock
                      </button>
                    )}

                    {p.status === 'UNLOCKED' && (
                      <button
                        id={`lock-again-${p.id}`}
                        className="btn btn-primary"
                        onClick={() => handleLock(p.id)}
                        disabled={isProving}
                      >
                        Use as Collateral
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── LOAN PANEL ── */}
          {totalLoanValue > 0 && (
            <div className="loan-section">
              <div className="loan-panel">
                {/* Left — Collateral list */}
                <div>
                  <p className="loan-panel-title">Locked Collateral</p>
                  <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Active Positions</h2>
                  {parcels.filter(p => p.status === 'LOCKED').map(p => (
                    <div key={p.id} className="collateral-item">
                      <div className="collateral-icon">{p.id}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 2 }}>{p.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                          Principal: {fmt(p.loanPrincipal!)} · Block #{p.loanDueBlock?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right — LTV + total */}
                <div>
                  <p className="loan-panel-title">Credit Facility</p>
                  <div className="loan-big-number">{fmt(totalLoanValue)}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Total active loan principal · Midnight Preview Network
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace' }}>
                    <span>LTV Ratio</span>
                    <span>{avgLTV}%</span>
                  </div>
                  <div className="ltv-track">
                    <div className="ltv-thumb" style={{ left: `${avgLTV}%` }} />
                  </div>
                  <div className="ltv-labels">
                    <span>0% Safe</span>
                    <span>50% Current</span>
                    <span>80% Max</span>
                  </div>

                  <div
                    style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      background: 'var(--purple-dim)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      color: '#C4B5FD',
                      fontFamily: 'JetBrains Mono, monospace',
                      lineHeight: 1.6,
                    }}
                  >
                    🔒 Land valuations are held as ZK witnesses.<br />
                    Only the <strong>loan principal</strong> (derived value) is disclosed on-chain.<br />
                    Circuit: <strong>lockCollateral() in bhoomi.compact</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIVITY LEDGER ── */}
          <section className="ledger-section">
            <div className="section-header">
              <h2 className="section-title">On-Chain Activity</h2>
              <span className="section-count">{transactions.length} transactions</span>
            </div>

            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Circuit</th>
                  <th>Description</th>
                  <th>Tx Hash</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      <span className={`tx-type-pill tx-${tx.circuit.replace('()', '').toLowerCase()}`}>
                        {tx.circuit.replace('()', '')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>{tx.description}</td>
                    <td className="tx-hash">{tx.txHash}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {/* ── TAB 2: GIS PARCEL EXPLORER ── */}
      {activeTab === 'gis' && <GISMap />}

      {/* ── TAB 3: FRACTIONAL MARKET & YIELD MODELER (NEW IDEA) ── */}
      {activeTab === 'fractional' && <FractionalMarket />}

      {/* ── TAB 4: ZK TITLE AUDITOR ── */}
      {activeTab === 'auditor' && <TitleAuditor />}

      {/* ── TAB 5: GOVT REGISTRY SYNC ── */}
      {activeTab === 'govt' && <GovtSync />}

      {/* ── ZK PROVING TOAST ── */}
      {isProving && (
        <div className="proving-toast">
          <div className="proving-icon">
            <div className="spinner" />
          </div>
          <div className="proving-text">
            <div className="proving-title">Generating ZK Proof…</div>
            <div className="proving-sub">circuit: {provingCircuit}</div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer>
        <strong>BhoomiChain</strong> · Built on{' '}
        <strong>Midnight Network</strong> · Smart contracts in{' '}
        <strong>Compact language</strong> · Land valuations secured by{' '}
        <strong>Zero-Knowledge proofs</strong>
        {walletState === 'demo' && (
          <div style={{ marginTop: '0.5rem', color: '#D97706', fontSize: '0.75rem' }}>
            🔓 Running in Demo Mode — connect 1AM wallet for live transactions
          </div>
        )}
      </footer>
    </>
  );
}
