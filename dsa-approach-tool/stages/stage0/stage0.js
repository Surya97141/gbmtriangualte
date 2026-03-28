// stages/stage0/stage0.js
// Complexity Budget — cream/white theme, self-contained styles
// Same pattern as stage1.js

const Stage0 = (() => {

  let _state         = null;
  let _debounceTimer = null;
  let _n             = null;
  let _q             = null;
  let _timeLimit     = 1;
  let _memLimit      = 256;
  let _flags         = {};

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state     = state;
    const saved = state.answers?.stage0 ?? {};

    _n         = saved.n         ?? null;
    _q         = saved.q         ?? null;
    _timeLimit = saved.timeLimit ?? 1;
    _memLimit  = saved.memLimit  ?? 256;
    _flags     = {
      hasUpdatesAndQueries: saved.hasUpdatesAndQueries ?? false,
      onlineQueries       : saved.onlineQueries        ?? false,
      negativeEdges       : saved.negativeEdges         ?? false,
      singleQuery         : saved.singleQuery           ?? false,
    };

    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 's0-shell';
    wrapper.innerHTML = `
      <div class="s0-main">

        <div class="s0-rule">
          Rule: Calculate ACTUAL operation count — not just Big-O notation.
          Enter constraints. Infeasible classes are eliminated immediately.
        </div>

        <!-- Section 01: Constraints -->
        <section class="s0-section">
          <div class="s0-section-header">
            <span class="s0-section-num">01</span>
            <div>
              <div class="s0-section-title">Enter your constraints</div>
              <div class="s0-section-sub">Supports shorthand: 1e5, 10^5, 100k</div>
            </div>
          </div>

          <div class="s0-input-grid">
            <div class="s0-input-block">
              <label class="s0-label" for="s0-n-input">N — primary input size</label>
              <input
                id="s0-n-input"
                class="s0-input"
                type="text"
                placeholder="e.g. 100000 or 1e5 or 100k"
                value="${_n ?? ''}"
                autocomplete="off"
              />
              <div class="s0-hint">The main constraint — array length, number of nodes, etc.</div>
              <div class="s0-quickset">
                ${['10²','10³','10⁴','10⁵','10⁶','10⁷'].map((label,i) => {
                  const val = Math.pow(10, i + 2);
                  const active = _n === val ? 's0-qs-btn--on' : '';
                  return `<button class="s0-qs-btn ${active}" data-val="${val}">${label}</button>`;
                }).join('')}
              </div>
            </div>

            <div class="s0-input-block">
              <label class="s0-label" for="s0-q-input">Q — number of queries</label>
              <input
                id="s0-q-input"
                class="s0-input"
                type="text"
                placeholder="Leave blank if no queries"
                value="${_q ?? ''}"
                autocomplete="off"
              />
              <div class="s0-hint">If the problem has Q separate queries on top of N elements</div>
            </div>

            <div class="s0-input-block">
              <label class="s0-label" for="s0-time-select">Time limit</label>
              <select id="s0-time-select" class="s0-select">
                ${[['0.5','0.5 s — very strict'],['1','1 s — standard'],['2','2 s — relaxed'],['5','5 s — generous']].map(
                  ([v,l]) => `<option value="${v}" ${String(_timeLimit)===v?'selected':''}>${l}</option>`
                ).join('')}
              </select>
            </div>

            <div class="s0-input-block">
              <label class="s0-label" for="s0-mem-select">Memory limit</label>
              <select id="s0-mem-select" class="s0-select">
                ${[['16','16 MB'],['32','32 MB'],['64','64 MB'],['128','128 MB'],['256','256 MB — standard'],['512','512 MB']].map(
                  ([v,l]) => `<option value="${v}" ${String(_memLimit)===v?'selected':''}>${l}</option>`
                ).join('')}
              </select>
            </div>
          </div>
        </section>

        <!-- Section 02: Additional flags -->
        <section class="s0-section">
          <div class="s0-section-header">
            <span class="s0-section-num">02</span>
            <div>
              <div class="s0-section-title">Additional constraints</div>
              <div class="s0-section-sub">Check all that apply — affects which approaches are viable</div>
            </div>
          </div>
          <div class="s0-flags-list" id="s0-flags-list"></div>
        </section>

        <!-- Section 03: Feasibility table -->
        <section class="s0-section">
          <div class="s0-section-header">
            <span class="s0-section-num">03</span>
            <div>
              <div class="s0-section-title">Feasibility at your N</div>
              <div class="s0-section-sub">Red rows are eliminated from consideration</div>
            </div>
          </div>
          <div id="s0-feasibility-wrap">
            <div class="s0-table-placeholder">← Enter N above to compute feasibility</div>
          </div>
        </section>

        <!-- Section 04: Memory -->
        <section class="s0-section" id="s0-memory-section" style="display:none">
          <div class="s0-section-header">
            <span class="s0-section-num">04</span>
            <div>
              <div class="s0-section-title">Memory check</div>
              <div class="s0-section-sub">Common data structures at your N</div>
            </div>
          </div>
          <div id="s0-memory-wrap"></div>
        </section>

      </div>

      <!-- Live side panel -->
      <aside class="s0-panel">
        <div class="s0-panel-header">
          <div class="s0-panel-title">What this rules out</div>
          <div class="s0-panel-sub">Updates as you type</div>
        </div>
        <div class="s0-panel-body" id="s0-panel-body">
          <div class="s0-panel-empty">← Enter N to see eliminated approaches</div>
        </div>
      </aside>
    `;

    // Build flags
    _buildFlags(wrapper);

    // Wire events
    _wireEvents(wrapper);

    // If returning with saved data, render immediately
    if (_n) {
      setTimeout(() => _recompute(wrapper), 0);
    }

    return wrapper;
  }

  // ─── FLAGS ─────────────────────────────────────────────────────────────────

  const FLAG_DEFS = [
    { key: 'hasUpdatesAndQueries', label: 'Has both updates AND queries',     impact: 'BFS/DFS precomputation won\'t work. Needs dynamic data structure — Segment Tree, BIT.' },
    { key: 'onlineQueries',        label: 'Queries must be answered online',  impact: 'Cannot sort queries. Cannot use offline algorithms (Mo\'s). Needs persistent or online structure.' },
    { key: 'negativeEdges',        label: 'Graph has negative edge weights',  impact: 'Dijkstra is WRONG. Must use Bellman-Ford or SPFA. Check for negative cycles.' },
    { key: 'singleQuery',          label: 'Only one query (q = 1)',           impact: 'No need for preprocessing. Direct O(n) or O(n log n) solution is sufficient.' },
  ];

  function _buildFlags(wrapper) {
    const list = wrapper.querySelector('#s0-flags-list');
    if (!list) return;

    FLAG_DEFS.forEach(flag => {
      const isOn = _flags[flag.key] ?? false;
      const row = document.createElement('label');
      row.className = `s0-flag-row ${isOn ? 's0-flag-row--on' : ''}`;
      row.dataset.key = flag.key;
      row.innerHTML = `
        <input type="checkbox" class="s0-flag-cb" ${isOn ? 'checked' : ''} data-key="${flag.key}">
        <div class="s0-flag-inner">
          <div class="s0-flag-label">${flag.label}</div>
          <div class="s0-flag-impact">${flag.impact}</div>
        </div>
      `;
      row.querySelector('input').addEventListener('change', (e) => {
        _flags[flag.key] = e.target.checked;
        row.classList.toggle('s0-flag-row--on', e.target.checked);
        State.setAnswer('stage0', { [flag.key]: e.target.checked });
        _updatePanel(wrapper);
      });
      list.appendChild(row);
    });
  }

  // ─── WIRE EVENTS ───────────────────────────────────────────────────────────

  function _wireEvents(wrapper) {
    // N input
    const nInput = wrapper.querySelector('#s0-n-input');
    if (nInput) {
      nInput.addEventListener('input', () => {
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
          _n = _parseN(nInput.value);
          if (_n && _n > 0) _recompute(wrapper);
          else {
            wrapper.querySelector('#s0-feasibility-wrap').innerHTML =
              '<div class="s0-table-placeholder">← Enter N above to compute feasibility</div>';
            const memSec = wrapper.querySelector('#s0-memory-section');
            if (memSec) memSec.style.display = 'none';
            _updatePanel(wrapper);
          }
        }, 400);
      });
    }

    // Q input
    const qInput = wrapper.querySelector('#s0-q-input');
    if (qInput) {
      qInput.addEventListener('input', () => {
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
          _q = _parseN(qInput.value) || null;
          State.setAnswer('stage0', { q: _q });
          if (_n) _recompute(wrapper);
        }, 400);
      });
    }

    // Time select
    const timeSelect = wrapper.querySelector('#s0-time-select');
    if (timeSelect) {
      timeSelect.addEventListener('change', () => {
        _timeLimit = parseFloat(timeSelect.value);
        State.setAnswer('stage0', { timeLimit: _timeLimit });
        if (_n) _recompute(wrapper);
      });
    }

    // Mem select
    const memSelect = wrapper.querySelector('#s0-mem-select');
    if (memSelect) {
      memSelect.addEventListener('change', () => {
        _memLimit = parseInt(memSelect.value);
        State.setAnswer('stage0', { memLimit: _memLimit });
        if (_n) _recompute(wrapper);
      });
    }

    // Quick-set buttons
    wrapper.querySelectorAll('.s0-qs-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _n = parseInt(btn.dataset.val);
        const nInput = wrapper.querySelector('#s0-n-input');
        if (nInput) nInput.value = _n.toLocaleString();
        wrapper.querySelectorAll('.s0-qs-btn').forEach(b => b.classList.remove('s0-qs-btn--on'));
        btn.classList.add('s0-qs-btn--on');
        _recompute(wrapper);
      });
    });
  }

  // ─── RECOMPUTE ─────────────────────────────────────────────────────────────

  function _recompute(wrapper) {
    if (!_n || _n <= 0) return;

    const q = _q || 1;
    const feasibility = MathUtils.buildFeasibilityReport(_n, q, _timeLimit, _memLimit);
    const eliminated  = feasibility.filter(r => r.status === 'red').map(r => r.complexityId);
    const memReport   = MathUtils.buildMemoryReport(_n, _memLimit);

    State.setAnswer('stage0', {
      n: _n, q: _q, timeLimit: _timeLimit, memLimit: _memLimit,
      feasibility, eliminated, memReport, memChecked: true,
    });

    // Render feasibility table
    const feasWrap = wrapper.querySelector('#s0-feasibility-wrap');
    if (feasWrap) {
      feasWrap.innerHTML = '';
      feasWrap.appendChild(_buildFeasibilityTable(feasibility));
    }

    // Render memory table
    const memSec = wrapper.querySelector('#s0-memory-section');
    const memWrap = wrapper.querySelector('#s0-memory-wrap');
    if (memSec && memWrap) {
      memSec.style.display = '';
      memWrap.innerHTML = '';
      memWrap.appendChild(_buildMemoryTable(memReport));
    }

    _updatePanel(wrapper);
    _checkComplete();
  }

  // ─── FEASIBILITY TABLE ─────────────────────────────────────────────────────

  function _buildFeasibilityTable(report) {
    const wrap = document.createElement('div');
    wrap.className = 's0-table';

    // Header
    const header = document.createElement('div');
    header.className = 's0-table-row s0-table-row--header';
    header.innerHTML = `
      <div class="s0-tc s0-tc--complexity">Complexity</div>
      <div class="s0-tc">Operations</div>
      <div class="s0-tc">Est. Time</div>
      <div class="s0-tc">Status</div>
    `;
    wrap.appendChild(header);

    report.forEach(row => {
      const tr = document.createElement('div');
      tr.className = `s0-table-row s0-table-row--${row.status}`;
      const statusText  = row.status === 'green' ? 'Safe' : row.status === 'yellow' ? 'Borderline' : 'TLE ✗';
      const statusClass = row.status === 'green' ? 's0-status--safe' : row.status === 'yellow' ? 's0-status--warn' : 's0-status--tle';
      tr.innerHTML = `
        <div class="s0-tc s0-tc--complexity s0-mono">${row.label}</div>
        <div class="s0-tc s0-mono">${row.opsDisplay}</div>
        <div class="s0-tc s0-mono">${row.estimatedTime}</div>
        <div class="s0-tc"><span class="${statusClass}">${statusText}</span></div>
      `;
      wrap.appendChild(tr);
    });

    return wrap;
  }

  // ─── MEMORY TABLE ──────────────────────────────────────────────────────────

  function _buildMemoryTable(report) {
    const wrap = document.createElement('div');
    wrap.className = 's0-mem-table';

    report.forEach(row => {
      const item = document.createElement('div');
      const over = row.status === 'over';
      item.className = `s0-mem-row ${over ? 's0-mem-row--over' : ''}`;
      item.innerHTML = `
        <div class="s0-mem-label">${row.label}</div>
        <div class="s0-mem-size s0-mono">${row.sizeDisplay}</div>
        <div class="s0-mem-status ${over ? 's0-status--tle' : 's0-status--safe'}">${over ? 'Over limit' : 'OK'}</div>
      `;
      wrap.appendChild(item);
    });

    return wrap;
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper) {
    const body = wrapper.querySelector('#s0-panel-body');
    if (!body) return;

    body.innerHTML = '';

    if (!_n) {
      body.innerHTML = '<div class="s0-panel-empty">← Enter N to see eliminated approaches</div>';
      return;
    }

    // N bucket insight
    const bucket  = typeof ComplexityTable !== 'undefined' ? ComplexityTable.getBucket(_n) : null;
    const insight = bucket ? ComplexityTable.getInsight(bucket.nBucket) : null;
    const watchOut= bucket ? ComplexityTable.getWatchOut(bucket.nBucket) : null;

    // N summary
    const nSection = document.createElement('div');
    nSection.className = 's0-panel-section';
    nSection.innerHTML = `
      <div class="s0-panel-section-title">Your N</div>
      <div class="s0-panel-n-display">
        <span class="s0-panel-n-value">${_n.toLocaleString()}</span>
        <span class="s0-panel-n-sci">${_toSci(_n)}</span>
      </div>
      ${bucket ? `<div class="s0-panel-bucket">Bucket: <strong>${bucket.nBucket}</strong></div>` : ''}
    `;
    body.appendChild(nSection);

    // Feasibility summary
    const saved = State.getAnswer('stage0') ?? {};
    if (saved.feasibility?.length) {
      const safe     = saved.feasibility.filter(r => r.status === 'green');
      const border   = saved.feasibility.filter(r => r.status === 'yellow');
      const tle      = saved.feasibility.filter(r => r.status === 'red');

      const feasSection = document.createElement('div');
      feasSection.className = 's0-panel-section';
      feasSection.innerHTML = `<div class="s0-panel-section-title">Feasibility summary</div>`;

      if (safe.length) {
        const el = document.createElement('div');
        el.className = 's0-panel-group s0-panel-group--safe';
        el.innerHTML = `<div class="s0-panel-group-label">✓ Safe to use</div>`;
        safe.forEach(r => {
          const tag = document.createElement('span');
          tag.className = 's0-panel-tag s0-panel-tag--safe';
          tag.textContent = r.label;
          el.appendChild(tag);
        });
        feasSection.appendChild(el);
      }

      if (border.length) {
        const el = document.createElement('div');
        el.className = 's0-panel-group s0-panel-group--warn';
        el.innerHTML = `<div class="s0-panel-group-label">⚠ Borderline</div>`;
        border.forEach(r => {
          const tag = document.createElement('span');
          tag.className = 's0-panel-tag s0-panel-tag--warn';
          tag.textContent = r.label;
          el.appendChild(tag);
        });
        feasSection.appendChild(el);
      }

      if (tle.length) {
        const el = document.createElement('div');
        el.className = 's0-panel-group s0-panel-group--tle';
        el.innerHTML = `<div class="s0-panel-group-label">✗ Eliminated (TLE)</div>`;
        tle.forEach(r => {
          const tag = document.createElement('span');
          tag.className = 's0-panel-tag s0-panel-tag--tle';
          tag.textContent = r.label;
          el.appendChild(tag);
        });
        feasSection.appendChild(el);
      }

      body.appendChild(feasSection);
    }

    // Insight
    if (insight) {
      const el = document.createElement('div');
      el.className = 's0-panel-section s0-panel-insight';
      el.innerHTML = `
        <div class="s0-panel-section-title">Key insight</div>
        <div class="s0-panel-insight-text">💡 ${insight}</div>
      `;
      body.appendChild(el);
    }

    // Watch out
    if (watchOut) {
      const el = document.createElement('div');
      el.className = 's0-panel-section s0-panel-watchout';
      el.innerHTML = `
        <div class="s0-panel-section-title">Watch out</div>
        <div class="s0-panel-warn-text">⚠ ${watchOut}</div>
      `;
      body.appendChild(el);
    }

    // Active flags
    const activeFlags = FLAG_DEFS.filter(f => _flags[f.key]);
    if (activeFlags.length) {
      const el = document.createElement('div');
      el.className = 's0-panel-section';
      el.innerHTML = `<div class="s0-panel-section-title">Constraint impacts</div>`;
      activeFlags.forEach(f => {
        const item = document.createElement('div');
        item.className = 's0-panel-flag-item';
        item.innerHTML = `
          <div class="s0-panel-flag-label">${f.label}</div>
          <div class="s0-panel-flag-impact">→ ${f.impact}</div>
        `;
        el.appendChild(item);
      });
      body.appendChild(el);
    }
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete() {
    const valid = _n && _n > 0;
    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(!!valid);
    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: { stageId: 'stage0', answers: State.getAnswer('stage0') }
      }));
    }
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  function _parseN(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toLowerCase().replace(/,/g, '').replace(/\s/g, '');
    if (s.endsWith('k')) return Math.round(parseFloat(s) * 1_000);
    if (s.endsWith('m')) return Math.round(parseFloat(s) * 1_000_000);
    if (s.includes('e')) return Math.round(parseFloat(s));
    if (s.includes('^')) {
      const [base, exp] = s.split('^').map(Number);
      return Math.round(Math.pow(base, exp));
    }
    const n = parseInt(s);
    return isNaN(n) ? null : n;
  }

  function _toSci(n) {
    if (!n) return '';
    const exp = Math.floor(Math.log10(n));
    const man = (n / Math.pow(10, exp)).toFixed(1);
    return man === '1.0' ? `10^${exp}` : `${man}×10^${exp}`;
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s0-styles')) return;
    const style = document.createElement('style');
    style.id = 's0-styles';
    style.textContent = `
    .s0-shell {
      --s0-bg      : #f7f4ef;
      --s0-surface : #ffffff;
      --s0-surface2: #faf8f5;
      --s0-border  : rgba(0,0,0,.09);
      --s0-border2 : rgba(0,0,0,.15);
      --s0-ink     : #1a1814;
      --s0-ink2    : #4a4540;
      --s0-muted   : #8a8070;
      --s0-blue    : #2563eb;
      --s0-blue-bg : rgba(37,99,235,.07);
      --s0-blue-b  : rgba(37,99,235,.25);
      --s0-green   : #059669;
      --s0-green-bg: rgba(5,150,105,.07);
      --s0-green-b : rgba(5,150,105,.28);
      --s0-warn    : #d97706;
      --s0-warn-bg : rgba(217,119,6,.07);
      --s0-warn-b  : rgba(217,119,6,.28);
      --s0-red     : #dc2626;
      --s0-red-bg  : rgba(220,38,38,.06);
      --s0-red-b   : rgba(220,38,38,.22);
      --s0-mono    : 'Space Mono', monospace;
      --s0-sans    : 'DM Sans', system-ui, sans-serif;
      display      : flex;
      gap          : 24px;
      align-items  : flex-start;
      background   : var(--s0-bg);
      min-height   : 100%;
      font-family  : var(--s0-sans);
      color        : var(--s0-ink);
      padding      : 28px;
    }
    .s0-main { flex: 1; display: flex; flex-direction: column; gap: 32px; min-width: 0; }
    .s0-rule { font-family: var(--s0-mono); font-size: .71rem; color: var(--s0-muted); padding: 10px 16px; background: var(--s0-surface); border: 1px solid var(--s0-border); border-left: 3px solid var(--s0-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }

    /* Sections */
    .s0-section { display: flex; flex-direction: column; gap: 14px; }
    .s0-section-header { display: flex; align-items: flex-start; gap: 14px; }
    .s0-section-num { font-family: var(--s0-mono); font-size: .65rem; font-weight: 700; color: #fff; background: var(--s0-blue); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .s0-section-title { font-size: .92rem; font-weight: 600; color: var(--s0-ink); line-height: 1.3; }
    .s0-section-sub   { font-size: .73rem; color: var(--s0-muted); margin-top: 2px; }

    /* Input grid */
    .s0-input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 700px) { .s0-input-grid { grid-template-columns: 1fr; } }
    .s0-input-block { display: flex; flex-direction: column; gap: 6px; }
    .s0-label { font-size: .78rem; font-weight: 500; color: var(--s0-ink2); }
    .s0-input { background: var(--s0-surface); border: 1.5px solid var(--s0-border); border-radius: 8px; padding: 9px 12px; font-family: var(--s0-mono); font-size: .86rem; color: var(--s0-blue); outline: none; transition: border-color .12s, box-shadow .12s; width: 100%; }
    .s0-input:focus { border-color: var(--s0-blue); box-shadow: 0 0 0 3px var(--s0-blue-bg); }
    .s0-input::placeholder { color: var(--s0-muted); font-size: .76rem; }
    .s0-select { background: var(--s0-surface); border: 1.5px solid var(--s0-border); border-radius: 8px; padding: 9px 12px; font-family: var(--s0-sans); font-size: .82rem; color: var(--s0-ink); outline: none; width: 100%; cursor: pointer; transition: border-color .12s; }
    .s0-select:focus { border-color: var(--s0-blue); box-shadow: 0 0 0 3px var(--s0-blue-bg); }
    .s0-hint { font-size: .68rem; color: var(--s0-muted); line-height: 1.4; }

    /* Quickset */
    .s0-quickset { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
    .s0-qs-btn { padding: 3px 10px; border: 1.5px solid var(--s0-border); border-radius: 9999px; background: var(--s0-surface); font-family: var(--s0-mono); font-size: .65rem; color: var(--s0-muted); cursor: pointer; transition: all .12s; }
    .s0-qs-btn:hover   { border-color: var(--s0-blue-b); color: var(--s0-blue); background: var(--s0-blue-bg); }
    .s0-qs-btn--on     { border-color: var(--s0-blue); background: var(--s0-blue-bg); color: var(--s0-blue); font-weight: 700; }

    /* Flag rows */
    .s0-flags-list { display: flex; flex-direction: column; gap: 5px; }
    .s0-flag-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; background: var(--s0-surface); border: 1.5px solid var(--s0-border); border-radius: 8px; cursor: pointer; transition: all .12s; user-select: none; }
    .s0-flag-row:hover  { border-color: var(--s0-border2); background: var(--s0-surface2); }
    .s0-flag-row--on    { border-color: var(--s0-blue-b); background: var(--s0-blue-bg); }
    .s0-flag-row input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--s0-blue); cursor: pointer; flex-shrink: 0; margin-top: 2px; }
    .s0-flag-inner { display: flex; flex-direction: column; gap: 2px; }
    .s0-flag-label  { font-size: .8rem; font-weight: 500; color: var(--s0-ink); }
    .s0-flag-impact { font-size: .7rem; color: var(--s0-muted); line-height: 1.4; }
    .s0-flag-row--on .s0-flag-label  { color: var(--s0-blue); }
    .s0-flag-row--on .s0-flag-impact { color: var(--s0-ink2); }

    /* Feasibility table */
    .s0-table-placeholder { font-family: var(--s0-mono); font-size: .72rem; color: var(--s0-muted); text-align: center; padding: 28px; background: var(--s0-surface); border: 1.5px dashed var(--s0-border); border-radius: 10px; }
    .s0-table { background: var(--s0-surface); border: 1.5px solid var(--s0-border); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
    .s0-table-row { display: grid; grid-template-columns: 1.4fr 1.4fr 1fr 1fr; border-bottom: 1px solid rgba(0,0,0,.05); transition: background .12s; }
    .s0-table-row:last-of-type { border-bottom: none; }
    .s0-table-row--header { background: var(--s0-surface2); }
    .s0-table-row--green:hover  { background: rgba(5,150,105,.03); }
    .s0-table-row--yellow:hover { background: rgba(217,119,6,.03); }
    .s0-table-row--red   { opacity: .65; }
    .s0-table-row--red:hover { background: rgba(220,38,38,.03); }
    .s0-tc { padding: 9px 14px; font-size: .74rem; color: var(--s0-ink2); display: flex; align-items: center; }
    .s0-tc--complexity { font-family: var(--s0-mono); font-size: .72rem; color: var(--s0-blue); font-weight: 700; }
    .s0-table-row--header .s0-tc { font-family: var(--s0-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s0-muted); font-weight: 400; }
    .s0-mono { font-family: var(--s0-mono) !important; }
    .s0-status--safe { color: var(--s0-green); font-weight: 600; font-size: .76rem; }
    .s0-status--warn { color: var(--s0-warn);  font-weight: 600; font-size: .76rem; }
    .s0-status--tle  { color: var(--s0-red);   font-weight: 600; font-size: .76rem; }

    /* Memory table */
    .s0-mem-table { display: flex; flex-direction: column; gap: 4px; }
    .s0-mem-row { display: flex; align-items: center; gap: 12px; padding: 8px 14px; background: var(--s0-surface); border: 1.5px solid var(--s0-border); border-radius: 8px; }
    .s0-mem-row--over { border-color: var(--s0-red-b); background: var(--s0-red-bg); }
    .s0-mem-label  { font-size: .78rem; color: var(--s0-ink2); flex: 1; }
    .s0-mem-size   { font-family: var(--s0-mono); font-size: .72rem; color: var(--s0-blue); min-width: 70px; }
    .s0-mem-status { font-size: .72rem; font-weight: 600; }

    /* Side panel */
    .s0-panel { width: 268px; flex-shrink: 0; background: var(--s0-surface); border: 1.5px solid var(--s0-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s0-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s0-border); background: #f6f4f0; }
    .s0-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s0-ink); }
    .s0-panel-sub    { font-size: .66rem; color: var(--s0-muted); margin-top: 2px; }
    .s0-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 18px; }
    .s0-panel-empty  { font-size: .74rem; color: var(--s0-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s0-panel-section { display: flex; flex-direction: column; gap: 8px; }
    .s0-panel-section-title { font-family: var(--s0-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s0-muted); margin-bottom: 2px; }
    .s0-panel-n-display { display: flex; align-items: baseline; gap: 8px; }
    .s0-panel-n-value { font-family: var(--s0-mono); font-size: 1.6rem; font-weight: 700; color: var(--s0-blue); line-height: 1; }
    .s0-panel-n-sci   { font-family: var(--s0-mono); font-size: .72rem; color: var(--s0-muted); }
    .s0-panel-bucket  { font-size: .7rem; color: var(--s0-ink2); }
    .s0-panel-group   { display: flex; flex-direction: column; gap: 5px; padding: 8px 10px; border-radius: 7px; }
    .s0-panel-group--safe { background: var(--s0-green-bg); border: 1px solid var(--s0-green-b); }
    .s0-panel-group--warn { background: var(--s0-warn-bg);  border: 1px solid var(--s0-warn-b);  }
    .s0-panel-group--tle  { background: var(--s0-red-bg);   border: 1px solid var(--s0-red-b);   }
    .s0-panel-group-label { font-size: .68rem; font-weight: 600; }
    .s0-panel-group--safe .s0-panel-group-label { color: var(--s0-green); }
    .s0-panel-group--warn .s0-panel-group-label { color: var(--s0-warn);  }
    .s0-panel-group--tle  .s0-panel-group-label { color: var(--s0-red);   }
    .s0-panel-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .s0-panel-tag  { font-family: var(--s0-mono); font-size: .62rem; padding: 2px 7px; border-radius: 9999px; border: 1px solid; font-weight: 600; }
    .s0-panel-tag--safe { background: var(--s0-green-bg); color: var(--s0-green); border-color: var(--s0-green-b); }
    .s0-panel-tag--warn { background: var(--s0-warn-bg);  color: var(--s0-warn);  border-color: var(--s0-warn-b); }
    .s0-panel-tag--tle  { background: var(--s0-red-bg);   color: var(--s0-red);   border-color: var(--s0-red-b);  text-decoration: line-through; }
    .s0-panel-insight { background: rgba(37,99,235,.05); border: 1px solid rgba(37,99,235,.18); border-radius: 8px; padding: 10px 12px; }
    .s0-panel-insight-text { font-size: .72rem; color: var(--s0-ink2); line-height: 1.6; }
    .s0-panel-watchout { background: var(--s0-warn-bg); border: 1px solid var(--s0-warn-b); border-radius: 8px; padding: 10px 12px; }
    .s0-panel-warn-text { font-size: .72rem; color: var(--s0-warn); line-height: 1.6; }
    .s0-panel-flag-item { padding: 7px 10px; background: var(--s0-surface2); border: 1px solid var(--s0-border); border-radius: 7px; display: flex; flex-direction: column; gap: 2px; }
    .s0-panel-flag-label  { font-size: .72rem; font-weight: 500; color: var(--s0-ink2); }
    .s0-panel-flag-impact { font-size: .68rem; color: var(--s0-blue); line-height: 1.4; }
    .s0-panel-body::-webkit-scrollbar { width: 3px; }
    .s0-panel-body::-webkit-scrollbar-thumb { background: var(--s0-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s0-shell { flex-direction: column; padding: 16px; }
      .s0-panel { width: 100%; position: static; max-height: none; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    if (state.answers?.stage0?.n) {
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
    _state = null;
    _n = null; _q = null;
    _timeLimit = 1; _memLimit = 256;
    _flags = {};
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage0;