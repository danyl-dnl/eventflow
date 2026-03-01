// ═══════════════════════════════════════════════
// TICKER BANNER
// ═══════════════════════════════════════════════

async function buildTicker() {
    try {
        const events = await apiFetch("/events");
        const items = events.flatMap(e => [
            `<div class="ticker-item"><span>${e.title.toUpperCase()}</span>${seatsLeft(e)} SEATS LEFT</div>`,
            `<div class="ticker-item"><span>REG:</span>${e.registered}/${e.capacity}</div>`,
        ]);
        document.getElementById('tickerTrack').innerHTML = items.join('') + items.join('');
    } catch {
        // Silently fail — ticker is non-critical
    }
}