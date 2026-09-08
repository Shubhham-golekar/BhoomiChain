import React, { useState } from 'react';

export interface GISParcel {
    id: string;
    title: string;
    ctsNumber: string;
    coordinates: string;
    size: string;
    zoning: string;
    stateSync: string;
    matchScore: string;
    elevation: string;
    soilQuality: string;
    privacyStatus: string;
    boundaryPath: string; // SVG path for map boundary
    centerCoords: { x: number; y: number };
    estimatedValue: string;
}

const GIS_PARCELS: GISParcel[] = [
    {
        id: '#0001',
        title: 'Nashik Vineyard Estate',
        ctsNumber: 'CTS 4392-A, Trimbak Zone',
        coordinates: '19.9975° N, 73.7898° E',
        size: '28 Acres (1,219,680 sq.ft)',
        zoning: 'Agricultural / Eco-Tourism',
        stateSync: 'DILRMP Verified',
        matchScore: '99.9%',
        elevation: '584m AMSL',
        soilQuality: 'Black Volcanic Red Soil (pH 6.8)',
        privacyStatus: 'ZK Witness Locked (Private Value)',
        boundaryPath: 'M 120 140 L 260 120 L 320 220 L 210 290 L 110 230 Z',
        centerCoords: { x: 200, y: 190 },
        estimatedValue: '₹8.50 Cr (Private Shield)',
    },
    {
        id: '#0002',
        title: 'Pune IT Corridor Plot',
        ctsNumber: 'Survey 110/B, Hinjewadi Phase 3',
        coordinates: '18.5912° N, 73.7389° E',
        size: '1.2 Acres (52,272 sq.ft)',
        zoning: 'Commercial / High-Density IT',
        stateSync: 'Mahabhulekh Sync Active',
        matchScore: '99.7%',
        elevation: '560m AMSL',
        soilQuality: 'Stable Murrum (Load Capacity 35t/sq.m)',
        privacyStatus: 'ZK Witness Locked (Collateral Active)',
        boundaryPath: 'M 360 80 L 490 100 L 520 210 L 380 190 Z',
        centerCoords: { x: 440, y: 145 },
        estimatedValue: '₹22.00 Cr (Disclosed 50% LTV)',
    },
    {
        id: '#0003',
        title: 'Konkan Coastal Resort Land',
        ctsNumber: 'Survey 88C, Alibaug Belt',
        coordinates: '18.6414° N, 72.8722° E',
        size: '5.0 Acres (217,800 sq.ft)',
        zoning: 'Non-Agricultural Commercial',
        stateSync: 'Revenue Office Clearance',
        matchScore: '99.5%',
        elevation: '12m AMSL',
        soilQuality: 'Coastal Sandy Loam (pH 7.1)',
        privacyStatus: 'ZK Witness Unlocked (Private Value)',
        boundaryPath: 'M 140 330 L 280 320 L 340 430 L 160 450 Z',
        centerCoords: { x: 230, y: 380 },
        estimatedValue: '₹15.00 Cr (Private Shield)',
    },
    {
        id: '#0004',
        title: 'Mumbai Bandra West Plot',
        ctsNumber: 'CTS 2291, Turner Road Precinct',
        coordinates: '19.0596° N, 72.8295° E',
        size: '0.8 Acres (34,848 sq.ft)',
        zoning: 'Prime Residential R-4 Zone',
        stateSync: 'MCGM Cadastral Verified',
        matchScore: '100.0%',
        elevation: '8m AMSL',
        soilQuality: 'Basalt Rock Sub-strata',
        privacyStatus: 'ZK Witness Verified (Deed Minted)',
        boundaryPath: 'M 400 270 L 540 250 L 560 380 L 420 390 Z',
        centerCoords: { x: 480, y: 320 },
        estimatedValue: '₹35.00 Cr (Private Shield)',
    },
];

