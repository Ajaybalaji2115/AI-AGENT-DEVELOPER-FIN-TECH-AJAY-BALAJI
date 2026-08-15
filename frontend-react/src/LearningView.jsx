import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import './App.css';

export default function LearningView() {
    const [feedbackLog, setFeedbackLog] = useState([]);
    const [loading, setLoading]         = useState(true);

    useEffect(() => { fetchFeedback(); }, []);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/feedback/list');
            const data = await res.json();
            setFeedbackLog(data || []);
        } catch { console.error("Failed to fetch feedback"); }
        finally  { setLoading(false); }
    };

    const upvotes    = feedbackLog.filter(l => l.rating === 'up').length;
    const downvotes  = feedbackLog.filter(l => l.rating === 'down').length;
    const corrections= feedbackLog.filter(l => l.correction).length;
    const accuracy   = feedbackLog.length > 0 ? Math.round((upvotes / feedbackLog.length) * 100) : 0;

    const chartData = [
        { name: '👍 Helpful',     value: upvotes,    fill: '#34d399' },
        { name: '👎 Corrected',   value: downvotes,  fill: '#f87171' },
    ];

    return (
        <div className="page-view">
            <div className="page-header">
                <h1>🧠 Phase 4 — Feedback & Learning Loop</h1>
                <p>
                    The AI learns from adoption. User corrections are cataloged and injected as few-shot rules
                    into future prompts — preventing the same mistake from recurring.
                </p>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                <div className="stat-card">
                    <div className="stat-card-icon">💬</div>
                    <div className="stat-card-value" style={{ color: '#c4b5fd' }}>{feedbackLog.length}</div>
                    <div className="stat-card-label">Total Feedback</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">👍</div>
                    <div className="stat-card-value" style={{ color: '#34d399' }}>{upvotes}</div>
                    <div className="stat-card-label">Helpful Votes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">✏️</div>
                    <div className="stat-card-value" style={{ color: '#f87171' }}>{corrections}</div>
                    <div className="stat-card-label">Corrections Logged</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">🎯</div>
                    <div className="stat-card-value" style={{ color: accuracy >= 70 ? '#34d399' : '#f59e0b' }}>
                        {accuracy}%
                    </div>
                    <div className="stat-card-label">Accuracy Rating</div>
                </div>
            </div>

            <div className="card-grid">
                {/* Learning Chart */}
                {feedbackLog.length > 0 && (
                    <div className="panel-card">
                        <h2>Feedback Distribution</h2>
                        <p className="section-desc">User sentiment split across all collected feedback entries.</p>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fill: '#8b9cc8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fill: '#8b9cc8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(13,20,42,0.97)',
                                        border: '1px solid rgba(124,58,237,0.35)',
                                        borderRadius: 10,
                                        fontSize: 12,
                                        color: '#f0f4ff'
                                    }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                        {/* How the loop works */}
                        <div style={{
                            marginTop: 16,
                            padding: '14px 16px',
                            background: 'rgba(124,58,237,0.06)',
                            border: '1px solid rgba(124,58,237,0.2)',
                            borderRadius: 10,
                            fontSize: 12.5,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                        }}>
                            <strong style={{ color: '#c4b5fd', display: 'block', marginBottom: 6 }}>
                                🔄 How the Learning Loop Works
                            </strong>
                            1. User submits 👎 + correction → saved to feedback database<br />
                            2. Next query → similar past corrections retrieved by semantic similarity<br />
                            3. Corrections injected as <em>few-shot examples</em> into the AI prompt<br />
                            4. AI produces a corrected, improved answer automatically
                        </div>
                    </div>
                )}

                {/* Correction Log */}
                <div className="panel-card" style={{ flex: '1.4' }}>
                    <div className="card-header-row">
                        <h2>Continuous Learning Log</h2>
                        <button className="btn-small" onClick={fetchFeedback}>↻ Refresh</button>
                    </div>
                    <p className="section-desc">Database of user corrections injected as few-shot rules on future queries.</p>

                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                        {loading ? (
                            <div className="loading-placeholder">Loading feedback logs…</div>
                        ) : feedbackLog.length === 0 ? (
                            <div className="console-empty">
                                No feedback collected yet.<br />
                                Go to <strong>Chat Assistant</strong> and give a 👎 on an answer to submit a correction!
                            </div>
                        ) : (
                            feedbackLog.map((log, i) => (
                                <div key={i} className={`feedback-item ${log.rating}`}>
                                    <div className="feedback-item-header">
                                        <div className="feedback-query">"{log.query}"</div>
                                        <span className="feedback-timestamp">{log.timestamp}</span>
                                    </div>
                                    <span className={`feedback-rating-pill ${log.rating}`}>
                                        {log.rating === 'up' ? '👍 Helpful' : '👎 Correction'}
                                    </span>
                                    {log.correction && (
                                        <div className="feedback-correction">
                                            <strong>📝 Correction Rule Injected:</strong>
                                            {log.correction}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
