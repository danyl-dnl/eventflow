// ═══════════════════════════════════════════════
// ADMIN PORTAL — Tab switching, Calendar, Users, Export
// ═══════════════════════════════════════════════

// ── Tab switching ──────────────────────────────
function switchTab(name, btn) {
    ['dashboard','events','registrations','users','calendar','export'].forEach(t => {
        document.getElementById(`tab-${t}`).style.display = 'none';
    });
    document.getElementById(`tab-${name}`).style.display = 'block';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (name === 'dashboard')     renderDashboard();
    if (name === 'events')        renderAdmin();
    if (name === 'registrations') renderRegistrations();
    if (name === 'users')         renderUsers();
    if (name === 'calendar')      renderCalendar();
}

// ── Init ───────────────────────────────────────
async function init() {
    if (!requireAdmin()) return;

    const user = getUser();
    const nameEl = document.getElementById('nav-user-name');
    if (nameEl) nameEl.textContent = user.name;

    const dateInput = document.getElementById('a-date');
    if (dateInput) dateInput.value = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];

    await Promise.all([buildTicker(), renderDashboard()]);
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
async function renderDashboard() {
    try {
        const stats = await apiFetch('/stats');
        document.getElementById('d-total').textContent = stats.total_events;
        document.getElementById('d-seats').textContent = stats.available_seats;
        document.getElementById('d-regs').textContent  = stats.confirmed_regs;
        document.getElementById('d-wait').textContent  = stats.waitlisted;

        const events  = await apiFetch('/events');
        const capList = document.getElementById('dashCapList');
        capList.innerHTML = events.map(ev => {
            const pct = fillPct(ev);
            return `
<div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius);padding:16px 20px;margin-bottom:12px">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
    <span style="font-weight:600;font-size:0.9rem">${ev.title}</span>
    <span style="font-size:0.78rem;font-weight:700;color:${pct>=100?'var(--accent)':pct>=80?'var(--amber)':'var(--green)'}">${pct}%</span>
  </div>
  <div class="cap-bar-track" style="height:6px;margin-bottom:8px">
    <div class="cap-bar-fill ${fillColor(pct)}" style="width:${pct}%"></div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--ink3)">
    <span>${ev.registered} registered · ${ev.waitlist} waitlisted</span>
    <span>${seatsLeft(ev)} seats left</span>
  </div>
</div>`;
        }).join('');
    } catch (err) {
        toast('Failed to load dashboard: ' + err.message, 'error');
    }
}

// ═══════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════
let userSearch = '';

async function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const empty = document.getElementById('usersEmpty');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--ink3)">Loading...</td></tr>`;
    try {
        let url = '/users';
        if (userSearch) url += `?search=${encodeURIComponent(userSearch)}`;
        const users = await apiFetch(url);

        if (!users.length) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        tbody.innerHTML = users.map(u => `
<tr>
  <td><div style="font-weight:600;font-size:0.88rem">${u.name}</div></td>
  <td style="font-size:0.84rem;color:var(--ink3)">${u.email}</td>
  <td><span class="user-role-badge user-role-${u.role}">${u.role}</span></td>
  <td style="font-size:0.82rem;color:var(--ink3)">${fmt(u.created_at)}</td>
</tr>`).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--accent)">${err.message}</td></tr>`;
    }
}

let userSearchTimeout;
function searchUsers(q) {
    clearTimeout(userSearchTimeout);
    userSearchTimeout = setTimeout(() => { userSearch = q; renderUsers(); }, 300);
}

// ═══════════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════════
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calEvents = [];

const CAL_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

async function renderCalendar() {
    try {
        calEvents = await apiFetch('/events');
    } catch { calEvents = []; }
    drawCalendar();
}

function calNav(dir) {
    if (dir === 0) { calYear = new Date().getFullYear(); calMonth = new Date().getMonth(); }
    else { calMonth += dir; if (calMonth > 11) { calMonth = 0; calYear++; } else if (calMonth < 0) { calMonth = 11; calYear--; } }
    drawCalendar();
}

function drawCalendar() {
    document.getElementById('calTitle').textContent = `${CAL_MONTHS[calMonth]} ${calYear}`;

    // Day labels
    const labelEl = document.getElementById('calDayLabels');
    labelEl.innerHTML = CAL_DAYS.map(d => `<div class="cal-day-label">${d}</div>`).join('');

    const today     = new Date();
    const firstDay  = new Date(calYear, calMonth, 1).getDay();
    const daysInMon = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev = new Date(calYear, calMonth, 0).getDate();

    // Events indexed by date string
    const evByDate = {};
    calEvents.forEach(ev => {
        const key = ev.date.slice(0, 10);
        if (!evByDate[key]) evByDate[key] = [];
        evByDate[key].push(ev);
    });

    const grid = document.getElementById('calGrid');
    let html = '';

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="cal-day other-month"><div class="cal-day-num">${daysInPrev - i}</div></div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMon; d++) {
        const dateStr  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday  = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
        const evs      = evByDate[dateStr] || [];
        const hasEvent = evs.length > 0;

        html += `<div class="cal-day ${isToday?'today':''} ${hasEvent?'has-event':''}" onclick="openCalDay('${dateStr}', ${JSON.stringify(evs).replace(/"/g,'&quot;')})">
  <div class="cal-day-num">${d}</div>
  ${evs.slice(0,2).map(e => `<div class="cal-event-dot">· ${e.title}</div>`).join('')}
  ${evs.length > 2 ? `<div class="cal-event-dot">+${evs.length-2} more</div>` : ''}
</div>`;
    }

    // Next month padding
    const total  = firstDay + daysInMon;
    const remain = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= remain; i++) {
        html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
    }

    grid.innerHTML = html;
}

