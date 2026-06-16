// debug/confidence-panel.js
// Renders the confidence score evolution as a simple bar chart and breakdown list.
// Call refresh(ir) after each engine run to update.

const ConfidencePanel = (() => {

  function mount(containerEl) {
    if (!containerEl) return null;

    containerEl.innerHTML = '';
    containerEl.style.cssText = 'font-family:monospace;font-size:12px;background:#0d1117;color:#c9d1d9;padding:12px;border-radius:6px;';

    const header = document.createElement('div');
    header.style.cssText = 'color:#58a6ff;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #30363d;padding-bottom:4px;';
    header.textContent = 'Confidence Panel';
    containerEl.appendChild(header);

    // Score bar
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'margin-bottom:12px;';

    const scoreLabel = document.createElement('div');
    scoreLabel.id = 'conf-score-label';
    scoreLabel.style.cssText = 'font-size:22px;font-weight:bold;color:#3fb950;margin-bottom:6px;';
    scoreLabel.textContent = '0 / 100';
    barWrap.appendChild(scoreLabel);

    const barOuter = document.createElement('div');
    barOuter.style.cssText = 'background:#21262d;border-radius:4px;height:14px;width:100%;overflow:hidden;';
    const barInner = document.createElement('div');
    barInner.id = 'conf-bar-inner';
    barInner.style.cssText = 'height:100%;width:0%;background:#3fb950;transition:width 0.3s,background 0.3s;border-radius:4px;';
    barOuter.appendChild(barInner);
    barWrap.appendChild(barOuter);

    const gateLabel = document.createElement('div');
    gateLabel.id = 'conf-gate-label';
    gateLabel.style.cssText = 'font-size:11px;margin-top:4px;color:#8b949e;';
    gateLabel.textContent = 'Gate: —';
    barWrap.appendChild(gateLabel);

    containerEl.appendChild(barWrap);

    // History sparkline (text-based)
    const historyWrap = document.createElement('div');
    historyWrap.style.cssText = 'margin-bottom:10px;';
    const histTitle = document.createElement('div');
    histTitle.style.cssText = 'color:#8b949e;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;';
    histTitle.textContent = 'Score history';
    historyWrap.appendChild(histTitle);
    const histEl = document.createElement('div');
    histEl.id = 'conf-history';
    histEl.style.cssText = 'color:#484f58;font-size:11px;';
    histEl.textContent = '—';
    historyWrap.appendChild(histEl);
    containerEl.appendChild(historyWrap);

    // Earned breakdown
    const earnedTitle = document.createElement('div');
    earnedTitle.style.cssText = 'color:#3fb950;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;';
    earnedTitle.textContent = 'Earned';
    containerEl.appendChild(earnedTitle);
    const earnedList = document.createElement('div');
    earnedList.id = 'conf-earned';
    earnedList.style.marginBottom = '8px';
    containerEl.appendChild(earnedList);

    // Deducted breakdown
    const deductedTitle = document.createElement('div');
    deductedTitle.style.cssText = 'color:#f85149;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;';
    deductedTitle.textContent = 'Deducted';
    containerEl.appendChild(deductedTitle);
    const deductedList = document.createElement('div');
    deductedList.id = 'conf-deducted';
    containerEl.appendChild(deductedList);

    const _history = [];

    function refresh(ir) {
      const conf = ir?.confidence;
      if (!conf) return;

      const score   = conf.score ?? 0;
      const band    = conf.band  ?? 'low';
      const gate    = conf.gate_action ?? '—';

      _history.push(score);
      if (_history.length > 20) _history.shift();

      const barColor = {high:'#3fb950', medium:'#e3b341', low:'#f85149'}[band] ?? '#3fb950';
      const gateColor = {proceed:'#3fb950', verify:'#e3b341', backtrack:'#f85149'}[gate] ?? '#8b949e';

      scoreLabel.textContent = `${score} / 100`;
      scoreLabel.style.color = barColor;
      barInner.style.width     = `${score}%`;
      barInner.style.background = barColor;
      gateLabel.textContent  = `Gate: ${gate}  |  Band: ${band}`;
      gateLabel.style.color  = gateColor;

      histEl.textContent = _history.map(s => _bar(s)).join(' ');

      // Earned
      earnedList.innerHTML = '';
      for (const e of (conf.earned ?? [])) {
        earnedList.appendChild(_breakdownRow(e.key, `+${e.points}`, '#3fb950'));
      }
      if ((conf.earned ?? []).length === 0) {
        const none = document.createElement('div');
        none.style.cssText = 'color:#484f58;padding-left:8px;';
        none.textContent = '(none)';
        earnedList.appendChild(none);
      }

      // Deducted
      deductedList.innerHTML = '';
      for (const d of (conf.deducted ?? [])) {
        deductedList.appendChild(_breakdownRow(d.key, String(d.points), '#f85149'));
      }
      if ((conf.deducted ?? []).length === 0) {
        const none = document.createElement('div');
        none.style.cssText = 'color:#484f58;padding-left:8px;';
        none.textContent = '(none)';
        deductedList.appendChild(none);
      }
    }

    function _bar(score) {
      const blocks = ['▁','▂','▃','▄','▅','▆','▇','█'];
      const idx = Math.min(blocks.length - 1, Math.floor(score / 100 * blocks.length));
      return blocks[idx];
    }

    function _breakdownRow(key, points, color) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:1px 8px;';
      const lbl = document.createElement('span');
      lbl.style.color = '#8b949e';
      lbl.textContent = key;
      const pts = document.createElement('span');
      pts.style.color = color;
      pts.textContent = points;
      row.appendChild(lbl);
      row.appendChild(pts);
      return row;
    }

    return { refresh };
  }

  return { mount };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = ConfidencePanel;
