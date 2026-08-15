import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import './App.css';

const CHART_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(13,20,42,0.97)',
            border: '1px solid rgba(124,58,237,0.35)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
        }}>
            <div style={{ color: '#c4b5fd', fontWeight: 600, marginBottom: 6 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#8b9cc8' }}>{p.name}:</span>
                    <strong style={{ color: '#f0f4ff' }}>
                        {p.value > 1e9 ? `$${(p.value / 1e9).toFixed(1)}B` : `${p.value}`}
                    </strong>
                </div>
            ))}
        </div>
    );
};

// Static Apple financial data for visualization
const APPLE_REVENUE_DATA = [
    { year: '2022', Revenue: 394.33e9, 'Gross Profit': 170.78e9, 'Net Income': 99.80e9 },
    { year: '2023', Revenue: 383.29e9, 'Gross Profit': 169.15e9, 'Net Income': 96.99e9 },
    { year: '2024', Revenue: 391.04e9, 'Gross Profit': 180.68e9, 'Net Income': 93.74e9 },
    { year: '2025', Revenue: 395.76e9, 'Gross Profit': 184.12e9, 'Net Income': 101.30e9 },
];

const APPLE_MARGIN_DATA = [
    { year: '2022', 'Gross Margin %': 43.3, 'Net Margin %': 25.3, 'Op Margin %': 30.3 },
    { year: '2023', 'Gross Margin %': 44.1, 'Net Margin %': 25.3, 'Op Margin %': 29.8 },
    { year: '2024', 'Gross Margin %': 46.2, 'Net Margin %': 24.0, 'Op Margin %': 31.5 },
    { year: '2025', 'Gross Margin %': 46.5, 'Net Margin %': 25.6, 'Op Margin %': 32.0 },
];

const formatBillions = (v) => v >= 1e9 ? `$${(v / 1e9).toFixed(0)}B` : v;

