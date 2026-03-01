// ═══════════════════════════════════════════════
// API CONFIG
// ═══════════════════════════════════════════════
const API_BASE = "http://127.0.0.1:8000/api/v1";

// ── Generic fetch helper ───────────────────────
async function apiFetch(path, options = {}) {
    const token = getToken();   // from auth.js

    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        ...options,
    });

    // Token expired or invalid → kick to login
    if (res.status === 401) {
        clearSession();
        window.location.href = 'login.html';
        return;
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || "Request failed");
    }

    if (res.status === 204) return null;
    return res.json();
}