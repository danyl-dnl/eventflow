// ═══════════════════════════════════════════════
// STUDENT PORTAL — Tab switching + Init
// ═══════════════════════════════════════════════

function switchTab(name, btn) {
    ['events', 'registrations'].forEach(t => {
        document.getElementById(`tab-${t}`).style.display = 'none';
    });
    document.getElementById(`tab-${name}`).style.display = 'block';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (name === 'registrations') renderRegistrations();
}

async function init() {
    // Auth guard — students only
    if (!requireStudent()) return;

    // Show user name in nav
    const user = getUser();
    const nameEl = document.getElementById('nav-user-name');
    if (nameEl) nameEl.textContent = user.name;

    // Close modal on backdrop click
    document.getElementById('regModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    // Default date in any admin forms
    const dateInput = document.getElementById('a-date');
    if (dateInput) dateInput.value = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];

    await Promise.all([buildTicker(), updateStats(), renderEvents()]);
}

document.addEventListener('DOMContentLoaded', init);