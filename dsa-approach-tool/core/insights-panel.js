// core/insights-panel.js
// Lightweight aggregation view over Outcomes — pass rate vs predicted
// confidence band, and which structural property values most often
// preceded a WA/TLE. Opened on demand from the topbar, same pattern as
// GuidePanel.

const InsightsPanel = (() => {

  const PROPERTY_LABELS = {
    orderSensitivity: 'Order Sensitivity', subproblemOverlap: 'Subproblem Overlap',
    feasibilityBoundary: 'Feasibility Boundary', localOptimality: 'Local Optimality',
    stateSpace: 'State Space', dependencyStructure: 'Dependency Structure', searchSpace: 'Search Space',
  };

  function show() {
    if (document.getElementById('ip-overlay')) return;
    _injectStyles();

    const outcomes = typeof Outcomes !== 'undefined' ? Outcomes.getAll() : [];

    const overlay = document.createElement('div');
    overlay.className = 'ip-overlay';
    overlay.id = 'ip-overlay';

    const panel = document.createElement('div');
    panel.className = 'ip-panel';

    panel.innerHTML = `
      <div class="ip-header">
        <div>
          <div class="ip-eyebrow">Insights</div>
          <div class="ip-title">Confidence vs. actual outcomes</div>
        </div>
        <button class="ip-close" id="ip-close" aria-label="Close insights">✕</button>
      </div>
      <div class="ip-body" id="ip-body"></div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    panel.querySelector('#ip-close').addEventListener('click', hide);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

    _renderBody(panel.querySelector('#ip-body'), outcomes);
    requestAnimationFrame(() => overlay.classList.add('ip-overlay--in'));
  }

  function hide() {
    const overlay = document.getElementById('ip-overlay');
    if (!overlay) return;
    overlay.classList.remove('ip-overlay--in');
    setTimeout(() => overlay.remove(), 160);
  }

  function _renderBody(body, outcomes) {
    if (!outcomes.length) {
      body.innerHTML = `<div class="ip-empty">No recorded outcomes yet — answer "Did this solve the problem?" after a few sessions and this fills in.</div>`;
      return;
    }

    const bandRates = typeof Outcomes !== 'undefined' ? Outcomes.passRateByBand() : {};
    const risky     = typeof Outcomes !== 'undefined' ? Outcomes.riskyPropertyValues() : [];

    // ── Pass rate vs band ──────────────────────────────────────────────────
    const bandSection = document.createElement('section');
    bandSection.className = 'ip-section';
    bandSection.innerHTML = `<div class="ip-section-title">Actual pass rate vs. predicted confidence band</div>`;

    ['high', 'medium', 'low'].forEach(band => {
      const stat = bandRates[band] ?? { pass: 0, total: 0, rate: null };
      const row = document.createElement('div');
      row.className = 'ip-band-row';
      row.innerHTML = `
        <span class="ip-band-name ip-band-name--${band}">${band}</span>
        <div class="ip-band-bar-wrap">
          <div class="ip-band-bar ip-band-bar--${band}" style="width:${stat.rate ?? 0}%"></div>
        </div>
        <span class="ip-band-stat">${stat.rate === null ? 'no data' : `${stat.rate}% (${stat.pass}/${stat.total})`}</span>
      `;
      bandSection.appendChild(row);
    });
    body.appendChild(bandSection);

    // ── Risky property values ──────────────────────────────────────────────
    const riskySection = document.createElement('section');
    riskySection.className = 'ip-section';
    riskySection.innerHTML = `<div class="ip-section-title">Structural properties that most often preceded a WA or TLE</div>`;

    if (!risky.length) {
      riskySection.innerHTML += `<div class="ip-empty">Not enough failed outcomes recorded yet to find a pattern.</div>`;
    } else {
      risky.slice(0, 8).forEach(r => {
        const row = document.createElement('div');
        row.className = 'ip-risky-row';
        row.innerHTML = `
          <span class="ip-risky-prop">${PROPERTY_LABELS[r.propertyId] ?? r.propertyId}</span>
          <span class="ip-risky-value">${r.value}</span>
          <span class="ip-risky-count">${r.wa ? `${r.wa} WA` : ''}${r.wa && r.tle ? ' · ' : ''}${r.tle ? `${r.tle} TLE` : ''}</span>
        `;
        riskySection.appendChild(row);
      });
    }
    body.appendChild(riskySection);

    // ── Targeted practice — weakest structural properties ───────────────────
    const drillSection = document.createElement('section');
    drillSection.className = 'ip-section';
    drillSection.innerHTML = `
      <div class="ip-section-title">Targeted practice — your weakest structural properties</div>
      <div id="ip-drills-body" class="ip-empty">Loading suggestions…</div>
    `;
    body.appendChild(drillSection);
    _renderDrills(drillSection.querySelector('#ip-drills-body'));

    // ── Total sample note ──────────────────────────────────────────────────
    const note = document.createElement('div');
    note.className = 'ip-note';
    note.textContent = `Based on ${outcomes.length} recorded outcome${outcomes.length !== 1 ? 's' : ''} on this browser.`;
    body.appendChild(note);
  }

  async function _renderDrills(container) {
    const weakest = typeof Outcomes !== 'undefined' ? Outcomes.weakestProperties().filter(w => w.weaknessScore > 0) : [];

    if (!weakest.length) {
      container.className = 'ip-empty';
      container.textContent = 'Not enough data yet — properties you mark "unsure", or that precede a WA/TLE, will surface targeted practice here.';
      return;
    }

    if (typeof ProblemLibrary === 'undefined') {
      container.className = 'ip-empty';
      container.textContent = 'Problem library unavailable.';
      return;
    }

    const top = weakest.slice(0, 3);
    const groups = await Promise.all(top.map(async w => ({
      weak    : w,
      problems: await ProblemLibrary.suggestForProperty(w.propertyId, { limit: 2 }),
    })));

    container.className = 'ip-drill-groups';
    container.innerHTML = '';

    groups.forEach(({ weak, problems }) => {
      const group = document.createElement('div');
      group.className = 'ip-drill-group';

      const reasonParts = [];
      if (weak.unsure)     reasonParts.push(`marked "unsure" ${weak.unsure}×`);
      if (weak.badOutcome) reasonParts.push(`preceded a WA/TLE ${weak.badOutcome}×`);

      group.innerHTML = `
        <div class="ip-drill-group-header">
          <span class="ip-drill-prop">${PROPERTY_LABELS[weak.propertyId] ?? weak.propertyId}</span>
          <span class="ip-drill-reason">${reasonParts.join(' · ')}</span>
        </div>
      `;

      if (!problems.length) {
        const empty = document.createElement('div');
        empty.className = 'ip-empty';
        empty.textContent = 'No tagged practice problems for this property yet.';
        group.appendChild(empty);
      } else {
        problems.forEach(p => {
          const card = document.createElement('div');
          card.className = 'ip-drill-card';
          card.innerHTML = `
            <div class="ip-drill-card-top">
              <span class="ip-drill-card-title">${p.title}</span>
              <span class="ip-drill-card-diff ip-drill-card-diff--${p.difficulty}">${p.difficulty}</span>
            </div>
            <div class="ip-drill-card-statement">${p.statement}</div>
          `;
          group.appendChild(card);
        });
      }

      container.appendChild(group);
    });
  }

  function _injectStyles() {
    if (document.getElementById('ip-styles')) return;
    const style = document.createElement('style');
    style.id = 'ip-styles';
    style.textContent = `
    .ip-overlay {
      position: fixed; inset: 0; z-index: 9500; background: rgba(6,10,8,.55);
      display: flex; align-items: center; justify-content: center; padding: 24px;
      opacity: 0; transition: opacity .16s ease;
    }
    .ip-overlay--in { opacity: 1; }
    .ip-panel {
      --ip-bg: #111d17; --ip-surface: #1e3229; --ip-ink: #ede4cf; --ip-ink2: #c4b89c; --ip-muted: #7d8f80;
      --ip-border: rgba(232,223,200,.14); --ip-green: #5cc98a; --ip-amber: #e8944a; --ip-red: #e05a5a;
      width: 100%; max-width: 640px; max-height: 80vh; background: var(--ip-bg); color: var(--ip-ink);
      border-radius: 16px; border: 1px solid var(--ip-border); box-shadow: 0 24px 60px rgba(0,0,0,.28);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: 'DM Sans', system-ui, sans-serif;
    }
    .ip-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 24px 16px; background: var(--ip-surface); border-bottom: 1px solid var(--ip-border);
    }
    .ip-eyebrow { font-family: 'Space Mono', monospace; font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; color: var(--ip-muted); margin-bottom: 4px; }
    .ip-title { font-size: 1.2rem; font-weight: 700; }
    .ip-close {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--ip-border);
      background: var(--ip-surface); color: var(--ip-muted); cursor: pointer; flex-shrink: 0;
    }
    .ip-body { overflow-y: auto; padding: 20px 24px 28px; display: flex; flex-direction: column; gap: 24px; }
    .ip-empty { font-size: .82rem; color: var(--ip-muted); font-style: italic; padding: 8px 0; }
    .ip-section { display: flex; flex-direction: column; gap: 8px; }
    .ip-section-title { font-size: .84rem; font-weight: 700; margin-bottom: 4px; }
    .ip-band-row { display: grid; grid-template-columns: 70px 1fr 110px; align-items: center; gap: 10px; font-size: .78rem; }
    .ip-band-name { text-transform: uppercase; font-family: 'Space Mono', monospace; font-size: .64rem; letter-spacing: .05em; }
    .ip-band-name--high { color: var(--ip-green); } .ip-band-name--medium { color: var(--ip-amber); } .ip-band-name--low { color: var(--ip-red); }
    .ip-band-bar-wrap { height: 8px; background: var(--ip-surface); border: 1px solid var(--ip-border); border-radius: 9999px; overflow: hidden; }
    .ip-band-bar { height: 100%; border-radius: 9999px; }
    .ip-band-bar--high { background: var(--ip-green); } .ip-band-bar--medium { background: var(--ip-amber); } .ip-band-bar--low { background: var(--ip-red); }
    .ip-band-stat { font-family: 'Space Mono', monospace; font-size: .68rem; color: var(--ip-ink2); text-align: right; }
    .ip-risky-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; font-size: .78rem; padding: 6px 10px; background: var(--ip-surface); border: 1px solid var(--ip-border); border-radius: 7px; }
    .ip-risky-prop { color: var(--ip-ink2); }
    .ip-risky-value { font-family: 'Space Mono', monospace; color: var(--ip-ink); }
    .ip-risky-count { font-size: .7rem; color: var(--ip-red); white-space: nowrap; }
    .ip-note { font-family: 'Space Mono', monospace; font-size: .66rem; color: var(--ip-muted); text-align: center; }
    .ip-drill-groups { display: flex; flex-direction: column; gap: 14px; }
    .ip-drill-group  { display: flex; flex-direction: column; gap: 6px; }
    .ip-drill-group-header { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
    .ip-drill-prop   { font-size: .8rem; font-weight: 700; color: var(--ip-ink); }
    .ip-drill-reason { font-size: .68rem; color: var(--ip-muted); }
    .ip-drill-card   { background: var(--ip-surface); border: 1px solid var(--ip-border); border-radius: 8px; padding: 9px 12px; display: flex; flex-direction: column; gap: 4px; }
    .ip-drill-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ip-drill-card-title { font-size: .78rem; font-weight: 600; color: var(--ip-ink); }
    .ip-drill-card-diff  { font-family: 'Space Mono', monospace; font-size: .6rem; text-transform: uppercase; letter-spacing: .05em; padding: 1px 7px; border-radius: 9999px; flex-shrink: 0; }
    .ip-drill-card-diff--easy   { color: var(--ip-green); background: rgba(31,122,92,.1); }
    .ip-drill-card-diff--medium { color: var(--ip-amber); background: rgba(164,101,12,.1); }
    .ip-drill-card-diff--hard   { color: var(--ip-red);   background: rgba(194,59,59,.1); }
    .ip-drill-card-statement { font-size: .74rem; color: var(--ip-ink2); line-height: 1.5; }
    .ip-body::-webkit-scrollbar { width: 6px; }
    .ip-body::-webkit-scrollbar-thumb { background: var(--ip-border); border-radius: 4px; }
    `;
    document.head.appendChild(style);
  }

  return { show, hide };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = InsightsPanel;
