// ═══════════════════════════════════════════════
// EVENTS TAB — Grid, Filters & Search
// ═══════════════════════════════════════════════

let activeFilter = 'all';
let searchQuery  = '';
let sortAsc      = true;

// ── Stats from API ─────────────────────────────
async function updateStats() {
    try {
        const stats = await apiFetch("/stats");
        document.getElementById('stat-total').textContent = stats.total_events;
        document.getElementById('stat-seats').textContent = stats.available_seats;
        document.getElementById('stat-regs').textContent  = stats.confirmed_regs;
        document.getElementById('stat-wait').textContent  = stats.waitlisted;
    } catch {
        // Keep previous values on error
    }
}

// ── Fetch and render events ────────────────────
async function renderEvents() {
    showLoading('eventsGrid');

    try {
        let url = "/events?";
        if (activeFilter !== 'all') url += `category=${activeFilter}&`;
        if (searchQuery)            url += `search=${encodeURIComponent(searchQuery)}&`;

        let events = await apiFetch(url);

        // Client-side sort
        events.sort((a, b) =>
            sortAsc ? new Date(a.date) - new Date(b.date)
                    : new Date(b.date) - new Date(a.date)
        );

        document.getElementById('events-count-label').textContent =
            `${events.length} Event${events.length !== 1 ? 's' : ''}`;

        const grid = document.getElementById('eventsGrid');

        if (!events.length) {
            grid.innerHTML = `
                <div class="empty" style="grid-column:1/-1">
                    <div class="empty-title">No Events Found</div>
                    <p style="font-size:0.88rem">Try adjusting your search or filters.</p>
                </div>`;
            return;
        }

        grid.innerHTML = events.map(ev => {
            const pct    = fillPct(ev);
            const left   = seatsLeft(ev);
            const full   = left === 0;
            const nearly = left > 0 && left <= 10;

            return `
<div class="event-card fade-up">
  ${full ? `<div class="sold-out-banner">Sold Out — Join Waitlist</div>` : ''}
  <div class="event-card-header">
    <div style="flex:1">
      <div class="event-category ${catClass(ev.category)}">${ev.category}</div>
      <div class="event-title">${ev.title}</div>
      <div class="event-date">${fmt(ev.date)} &middot; ${ev.time}</div>
    </div>
    <div class="event-badge">
      <div class="event-badge-day">${fmtDay(ev.date)}</div>
      <div class="event-badge-month">${fmtMonth(ev.date)}</div>
    </div>
  </div>
  <div class="event-card-body">
    <div class="event-meta">
      <div class="event-meta-row">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        ${ev.location}
      </div>
      <div class="event-meta-row">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        ${ev.speaker}
      </div>
      <div class="event-meta-row">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        ${price(ev.price)}
      </div>
    </div>
    <div class="capacity-label">
      <span>${ev.registered} / ${ev.capacity} registered</span>
      <span class="pct" style="color:${pct >= 100 ? 'var(--accent)' : pct >= 80 ? 'var(--amber)' : 'var(--green)'}">${pct}%</span>
    </div>
    <div class="cap-bar-track">
      <div class="cap-bar-fill ${fillColor(pct)}" style="width:${pct}%"></div>
    </div>
    ${nearly ? `<div class="seats-left">Only ${left} seat${left !== 1 ? 's' : ''} left!</div>` : ''}
    ${ev.waitlist > 0 ? `<div style="font-size:0.72rem;color:var(--ink3);margin-top:4px">${ev.waitlist} on waitlist</div>` : ''}
  </div>
  <div class="event-card-footer">
    <button class="btn-register ${full ? 'waitlist' : ''}" onclick="openModal(${ev.id})">
      ${full ? 'Join Waitlist' : 'Register Now'}
    </button>
    <button class="btn-view" onclick="openModal(${ev.id})">Details</button>
  </div>
</div>`;
        }).join('');

    } catch (err) {
        showError('eventsGrid', err.message);
    }
}

// ── Filter / search / sort controls ───────────
function filterEvents(cat, btn) {
    activeFilter = cat;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderEvents();
}

let searchTimeout;
function searchEvents(q) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = q.toLowerCase();
        renderEvents();
    }, 300); // debounce 300ms
}

function toggleSort() {
    sortAsc = !sortAsc;
    document.getElementById('sort-label').textContent = `Sort: Date ${sortAsc ? '↓' : '↑'}`;
    renderEvents();
}