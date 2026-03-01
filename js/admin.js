// ═══════════════════════════════════════════════
// ADMIN TAB
// ═══════════════════════════════════════════════

// ── Render capacity monitor + management table ─
function renderAdmin() {
    // Live capacity monitor
    const capList = document.getElementById('adminCapList');
    capList.innerHTML = events.map(ev => {
        const pct = fillPct(ev);
        return `
<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--rule)">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
    <span style="font-size:0.82rem;font-weight:600">${ev.title}</span>
    <span style="font-size:0.72rem;font-weight:700;color:${pct >= 100 ? 'var(--accent)' : pct >= 80 ? 'var(--amber)' : 'var(--green)'}">${pct}%</span>
  </div>
  <div class="cap-bar-track" style="height:5px">
    <div class="cap-bar-fill ${fillColor(pct)}" style="width:${pct}%"></div>
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:4px">
    <span style="font-size:0.7rem;color:var(--ink3)">${ev.registered} registered · ${ev.waitlist} waitlisted</span>
    <span style="font-size:0.7rem;color:var(--ink3)">${seatsLeft(ev)} left</span>
  </div>
</div>`;
    }).join('');

    // Event management table
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = events.map(ev => {
        const pct = fillPct(ev);
        return `
<tr>
  <td><span style="font-weight:600">${ev.title}</span></td>
  <td>${fmt(ev.date)}</td>
  <td><span class="event-category ${catClass(ev.category)}" style="margin:0">${ev.category}</span></td>
  <td>${ev.capacity}</td>
  <td>${ev.registered}</td>
  <td>${ev.waitlist > 0 ? `<span style="color:var(--amber);font-weight:600">${ev.waitlist}</span>` : '—'}</td>
  <td>
    <div style="display:flex;align-items:center;gap:8px">
      <div class="cap-bar-track" style="height:4px;width:60px;flex-shrink:0">
        <div class="cap-bar-fill ${fillColor(pct)}" style="width:${pct}%"></div>
      </div>
      <span style="font-size:0.75rem;font-weight:700;color:${pct >= 100 ? 'var(--accent)' : pct >= 80 ? 'var(--amber)' : 'var(--green)'}">${pct}%</span>
    </div>
  </td>
  <td>
    <button class="action-btn" onclick="deleteEvent(${ev.id})"
      style="color:var(--accent);border-color:var(--accent)">Remove</button>
  </td>
</tr>`;
    }).join('');
}

// ── Add new event ──────────────────────────────
function addEvent() {
    const title = document.getElementById('a-title').value.trim();
    const cap   = parseInt(document.getElementById('a-cap').value);
    const date  = document.getElementById('a-date').value;

    if (!title || !cap || !date) {
        toast('Please fill in all required fields.', 'error');
        return;
    }
    if (cap < 1) {
        toast('Capacity must be at least 1.', 'error');
        return;
    }

    const ev = {
        id:         nextEventId++,
        title,
        category:   document.getElementById('a-cat').value,
        date,
        time:       document.getElementById('a-time').value,
        location:   document.getElementById('a-loc').value  || 'TBD',
        speaker:    document.getElementById('a-spk').value  || 'TBD',
        capacity:   cap,
        registered: 0,
        waitlist:   0,
        price:      parseInt(document.getElementById('a-price').value) || 0,
        status:     'upcoming',
    };

    events.push(ev);
    ['a-title', 'a-cap', 'a-date', 'a-loc', 'a-spk'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('a-price').value = '0';

    updateStats();
    renderEvents();
    renderAdmin();
    buildTicker();
    toast(`Event "${ev.title}" created successfully!`, 'success');
}

// ── Delete event ───────────────────────────────
function deleteEvent(id) {
    const idx = events.findIndex(e => e.id === id);
    if (idx !== -1) events.splice(idx, 1);
    updateStats();
    renderEvents();
    renderAdmin();
    buildTicker();
    toast('Event removed.', 'info');
}