import React, { useState } from 'react';

interface FractionalToken {
    symbol: string;
    parcelId: string;
    landTitle: string;
    totalMarketCap: number;
    tokenPrice: number;
    availableSupply: number;
    annualYieldPercent: number;
    appreciation5YrPercent: number;
    category: 'Commercial' | 'Agricultural' | 'Residential';
    verifiedInvestorsCount: number;
}

const DEMO_TOKENS: FractionalToken[] = [
    {
        symbol: '$BHOOMI-PUNE',
        parcelId: '#0002',
        landTitle: 'Pune IT Corridor Commercial Hub',
        totalMarketCap: 220000000, // ₹22 Cr
        tokenPrice: 1000, // ₹1,000 per token
        availableSupply: 45000,
        annualYieldPercent: 9.2, // 9.2% annual rental yield from tech tenants
        appreciation5YrPercent: 42.5,
        category: 'Commercial',
        verifiedInvestorsCount: 312,
    },
    {
        symbol: '$BHOOMI-NSK',
        parcelId: '#0001',
        landTitle: 'Nashik Vineyard & Winery Estate',
        totalMarketCap: 85000000, // ₹8.5 Cr
        tokenPrice: 500, // ₹500 per token
        availableSupply: 28000,
        annualYieldPercent: 7.8, // 7.8% yield from organic grape exports & wine leases
        appreciation5YrPercent: 35.0,
        category: 'Agricultural',
        verifiedInvestorsCount: 184,
    },
    {
        symbol: '$BHOOMI-MUM',
        parcelId: '#0004',
        landTitle: 'Mumbai Bandra Luxury Redevelopment',
        totalMarketCap: 350000000, // ₹35 Cr
        tokenPrice: 5000, // ₹5,000 per token
        availableSupply: 12000,
        annualYieldPercent: 6.4, // 6.4% yield + high capital growth
        appreciation5YrPercent: 68.0,
        category: 'Residential',
        verifiedInvestorsCount: 520,
    },
];

