import React, { useState } from 'react';

interface VerificationResult {
    docHash: string;
    parcelId: string;
    title: string;
    zkWitnessStatus: 'VERIFIED' | 'FAILED';
    titleClearance: 'NO_ENCUMBRANCE' | 'ACTIVE_MORTGAGE';
    governmentSyncMatch: number; // e.g. 99.8%
    stampDutySettled: boolean;
    biometricOwnership: boolean;
    timestamp: string;
    proofHash: string;
}

export const TitleAuditor: React.FC = () => {
    const [inputHash, setInputHash] = useState<string>('QmX9vT...kR7mP');
    const [isAuditing, setIsAuditing] = useState<boolean>(false);
    const [auditResult, setAuditResult] = useState<VerificationResult | null>({
        docHash: 'QmX9vT...kR7mP',
        parcelId: '#0001',
        title: 'Nashik Vineyard Estate',
        zkWitnessStatus: 'VERIFIED',
        titleClearance: 'NO_ENCUMBRANCE',
        governmentSyncMatch: 99.9,
        stampDutySettled: true,
        biometricOwnership: true,
        timestamp: '2026-09-08 08:30:15 UTC',
        proofHash: 'zk_proof_midnight_0x8f3a2b1c4e9d7a6b5c4d3e2f1a0b9c8d',
    });

    const handleRunAudit = () => {
        setIsAuditing(true);
        setAuditResult(null);
        setTimeout(() => {
            setIsAuditing(false);
            setAuditResult({
                docHash: inputHash || 'QmRf3q...9sLP',
                parcelId: '#0002',
                title: 'Pune IT Corridor Plot',
                zkWitnessStatus: 'VERIFIED',
                titleClearance: 'ACTIVE_MORTGAGE',
                governmentSyncMatch: 99.7,
                stampDutySettled: true,
                biometricOwnership: true,
                timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
                proofHash: `zk_proof_midnight_0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
            });
        }, 2500);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h2 className="section-title" style={{ fontSize: '1.6rem' }}>ZK Title Deed Auditor & Verification Portal</h2>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: 99, fontFamily: 'JetBrains Mono, monospace' }}>
                        🛡️ Zero-Knowledge Encumbrance Circuit
                    </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                    Instantly verify property deed authenticity, government cadastral sync, encumbrances, and stamp duty clearance without compromising owner identity or private land value.
                </p>
            </div>

            {/* Audit Search Box */}
            <div style={{
                background: 'var(--midnight-2)',
                border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                marginBottom: '2rem',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '0.5rem' }}>
                    ENTER LAND DEED IPFS HASH OR SURVEY CTS NUMBER:
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        type="text"
                        value={inputHash}
                        onChange={e => setInputHash(e.target.value)}
                        placeholder="e.g. QmX9vT...kR7mP or CTS 4392-A"
                        style={{
                            flex: 1, padding: '0.85rem 1.25rem',
                            background: 'var(--midnight-3)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.95rem'
                        }}
                    />
                    <button
                        onClick={handleRunAudit}
                        disabled={isAuditing}
                        className="btn btn-primary"
                        style={{ padding: '0.85rem 2rem', fontSize: '0.95rem', fontWeight: 700 }}
                    >
                        {isAuditing ? 'Executing ZK Circuit…' : '🔍 Verify Title Deed'}
                    </button>
                </div>

                {/* Quick Sample Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    <span>Try Demo Hashes:</span>
                    <span onClick={() => setInputHash('QmX9vT...kR7mP')} style={{ color: '#38BDF8', cursor: 'pointer', textDecoration: 'underline' }}>#0001 (Nashik Vineyard)</span>
                    <span>·</span>
                    <span onClick={() => setInputHash('QmRf3q...9sLP')} style={{ color: '#38BDF8', cursor: 'pointer', textDecoration: 'underline' }}>#0002 (Pune IT Corridor)</span>
                    <span>·</span>
                    <span onClick={() => setInputHash('QmWk8p...1tKQ')} style={{ color: '#38BDF8', cursor: 'pointer', textDecoration: 'underline' }}>#0003 (Konkan Resort)</span>
                </div>
            </div>

            {/* Loading state */}
            {isAuditing && (
                <div style={{ background: 'var(--midnight-2)', borderRadius: 'var(--radius-xl)', padding: '3rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1.5rem', width: 44, height: 44, borderWidth: 3 }} />
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Evaluating Midnight Compact Circuit</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>
                        Verifying docHash commitment <code>{inputHash}</code> against state registry witness polynomial…
                    </p>
                </div>
            )}

            {/* Audit Certificate Report Card */}
            {auditResult && !isAuditing && (
                <div style={{
                    background: 'var(--midnight-2)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '2.5rem',
                    boxShadow: '0 0 50px rgba(16,185,129,0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Certificate Header watermark */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: '#34D399', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '1px' }}>
                                MIDNIGHT NETWORK · ZK AUDIT REPORT
                            </div>
                            <h3 style={{ fontSize: '1.6rem', fontFamily: 'Playfair Display, serif', marginTop: 4 }}>{auditResult.title}</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                Deed Hash: {auditResult.docHash} · Parcel {auditResult.parcelId}
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(16,185,129,0.15)', border: '1.5px solid #10B981',
                            borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem', textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34D399', fontFamily: 'JetBrains Mono, monospace' }}>
                                PASSED ✓
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                ZK VERIFIED CLEAN TITLE
                            </div>
                        </div>
                    </div>

                    {/* Audit Verification Checklist Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>

                        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>ZK WITNESS COMMITMENT</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34D399', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>✓ Verified On-Chain</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Private value hidden via Midnight witness</div>
                        </div>

                        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>ENCUMBRANCE & LIEN STATUS</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: auditResult.titleClearance === 'NO_ENCUMBRANCE' ? '#34D399' : '#F59E0B', marginTop: 4 }}>
                                {auditResult.titleClearance === 'NO_ENCUMBRANCE' ? '✓ Free & Clear' : '⚠️ Active Collateral Loan'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {auditResult.titleClearance === 'NO_ENCUMBRANCE' ? 'No external bank mortgages' : '50% LTV smart contract lock'}
                            </div>
                        </div>

                        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>GOVT REGISTRY MATCH</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38BDF8', marginTop: 4 }}>
                                {auditResult.governmentSyncMatch}% Vector Match
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Mahabhulekh DILRMP Cadastral Feed</div>
                        </div>

                        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>STAMP DUTY & BIOMETRIC</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#C4B5FD', marginTop: 4 }}>
                                ✓ Settled & Signed
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>e-Registration clearance complete</div>
                        </div>

                    </div>

                    {/* Proof Cryptographic Footer */}
                    <div style={{
                        background: 'var(--midnight-3)',
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--text-muted)'
                    }}>
                        <div>
                            <span style={{ color: 'var(--aurora-end)' }}>ZK PROOF HASH: </span>
                            {auditResult.proofHash}
                        </div>
                        <button className="btn" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}>
                            📥 Export Audit PDF
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};
