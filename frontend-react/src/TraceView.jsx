import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
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
    pill: (color) => ({
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20,
        fontSize: 10.5, fontWeight: 700,
        background: color + '15', color, border: `1px solid ${color}30`,
    }),
    card: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '14px 16px',
        fontSize: 13,
    },
};

export default function TraceView() {
    const { userRole } = useOutletContext();
    const [query, setQuery]           = useState('');
    const [loading, setLoading]       = useState(false);
    const [citations, setCitations]   = useState([]);
    const [selected, setSelected]     = useState(null);
    const [error, setError]           = useState('');

    const DEMO_QUERIES = [
        "What were Apple's key risk factors in 2024?",
        "Explain Apple's services segment revenue growth",
        "What was Apple's capital return program?",
        "Describe Apple's R&D strategy",
    ];

    const search = async (q) => {
        const text = (q || query).trim();
        if (!text) return;
        setQuery(text);
        setLoading(true);
        setError('');
        setCitations([]);
        setSelected(null);
        try {
            const res = await fetch('/api/trust-trace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text, role: userRole }),
            });
            const data = await res.json();
            if (data.error) { setError(data.error); return; }
            setCitations(data.citations || []);
            if (data.citations?.length) setSelected(data.citations[0]);
        } catch (e) {
            setError('Backend error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const relevanceColor = (score) => {
        if (score >= 70) return '#34d399';
        if (score >= 40) return '#f59e0b';
        return '#f87171';
    };

    return (
        <div className="page-view">
            <div className="page-header">
                <h1>🔍 Trust &amp; Trace Source Viewer</h1>
                <p>
                    Verify every AI response against the ground-truth document chunks. Click any citation to view page metadata and exact source excerpts.
                </p>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {/* Search control bar */}
                <div style={S.sectionBox}>
                    <div style={S.topBar('#7c3aed')} />
                    <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                        <span style={{ fontSize:28 }}>🔍</span>
                        <div>
                            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, marginBottom:6 }}>
                                Document Excerpt &amp; Citation Engine
                            </h2>
                            <p style={{ fontSize:13, color:'#8b9cc8', lineHeight:1.6, maxWidth:700 }}>
                                Enter a financial query to search the 10-K vector database. Click any search match to display the exact paragraph from Apple's filings.
                            </p>
                        </div>
                    </div>

                    <div style={{ marginTop:18, display:'flex', gap:10 }}>
                        <input
                            style={{
                                flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(124,58,237,0.3)',
                                borderRadius:10, padding:'11px 16px', color:'#f0f4ff', fontSize:14,
                                outline:'none', fontFamily:'Inter,sans-serif',
                            }}
                            placeholder="e.g. What were Apple's key risk factors in 2024?"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && search()}
                        />
                        <button
                            onClick={() => search()}
                            disabled={loading}
                            style={{
                                background:'linear-gradient(135deg,#7c3aed,#2563eb)',
                                border:'none', borderRadius:10, padding:'11px 22px',
                                color:'#fff', fontWeight:600, cursor:'pointer', fontSize:14,
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            {loading ? 'Searching…' : 'Trace Source'}
                        </button>
                    </div>

                    {/* Chips */}
                    <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:8 }}>
                        {DEMO_QUERIES.map(q => (
                            <span key={q}
                                onClick={() => search(q)}
                                style={{ padding:'5px 12px', borderRadius:20, fontSize:11.5, cursor:'pointer',
                                    background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'#c4b5fd',
                                    transition:'all 0.15s' }}
                            >{q}</span>
                        ))}
                    </div>
                </div>

                {error && (
                    <div style={{ padding:'12px 16px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, color:'#f87171', fontSize:13 }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Split-pane results */}
                {citations.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:16, alignItems:'start' }}>
                        {/* Left Column: Citation card list */}
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            <div style={S.label}>📎 {citations.length} Citations Found</div>
                            {citations.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => setSelected(c)}
                                    style={{
                                        ...S.card,
                                        cursor:'pointer',
                                        borderColor: selected?.id === c.id ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.07)',
                                        background: selected?.id === c.id ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)',
                                        transition:'all 0.15s',
                                    }}
                                >
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                                        <span style={{ fontWeight:700, color:'#c4b5fd', fontSize:14 }}>[{c.id}]</span>
                                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5,
                                            background: relevanceColor(c.relevance_score)+'15', color: relevanceColor(c.relevance_score) }}>
                                            {c.relevance_score}% match
                                        </span>
                                    </div>
                                    <div style={{ fontWeight:600, fontSize:12, color:'#f0f4ff', marginBottom:3 }}>
                                        📄 {c.source_file}
                                    </div>
                                    <div style={{ fontSize:11, color:'#8b9cc8' }}>Page {c.page_number} · Year: {c.year}</div>
                                    <div style={{ marginTop:8, fontSize:12, color:'#8b9cc8', lineHeight:1.5,
                                        display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                                        {c.excerpt}
                                    </div>
                                    <div style={{ marginTop:8 }}>
                                        <span style={S.pill('#34d399')}>✓ {c.access}</span>
                                        {' '}
                                        <span style={S.pill('#38bdf8')}>{c.classification}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right Column: Ground truth text viewer */}
                        {selected && (
                            <div style={{ ...S.sectionBox, position:'sticky', top:20 }}>
                                <div style={S.topBar('#06b6d4')} />
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:16, color:'#f0f4ff', fontFamily:"'Space Grotesk',sans-serif" }}>
                                            Source Document — Citation [{selected.id}]
                                        </div>
                                        <div style={{ fontSize:12, color:'#8b9cc8', marginTop:3 }}>
                                            {selected.source_file} · Page {selected.page_number} · {selected.year}
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', gap:6 }}>
                                        <span style={S.pill('#34d399')}>✓ ALLOWED</span>
                                        <span style={S.pill('#a855f7')}>{selected.relevance_score}% relevant</span>
                                    </div>
                                </div>

                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:18 }}>
                                    {[
                                        { label:'Source File', val: selected.source_file },
                                        { label:'Page Number', val: `Page ${selected.page_number}` },
                                        { label:'Filing Year',  val: selected.year },
                                    ].map(({ label, val }) => (
                                        <div key={label} style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:8, padding:'10px 12px' }}>
                                            <div style={S.label}>{label}</div>
                                            <div style={{ marginTop:4, fontWeight:600, fontSize:13, color:'#c4b5fd' }}>{val}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ ...S.label, marginBottom:10 }}>📝 Raw Source Text Excerpt</div>
                                <div style={{
                                    background:'rgba(0,0,0,0.4)', border:'1px solid rgba(124,58,237,0.2)',
                                    borderRadius:10, padding:18, fontSize:13.5, lineHeight:1.8,
                                    color:'#d1d5db', fontFamily:'Georgia,serif', maxHeight:340, overflowY:'auto',
                                    borderLeft:'3px solid #7c3aed',
                                }}>
                                    {selected.excerpt}
                                </div>

                                <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(124,58,237,0.06)',
                                    border:'1px solid rgba(124,58,237,0.15)', borderRadius:8, fontSize:12, color:'#8b9cc8' }}>
                                    <strong style={{ color:'#c4b5fd' }}>💡 verification:</strong> This is the exact text stored in the vector database retrieved for analysis.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!loading && citations.length === 0 && !error && (
                    <div style={{ textAlign:'center', padding:'50px 20px', color:'#4a5578', fontSize:14, border:'1px dashed rgba(255,255,255,0.06)', borderRadius:12 }}>
                        Run a search query to trace original file citations
                    </div>
                )}
            </div>
        </div>
    );
}
