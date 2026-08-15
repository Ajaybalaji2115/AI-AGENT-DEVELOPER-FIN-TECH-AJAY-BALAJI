import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    ResponsiveContainer, Cell
} from 'recharts';
import './App.css';

const S = {
    sectionBox: {
        background: 'rgba(13,20,42,0.85)',
        border: '1px solid rgba(124,58,237,0.18)',
        borderRadius: 16,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    topBar: (color = '#7c3aed') => ({
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${color}, #06b6d4)`,
    }),
    label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8b9cc8' },
    value: { fontSize: 26, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px' },
    pill: (color) => ({
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20,
        fontSize: 10.5, fontWeight: 700,
        background: color + '15', color, border: `1px solid ${color}30`,
    }),
};

const DarkTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background:'rgba(8,12,24,0.97)', border:'1px solid rgba(124,58,237,0.35)', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
            <div style={{ color:'#c4b5fd', fontWeight:600, marginBottom:6 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ display:'flex', gap:8, color:'#8b9cc8' }}>
                    <span>{p.name}:</span>
                    <strong style={{ color:'#f0f4ff' }}>
                        {typeof p.value === 'number' && Math.abs(p.value) > 1e6
                            ? `$${(p.value/1e9).toFixed(2)}B`
                            : typeof p.value === 'number'
                            ? p.value.toFixed(2)
                            : p.value}
                    </strong>
                </div>
            ))}
        </div>
    );
};

const METRICS = [
    { key:'revenue',           label:'Total Net Revenue',       icon:'💰' },
    { key:'gross_profit',      label:'Gross Profit',            icon:'📈' },
    { key:'operating_income',  label:'Operating Income',        icon:'🏭' },
    { key:'net_income',        label:'Net Income',              icon:'💵' },
    { key:'rd_expense',        label:'R&D Expense',             icon:'🔬' },
    { key:'operating_expense', label:'Operating Expense',       icon:'📉' },
    { key:'cost_of_sales',     label:'Cost of Sales',           icon:'🛒' },
];

