// ═══════════════════════════════════════════════
// REGISTRATION MODAL
// ═══════════════════════════════════════════════

let currentEventId = null;

// ── Open modal with live event data ───────────
async function openModal(id) {
    currentEventId = id;

    try {
        const ev   = await apiFetch(`/events/${id}`);
        const left = seatsLeft(ev);

        document.getElementById('modalTitle').textContent     = ev.title;
        document.getElementById('modalCategory').className   = `event-category ${catClass(ev.category)}`;
        document.getElementById('modalCategory').textContent = ev.category;
        document.getElementById('ms-date').textContent       = `${fmt(ev.date)} at ${ev.time}`;
        document.getElementById('ms-location').textContent   = ev.location;
        document.getElementById('ms-seats').textContent      = left > 0 ? `${left} available` : 'Sold out — waitlist open';
        document.getElementById('ms-seats').style.color      = left > 0 ? 'var(--green)' : 'var(--accent)';
        document.getElementById('ms-price').textContent      = price(ev.price);
        document.getElementById('waitlistNotice').style.display = left <= 10 ? 'block' : 'none';
        document.getElementById('submitBtn').textContent     = left === 0 ? 'Join Waitlist' : 'Confirm Registration';

        document.getElementById('regModal').classList.add('open');
        document.getElementById('regName').focus();

    } catch (err) {
        toast('Failed to load event details.', 'error');
    }
}

// ── Close modal ────────────────────────────────
function closeModal() {
    document.getElementById('regModal').classList.remove('open');
    ['regName', 'regEmail', 'regPhone', 'regOrg'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

// ── Submit registration to API ─────────────────
async function submitRegistration() {
    const name  = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();

    if (!name || !email) {
        toast('Name and email are required.', 'error');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast('Please enter a valid email.', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled    = true;

    try {
        const payload = {
            event_id:     currentEventId,
            name,
            email,
            phone:        document.getElementById('regPhone').value || null,
            organisation: document.getElementById('regOrg').value   || null,
            ticket_type:  document.getElementById('regTicket').value,
            seats:        parseInt(document.getElementById('regSeats').value),
        };

        const reg = await apiFetch("/registrations", {
            method: "POST",
            body:   JSON.stringify(payload),
        });

        closeModal();
        await Promise.all([updateStats(), renderEvents(), buildTicker()]);

        if (reg.status === 'waitlist') {
            toast(`Added to waitlist! We'll notify you when a seat opens.`, 'warning');
        } else {
            toast(`Registration confirmed for ${reg.event_id ? 'the event' : 'event'}! ✅`, 'success');
        }

    } catch (err) {
        toast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Confirm Registration';
    }
}