export const FractionalMarket: React.FC = () => {
    const [selectedToken, setSelectedToken] = useState<FractionalToken>(DEMO_TOKENS[0]);
    const [investmentAmount, setInvestmentAmount] = useState<number>(50000); // Default ₹50,000
    const [holdingYears, setHoldingYears] = useState<number>(5);
    const [isZkChecking, setIsZkChecking] = useState<boolean>(false);
    const [zkStatus, setZkStatus] = useState<'idle' | 'verified'>('idle');
    const [showBuyModal, setShowBuyModal] = useState<boolean>(false);
    const [buyTxState, setBuyTxState] = useState<'idle' | 'proving' | 'success'>('idle');

    // Calculated yields
    const tokenQuantity = Math.floor(investmentAmount / selectedToken.tokenPrice);
    const actualInvestment = tokenQuantity * selectedToken.tokenPrice;
    const annualRentalIncome = (actualInvestment * selectedToken.annualYieldPercent) / 100;
    const monthlyPayout = annualRentalIncome / 12;
    const projectedAppreciation = actualInvestment * (1 + (selectedToken.appreciation5YrPercent / 100) * (holdingYears / 5)) - actualInvestment;
    const totalValueEnd = actualInvestment + projectedAppreciation + (annualRentalIncome * holdingYears);

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    const runZkInvestorCheck = () => {
        setIsZkChecking(true);
        setTimeout(() => {
            setIsZkChecking(false);
            setZkStatus('verified');
        }, 2200);
    };

    const handleBuyTokens = () => {
        setBuyTxState('proving');
        setTimeout(() => {
            setBuyTxState('success');
        }, 2800);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h2 className="section-title" style={{ fontSize: '1.6rem' }}>Fractional Tokenization & Yield Modeler</h2>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(124,58,237,0.15)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,0.3)', padding: '2px 8px', borderRadius: 99, fontFamily: 'JetBrains Mono, monospace' }}>
                            💡 Midnight ZK Micro-Investment Protocol
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                        Own fractional shares of institutional-grade real estate from ₹500 with automated quarterly rental yields & ZK investor accreditation.
                    </p>
                </div>

                {/* ZK Accredited Investor Badge */}
                <div style={{
                    background: zkStatus === 'verified' ? 'rgba(16,185,129,0.12)' : 'var(--midnight-2)',
                    border: zkStatus === 'verified' ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.6rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                            ACCREDITED INVESTOR CHECK
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: zkStatus === 'verified' ? '#34D399' : 'var(--text-primary)' }}>
                            {zkStatus === 'verified' ? '✓ ZK Proof Verified (Net Worth Witness)' : 'Not Proved Yet'}
                        </div>
                    </div>
                    {zkStatus !== 'verified' && (
                        <button
                            onClick={runZkInvestorCheck}
                            disabled={isZkChecking}
                            style={{
                                background: 'var(--aurora)', border: 'none', borderRadius: 'var(--radius-sm)',
                                color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '0.4rem 0.8rem',
                                cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
                            }}
                        >
                            {isZkChecking ? 'Proving ZK…' : 'Verify ZK'}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>

                {/* LEFT: Token Cards */}
                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Available Fractional Assets</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {DEMO_TOKENS.map(token => {
                            const isSelected = token.symbol === selectedToken.symbol;
                            return (
                                <div
                                    key={token.symbol}
                                    onClick={() => setSelectedToken(token)}
                                    style={{
                                        background: isSelected ? 'var(--midnight-3)' : 'var(--midnight-2)',
                                        border: isSelected ? '1px solid #7C3AED' : '1px solid var(--border)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '1.25rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        boxShadow: isSelected ? '0 0 25px rgba(124,58,237,0.25)' : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <span style={{
                                                fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99,
                                                background: token.category === 'Commercial' ? 'rgba(14,165,233,0.15)' : 'rgba(16,185,129,0.15)',
                                                color: token.category === 'Commercial' ? '#38BDF8' : '#34D399',
                                                fontFamily: 'JetBrains Mono, monospace', fontWeight: 600
                                            }}>
                                                {token.category}
                                            </span>
                                            <h4 style={{ fontSize: '1.1rem', margin: '0.3rem 0 0.1rem', color: 'var(--text-primary)' }}>{token.symbol}</h4>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{token.landTitle}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {token.annualYieldPercent}% <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>APY</span>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {fmt(token.tokenPrice)} / token
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>TOTAL VALUATION</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(token.totalMarketCap / 10000000)} Cr</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>5-YR APPRECIATION</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#34D399' }}>+{token.appreciation5YrPercent}%</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>HOLDERS</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{token.verifiedInvestorsCount} investors</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Investment Yield Modeler Calculator */}
                <div style={{
                    background: 'var(--midnight-2)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontFamily: 'Playfair Display, serif' }}>Yield & ROI Simulator</h3>
                            <span style={{ fontSize: '0.8rem', color: '#C4B5FD', fontFamily: 'JetBrains Mono, monospace' }}>{selectedToken.symbol}</span>
                        </div>

                        {/* Slider 1: Investment Amount */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>INVESTMENT AMOUNT</label>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(actualInvestment)}</span>
                            </div>
                            <input
                                type="range"
                                min="5000"
                                max="500000"
                                step="5000"
                                value={investmentAmount}
                                onChange={e => setInvestmentAmount(Number(e.target.value))}
                                style={{ width: '100%', accentColor: '#7C3AED', cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                                <span>₹5,000</span>
                                <span>₹2,50,000</span>
                                <span>₹5,000,000</span>
                            </div>
                        </div>

                        {/* Slider 2: Holding Horizon */}
                        <div style={{ marginBottom: '1.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>HOLDING HORIZON</label>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace' }}>{holdingYears} Years</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={holdingYears}
                                onChange={e => setHoldingYears(Number(e.target.value))}
                                style={{ width: '100%', accentColor: '#0EA5E9', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Output Metrics Grid */}
                        <div style={{
                            background: 'var(--midnight-3)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.25rem',
                            marginBottom: '1.5rem',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>FRACTIONAL TOKENS</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{tokenQuantity} shares</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>EST. MONTHLY PAYOUT</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34D399', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(Math.round(monthlyPayout))}/mo</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>CUMULATIVE RENTAL YIELD</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(Math.round(annualRentalIncome * holdingYears))}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>PROJECTED PORTFOLIO VALUE</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#C4B5FD', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(Math.round(totalValueEnd))}</div>
                            </div>
                        </div>

                        {/* Privacy Shield Disclaimer */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                            🛡️ Yield distributions are settled in Midnight native shielded tokens. Your identity and net worth witness remain completely confidential on-chain.
                        </div>
                    </div>

                    <button
                        onClick={() => setShowBuyModal(true)}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 700 }}
                    >
                        Buy {tokenQuantity} Tokens ({fmt(actualInvestment)}) →
                    </button>
                </div>

            </div>

            {/* PURCHASE MODAL */}
            {showBuyModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                    zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--midnight-2)', border: '1px solid var(--border-bright)',
                        borderRadius: 'var(--radius-xl)', padding: '2rem', maxWidth: 440, width: '100%',
                        boxShadow: '0 0 50px rgba(124,58,237,0.3)', textAlign: 'center'
                    }}>
                        {buyTxState === 'idle' && (
                            <>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
                                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Confirm Fractional Investment</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                    You are purchasing <strong>{tokenQuantity} tokens</strong> of <strong>{selectedToken.symbol}</strong> for <strong>{fmt(actualInvestment)}</strong>.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button onClick={() => setShowBuyModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                                    <button onClick={handleBuyTokens} className="btn btn-primary" style={{ flex: 2 }}>Confirm & Mint ZK Proof</button>
                                </div>
                            </>
                        )}

                        {buyTxState === 'proving' && (
                            <div style={{ padding: '1.5rem 0' }}>
                                <div className="spinner" style={{ margin: '0 auto 1.25rem', width: 36, height: 36, borderWidth: 3 }} />
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Generating ZK Purchase Witness…</h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                    Circuit: <code>mintLandFraction()</code> · Midnight Testnet
                                </p>
                            </div>
                        )}

                        {buyTxState === 'success' && (
                            <>
                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
                                <h3 style={{ fontSize: '1.4rem', color: '#34D399', marginBottom: '0.5rem' }}>Tokens Minted Successfully!</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                                    Your ownership tokens <strong>{selectedToken.symbol}</strong> have been credited to your shielded address.
                                </p>
                                <button onClick={() => { setShowBuyModal(false); setBuyTxState('idle'); }} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