export const GISMap: React.FC = () => {
    const [selectedParcel, setSelectedParcel] = useState<GISParcel>(GIS_PARCELS[0]);
    const [mapLayer, setMapLayer] = useState<'satellite' | 'cadastral' | 'heatmap'>('satellite');
    const [showGrid, setShowGrid] = useState(true);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h2 className="section-title" style={{ fontSize: '1.6rem' }}>Geospatial GIS Parcel Explorer</h2>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(14,165,233,0.15)', color: '#38BDF8', border: '1px solid rgba(14,165,233,0.3)', padding: '2px 8px', borderRadius: 99, fontFamily: 'JetBrains Mono, monospace' }}>
                            📡 Cadastral Vector Engine v2.4
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                        Interactive satellite polygon boundary map linked with Midnight ZK privacy proofs & Govt land registry vector feeds.
                    </p>
                </div>

                {/* Layer Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--midnight-2)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setMapLayer('satellite')}
                        style={{
                            padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
                            background: mapLayer === 'satellite' ? 'var(--aurora)' : 'transparent',
                            color: mapLayer === 'satellite' ? '#fff' : 'var(--text-muted)',
                            border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                        }}
                    >
                        🛰️ Satellite Overlay
                    </button>
                    <button
                        onClick={() => setMapLayer('cadastral')}
                        style={{
                            padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
                            background: mapLayer === 'cadastral' ? 'var(--aurora)' : 'transparent',
                            color: mapLayer === 'cadastral' ? '#fff' : 'var(--text-muted)',
                            border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                        }}
                    >
                        📐 Cadastral Survey
                    </button>
                    <button
                        onClick={() => setMapLayer('heatmap')}
                        style={{
                            padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
                            background: mapLayer === 'heatmap' ? 'var(--aurora)' : 'transparent',
                            color: mapLayer === 'heatmap' ? '#fff' : 'var(--text-muted)',
                            border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                        }}
                    >
                        🔥 Valuation Heatmap
                    </button>
                </div>
            </div>

            {/* Main Grid View */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>

                {/* MAP CANVAS PANEL */}
                <div style={{
                    background: mapLayer === 'satellite'
                        ? 'radial-gradient(circle at 50% 50%, #0c1c38 0%, #050B14 100%)'
                        : mapLayer === 'cadastral'
                            ? '#081224'
                            : 'radial-gradient(circle at 60% 40%, #1f0b38 0%, #050B14 100%)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 480,
                    boxShadow: 'var(--shadow-lg)'
                }}>

                    {/* Map Top Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
                            STATE GIS SYNC: ACTIVE (Mahabhulekh Node #402)
                        </div>
                        <button
                            onClick={() => setShowGrid(!showGrid)}
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}
                        >
                            {showGrid ? 'Grid: ON' : 'Grid: OFF'}
                        </button>
                    </div>

                    {/* SVG Map Viewer */}
                    <div style={{ position: 'relative', width: '100%', height: 380, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>

                        {/* Grid Lines Overlay */}
                        {showGrid && (
                            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
                                <defs>
                                    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7C3AED" strokeWidth="0.8" />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#gridPattern)" />
                            </svg>
                        )}

                        {/* Cadastral Polygon Boundaries */}
                        <svg width="100%" height="100%" viewBox="0 0 650 480" style={{ width: '100%', height: '100%' }}>
                            <defs>
                                <linearGradient id="polyGradientSelected" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45" />
                                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.45" />
                                </linearGradient>
                                <linearGradient id="polyGradientNormal" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.18" />
                                </linearGradient>
                                <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="6" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>

                            {/* Draw Roads / River Features */}
                            <path d="M 0 200 Q 200 240 650 180" stroke="rgba(14, 165, 233, 0.25)" strokeWidth="8" fill="none" strokeDasharray="6 4" />
                            <text x="500" y="170" fill="rgba(14, 165, 233, 0.5)" fontSize="10" fontFamily="JetBrains Mono, monospace">STATE HIGHWAY SH-42</text>

                            {/* Render Parcels */}
                            {GIS_PARCELS.map(parcel => {
                                const isSelected = parcel.id === selectedParcel.id;
                                return (
                                    <g key={parcel.id} onClick={() => setSelectedParcel(parcel)} style={{ cursor: 'pointer' }}>
                                        <path
                                            d={parcel.boundaryPath}
                                            fill={isSelected ? 'url(#polyGradientSelected)' : 'url(#polyGradientNormal)'}
                                            stroke={isSelected ? '#C4B5FD' : mapLayer === 'heatmap' ? '#F59E0B' : 'rgba(255,255,255,0.4)'}
                                            strokeWidth={isSelected ? 3 : 1.5}
                                            strokeDasharray={isSelected ? 'none' : mapLayer === 'cadastral' ? '4 2' : 'none'}
                                            filter={isSelected ? 'url(#glowEffect)' : undefined}
                                            style={{ transition: 'all 0.3s ease' }}
                                        />

                                        {/* Plot Pin Marker */}
                                        <circle
                                            cx={parcel.centerCoords.x}
                                            cy={parcel.centerCoords.y}
                                            r={isSelected ? 7 : 5}
                                            fill={isSelected ? '#F59E0B' : '#0EA5E9'}
                                            stroke="#ffffff"
                                            strokeWidth={2}
                                        />

                                        {/* Plot Label */}
                                        <text
                                            x={parcel.centerCoords.x}
                                            y={parcel.centerCoords.y - 12}
                                            textAnchor="middle"
                                            fill={isSelected ? '#FFFFFF' : '#94A3B8'}
                                            fontSize="11"
                                            fontWeight={isSelected ? 'bold' : 'normal'}
                                            fontFamily="Outfit, sans-serif"
                                        >
                                            {parcel.id} · {parcel.title.split(' ')[0]}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Map Legend Floating Box */}
                        <div style={{
                            position: 'absolute', bottom: 12, left: 12,
                            background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(8px)',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                            padding: '0.6rem 0.8rem', fontSize: '0.7rem', color: 'var(--text-muted)',
                            fontFamily: 'JetBrains Mono, monospace'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ width: 10, height: 10, background: '#7C3AED', borderRadius: 2, display: 'inline-block' }} /> Selected Boundary
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, background: '#0EA5E9', borderRadius: '50%', display: 'inline-block' }} /> ZK Verified Parcel Pin
                            </div>
                        </div>
                    </div>
                </div>

                {/* PARCEL DETAIL INSPECTOR SIDEBAR */}
                <div style={{
                    background: 'var(--midnight-2)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        {/* Header Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--aurora-end)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                                    PARCEL INSPECTOR
                                </span>
                                <h3 style={{ fontSize: '1.35rem', margin: '0.2rem 0' }}>{selectedParcel.title}</h3>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {selectedParcel.id} · {selectedParcel.ctsNumber}
                                </div>
                            </div>
                            <span style={{
                                fontSize: '0.7rem', padding: '3px 8px', borderRadius: 99,
                                background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)',
                                fontFamily: 'JetBrains Mono, monospace', fontWeight: 600
                            }}>
                                ✓ {selectedParcel.matchScore} Match
                            </span>
                        </div>

                        {/* ZK Privacy Alert Banner */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(14,165,233,0.12))',
                            border: '1px solid rgba(124,58,237,0.3)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.875rem',
                            marginBottom: '1.25rem'
                        }}>
                            <div style={{ fontSize: '0.72rem', color: '#C4B5FD', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, marginBottom: 2 }}>
                                🔒 PRIVACY SHIELDED STATE
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                Valuation witness protected via <strong>Midnight ZK proof</strong>. Public chain sees only encrypted commitments & proof hashes.
                            </div>
                        </div>

                        {/* Spec Matrix */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>GPS COORDINATES</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedParcel.coordinates}</div>
                            </div>
                            <div style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>SURVEY AREA</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedParcel.size}</div>
                            </div>
                            <div style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>MUNICIPAL ZONING</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedParcel.zoning}</div>
                            </div>
                            <div style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>ELEVATION & SOIL</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedParcel.elevation}</div>
                            </div>
                        </div>

                        {/* Soil Quality Detail */}
                        <div style={{ background: 'var(--midnight-3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px border-dashed var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '1.25rem' }}>
                            🌱 <strong>Soil Report:</strong> {selectedParcel.soilQuality}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }}>
                            Verify Cadastral Vector →
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
