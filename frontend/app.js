const API_BASE = ""; // Relative paths since Flask serves the frontend
let currentRole = "Analyst"; // Default; overridden by session
let lastQueryMatched = "";
let lastAnswerData = null; // Stores the last AI response for PDF export
let chatHistory = []; // Stores the conversation history for follow-up context

// ─── AUTH GUARD ───────────────────────────────────────────────────────────────
// Reads sessionStorage to get the role assigned at login.
// If no session exists, redirect to login page immediately.
function initAuth() {
    const role  = sessionStorage.getItem("sf_role");
    const email = sessionStorage.getItem("sf_email");
    const label = sessionStorage.getItem("sf_label");

    if (!role || !email) {
        window.location.href = "/login";
        return false;
    }

    currentRole = role;

    // Reveal app container (was hidden by default to prevent flash)
    document.getElementById("app-container").style.display = "flex";

    // Render user chip in the header
    renderHeaderUser(label, role, email);

    // Render role info in the sidebar
    renderSessionRole(label, role);

    return true;
}

function renderHeaderUser(label, role, email) {
    const el = document.getElementById("header-user");
    const colors = { CEO: "#a855f7", CTO: "#3b82f6", Analyst: "#10b981" };
    const color  = colors[role] || "#6b7280";
    el.innerHTML = `
        <div class="header-user-inner">
            <div class="user-avatar" style="background: ${color}22; border-color: ${color}44; color: ${color};">
                ${label.charAt(0).toUpperCase()}
            </div>
            <div class="user-info">
                <span class="user-role-label" style="color: ${color};">${label}</span>
                <span class="user-email">${email}</span>
            </div>
            <button class="btn-logout" id="btn-logout" title="Sign out">⏻</button>
        </div>
    `;
    document.getElementById("btn-logout").addEventListener("click", () => {
        sessionStorage.clear();
        window.location.href = "/login";
    });
}

function renderSessionRole(label, role) {
    const el = document.getElementById("session-role-display");
    const roleConfig = {
        CEO:     { color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)", perms: "Full access — financials, operations, HR & executive compensation", icon: "👑" },
        CTO:     { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)",  perms: "Operations access — no headcount or salary data", icon: "⚙️" },
        Analyst: { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)",  perms: "Public filings only — 10-K reports, income statements", icon: "📊" }
    };
    const cfg = roleConfig[role] || roleConfig.Analyst;
    el.innerHTML = `
        <div class="session-role-inner" style="background:${cfg.bg}; border:1px solid ${cfg.border}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">${cfg.icon}</span>
                <div>
                    <div style="font-weight: 600; font-size: 14px; color: ${cfg.color};">${label}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Authenticated Role</div>
                </div>
            </div>
            <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.5; padding-top: 4px; border-top: 1px solid ${cfg.border};">${cfg.perms}</p>
        </div>
    `;
}

// ─── DOM ELEMENTS ──────────────────────────────────────────────────────────────
const queryInput       = document.getElementById("query-input");
const chatForm         = document.getElementById("chat-form");
const chatMessages     = document.getElementById("chat-messages");
const fileCatalogList  = document.getElementById("file-catalog-list");
const auditLogConsole  = document.getElementById("audit-log-console");
const auditBadge       = document.getElementById("audit-badge");
const apiStatusDot     = document.getElementById("api-status-dot");
const apiStatusText    = document.getElementById("api-status-text");
const reingestBtn      = document.getElementById("btn-reingest");

// Modal Elements
const correctionModal  = document.getElementById("correction-modal");
const correctionText   = document.getElementById("correction-text");
const modalCancel      = document.getElementById("modal-cancel");
const modalSubmit      = document.getElementById("modal-submit");
let activeFeedbackQuery = "";

// ─── INITIALIZE ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const authed = initAuth();
    if (!authed) return;  // Redirected to login, stop here
    fetchSystemStatus();
    setupEventListeners();
});