function openCalDay(dateStr, evs) {
    const display = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    document.getElementById('calModalTitle').textContent = display;

    let content = '';
    if (evs.length) {
        content += `<div class="section-label" style="margin-bottom:12px"><span>Events on this day</span></div>`;
        content += evs.map(ev => `
<div style="background:var(--bg);border:1px solid var(--rule);border-radius:var(--radius);padding:12px 14px;margin-bottom:10px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span class="event-category ${catClass(ev.category)}" style="margin:0">${ev.category}</span>
    <span style="font-weight:600;font-size:0.9rem">${ev.title}</span>
  </div>
  <div style="font-size:0.78rem;color:var(--ink3)">${ev.time} · ${ev.location} · ${seatsLeft(ev)} seats left</div>
</div>`).join('');
        content += `<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--rule);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink3);margin-bottom:12px">Create Another Event</div>`;
    } else {
        content += `<div style="text-align:center;padding:16px 0 20px;color:var(--ink3);font-size:0.88rem">No events on this day. Create one below.</div>`;
    }

    // Prefilled create form
    content += `
<div class="form-group"><label class="form-label">Title *</label><input type="text" class="form-input" id="cal-title" placeholder="Event title" /></div>
<div class="form-row">
  <div class="form-group" style="margin-bottom:0"><label class="form-label">Category</label><select class="form-input form-select" id="cal-cat"><option value="conference">Conference</option><option value="workshop">Workshop</option><option value="summit">Summit</option><option value="networking">Networking</option></select></div>
  <div class="form-group" style="margin-bottom:0"><label class="form-label">Capacity *</label><input type="number" class="form-input" id="cal-cap" placeholder="100" min="1" /></div>
</div>
<div class="form-row" style="margin-top:14px">
  <div class="form-group" style="margin-bottom:0"><label class="form-label">Time</label><input type="time" class="form-input" id="cal-time" value="10:00" /></div>
  <div class="form-group" style="margin-bottom:0"><label class="form-label">Price (₹)</label><input type="number" class="form-input" id="cal-price" value="0" min="0" /></div>
</div>
<div class="form-group" style="margin-top:14px"><label class="form-label">Location</label><input type="text" class="form-input" id="cal-loc" placeholder="Venue or Online" /></div>
<div class="form-group"><label class="form-label">Speaker</label><input type="text" class="form-input" id="cal-spk" placeholder="Speaker name" /></div>`;

    document.getElementById('calModalContent').innerHTML = content;
    document.getElementById('calModalFooter').innerHTML = `
<button class="btn-secondary" onclick="closeCalModal()" style="flex:1">Cancel</button>
<button class="btn-primary" onclick="createEventFromCal('${dateStr}')" style="flex:2">Create Event</button>`;

    document.getElementById('calModal').classList.add('open');
}

function closeCalModal() {
    document.getElementById('calModal').classList.remove('open');
}

async function createEventFromCal(dateStr) {
    const title = document.getElementById('cal-title').value.trim();
    const cap   = parseInt(document.getElementById('cal-cap').value);
    if (!title || !cap) { toast('Title and capacity are required.', 'error'); return; }

    try {
        await apiFetch('/events', {
            method: 'POST',
            body: JSON.stringify({
                title,
                category: document.getElementById('cal-cat').value,
                date:     dateStr,
                time:     document.getElementById('cal-time').value + ':00',
                location: document.getElementById('cal-loc').value || 'TBD',
                speaker:  document.getElementById('cal-spk').value || 'TBD',
                capacity: cap,
                price:    parseInt(document.getElementById('cal-price').value) || 0,
                status:   'upcoming',
            }),
        });
        closeCalModal();
        toast('Event created! ✅', 'success');
        await renderCalendar();
    } catch (err) {
        toast(err.message || 'Failed to create event.', 'error');
    }
}

// ═══════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════
async function exportCSV(statusFilter) {
    try {
        let url = '/registrations?';
        if (statusFilter !== 'all') url += `status=${statusFilter}&`;
        const list = await apiFetch(url);

        if (!list.length) { toast('No registrations to export.', 'info'); return; }

        const headers = ['ID','Event ID','Name','Email','Phone','Organisation','Ticket Type','Seats','Status','Registered At'];
        const rows = list.map(r => [
            r.id, r.event_id, r.name, r.email,
            r.phone || '', r.organisation || '',
            r.ticket_type, r.seats, r.status,
            new Date(r.registered_at).toLocaleString('en-IN'),
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = `eventflow_registrations_${statusFilter}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast(`Exported ${list.length} registrations.`, 'success');
    } catch (err) {
        toast('Export failed: ' + err.message, 'error');
    }
}

// ── Calendar modal close on backdrop ──────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calModal').addEventListener('click', function(e) {
        if (e.target === this) closeCalModal();
    });
});

document.addEventListener('DOMContentLoaded', init);