export default function WhatIfView() {
    const { userRole } = useOutletContext();
    const [metric,    setMetric]    = useState('revenue');
    const [changePct, setChangePct] = useState(10);
    const [baseYear,  setBaseYear]  = useState('2024');
    const [loading,   setLoading]   = useState(false);
    const [result,    setResult]    = useState(null);
    const [error,     setError]     = useState('');

    const run = async () => {
        setLoading(true); setError(''); setResult(null);
        try {
            const res = await fetch('/api/whatif', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ metric, change_pct: changePct, base_year: baseYear, role: userRole }),
            });
            const data = await res.json();
            if (data.error) { setError(data.error); return; }
            setResult(data);
        } catch(e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const SCENARIOS = [
        { label:'Bull Case +15% Revenue',   metric:'revenue',          pct:15,   year:'2024' },
        { label:'Bear Case -8% Revenue',    metric:'revenue',          pct:-8,   year:'2024' },
        { label:'R&D Surge +25%',           metric:'rd_expense',       pct:25,   year:'2024' },
        { label:'Margin Squeeze -5% Gross', metric:'gross_profit',     pct:-5,   year:'2024' },
        { label:'Net Income +12%',          metric:'net_income',       pct:12,   year:'2023' },
    ];

    const chartData = result ? [
        { year: result.base_year,       value: result.baseline,   label:'Baseline',  fill:'#38bdf8' },
        { year: `${+result.base_year+1}`, value: result.projections[0]?.value, label:'Year 1', fill: changePct >= 0 ? '#34d399' : '#f87171' },
        { year: `${+result.base_year+2}`, value: result.projections[1]?.value, label:'Year 2', fill: changePct >= 0 ? '#34d399' : '#f87171' },
        { year: `${+result.base_year+3}`, value: result.projections[2]?.value, label:'Year 3', fill: changePct >= 0 ? '#34d399' : '#f87171' },
    ] : [];

    const fmtB = (v) => v > 1e6 ? `$${(v/1e9).toFixed(2)}B` : v?.toFixed(2);

    return (
        <div className="page-view">
            <div className="page-header">
                <h1>🧮 What-If Projection Simulator</h1>
                <p>
                    Perform dynamic, AST-verified calculations using historical balance sheet and income statement baselines.
                </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:16, alignItems:'start' }}>
                {/* Control Panel */}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div style={S.sectionBox}>
                        <div style={S.topBar('#06b6d4')} />
                        <div style={S.label}>Select Baseline Metric</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
                            {METRICS.map(m => (
                                <div
                                    key={m.key}
                                    onClick={() => setMetric(m.key)}
                                    style={{
                                        padding:'10px 14px', borderRadius:9, cursor:'pointer', display:'flex', gap:10, alignItems:'center',
                                        background: metric === m.key ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${metric === m.key ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.07)'}`,
                                        transition:'all 0.15s',
                                    }}
                                >
                                    <span style={{ fontSize:16 }}>{m.icon}</span>
                                    <span style={{ fontSize:13, fontWeight: metric === m.key ? 600 : 400, color: metric === m.key ? '#67e8f9' : '#8b9cc8' }}>{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={S.sectionBox}>
                        <div style={S.topBar('#06b6d4')} />
                        <div style={{ marginBottom:16 }}>
                            <div style={{ ...S.label, marginBottom:8 }}>Base Year</div>
                            <div style={{ display:'flex', gap:6 }}>
                                {['2022','2023','2024'].map(y => (
                                    <button key={y} onClick={() => setBaseYear(y)} style={{
                                        flex:1, padding:'8px 0', borderRadius:8, cursor:'pointer',
                                        background: baseYear === y ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
                                        border:`1px solid ${baseYear === y ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                        color: baseYear === y ? '#67e8f9' : '#8b9cc8', fontWeight:600, fontSize:13,
                                    }}>{y}</button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom:16 }}>
                            <div style={{ ...S.label, marginBottom:8 }}>
                                Growth Rate %: <span style={{ color: changePct >= 0 ? '#34d399' : '#f87171', fontFamily:"'Space Grotesk',sans-serif", fontSize:18 }}>
                                    {changePct >= 0 ? '+' : ''}{changePct}%
                                </span>
                            </div>
                            <input
                                type="range" min="-50" max="50" value={changePct}
                                onChange={e => setChangePct(Number(e.target.value))}
                                style={{ width:'100%', accentColor:'#06b6d4' }}
                            />
                        </div>

                        <button onClick={run} disabled={loading} style={{
                            width:'100%', padding:'12px 0',
                            background:'linear-gradient(135deg,#06b6d4,#2563eb)',
                            border:'none', borderRadius:10, color:'#fff',
                            fontWeight:700, fontSize:14, cursor:'pointer',
                            boxShadow:'0 4px 16px rgba(6,182,212,0.3)',
                            opacity: loading ? 0.6 : 1,
                        }}>
                            {loading ? 'Calculating…' : 'Run Projection'}
                        </button>
                    </div>

                    <div style={S.sectionBox}>
                        <div style={S.topBar('#06b6d4')} />
                        <div style={S.label}>⚡ Presets</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:10 }}>
                            {SCENARIOS.map(sc => (
                                <button key={sc.label} onClick={() => {
                                    setMetric(sc.metric); setChangePct(sc.pct); setBaseYear(sc.year);
                                    setTimeout(run, 50);
                                }} style={{
                                    textAlign:'left', padding:'8px 12px', borderRadius:8, cursor:'pointer',
                                    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                                    color:'#8b9cc8', fontSize:12, fontFamily:'Inter,sans-serif',
                                }}>
                                    {sc.pct >= 0 ? '📈' : '📉'} {sc.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {error && (
                        <div style={{ padding:'14px 16px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, color:'#f87171', fontSize:13 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {!result && !loading && !error && (
                        <div style={{ ...S.sectionBox, textAlign:'center', padding:'60px 20px' }}>
                            <div style={{ fontSize:48, marginBottom:16 }}>🧮</div>
                            <div style={{ color:'#4a5578', fontSize:14 }}>
                                Configure metrics and click <strong style={{color:'#67e8f9'}}>Run Projection</strong> to see forecast modeling.
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div style={{ ...S.sectionBox, textAlign:'center', padding:'40px' }}>
                            <div style={{ color:'#67e8f9', fontSize:14 }}>Calculating compound values using AST engine…</div>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Projections stats */}
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                                {[
                                    { label:'Baseline (Database Value)', value: fmtB(result.baseline),  color:'#38bdf8' },
                                    { label:'Year 1 Projection',       value: fmtB(result.projected), color: changePct>=0?'#34d399':'#f87171' },
                                    { label:'Forecast Delta',          value: `${changePct>=0?'+':''}${fmtB(result.delta)}`, color: changePct>=0?'#34d399':'#f87171' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ ...S.sectionBox, padding:16 }}>
                                        <div style={S.topBar(color)} />
                                        <div style={{ ...S.label, marginBottom:6 }}>{label}</div>
                                        <div style={{ ...S.value, color, fontSize:22 }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Chart */}
                            <div style={S.sectionBox}>
                                <div style={S.topBar('#06b6d4')} />
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:15, fontFamily:"'Space Grotesk',sans-serif" }}>
                                            {result.metric_label} — 3-Year Projection
                                        </div>
                                        <div style={{ fontSize:12, color:'#8b9cc8', marginTop:2 }}>
                                            Applied: {changePct >= 0 ? '+' : ''}{changePct}% annually · Base: {result.base_year}
                                        </div>
                                    </div>
                                    <span style={S.pill(changePct >= 0 ? '#34d399' : '#f87171')}>
                                        {changePct >= 0 ? '📈 Growth' : '📉 Decline'} Scenario
                                    </span>
                                </div>

                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={chartData} margin={{ top:5, right:10, bottom:5, left:20 }}>
                                        <defs>
                                            <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                                                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.5} />
                                            </linearGradient>
                                            <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={changePct >= 0 ? '#34d399' : '#f87171'} stopOpacity={0.9} />
                                                <stop offset="100%" stopColor={changePct >= 0 ? '#34d399' : '#f87171'} stopOpacity={0.5} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="year" tick={{ fill:'#8b9cc8', fontSize:12 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={v => v>1e9?`$${(v/1e9).toFixed(0)}B`:v} tick={{ fill:'#8b9cc8', fontSize:10 }} axisLine={false} tickLine={false} width={55} />
                                        <Tooltip content={<DarkTip />} cursor={{ fill:'rgba(124,58,237,0.06)' }} />
                                        <ReferenceLine y={result.baseline} stroke="rgba(56,189,248,0.4)" strokeDasharray="4 4" />
                                        <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={70}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={i === 0 ? 'url(#baseGrad)' : 'url(#projGrad)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* AST Details */}
                            <div style={S.sectionBox}>
                                <div style={S.topBar('#10b981')} />
                                <div style={{ ...S.label, marginBottom:12 }}>🔬 Mathematical Proof (AST Safe Parser)</div>
                                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                                    {[
                                        { step:'1', label:'MySQL Baseline Extract', value:`SELECT ... FROM financials → ${fmtB(result.baseline)} (${result.base_year})`, color:'#38bdf8' },
                                        { step:'2', label:'Expression String', value:`${result.expression}`, color:'#c4b5fd' },
                                        { step:'3', label:'Python AST Safe Evaluation', value:`AST Tree Parsing → ${fmtB(result.projected)}`, color:'#34d399' },
                                    ].map(({ step, label, value, color }) => (
                                        <div key={step} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 14px',
                                            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9 }}>
                                            <span style={{ ...S.pill(color), flexShrink:0 }}>Step {step}</span>
                                            <div>
                                                <div style={{ fontSize:11, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
                                                <code style={{ fontSize:12, color:'#8b9cc8', fontFamily:'monospace' }}>{value}</code>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