function setupEventListeners() {
    // Chat submit
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const query = queryInput.value.trim();
        if (!query) return;
        submitQuery(query);
    });

    // Suggestion chips (welcome message)
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("chip")) {
            const queryText = e.target.textContent;
            queryInput.value = queryText;
            submitQuery(queryText);
        }
        // Quick compare toolbar chips
        if (e.target.classList.contains("btn-chip")) {
            const queryText = e.target.getAttribute("data-query");
            if (queryText) {
                queryInput.value = queryText;
                submitQuery(queryText);
            }
        }
    });

    // Re-ingest database
    reingestBtn.addEventListener("click", triggerReingestion);

    // PDF Export button
    const exportBtn = document.getElementById("btn-export-pdf");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportToPDF);
    }

    // Cancel modal
    modalCancel.addEventListener("click", () => {
        correctionModal.classList.remove("show");
        correctionText.value = "";
    });

    // Submit modal correction
    modalSubmit.addEventListener("click", submitCorrection);
}

// ─── PDF EXPORT ────────────────────────────────────────────────────────────────
function exportToPDF() {
    if (!lastAnswerData) {
        alert("No answer to export yet. Ask a question first!");
        return;
    }

    const { query, answer, sources, role, timestamp } = lastAnswerData;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ajay Agentic AI — Financial Report Export</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #111; line-height: 1.6; }
                .header { border-bottom: 2px solid #6d28d9; padding-bottom: 16px; margin-bottom: 24px; }
                .header h1 { margin: 0; font-size: 22px; color: #6d28d9; }
                .header p { margin: 4px 0 0; color: #666; font-size: 13px; }
                .meta { background: #f8f8f8; border-left: 4px solid #6d28d9; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; }
                .meta strong { color: #333; }
                .answer { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; font-size: 14px; white-space: pre-wrap; }
                .sources { margin-top: 20px; font-size: 12px; color: #666; }
                .sources span { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 2px 8px; border-radius: 4px; margin-right: 6px; }
                .footer { margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>▲ Ajay Agentic AI — Financial Intelligence Report</h1>
                <p>Apple Inc. 10-K Analysis · Role: ${role} · Exported: ${timestamp}</p>
            </div>
            <div class="meta">
                <strong>Query:</strong> ${query}
            </div>
            <div class="answer">${answer.replace(/\n/g, "<br>")}</div>
            <div class="sources">
                <strong>Sources:</strong>
                ${sources.map(s => `<span>${s}</span>`).join("")}
            </div>
            <div class="footer">Generated by Ajay Agentic AI · Confidential — For internal use only</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
}

// ─── SYSTEM STATUS ─────────────────────────────────────────────────────────────
async function fetchSystemStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        if (!response.ok) throw new Error("Status failed");
        
        const data = await response.json();
        
        // Update connection status
        apiStatusDot.style.backgroundColor = "#10b981"; // Green
        if (data.api_key_configured) {
            apiStatusText.textContent = "Online (Gemini Active)";
        } else {
            apiStatusText.textContent = "Online (Fallback / Demo Engine)";
        }

        // Render Data Sources Catalog
        renderFileCatalog(data.files);
        
        // If ingestion is currently running, poll status
        if (data.ingestion_state && data.ingestion_state.status === "running") {
            reingestBtn.disabled = true;
            reingestBtn.textContent = "Ingesting...";
            appendSystemMessage(`System is indexing files in the background: ${data.ingestion_state.message}`);
            setTimeout(fetchSystemStatus, 3000);
        } else {
            reingestBtn.disabled = false;
            reingestBtn.textContent = "Re-Ingest";
        }
        
    } catch (error) {
        apiStatusDot.style.backgroundColor = "#ef4444"; // Red
        apiStatusText.textContent = "Offline (Connection Error)";
        console.error("Error fetching system status:", error);
        fileCatalogList.innerHTML = `<div class="loading-placeholder" style="color: #ef4444;">Could not connect to backend server. Please ensure the server is running.</div>`;
    }
}

// ─── FILE CATALOG ──────────────────────────────────────────────────────────────
function renderFileCatalog(files) {
    if (!files || files.length === 0) {
        fileCatalogList.innerHTML = `<div class="loading-placeholder">No raw documents found. Click Re-Ingest.</div>`;
        return;
    }
    
    fileCatalogList.innerHTML = "";
    files.forEach(file => {
        const li = document.createElement("li");
        li.className = "file-item";
        
        let classLabel = "PUBLIC";
        let classColor = "public";
        if (file.classification === "CONFIDENTIAL_HR") {
            classLabel = "HR CONFIDENTIAL";
            classColor = "confidential";
        } else if (file.classification === "INTERNAL_OPERATIONS") {
            classLabel = "INTERNAL OPS";
            classColor = "operations";
        }
        
        li.innerHTML = `
            <div class="file-info">
                <span class="file-name" title="${file.filename}">${file.filename}</span>
                <span class="file-meta">${file.size_kb} KB</span>
            </div>
            <span class="file-class ${classColor}">${classLabel}</span>
        `;
        fileCatalogList.appendChild(li);
    });
}

// ─── QUERY SUBMISSION ──────────────────────────────────────────────────────────
async function submitQuery(query) {
    queryInput.value = "";
    appendMessage(query, "user");
    const loadingId = appendLoadingMessage();
    
    try {
        const response = await fetch(`${API_BASE}/api/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query, role: currentRole, history: chatHistory })
        });
        
        if (!response.ok) throw new Error("Query execution failed");
        
        const data = await response.json();
        removeLoadingMessage(loadingId);

        // Store for PDF export
        lastAnswerData = {
            query,
            answer: data.answer,
            sources: data.sources || [],
            role: currentRole,
            timestamp: new Date().toLocaleString()
        };

        // Append to memory buffer
        chatHistory.push({ role: "user", content: query });
        chatHistory.push({ role: "assistant", content: data.answer });

        appendMessage(data.answer, "assistant", data.sources, query);
        renderAuditLogs(data.audit_log, data.is_fallback);
        
    } catch (error) {
        removeLoadingMessage(loadingId);
        appendSystemMessage(`<span style="color: #ef4444; font-weight: bold;">⚠️ Connection Error</span><br/>Sorry, I encountered an internal backend error while processing your request. Please ensure the server is online and try again. <br/><small>${error.message}</small>`);
        console.error("Query submit error:", error);
    }
}

// ─── AUDIT LOG RENDERING ───────────────────────────────────────────────────────
function renderAuditLogs(auditLog, isFallback) {
    if (!auditLog || auditLog.length === 0) {
        auditLogConsole.innerHTML = `
            <div class="console-empty">
                Heuristic precomputed metrics database was queried. Direct exact lookup succeeded. No vector RAG required.
            </div>
        `;
        auditBadge.textContent = "Fact Lookup";
        auditBadge.className = "badge active";
        return;
    }
    
    auditLogConsole.innerHTML = "";
    
    let blockedCount = 0;
    auditLog.forEach(log => {
        const item = document.createElement("div");
        const isAllowed = log.status === "ALLOWED";
        item.className = `audit-item ${isAllowed ? 'allowed' : 'blocked'}`;
        
        if (!isAllowed) blockedCount++;
        
        item.innerHTML = `
            <div class="audit-header">
                <span class="audit-status">${log.status}</span>
                <span class="audit-file">${log.source_file}</span>
            </div>
            <div class="audit-reason">${log.reason}</div>
        `;
        auditLogConsole.appendChild(item);
    });
    
    if (blockedCount > 0) {
        auditBadge.textContent = `Security Block ×${blockedCount}`;
        auditBadge.className = "badge active";
    } else {
        auditBadge.textContent = "Authorized Access";
        auditBadge.className = "badge active";
    }
}

// ─── REINGESTION ───────────────────────────────────────────────────────────────
async function triggerReingestion() {
    reingestBtn.disabled = true;
    reingestBtn.textContent = "Ingesting...";
    
    try {
        const response = await fetch(`${API_BASE}/api/ingest`, { method: "POST" });
        const data = await response.json();
        appendSystemMessage("Ingestion and indexing pipelines triggered. Re-indexing all data source files in the background...");
        setTimeout(fetchSystemStatus, 2000);
    } catch (error) {
        reingestBtn.disabled = false;
        reingestBtn.textContent = "Re-Ingest";
        appendSystemMessage(`<span style="color: #ef4444; font-weight: bold;">⚠️ Error</span><br/>Failed to trigger data re-ingestion. Ensure the backend server is running.`);
        console.error("Ingestion trigger error:", error);
    }
}

// ─── MESSAGE RENDERING ─────────────────────────────────────────────────────────
function appendMessage(text, sender, sources = [], queryText = "") {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;
    
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = text.replace(/\n/g, "<br/>");
    messageDiv.appendChild(bubble);
    
    if (sender === "assistant") {
        const footer = document.createElement("div");
        footer.className = "message-footer";
        
        const sourcesDiv = document.createElement("div");
        sourcesDiv.className = "message-sources";
        if (sources && sources.length > 0) {
            sources.forEach(src => {
                const span = document.createElement("span");
                span.className = "source-tag";
                span.textContent = src;
                sourcesDiv.appendChild(span);
            });
        } else {
            const span = document.createElement("span");
            span.className = "source-tag";
            span.textContent = "System Knowledge";
            sourcesDiv.appendChild(span);
        }
        footer.appendChild(sourcesDiv);
        
        if (queryText) {
            const feedbackDiv = document.createElement("div");
            feedbackDiv.className = "message-feedback";
            
            const btnUp = document.createElement("button");
            btnUp.className = "btn-feedback up";
            btnUp.innerHTML = "👍";
            btnUp.title = "Good response";
            btnUp.onclick = () => sendRating(queryText, "up");
            
            const btnDown = document.createElement("button");
            btnDown.className = "btn-feedback down";
            btnDown.innerHTML = "👎";
            btnDown.title = "Report incorrect answer / Submit correction";
            btnDown.onclick = () => openCorrectionModal(queryText);
            
            feedbackDiv.appendChild(btnUp);
            feedbackDiv.appendChild(btnDown);
            footer.appendChild(feedbackDiv);
        }
        
        messageDiv.appendChild(footer);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendSystemMessage(htmlText) {
    const div = document.createElement("div");
    div.className = "message system";
    div.innerHTML = `<div class="message-bubble">${htmlText}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendLoadingMessage() {
    const id = "loading-" + Math.random().toString(36).substr(2, 9);
    const div = document.createElement("div");
    div.className = "message assistant";
    div.id = id;
    div.innerHTML = `
        <div class="message-bubble">
            <div class="loading-placeholder">Thinking... Searching authorized records...</div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ─── FEEDBACK ──────────────────────────────────────────────────────────────────
async function sendRating(query, rating) {
    try {
        const response = await fetch(`${API_BASE}/api/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query, rating: rating })
        });
        
        if (response.ok) {
            appendSystemMessage("Thank you for your rating! Feedback saved to database.");
        } else {
            throw new Error("Failed to submit feedback");
        }
    } catch (e) {
        appendSystemMessage(`<span style="color: #ef4444;">⚠️ Failed to submit rating. Network error.</span>`);
        console.error("Feedback submit error:", e);
    }
}

function openCorrectionModal(query) {
    activeFeedbackQuery = query;
    correctionModal.classList.add("show");
    correctionText.focus();
}

async function submitCorrection() {
    const correction = correctionText.value.trim();
    if (!correction) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: activeFeedbackQuery,
                rating: "down",
                correction: correction
            })
        });
        
        if (response.ok) {
            correctionModal.classList.remove("show");
            correctionText.value = "";
            appendSystemMessage(`<strong>Correction Saved!</strong> The assistant has cataloged the correction rules. It will apply these rules to future queries.`);
            fetchSystemStatus();
        } else {
            throw new Error("Failed to save correction");
        }
    } catch (e) {
        appendSystemMessage(`<span style="color: #ef4444;">⚠️ Failed to submit correction. Please check connection.</span>`);
        console.error("Error submitting correction:", e);
    }
}

/* Application initialization and event handling logic */
