import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './App.css';

export default function Layout() {
    const navigate = useNavigate();
    const [userRole, setUserRole]   = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userLabel, setUserLabel] = useState('');
    const [apiStatus, setApiStatus] = useState("Connecting…");
    const [apiDotStyle, setApiDotStyle] = useState({ backgroundColor: '#eab308' });
    const [apiDotClass, setApiDotClass] = useState("pulse");
    const [auditLog, setAuditLog] = useState([]);

    useEffect(() => {
        const role  = sessionStorage.getItem("sf_role");
        const email = sessionStorage.getItem("sf_email");
        const label = sessionStorage.getItem("sf_label");
        if (!role || !email) { navigate('/login'); return; }
        setUserRole(role);
        setUserEmail(email);
        setUserLabel(label);
        fetchStatus();
    }, [navigate]);

    const fetchStatus = async () => {
        try {
            const res  = await fetch('/api/status');
            if (!res.ok) throw new Error();
            const data = await res.json();
            setApiDotClass("");
            setApiDotStyle({ backgroundColor: '#34d399' });
            setApiStatus(data.api_key_configured ? "Online · Gemini Active" : "Online · Demo Engine");
        } catch {
            setApiStatus("Offline · Connection Error");
            setApiDotClass("");
            setApiDotStyle({ backgroundColor: '#f87171' });
        }
    };

    const handleLogout = () => { sessionStorage.clear(); navigate('/login'); };

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

    const blockedCount = auditLog.filter(l => l.status !== 'ALLOWED').length;

    return (
        <div className="app-container">
            {/* ── HEADER ── */}
            <header className="app-header">
                <div className="header-logo">
                    <div className="logo-icon">▲</div>
                    <h1>FinAI Intelligence <span>v1.0</span></h1>
                </div>

                <div className="header-center">
                    <div className="status-indicator">
                        <span
                            className={`indicator-dot ${apiDotClass}`}
                            style={apiDotStyle}
                        />
                        <span>{apiStatus}</span>
                    </div>
                </div>

                <div className="header-user">
                    <div className="header-user-inner">
                        <div
                            className="user-avatar"
                            style={{
                                background: getRoleColor(userRole) + '22',
                                border: `1.5px solid ${getRoleColor(userRole)}55`,
                                color: getRoleColor(userRole)
                            }}
                        >
                            {userLabel.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="user-info">
                            <span className="user-role-label" style={{ color: getRoleColor(userRole) }}>
                                {getRoleIcon(userRole)} {userLabel}
                            </span>
                            <span className="user-email">{userEmail}</span>
                        </div>
                        <button className="btn-logout" onClick={handleLogout} title="Sign out">⏻</button>
                    </div>
                </div>
            </header>

            <div className="app-body">
                {/* ── SIDEBAR ── */}
                <aside className="sidebar-nav">
                    <div className="sidebar-brand">
                        <div className="sidebar-brand-title">Navigation</div>
                    </div>

                    <nav className="nav-menu">
                        <NavLink to="/" end className={({ isActive }) => "nav-link " + (isActive ? "active" : "")}>
                            <span className="nav-icon">💬</span>
                            <div className="nav-text">
                                <strong>Phase 5</strong>
                                <span>Chat Assistant</span>
                            </div>
                        </NavLink>

                        <NavLink to="/data" className={({ isActive }) => "nav-link " + (isActive ? "active" : "")}>
                            <span className="nav-icon">📁</span>
                            <div className="nav-text">
                                <strong>Phase 1 & 2</strong>
                                <span>Data & Understanding</span>
                            </div>
                        </NavLink>

                        <NavLink to="/security" className={({ isActive }) => "nav-link " + (isActive ? "active" : "")}>
                            <span className="nav-icon">🛡️</span>
                            <div className="nav-text">
                                <strong>Phase 3</strong>
                                <span>RBAC & Security</span>
                            </div>
                            {blockedCount > 0 && (
                                <span className="nav-badge">{blockedCount}</span>
                            )}
                        </NavLink>

                        <NavLink to="/learning" className={({ isActive }) => "nav-link " + (isActive ? "active" : "")}>
                            <span className="nav-icon">🧠</span>
                            <div className="nav-text">
                                <strong>Phase 4</strong>
                                <span>Feedback & Learning</span>
                            </div>
                        </NavLink>

                        <NavLink to="/trace" className={({ isActive }) => "nav-link " + (isActive ? "active" : "")}>
                            <span className="nav-icon">🔍</span>
                            <div className="nav-text">
                                <strong>Trust &amp; Trace</strong>
                                <span>Verify source context</span>
                            </div>
                            <span className="nav-badge" style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color:'#fff', border:'none' }}>NEW</span>
                        </NavLink>

                        <NavLink to="/whatif" className={({ isActive }) => "nav-link " + (isActive ? "active" : "")}>
                            <span className="nav-icon">🧮</span>
                            <div className="nav-text">
                                <strong>What-If Modeling</strong>
                                <span>AST-safe math projections</span>
                            </div>
                            <span className="nav-badge" style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color:'#fff', border:'none' }}>NEW</span>
                        </NavLink>

                        <NavLink to="/access" className={({ isActive }) => "nav-link " + (isActive ? "active" : "")}>
                            <span className="nav-icon">🔐</span>
                            <div className="nav-text">
                                <strong>Access Requests</strong>
                                <span>Intelligent RBAC desk</span>
                            </div>
                            <span className="nav-badge" style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color:'#fff', border:'none' }}>NEW</span>
                        </NavLink>
                    </nav>

                    {/* Role pill at bottom of sidebar */}
                    <div style={{
                        marginTop: 'auto',
                        padding: '14px 12px 6px',
                        borderTop: '1px solid var(--border-subtle)'
                    }}>
                        <div style={{
                            padding: '10px 14px',
                            background: getRoleColor(userRole) + '12',
                            border: `1px solid ${getRoleColor(userRole)}30`,
                            borderRadius: 10,
                            fontSize: 12,
                        }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                Active Session
                            </div>
                            <div style={{ color: getRoleColor(userRole), fontWeight: 600, fontSize: 13 }}>
                                {getRoleIcon(userRole)} {userRole} Access Level
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── MAIN CONTENT ── */}
                <main className="content-area">
                    <Outlet context={{ auditLog, setAuditLog, userRole, userLabel, userEmail }} />
                </main>
            </div>
        </div>
    );
}
