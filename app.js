// app.js
async function loadStatus(statusUrl) {
  const res = await fetch(statusUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return await res.json();
}

function fmtTimestamp(iso) {
  // ISO van python utc: 2025-12-17T11:49:03.123456
  // We tonen 'm simpel, zonder timezone gedoe
  return (iso || "").replace("T", " ").split(".")[0];
}

function dayNameNL(dateObj) {
  const names = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
  return names[dateObj.getDay()];
}

function monthNameNL(m) {
  const names = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  return names[m];
}

function fmtDateNL(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${dayNameNL(dt)} ${d} ${monthNameNL(dt.getMonth())}`;
}

function groupByDate(allSlots) {
  const map = new Map();
  for (const s of allSlots || []) {
    const date = s.date;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(s);
  }
  // sort dates ascending
  const dates = Array.from(map.keys()).sort();
  return dates.map(date => {
    const slots = map.get(date);
    // sort courts (Padel indoor 1..12 / Padel outdoor 1..2)
    slots.sort((a, b) => (a.court || "").localeCompare((b.court || ""), "nl"));
    return { date, slots };
  });
}

function pickFirstSlot(groups) {
  for (const g of groups) {
    if (g.slots.length > 0) return { date: g.date, slot: g.slots[0] };
  }
  return null;
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPage({ title, statusUrl, weatherUrl, navLabel }) {
  const root = document.getElementById("app");
  root.innerHTML = `<div class="none">Laden…</div>`;

  loadStatus(statusUrl)
    .then(status => {
      const ts = fmtTimestamp(status.timestamp);

      const groups = groupByDate(status.all_slots || []);
      const first = pickFirstSlot(groups);

      const heroHtml = first
        ? `
        <section class="hero">
          <div class="hero-title">Eerstvolgende vrije baan</div>
          <div class="hero-date">${escapeHtml(fmtDateNL(first.date))}</div>
          <div class="hero-detail">${escapeHtml(first.slot.court)} — ${escapeHtml(first.slot.period || "20:00–21:30")}</div>
        </section>`
        : `
        <section class="hero">
          <div class="hero-title">Eerstvolgende vrije baan</div>
          <div class="hero-date">Geen beschikbaarheid</div>
          <div class="hero-detail">Er zijn momenteel geen vrije banen in dit venster.</div>
        </section>`;

      let daysHtml = "";
      if (!groups.length || groups.every(g => g.slots.length === 0)) {
        daysHtml = `<div class="none">Geen vrije banen gevonden.</div>`;
      } else {
        daysHtml = groups.map(g => {
          const label = `${fmtDateNL(g.date)} – ${g.slots.length} vrije banen`;
          const lis = g.slots.map(s => `<li>${escapeHtml(s.court)}</li>`).join("");
          return `
            <details>
              <summary>${escapeHtml(label)}</summary>
              <ul>${lis}</ul>
            </details>
          `;
        }).join("");
      }

      root.innerHTML = `
        <h1>${escapeHtml(title)}</h1>
        <div class="nav">${navLabel || ""}</div>
        <div class="timestamp">Laatst geüpdatet: ${escapeHtml(ts)}</div>
        ${heroHtml}
        <h2>Beschikbare dagen</h2>
        ${daysHtml}
        <div id="weather"></div>
      `;

      // Weather (optioneel)
      if (weatherUrl) {
        fetch(weatherUrl, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .then(w => {
            if (!w) return;
            const weatherRoot = document.getElementById("weather");
            // verwacht: { title: "...", days: [{label, main, hi, lo, precip}] }
            const cards = (w.days || []).map(d => `
              <div class="weather-card">
                <div class="weather-row">
                  <div class="weather-main">${escapeHtml(d.main)} — ${escapeHtml(d.label)}</div>
                  <div class="weather-temp">${escapeHtml(d.hi)}° / ${escapeHtml(d.lo)}°</div>
                </div>
                <div class="weather-sub">Neerslagkans: ${escapeHtml(d.precip)}%</div>
              </div>
            `).join("");

            weatherRoot.innerHTML = `
              <h2>${escapeHtml(w.title || "Weersverwachting")}</h2>
              <div class="weather-list">${cards || `<div class="none">Geen weerdata.</div>`}</div>
            `;
          })
          .catch(() => {
            // weather is optional; ignore errors
          });
      }
    })
    .catch(err => {
      root.innerHTML = `<div class="none">Kon data niet laden: ${escapeHtml(err.message)}</div>`;
    });
}