export default function DataView() {
    const [statusData, setStatusData] = useState({ files: [], summaries: {}, ingestion_state: null });
    const [reingesting, setReingesting] = useState(false);
    const [ingestMessage, setIngestMessage] = useState("");
    const [activeChart, setActiveChart] = useState('revenue');
    const isReingesting = useRef(false);

    useEffect(() => { fetchStatus(); }, []);

    const fetchStatus = async () => {
        try {
            const res  = await fetch('/api/status');
            const data = await res.json();
            setStatusData(data);

            const state = data.ingestion_state?.status;
            if (state === "running") {
                setReingesting(true);
                isReingesting.current = true;
                setIngestMessage(data.ingestion_state.message || "Ingesting data…");
                setTimeout(fetchStatus, 3000);
            } else {
                setReingesting(false);
                if (isReingesting.current && (state === "success" || state === "error")) {
                    setIngestMessage(data.ingestion_state.message);
                    isReingesting.current = false;
                } else if (!isReingesting.current && state === "idle") {
                    setIngestMessage("");
                }
            }
        } catch { console.error("Status fetch error"); }
    };

    const triggerReingest = async () => {
        setReingesting(true);
        setIngestMessage("Ingestion triggered in the background…");
        try {
            await fetch('/api/ingest', { method: "POST" });
            setTimeout(fetchStatus, 2000);
        } catch {
            setReingesting(false);
            setIngestMessage("Failed to trigger re-ingestion.");
        }
    };

    const totalFiles  = statusData.files.length;
    const publicFiles = statusData.files.filter(f => f.classification === 'PUBLIC').length;
    const confFiles   = statusData.files.filter(f => f.classification === 'CONFIDENTIAL_HR').length;

    return (
        <div className="page-view">
            <div className="page-header">
                <h1>📁 Phase 1 & 2 — Data Ingestion & Understanding</h1>
                <p>
                    Raw financial data (PDFs and Excel files) converted into structured knowledge.
                    Metrics are pre-extracted, embeddings indexed, and schemas cached for instant AI reasoning.
                </p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                <div className="stat-card">
                    <div className="stat-card-icon">📄</div>
                    <div className="stat-card-value" style={{ color: '#c4b5fd' }}>{totalFiles}</div>
                    <div className="stat-card-label">Total Files Indexed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">🌐</div>
                    <div className="stat-card-value" style={{ color: '#34d399' }}>{publicFiles}</div>
                    <div className="stat-card-label">Public Filings</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">🔒</div>
                    <div className="stat-card-value" style={{ color: '#a855f7' }}>{confFiles}</div>
                    <div className="stat-card-label">Confidential Files</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">📊</div>
                    <div className="stat-card-value" style={{ color: '#38bdf8' }}>4</div>
                    <div className="stat-card-label">Years Covered</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">🧠</div>
                    <div className="stat-card-value" style={{ color: '#f59e0b' }}>{Object.keys(statusData.summaries).length}</div>
                    <div className="stat-card-label">AI Summaries</div>
                </div>
            </div>

            {/* Financial Charts */}
            <div className="panel-card">
                <div className="card-header-row">
                    <h2>Apple Inc. — Financial Overview (2022–2025)</h2>
                    <div className="chart-tabs">
                        <button
                            className={`chart-tab ${activeChart === 'revenue' ? 'active' : ''}`}
                            onClick={() => setActiveChart('revenue')}
                        >▬ Revenue & Profit</button>
                        <button
                            className={`chart-tab ${activeChart === 'margin' ? 'active' : ''}`}
                            onClick={() => setActiveChart('margin')}
                        >〜 Margins</button>
                    </div>
                </div>
                <p className="section-desc">Pre-computed financial metrics extracted from Apple's 10-K filings.</p>

                <ResponsiveContainer width="100%" height={280}>
                    {activeChart === 'revenue' ? (
                        <BarChart data={APPLE_REVENUE_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 30 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.5} />
                                </linearGradient>
                                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.5} />
                                </linearGradient>
                                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="year" tick={{ fill: '#8b9cc8', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={formatBillions} tick={{ fill: '#8b9cc8', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.05)' }} />
                            <Legend wrapperStyle={{ fontSize: 11, color: '#8b9cc8', paddingTop: 10 }} />
                            <Bar dataKey="Revenue"      fill="url(#revGrad)"   radius={[5,5,0,0]} maxBarSize={55} />
                            <Bar dataKey="Gross Profit" fill="url(#grossGrad)" radius={[5,5,0,0]} maxBarSize={55} />
                            <Bar dataKey="Net Income"   fill="url(#netGrad)"   radius={[5,5,0,0]} maxBarSize={55} />
                        </BarChart>
                    ) : (
                        <AreaChart data={APPLE_MARGIN_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                            <defs>
                                {['#7c3aed', '#06b6d4', '#10b981'].map((c, i) => (
                                    <linearGradient key={i} id={`mg${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor={c} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="year" tick={{ fill: '#8b9cc8', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis unit="%" tick={{ fill: '#8b9cc8', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, color: '#8b9cc8', paddingTop: 10 }} />
                            <Area type="monotone" dataKey="Gross Margin %" stroke="#7c3aed" strokeWidth={2.5} fill="url(#mg0)" dot={{ r: 4, fill: '#7c3aed', stroke: '#080c18', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="Op Margin %"    stroke="#06b6d4" strokeWidth={2.5} fill="url(#mg1)" dot={{ r: 4, fill: '#06b6d4', stroke: '#080c18', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="Net Margin %"   stroke="#10b981" strokeWidth={2.5} fill="url(#mg2)" dot={{ r: 4, fill: '#10b981', stroke: '#080c18', strokeWidth: 2 }} />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Files & Summaries Grid */}
            <div className="card-grid">
                {/* Data Sources Catalog */}
                <div className="panel-card file-card">
                    <div className="card-header-row">
                        <h2>Data Sources Catalog</h2>
                        <button className="btn-small" onClick={triggerReingest} disabled={reingesting}>
                            {reingesting ? '⟳ Ingesting…' : '↻ Re-Ingest'}
                        </button>
                    </div>
                    <p className="section-desc">Raw files in the <code style={{ fontSize: 11, color: '#c4b5fd', background: 'rgba(124,58,237,0.1)', padding: '1px 5px', borderRadius: 4 }}>data/raw/</code> directory.</p>

                    {ingestMessage && (
                        <div className="ingest-message">
                            <span>⟳</span> {ingestMessage}
                        </div>
                    )}

                    <ul className="file-list">
                        {statusData.files.length === 0 ? (
                            <div className="loading-placeholder">No files found. Run ingestion.</div>
                        ) : (
                            statusData.files.map((file, i) => (
                                <li key={i} className="file-item">
                                    <div className="file-info">
                                        <span className="file-name" title={file.filename}>
                                            {file.filename.endsWith('.pdf') ? '📄' : '📊'} {file.filename}
                                        </span>
                                        <span className="file-meta">{file.size_kb} KB</span>
                                    </div>
                                    <span className={`file-class ${
                                        file.classification === 'PUBLIC'         ? 'public'       :
                                        file.classification === 'CONFIDENTIAL_HR'? 'confidential' : 'operations'
                                    }`}>
                                        {file.classification.replace(/_/g, ' ')}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* Understanding Layer */}
                <div className="panel-card">
                    <h2>Understanding Layer (Pre-computed)</h2>
                    <p className="section-desc">AI-generated summaries and extracted metrics — avoid re-parsing raw files every query.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                        {Object.keys(statusData.summaries).length === 0 ? (
                            <div className="loading-placeholder">No summaries generated yet. Run ingestion first.</div>
                        ) : (
                            Object.entries(statusData.summaries).map(([filename, data]) => (
                                <div key={filename} style={{
                                    background: 'rgba(124, 58, 237, 0.04)',
                                    padding: 16,
                                    borderRadius: 10,
                                    border: '1px solid rgba(124, 58, 237, 0.15)',
                                }}>
                                    <h4 style={{ color: '#c4b5fd', marginBottom: 3, fontSize: 13.5, fontWeight: 600 }}>{data.title}</h4>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{data.period}</div>
                                    <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, color: 'var(--text-secondary)' }}>{data.description}</p>

                                    <div className="metric-grid">
                                        {Object.entries(data.key_metrics || {}).slice(0, 4).map(([k, v]) => (
                                            <div key={k} className="metric-box">
                                                <div className="metric-box-label">{k}</div>
                                                <div className="metric-box-value">{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
