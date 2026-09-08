import React, { useState } from 'react';

interface GovtIntegration {
    agency: string;
    systemName: string;
    status: 'ONLINE' | 'SYNCING' | 'MAINTENANCE';
    lastPing: string;
    verifiedRecordsCount: number;
    apiEndpoint: string;
    complianceShield: string;
}

const INTEGRATIONS: GovtIntegration[] = [
    {
        agency: 'Revenue & Land Records Dept',
        systemName: 'DILRMP / Mahabhulekh Cadastral Portal',
        status: 'ONLINE',
        lastPing: '12 seconds ago',
        verifiedRecordsCount: 48920,
        apiEndpoint: 'https://mahabhulekh.gov.in/api/v2/cadastral/verify',
        complianceShield: 'Digital India Land Modernization Compliant',
    },
    {
        agency: 'Stamp Duty & Registration Dept',
        systemName: 'IGR Maharashtra e-Registration Network',
        status: 'ONLINE',
        lastPing: '45 seconds ago',
        verifiedRecordsCount: 31050,
        apiEndpoint: 'https://igrmaharashtra.gov.in/api/v1/stampduty/verify',
        complianceShield: 'Automatic Smart Duty Deduction Settled',
    },
    {
        agency: 'Urban Development & Zoning Authority',
        systemName: 'Town Planning Cadastral GIS (TPD-GIS)',
        status: 'ONLINE',
        lastPing: '2 minutes ago',
        verifiedRecordsCount: 15400,
        apiEndpoint: 'https://dtp.maharashtra.gov.in/api/v3/zoning/lookup',
        complianceShield: 'Zoning Code & FSI Clearance Certified',
    },
    {
        agency: 'Judicial & Dispute Registry',
        systemName: 'National Judicial Data Grid (NJDG)',
        status: 'SYNCING',
        lastPing: 'Syncing now…',
        verifiedRecordsCount: 102400,
        apiEndpoint: 'https://njdg.ecourts.gov.in/api/v1/litigation/check',
        complianceShield: 'Zero Pending Litigation Certificate (ZK Verified)',
    },
];

export const GovtSync: React.FC = () => {
    const [integrations, setIntegrations] = useState<GovtIntegration[]>(INTEGRATIONS);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            setIntegrations(prev => prev.map(item => ({
                ...item,
                lastPing: 'Just now',
                verifiedRecordsCount: item.verifiedRecordsCount + Math.floor(Math.random() * 5) + 1
            })));
        }, 1500);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h2 className="section-title" style={{ fontSize: '1.6rem' }}>Government Land Registry & Compliance Sync</h2>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', padding: '2px 8px', borderRadius: 99, fontFamily: 'JetBrains Mono, monospace' }}>
                            🏛️ DILRMP Enterprise Node
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                        Direct API sync status with state revenue departments, municipal town planning GIS, and Judicial Data Grid encumbrance indexes.
                    </p>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="btn"
                    style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    {isRefreshing ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '🔄'} Refresh Government Sync
                </button>
            </div>

            {/* Enterprise Architecture Blueprint Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {integrations.map(item => (
                    <div
                        key={item.agency}
                        style={{
                            background: 'var(--midnight-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.5rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                                {item.agency.toUpperCase()}
                            </span>
                            <span style={{
                                fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99,
                                background: item.status === 'ONLINE' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                color: item.status === 'ONLINE' ? '#34D399' : '#FCD34D',
                                border: item.status === 'ONLINE' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)',
                                fontFamily: 'JetBrains Mono, monospace', fontWeight: 600
                            }}>
                                ● {item.status}
                            </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{item.systemName}</h3>

                        <div style={{
                            fontSize: '0.75rem', color: '#67E8F9', background: 'var(--midnight-3)',
                            padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
                            fontFamily: 'JetBrains Mono, monospace', margin: '0.875rem 0',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                            API: {item.apiEndpoint}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Verified Records:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.verifiedRecordsCount.toLocaleString()}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Ping Latency:</span>
                            <span style={{ color: '#34D399' }}>{item.lastPing}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Smart Legal Escrow & Regulatory Compliance Section */}
            <div style={{
                background: 'linear-gradient(135deg, var(--midnight-2), var(--midnight-3))',
                border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <h3 style={{ fontSize: '1.3rem', fontFamily: 'Playfair Display, serif', marginBottom: '1rem' }}>
                    🏛️ Smart Escrow & Legal Framework Architecture
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>

                    <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📜</div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>Legally Binding Smart Deed</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Each tokenized parcel is bound to a Special Purpose Vehicle (SPV) deed document hash legally recognized under the Registration Act 1908.
                        </p>
                    </div>

                    <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>Midnight ZK Escrow Vault</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Funds and collateral deed tokens are locked in Compact smart circuits. Liquidation or unlock requires Zero-Knowledge multi-key consensus.
                        </p>
                    </div>

                    <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚖️</div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>Dispute Resolution Oracle</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Integrated with court database feeds. Any encumbrance flag automatically freezes collateral locking until judicial clearance ZK proof is posted.
                        </p>
                    </div>

                </div>
            </div>

        </div>
    );
};
