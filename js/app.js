// ═══════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════
function switchTab(name, btn) {
    ['events', 'registrations', 'admin'].forEach(t => {
        document.getElementById(`tab-${t}`).style.display = 'none';
    });
    document.getElementById(`tab-${name}`).style.display = 'block';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (name === 'registrations') renderRegistrations();
    if (name === 'admin')         renderAdmin();
}

// ═══════════════════════════════════════════════
// ROLE-BASED UI
// ═══════════════════════════════════════════════
function applyRoleUI() {
    const user = getUser();

    // Show user name + role in navbar
    const nameEl = document.getElementById('nav-user-name');
    const roleEl = document.getElementById('nav-user-role');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    // Hide Admin tab for students
    if (!isAdmin()) {
        const adminBtn = document.getElementById('nav-admin-btn');
        if (adminBtn) adminBtn.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
    // ── Auth guard ─────────────────────────────
    requireAuth();   // redirects to login.html if no session

    // ── Apply role-based UI ────────────────────
    applyRoleUI();

    // ── Close modal on backdrop click ──────────
    document.getElementById('regModal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });

    // ── Default date in admin form ─────────────
    const dateInput = document.getElementById('a-date');
    if (dateInput) {
        dateInput.value = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];
    }

    // ── Load everything in parallel ────────────
    await Promise.all([
        buildTicker(),
        updateStats(),
        renderEvents(),
    ]);
}

document.addEventListener('DOMContentLoaded', init);