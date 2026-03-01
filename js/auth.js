// ═══════════════════════════════════════════════
// AUTH — In-memory session (JWT never touches disk)
// ═══════════════════════════════════════════════

let _session = null;   // { token, user: { id, name, email, role } }

// ── Public accessors ───────────────────────────
function getToken()   { return _session?.token ?? null; }
function getUser()    { return _session?.user  ?? null; }
function isAdmin()    { return _session?.user?.role === 'admin'; }
function isLoggedIn() { return !!_session; }

function setSession(data) {
    _session = { token: data.access_token, user: data.user };
}

function clearSession() {
    _session = null;
}

// ── Redirect guards ────────────────────────────
function requireAuth() {
    readHandoff();   // pick up token from login.html page transition
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
    }
}

function redirectIfLoggedIn() {
    if (isLoggedIn()) {
        window.location.href = 'index.html';
    }
}

// ── LOGIN ──────────────────────────────────────
async function authLogin(email, password, role) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, role }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');

    setSession(data);
    return data.user;
}

// ── REGISTER (students only) ───────────────────
async function authRegister(name, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');

    setSession(data);
    return data.user;
}

// ── LOGOUT ─────────────────────────────────────
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// ── Handoff reader (called once on index.html load) ──
// login.html stores the token briefly in sessionStorage
// for the page transition. We read it here, move it into
// memory, and immediately clear sessionStorage.
function readHandoff() {
    const raw = sessionStorage.getItem('_ef_handoff');
    if (!raw) return false;
    sessionStorage.removeItem('_ef_handoff');   // clear immediately
    try {
        const data = JSON.parse(raw);
        if (data?.token && data?.user) {
            _session = { token: data.token, user: data.user };
            return true;
        }
    } catch { /* ignore */ }
    return false;
}