import React, { useState, useEffect, useCallback } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

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
  const [walletState, setWalletState] = useState<WalletState>('idle');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletAPI, setWalletAPI] = useState<ConnectedAPI | null>(null);
  const [walletError, setWalletError] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>(DEMO_PARCELS);
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TXS);
  const [isProving, setIsProving] = useState(false);
  const [provingCircuit, setProvingCircuit] = useState('');

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

  // ── Simulate ZK proving + circuit call ──
  const runCircuit = async (circuitName: string, execute: () => void) => {
    if (!isConnected) { setShowWalletModal(true); return; }
    setProvingCircuit(circuitName);
    setIsProving(true);
    // Simulate Compact ZK proof generation (real time: 2-5s)
    await new Promise(r => setTimeout(r, 2800));
    execute();
    setIsProving(false);
    setProvingCircuit('');
  };

  const addTx = (circuit: string, description: string) => {
    const tx: Transaction = {
      id: Math.random().toString(36).slice(2),
      circuit,
      description,
      txHash: `midnight:tx:${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 6)}`,
      time: 'Just now',
      network: 'preview',
    };
    setTransactions(prev => [tx, ...prev]);
  };

  // ── Action handlers — call Compact circuits ──

  const handleLock = (id: string) => {
    runCircuit('lockCollateral()', () => {
      setParcels(prev => prev.map(p => {
        if (p.id !== id) return p;
        // ZK witness: landValue stays private, only loanPrincipal disclosed
        const principal = Math.floor(p.landValue * 0.5);
        return { ...p, status: 'LOCKED', loanPrincipal: principal, loanDueBlock: 184_500 };
      }));
      addTx('lockCollateral', `Locked ${id} as collateral at 50% LTV`);
    });
  };

  const handleRepay = (id: string) => {
    runCircuit('repayLoan()', () => {
      setParcels(prev => prev.map(p => {
        if (p.id !== id) return p;
        return { ...p, status: 'UNLOCKED', loanPrincipal: undefined, loanDueBlock: undefined };
      }));
      addTx('repayLoan', `Loan repaid for ${id} — parcel unlocked`);
    });
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
