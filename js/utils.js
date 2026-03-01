// ═══════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════

function fmt(date) {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDay(date) {
    return new Date(date).getDate().toString().padStart(2, '0');
}

function fmtMonth(date) {
    return new Date(date).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
}

function fillColor(pct) {
    return pct >= 100 ? 'fill-red' : pct >= 80 ? 'fill-amber' : 'fill-green';
}

function fillPct(ev) {
    return Math.min(100, Math.round((ev.registered / ev.capacity) * 100));
}

function seatsLeft(ev) {
    return Math.max(0, ev.capacity - ev.registered);
}

function catClass(cat) {
    return `cat-${cat}`;
}

function price(p) {
    return p === 0 ? 'Free' : `₹${p.toLocaleString('en-IN')}`;
}

// ── Toast notification ─────────────────────────
function toast(msg, type = 'info') {
    const stack = document.getElementById('toastStack');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<div class="toast-dot"></div>${msg}`;
    stack.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(() => t.remove(), 400);
    }, 3200);
}

// ── Loading spinner for grids ──────────────────
function showLoading(elementId) {
    document.getElementById(elementId).innerHTML = `
        <div class="empty" style="grid-column:1/-1">
            <div style="font-size:1.5rem;margin-bottom:8px">⏳</div>
            <div class="empty-title">Loading...</div>
        </div>`;
}

// ── Error state ────────────────────────────────
function showError(elementId, msg = "Failed to load data. Is the backend running?") {
    document.getElementById(elementId).innerHTML = `
        <div class="empty" style="grid-column:1/-1">
            <div style="font-size:1.5rem;margin-bottom:8px">⚠️</div>
            <div class="empty-title">Error</div>
            <p style="font-size:0.88rem;color:var(--accent)">${msg}</p>
        </div>`;
}