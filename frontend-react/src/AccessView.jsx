import React, { useState, useEffect } from 'react';
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
};

export default function AccessView() {
    const { userRole, userEmail, userLabel } = useOutletContext();
    const [query, setQuery]       = useState('');
    const [result, setResult]     = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading]   = useState(false);
    const [note,    setNote]      = useState('');
    const [submitting, setSubmitting] = useState(false);

    const DEMO_BLOCKED = [
        "What is Tim Cook's total compensation?",
        "Show me executive salary breakdown",
        "How many employees does Apple have?",
        "What is the headcount by division?",
    ];

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        try {
            const res  = await fetch(`/api/access-request?role=${userRole}`);
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
        } catch {}
    };

    const simulate = async (q) => {
        const text = (q || query).trim();
        if (!text) return;
        setQuery(text);
        setLoading(true);
        setResult(null);

        const blocked_keywords = {
            compensation: { label:'Executive Compensation Data', classification:'CONFIDENTIAL_HR', required_role:'CEO' },
            salary:       { label:'Executive Salary Records',    classification:'CONFIDENTIAL_HR', required_role:'CEO' },
            payroll:      { label:'Payroll Data',                classification:'CONFIDENTIAL_HR', required_role:'CEO' },
            headcount:    { label:'Employee Headcount Data',     classification:'INTERNAL_OPERATIONS', required_role:'CTO' },
            employee:     { label:'Workforce Records',           classification:'INTERNAL_OPERATIONS', required_role:'CTO' },
            employees:    { label:'Workforce Records',           classification:'INTERNAL_OPERATIONS', required_role:'CTO' },
        };

        await new Promise(r => setTimeout(r, 600));

        const lower = text.toLowerCase();
        let blocked = null;
        for (const [kw, meta] of Object.entries(blocked_keywords)) {
            if (lower.includes(kw)) {
                if (userRole !== 'CEO' && !(userRole === 'CTO' && meta.required_role === 'CTO')) {
                    blocked = { ...meta, keyword: kw };
                    break;
                }
            }
        }

        setResult({ blocked, query: text });
        setLoading(false);
    };

    const sendRequest = async () => {
        if (!result?.blocked) return;
        setSubmitting(true);
        try {
            await fetch('/api/access-request', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                    requester_role:  userRole,
                    requester_email: userEmail,
                    data_label:      result.blocked.label,
                    classification:  result.blocked.classification,
                    required_role:   result.blocked.required_role,
                    original_query:  result.query,
                }),
            });
            await fetchRequests();
            setResult(prev => ({ ...prev, requested: true }));
        } catch {}
        setSubmitting(false);
    };

    const reviewRequest = async (reqId, decision) => {
        if (userRole !== 'CEO') return;
        await fetch(`/api/access-request/${reqId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision, note, reviewer_role: userRole }),
        });
        await fetchRequests();
        setNote('');
    };

    const statusColor = (s) => s === 'APPROVED' ? '#34d399' : s === 'DENIED' ? '#f87171' : '#f59e0b';
    const classColor  = (c) => c === 'CONFIDENTIAL_HR' ? '#a855f7' : '#38bdf8';

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    return (
        <div className="page-view">
            <div className="page-header">
                <h1>🔐 Shadow Mode Access Requests</h1>
                <p>
                    Intelligent RBAC escalation routing. Blocked queries are deflected to public data while letting users request temporary CEO authorization.
                </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                {/* Left side: query testing */}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div style={S.sectionBox}>
                        <div style={S.topBar('#a855f7')} />
                        <div style={S.label}>Query Security Interceptor</div>
                        <p style={{ fontSize:12, color:'#4a5578', marginTop:6, marginBottom:14 }}>
                            Logged in: <strong style={{ color:'#c084fc' }}>{userLabel} ({userRole})</strong>
                        </p>

                        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                            {DEMO_BLOCKED.map(q => (
                                <span key={q} onClick={() => simulate(q)}
                                    style={{ padding:'8px 12px', borderRadius:9, cursor:'pointer', fontSize:12,
                                        background:'rgba(168,85,247,0.06)', border:'1px solid rgba(168,85,247,0.15)', color:'#c084fc',
                                        transition:'all 0.15s' }}>
                                    🔒 {q}
                                </span>
                            ))}
                        </div>

                        <div style={{ display:'flex', gap:8 }}>
                            <input
                                style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(168,85,247,0.3)',
                                    borderRadius:9, padding:'10px 14px', color:'#f0f4ff', fontSize:13, outline:'none', fontFamily:'Inter,sans-serif' }}
                                placeholder="Type a restricted query…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && simulate()}
                            />
                            <button onClick={() => simulate()} disabled={loading} style={{
                                padding:'10px 16px', background:'linear-gradient(135deg,#a855f7,#7c3aed)',
                                border:'none', borderRadius:9, color:'#fff', fontWeight:600, cursor:'pointer', fontSize:13,
                            }}>{loading ? '…' : '▶'}</button>
                        </div>
                    </div>

                    {result && (
                        <div style={S.sectionBox}>
                            <div style={S.topBar(result.blocked ? '#f87171' : '#34d399')} />
                            {result.blocked ? (
                                <>
                                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                                        <span style={{ fontSize:22 }}>🛑</span>
                                        <div>
                                            <div style={{ fontWeight:700, color:'#f87171', fontSize:15 }}>Access Blocked</div>
                                            <div style={{ fontSize:12, color:'#8b9cc8' }}>System Response:</div>
                                        </div>
                                    </div>

                                    <div style={{ padding:'14px 16px', background:'rgba(13,20,42,0.8)', border:'1px solid rgba(168,85,247,0.2)',
                                        borderRadius:10, fontSize:13.5, lineHeight:1.7, color:'#d1d5db', marginBottom:14 }}>
                                        The requested metric <strong style={{color:'#c084fc'}}>{result.blocked.label}</strong> is classified as{' '}
                                        <strong style={{color: classColor(result.blocked.classification)}}>{result.blocked.classification}</strong>{' '}
                                        and is limited to the <strong style={{color:'#a855f7'}}>{result.blocked.required_role}</strong>.
                                        <br/><br/>
                                        Would you like to log an access request to the system administrator?
                                    </div>

                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                                        {[
                                            { label:'Classification', value: result.blocked.classification, color: classColor(result.blocked.classification) },
                                            { label:'Required Access Role',  value: result.blocked.required_role,  color:'#a855f7' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.03)',
                                                border:`1px solid ${color}25`, borderRadius:8 }}>
                                                <div style={S.label}>{label}</div>
                                                <div style={{ marginTop:3, fontWeight:700, color, fontSize:13 }}>{value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {!result.requested ? (
                                        <button onClick={sendRequest} disabled={submitting} style={{
                                            width:'100%', padding:'12px 0', background:'linear-gradient(135deg,#a855f7,#7c3aed)',
                                            border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer',
                                            boxShadow:'0 4px 14px rgba(168,85,247,0.3)', opacity: submitting ? 0.6 : 1,
                                        }}>
                                            {submitting ? 'Submitting…' : 'Send Access Request'}
                                        </button>
                                    ) : (
                                        <div style={{ padding:'12px 16px', background:'rgba(52,211,153,0.08)',
                                            border:'1px solid rgba(52,211,153,0.25)', borderRadius:9, color:'#34d399', fontSize:13, textAlign:'center' }}>
                                            ✅ Request submitted. It has been routed to the {result.blocked.required_role}'s dashboard.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ color:'#34d399', fontSize:13 }}>
                                    ✅ Query authorized for <strong>{userRole}</strong> level.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right side: request log / admin review */}
                <div style={S.sectionBox}>
                    <div style={S.topBar('#f59e0b')} />
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <div style={{ fontWeight:700, fontSize:15, fontFamily:"'Space Grotesk',sans-serif" }}>
                            {userRole === 'CEO' ? '👑 Executive Access Request Console' : '📋 Access Request History'}
                        </div>
                        <button onClick={fetchRequests} style={{ padding:'4px 10px', background:'rgba(255,255,255,0.04)',
                            border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#8b9cc8', cursor:'pointer', fontSize:11 }}>
                            Refresh
                        </button>
                    </div>
                    <p style={{ fontSize:12, color:'#4a5578', marginBottom:16 }}>
                        {userRole === 'CEO' ? 'Pending data requests submitted by operations staff.' : 'Your data access requests trail.'}
                    </p>

                    {requests.length === 0 ? (
                        <div style={{ textAlign:'center', padding:'40px 20px', color:'#4a5578', fontSize:13,
                            border:'1px dashed rgba(255,255,255,0.07)', borderRadius:10 }}>
                            No requests found. Simulate a query on the left.
                        </div>
                    ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:12, maxHeight:520, overflowY:'auto' }}>
                            {[...requests].reverse().map(req => (
                                <div key={req.id} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.02)',
                                    border:`1px solid ${statusColor(req.status)}25`, borderRadius:10 }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                                        <span style={{ fontWeight:700, color:'#c4b5fd', fontSize:12, fontFamily:'monospace' }}>{req.id}</span>
                                        <span style={{ ...S.pill(statusColor(req.status)), fontSize:10 }}>
                                            {req.status === 'PENDING' ? '⏳' : req.status === 'APPROVED' ? '✓' : '✗'} {req.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize:13, fontWeight:600, color:'#f0f4ff', marginBottom:4 }}>{req.data_label}</div>
                                    <div style={{ fontSize:11, color:'#8b9cc8', marginBottom:6 }}>
                                        From: <strong>{req.requester_role}</strong> ({req.requester_email}) · {new Date(req.timestamp).toLocaleString()}
                                    </div>
                                    <div style={{ fontSize:12, color:'#6b7280', fontStyle:'italic', marginBottom:8 }}>
                                        Query: "{req.original_query}"
                                    </div>
                                    {req.reviewer_note && (
                                        <div style={{ fontSize:12, padding:'7px 10px', background:'rgba(255,255,255,0.03)',
                                            border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#8b9cc8', marginBottom:8 }}>
                                            Reviewer Note: {req.reviewer_note}
                                        </div>
                                    )}

                                    {userRole === 'CEO' && req.status === 'PENDING' && (
                                        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:7 }}>
                                            <input
                                                style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
                                                    borderRadius:7, padding:'7px 10px', color:'#f0f4ff', fontSize:12, outline:'none', fontFamily:'Inter,sans-serif' }}
                                                placeholder="Approval / Denial reasons…"
                                                value={note}
                                                onChange={e => setNote(e.target.value)}
                                            />
                                            <div style={{ display:'flex', gap:7 }}>
                                                <button onClick={() => reviewRequest(req.id,'approve')} style={{
                                                    flex:1, padding:'8px 0', background:'rgba(52,211,153,0.15)',
                                                    border:'1px solid rgba(52,211,153,0.35)', borderRadius:7,
                                                    color:'#34d399', fontWeight:600, cursor:'pointer', fontSize:12,
                                                }}>Approve</button>
                                                <button onClick={() => reviewRequest(req.id,'deny')} style={{
                                                    flex:1, padding:'8px 0', background:'rgba(248,113,113,0.1)',
                                                    border:'1px solid rgba(248,113,113,0.3)', borderRadius:7,
                                                    color:'#f87171', fontWeight:600, cursor:'pointer', fontSize:12,
                                                }}>Deny</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
