import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

export default function SecurityView() {
    const { auditLog, userRole, userLabel } = useOutletContext();

    const getRoleColor = (role) => {
        if (role === 'CEO')    return '#a855f7';
        if (role === 'CTO')    return '#38bdf8';
        return '#34d399';
    };

    const getRoleIcon = (role) => {
        if (role === 'CEO')    return '👑';
        if (role === 'CTO')    return '⚙️';
        return '📊';
    };

    const allowedCount = auditLog.filter(l => l.status === 'ALLOWED').length;
    const blockedCount = auditLog.filter(l => l.status !== 'ALLOWED').length;
    const badgeLabel   = blockedCount > 0 ? `🛑 ${blockedCount} Block${blockedCount > 1 ? 's' : ''}` : auditLog.length > 0 ? '✅ Authorized' : 'Idle';
    const badgeActive  = auditLog.length > 0;

    const pieData = [
        { name: 'Allowed', value: allowedCount || 0, fill: '#34d399' },
        { name: 'Blocked', value: blockedCount || 0, fill: '#f87171' },
    ];

    const permMatrix = {
        CEO:     { PUBLIC: true, INTERNAL_OPERATIONS: true, CONFIDENTIAL_HR: true },
        CTO:     { PUBLIC: true, INTERNAL_OPERATIONS: true, CONFIDENTIAL_HR: false },
        Analyst: { PUBLIC: true, INTERNAL_OPERATIONS: false, CONFIDENTIAL_HR: false },
    };

    const perms = permMatrix[userRole] || permMatrix.Analyst;
    const PERM_LABELS = {
        PUBLIC:                { label: 'Public Financial Filings',         icon: '📄' },
        INTERNAL_OPERATIONS:   { label: 'Internal Operations Data',         icon: '⚙️' },
        CONFIDENTIAL_HR:       { label: 'Confidential HR / Payroll Data',   icon: '🔒' },
    };

    return (
        <div className="page-view">
            <div className="page-header">
                <h1>🛡️ Phase 3 — Role-Based Access Control</h1>
                <p>
                    Security is enforced at the <strong>data retrieval layer</strong>, not just UI visibility.
                    Every chunk retrieved from the vector database is inspected against your role before reaching the AI.
                </p>
            </div>

            <div className="card-grid">
                {/* Active Session Profile */}
                <div className="panel-card">
                    <h2>Active Session Profile</h2>
                    <p className="section-desc">Permissions assigned at login. Cannot be changed at runtime.</p>

                    <div className="role-card-inner" style={{
                        background: getRoleColor(userRole) + '0a',
                        border: `1px solid ${getRoleColor(userRole)}30`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 36 }}>{getRoleIcon(userRole)}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 20, color: getRoleColor(userRole), fontFamily: 'var(--font-heading)' }}>
                                    {userLabel}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Authenticated Role: <strong style={{ color: 'var(--text-secondary)' }}>{userRole}</strong>
                                </div>
                            </div>
                        </div>

                        <ul className="permission-list">
                            {Object.entries(PERM_LABELS).map(([key, { label, icon }]) => (
                                <li key={key} className={perms[key] ? 'allowed-perm' : 'denied-perm'}>
                                    <span className="perm-icon">{icon}</span>
                                    <span style={{ flex: 1, color: perms[key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                                        background: perms[key] ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.1)',
                                        color: perms[key] ? '#34d399' : '#f87171',
                                    }}>
                                        {perms[key] ? '✓ GRANTED' : '✗ DENIED'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Security Guard Inspector */}
                <div className="panel-card" style={{ flex: '1.3' }}>
                    <div className="card-header-row">
                        <h2>Security Guard Inspector</h2>
                        <span className={`badge ${badgeActive ? 'active' : ''}`}>{badgeLabel}</span>
                    </div>
                    <p className="section-desc">Real-time data-layer auditing for your last query. Every retrieved chunk evaluated before AI sees it.</p>

                    {auditLog.length > 0 && (
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, marginTop: 4 }}>
                            <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '10px 16px', flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-heading)' }}>{allowedCount}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Chunks Allowed</div>
                            </div>
                            <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '10px 16px', flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-heading)' }}>{blockedCount}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Chunks Blocked</div>
                            </div>
                            {(allowedCount + blockedCount > 0) && (
                                <div style={{ width: 100 }}>
                                    <ResponsiveContainer width="100%" height={60}>
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={28} dataKey="value" paddingAngle={2}>
                                                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="audit-console">
                        {auditLog.length === 0 ? (
                            <div className="console-empty">
                                🔍 Go to the Chat Assistant and ask a question.<br />
                                The security audit trail will appear here in real-time.
                            </div>
                        ) : (
                            auditLog.map((log, i) => (
                                <div key={i} className={`audit-item ${log.status === 'ALLOWED' ? 'allowed' : 'blocked'}`}>
                                    <div className="audit-header">
                                        <span className="audit-status">{log.status}</span>
                                        <span className="audit-file">{log.source_file}</span>
                                    </div>
                                    <div className="audit-reason">{log.reason}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
