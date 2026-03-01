// ═══════════════════════════════════════════════
// REGISTRATIONS TAB
// ═══════════════════════════════════════════════

let regFilter = 'all';
let regSearch = '';

// ── Render table from API ──────────────────────
async function renderRegistrations() {
    const tbody = document.getElementById('regTableBody');
    const empty = document.getElementById('regEmpty');

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--ink3)">Loading...</td></tr>`;

    try {
        let url = "/registrations?";
        if (regFilter !== 'all') url += `status=${regFilter}&`;
        if (regSearch)           url += `search=${encodeURIComponent(regSearch)}&`;

        const list = await apiFetch(url);

        if (!list.length) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        tbody.innerHTML = list.map(r => `
<tr>
  <td>
    <div style="font-weight:600;font-size:0.88rem">${r.name}</div>
    <div style="font-size:0.75rem;color:var(--ink3)">${r.email}</div>
  </td>
  <td>${r.event_id}</td>
  <td>${fmt(r.registered_at)}</td>
  <td style="text-transform:capitalize">${r.ticket_type}</td>
  <td>${r.seats}</td>
  <td><span class="status-badge status-${r.status}">${r.status}</span></td>
  <td>
    ${r.status !== 'cancelled'
        ? `<button class="action-btn" onclick="cancelReg(${r.id})">Cancel</button>`
        : '—'}
  </td>
</tr>`).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--accent)">${err.message}</td></tr>`;
    }
}

// ── Cancel registration via API ────────────────
async function cancelReg(id) {
    try {
        await apiFetch(`/registrations/${id}/cancel`, { method: "PATCH" });
        toast('Registration cancelled.', 'info');
        await Promise.all([renderRegistrations(), updateStats(), renderEvents(), buildTicker()]);
    } catch (err) {
        toast(err.message || 'Failed to cancel registration.', 'error');
    }
}

// ── Search / filter controls ───────────────────
let regSearchTimeout;
function searchRegs(q) {
    clearTimeout(regSearchTimeout);
    regSearchTimeout = setTimeout(() => {
        regSearch = q.toLowerCase();
        renderRegistrations();
    }, 300);
}

function filterRegs(v) {
    regFilter = v;
    renderRegistrations();
}