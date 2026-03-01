// ═══════════════════════════════════════════════
// AUTH — In-memory session (JWT never touches disk)
// ═══════════════════════════════════════════════

let _session = null;  // { token, user: { id, name, email, role } }

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

// ── Read handoff from login page ───────────────
// login pages store token briefly in sessionStorage
// for the page transition only — cleared immediately here
function readHandoff() {
    const raw = sessionStorage.getItem('_ef_handoff');
    if (!raw) return false;
    sessionStorage.removeItem('_ef_handoff');
    try {
        const data = JSON.parse(raw);
        if (data?.token && data?.user) {
            _session = { token: data.token, user: data.user };
            return true;
        }
    } catch { /* ignore */ }
    return false;
}

// ── Auth guard for student pages ───────────────
function requireStudent() {
    readHandoff();
    if (!isLoggedIn()) {
        window.location.href = 'student-login.html';
        return false;
    }
    if (isAdmin()) {
        // Admin accidentally on student page → send to admin panel
        window.location.href = 'admin.html';
        return false;
    }
    return true;
}

// ── Auth guard for admin pages ─────────────────
function requireAdmin() {
    readHandoff();
    if (!isLoggedIn()) {
        window.location.href = 'admin-login.html';
        return false;
    }
    if (!isAdmin()) {
        // Student accidentally on admin page → send to student portal
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ── Logout ─────────────────────────────────────
function logout() {
    const wasAdmin = isAdmin();
    clearSession();
    window.location.href = wasAdmin ? 'admin-login.html' : 'student-login.html';
}