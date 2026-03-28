// stages/stage7/stage7.js
// Final Output — cream/white theme, self-contained styles
// Same pattern as stage0/1/2/2-5/3/3-5/4/4-5/5/6/6-5

const Stage7 = (() => {

  let _state             = null;
  let _directions        = [];
  let _selectedDirection = null;
  let _activeTab         = 'directions';

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state      = state;
    _directions = _resolveDirections(state);
    const saved = state.answers?.stage7 ?? {};

    _selectedDirection = saved.selectedDirection ?? _directions[0]?.id ?? null;
    _activeTab         = 'directions';

    State.setAnswer('stage7', {
      directions       : _directions,
      selectedDirection: _selectedDirection,
    });

    _injectStyles();

    const score = state.answers?.stage6_5?.score ?? null;
    const band  = score !== null ? _getBandLabel(score) : null;

    const wrapper = document.createElement('div');
    wrapper.className = 's7-shell';

    wrapper.innerHTML = `
      <div class="s7-main">

        <div class="s7-rule">
          Your approach — built from structural analysis, not pattern matching.
          ${band ? `Confidence: ${band} (${score}/100) · ` : ''}${_directions.length} direction(s) identified.
        </div>

        <!-- Summary strip -->
        <div class="s7-summary-strip" id="s7-summary-strip"></div>

        <!-- Tab bar -->
        <div class="s7-tab-bar" id="s7-tab-bar"></div>

        <!-- Panels -->
        <div class="s7-panels" id="s7-panels"></div>

      </div>

      <!-- Live side panel -->
      <aside class="s7-panel-aside">
        <div class="s7-panel-aside-header">
          <div class="s7-panel-aside-title">Your direction</div>
          <div class="s7-panel-aside-sub">Selected approach summary</div>
        </div>
        <div class="s7-panel-aside-body" id="s7-panel-aside-body">
          <div class="s7-panel-empty">← Select a direction to see summary</div>
        </div>
      </aside>
    `;

    _buildSummaryStrip(wrapper, state);
    _buildTabs(wrapper);
    _buildPanels(wrapper, saved);

    if (_directions.length > 0 && _selectedDirection) {
      setTimeout(() => _updatePanel(wrapper), 0);
      setTimeout(() => _checkComplete(), 0);
    }

    return wrapper;
  }

  // ─── SUMMARY STRIP ─────────────────────────────────────────────────────────

  function _buildSummaryStrip(wrapper, state) {
    const strip = wrapper.querySelector('#s7-summary-strip');
    if (!strip) return;

    const SB = typeof SummaryBuilder !== 'undefined' ? SummaryBuilder : null;
    const summary = SB?.build?.(state) ?? _fallbackSummary(state);

    const rows = [
      { label: 'N / Budget',  value: summary.complexity ?? '—' },
      { label: 'Input',       value: summary.input      ?? '—' },
      { label: 'Output',      value: summary.output     ?? '—' },
      { label: 'Structure',   value: summary.structure  ?? '—' },
      { label: 'Direction',   value: summary.direction  ?? '—' },
    ];

    rows.forEach(row => {
      const el = document.createElement('div');
      el.className = 's7-summary-row';
      el.innerHTML = `
        <span class="s7-summary-label">${row.label}</span>
        <span class="s7-summary-value">${row.value}</span>
      `;
      strip.appendChild(el);
    });
  }

  function _fallbackSummary(state) {
    const s0   = state.answers?.stage0 ?? {};
    const s1   = state.answers?.stage1 ?? {};
    const s2   = state.answers?.stage2 ?? {};
    const s3   = state.answers?.stage3 ?? {};
    const dirs = _directions;

    const n       = s0.n ? s0.n.toLocaleString() : '—';
    const safe    = (s0.feasibility ?? []).filter(r => r.status === 'green').map(r => r.label).join(', ');
    const inputs  = (s1.inputTypes ?? []).join(', ') || '—';
    const output  = s2.outputForm ?? '—';
    const props   = Object.entries(s3.properties ?? {}).filter(([,v]) => v && v !== 'unsure').map(([k]) => k.replace(/([A-Z])/g,' $1').trim()).slice(0,3).join(', ') || '—';
    const dir     = dirs[0]?.label ?? '—';

    return { complexity: `n=${n} · safe: ${safe||'—'}`, input: inputs, output, structure: props, direction: dir };
  }

  // ─── TABS ──────────────────────────────────────────────────────────────────

  function _buildTabs(wrapper) {
    const bar = wrapper.querySelector('#s7-tab-bar');
    if (!bar) return;

    const TABS = [
      { id: 'directions', label: 'Directions'          },
      { id: 'failure',    label: 'Failure conditions'  },
      { id: 'actions',    label: 'First actions'       },
    ];

    if (_directions.length > 1) {
      TABS.push({ id: 'tradeoffs', label: 'Tradeoffs' });
    }

    TABS.forEach(t => {
      const tab = document.createElement('div');
      tab.className = `s7-tab ${t.id === 'directions' ? 's7-tab--active' : ''}`;
      tab.dataset.tabId = t.id;
      tab.textContent = t.label;
      tab.addEventListener('click', () => {
        _activeTab = t.id;
        wrapper.querySelectorAll('.s7-tab').forEach(el =>
          el.classList.toggle('s7-tab--active', el.dataset.tabId === t.id)
        );
        wrapper.querySelectorAll('.s7-tab-panel').forEach(el =>
          el.classList.toggle('s7-hidden', el.dataset.panel !== t.id)
        );
      });
      bar.appendChild(tab);
    });
  }

  // ─── PANELS ────────────────────────────────────────────────────────────────

  function _buildPanels(wrapper, saved) {
    const container = wrapper.querySelector('#s7-panels');
    if (!container) return;

    // Directions panel
    const dirPanel = document.createElement('div');
    dirPanel.className = 's7-tab-panel';
    dirPanel.dataset.panel = 'directions';
    _buildDirectionsPanel(dirPanel, saved);
    container.appendChild(dirPanel);

    // Failure panel
    const failPanel = document.createElement('div');
    failPanel.className = 's7-tab-panel s7-hidden';
    failPanel.dataset.panel = 'failure';
    failPanel.id = 's7-failure-panel';
    _buildFailurePanel(failPanel);
    container.appendChild(failPanel);

    // Actions panel
    const actPanel = document.createElement('div');
    actPanel.className = 's7-tab-panel s7-hidden';
    actPanel.dataset.panel = 'actions';
    actPanel.id = 's7-actions-panel';
    _buildActionsPanel(actPanel);
    container.appendChild(actPanel);

    // Tradeoffs panel
    if (_directions.length > 1) {
      const trPanel = document.createElement('div');
      trPanel.className = 's7-tab-panel s7-hidden';
      trPanel.dataset.panel = 'tradeoffs';
      _buildTradeoffsPanel(trPanel);
      container.appendChild(trPanel);
    }
  }

  // ─── DIRECTIONS PANEL ──────────────────────────────────────────────────────

  function _buildDirectionsPanel(panel, saved) {
    if (!_directions.length) {
      panel.innerHTML = `<div class="s7-empty">No directions could be determined. Return to Stage 3 and answer more structural property questions.</div>`;
      return;
    }

    _directions.forEach((dir, idx) => {
      const isPrimary  = idx === 0;
      const isSelected = _selectedDirection === dir.id;
      const TR = typeof TradeoffResolver !== 'undefined' ? TradeoffResolver : null;
      const meta = TR?.getMetaForDirection?.(dir.id) ?? _fallbackMeta();

      const card = document.createElement('div');
      card.className = `s7-dir-card ${isPrimary ? 's7-dir-card--primary' : ''} ${isSelected ? 's7-dir-card--selected' : ''}`;
      card.id = `s7-dc-${dir.id}`;

      const woHTML = (dir.watchOut ?? []).map(w =>
        `<div class="s7-watchout">⚠ ${w}</div>`
      ).join('');

      const metaHTML = meta ? `
        <div class="s7-meta-badges">
          ${_metaBadgeHTML('Impl',    meta.implementationDifficulty)}
          ${_metaBadgeHTML('WA risk', meta.riskOfWA)}
          ${_metaBadgeHTML('TLE risk',meta.riskOfTLE)}
          ${_metaBadgeHTML('Code',    meta.codeLength)}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="s7-dir-header">
          <div class="s7-dir-header-left">
            <span class="${isPrimary ? 's7-primary-badge' : 's7-secondary-badge'}">${isPrimary ? 'Primary' : `Option ${idx+1}`}</span>
            <span class="s7-dir-label">${dir.label}</span>
          </div>
          <code class="s7-dir-complexity">${dir.complexity ?? ''}</code>
        </div>
        <div class="s7-dir-why"><span class="s7-why-label">Why:</span> ${dir.why ?? ''}</div>
        <div class="s7-dir-verify"><span class="s7-verify-label">Verify first:</span> ${dir.verifyBefore ?? ''}</div>
        ${dir.transformApplied ? `<div class="s7-transform-notice">🔄 After transformation: ${dir.transformApplied}</div>` : ''}
        ${woHTML ? `<div class="s7-dir-wos">${woHTML}</div>` : ''}
        ${dir.codeShape ? `
          <details class="s7-collapsible" ${isPrimary ? 'open' : ''}>
            <summary class="s7-collapsible-summary">Code shape</summary>
            <pre class="s7-code-shape">${dir.codeShape}</pre>
          </details>
        ` : ''}
        ${metaHTML}
        <button class="s7-select-btn ${isSelected?'s7-select-btn--on':''}" data-id="${dir.id}">
          ${isSelected ? '✓ This is my direction' : 'Select this direction'}
        </button>
      `;

      card.querySelector('.s7-select-btn').addEventListener('click', btn => {
        _onDirectionSelect(dir.id, panel.closest('.s7-main')?.parentElement ?? document);
      });

      panel.appendChild(card);
    });
  }

  function _metaBadgeHTML(label, value) {
    const color = { easy:'green', low:'green', short:'green', medium:'yellow', hard:'red', high:'red' }[value] ?? 'gray';
    return `<div class="s7-meta-badge s7-meta-badge--${color}"><span class="s7-meta-label">${label}</span><span class="s7-meta-value">${value ?? '?'}</span></div>`;
  }

  function _fallbackMeta() {
    return { implementationDifficulty: 'medium', riskOfWA: 'medium', riskOfTLE: 'low', codeLength: 'medium' };
  }

  function _onDirectionSelect(dirId, wrapper) {
    _selectedDirection = dirId;

    const realWrapper = wrapper ?? document;

    realWrapper.querySelectorAll('.s7-dir-card').forEach(c => {
      const isOn = c.id === `s7-dc-${dirId}`;
      c.classList.toggle('s7-dir-card--selected', isOn);
      const btn = c.querySelector('.s7-select-btn');
      if (btn) {
        btn.classList.toggle('s7-select-btn--on', isOn);
        btn.textContent = isOn ? '✓ This is my direction' : 'Select this direction';
      }
    });

    State.setAnswer('stage7', { selectedDirection: dirId });

    // Refresh failure + actions panels
    const failPanel = realWrapper.querySelector('#s7-failure-panel');
    if (failPanel) { failPanel.innerHTML = ''; _buildFailurePanel(failPanel); }
    const actPanel = realWrapper.querySelector('#s7-actions-panel');
    if (actPanel) { actPanel.innerHTML = ''; _buildActionsPanel(actPanel); }

    _updatePanel(realWrapper);
    _checkComplete();
  }

  // ─── FAILURE PANEL ─────────────────────────────────────────────────────────

  function _buildFailurePanel(panel) {
    panel.innerHTML = '<div class="s7-panel-intro">Specific ways this approach fails — silent wrong answers and TLE conditions.</div>';

    const dir = _getSelectedDir();
    const FC  = typeof FailureConditions !== 'undefined' ? FailureConditions : null;
    const failures = FC?.getForDirection?.(dir?.id) ?? _fallbackFailures(dir?.id);

    if (!failures.length) {
      panel.innerHTML += `<div class="s7-empty">No specific failure conditions catalogued for this direction. Test the edge cases from Stage 6.</div>`;
      return;
    }

    failures.forEach(f => {
      const card = document.createElement('div');
      card.className = 's7-failure-card';
      card.innerHTML = `
        <div class="s7-failure-condition"><span class="s7-fail-icon">✗</span>${f.condition}</div>
        <div class="s7-failure-row"><span class="s7-fail-key">Consequence:</span> ${f.consequence}</div>
        <div class="s7-failure-row"><span class="s7-fail-key">Detect:</span> ${f.detection}</div>
        ${f.fix ? `
          <details class="s7-collapsible">
            <summary class="s7-collapsible-summary">Fix</summary>
            <div class="s7-fix-body">${f.fix}</div>
          </details>
        ` : ''}
      `;
      panel.appendChild(card);
    });
  }

  function _fallbackFailures(dirId) {
    const common = [
      { condition: 'Off-by-one in loop bounds',                consequence: 'Wrong answer on last/first element', detection: 'Test n=1, n=2 explicitly', fix: 'Check: range(n) vs range(n-1) vs range(1, n)' },
      { condition: 'Integer overflow in intermediate computation', consequence: 'Silently wraps to negative — wrong sign', detection: 'Input: values at 10⁹ with multiplication', fix: 'Apply modular reduction at every step, not just at the end' },
      { condition: 'Empty/null input not handled',              consequence: 'IndexError or NullPointerException', detection: 'Test n=0 immediately', fix: 'Guard clause: if not arr or n == 0: return default_value' },
    ];

    if (dirId?.includes('dp')) {
      common.push({ condition: 'DP table not initialized for all base cases', consequence: 'Incorrect recurrence — uses uninitialized memory', detection: 'Trace through dp[0] and dp[1] manually', fix: 'Explicitly set all base cases before the main loop' });
    }
    if (dirId?.includes('greedy')) {
      common.push({ condition: 'Greedy choice does not hold for all inputs', consequence: 'Wrong answer — locally optimal is not globally optimal', detection: 'Construct adversarial input of size n=4', fix: 'Prove exchange argument or fall back to DP' });
    }
    if (dirId?.includes('binary_search')) {
      common.push({ condition: 'Monotonicity assumption violated', consequence: 'Binary search terminates at wrong boundary', detection: 'Test isFeasible on a small array manually', fix: 'Verify: if X is feasible, all X+1...n are also feasible (or vice versa)' });
    }

    return common;
  }

  // ─── ACTIONS PANEL ─────────────────────────────────────────────────────────

  function _buildActionsPanel(panel) {
    panel.innerHTML = '<div class="s7-panel-intro">The exact steps to take when you open your editor — in order.</div>';

    const dir = _getSelectedDir();
    const NA  = typeof NextAction !== 'undefined' ? NextAction : null;
    const actions = NA?.buildActionList?.([dir].filter(Boolean)) ?? _fallbackActions(dir);

    if (!actions.length) {
      panel.innerHTML += `<div class="s7-empty">Select a direction to see first actions.</div>`;
      return;
    }

    actions.forEach(action => {
      const card = document.createElement('div');
      card.className = 's7-action-card';
      card.innerHTML = `
        <div class="s7-action-header">
          <span class="s7-action-num">${action.order}</span>
          <span class="s7-action-text">${action.action}</span>
        </div>
        <div class="s7-action-detail">${action.detail}</div>
        ${action.code ? `
          <details class="s7-collapsible" ${action.order===1?'open':''}>
            <summary class="s7-collapsible-summary">Code</summary>
            <pre class="s7-code-shape">${action.code}</pre>
          </details>
        ` : ''}
      `;
      panel.appendChild(card);
    });
  }

  function _fallbackActions(dir) {
    if (!dir) return [];
    const label = dir.label ?? 'your algorithm';
    return [
      { order: 1, action: 'Write and verify your test cases', detail: `Test n=0, n=1, all-same, max-N before writing any algorithm code. One failing test now saves 30 min of debugging later.`, code: `# Verify these manually before starting:\ntest_cases = [\n    ([], 0),          # empty\n    ([42], 42),       # single element\n    ([3,3,3], 9),     # all same\n]` },
      { order: 2, action: `Define the state and transitions for ${label}`, detail: `Write down exactly: what dp[i] means (or what each variable means). No code until this is clear.`, code: `# State definition:\n# dp[i] = ...\n# Transition:\n# dp[i] = f(dp[i-1], ...)\n# Base case:\n# dp[0] = ...` },
      { order: 3, action: 'Code the solution and dry-run on your test cases', detail: `Write the algorithm. Then trace through test case n=3 by hand — verify each iteration. Only submit when dry-run matches expected.`, code: null },
    ];
  }

  // ─── TRADEOFFS PANEL ───────────────────────────────────────────────────────

  function _buildTradeoffsPanel(panel) {
    panel.innerHTML = '<div class="s7-panel-intro">Side-by-side comparison of candidate directions.</div>';

    const TR = typeof TradeoffResolver !== 'undefined' ? TradeoffResolver : null;
    const comparison = TR?.buildComparison?.(_directions) ?? _fallbackComparison();
    const recommended = TR?.recommend?.(_directions, { prioritizeLowWA: true }) ?? _directions[0];

    if (recommended) {
      const rec = document.createElement('div');
      rec.className = 's7-recommendation';
      rec.innerHTML = `
        <span class="s7-rec-label">Recommended:</span>
        <span class="s7-rec-value">${recommended.label}</span>
        <span class="s7-rec-reason"> — lowest WA risk among options</span>
      `;
      panel.appendChild(rec);
    }

    const table = document.createElement('div');
    table.className = 's7-tradeoff-table';

    table.innerHTML = `
      <div class="s7-tradeoff-header">
        <span>Direction</span>
        <span>Complexity</span>
        <span>Impl</span>
        <span>WA risk</span>
        <span>TLE risk</span>
      </div>
    `;

    comparison.forEach(row => {
      const isRec = recommended?.id === row.id;
      const rowEl = document.createElement('div');
      rowEl.className = `s7-tradeoff-row ${isRec ? 's7-tradeoff-row--rec' : ''}`;
      rowEl.innerHTML = `
        <span>${isRec ? '★ ' : ''}${row.label}</span>
        <code class="s7-tradeoff-code">${row.complexity}</code>
        <span class="s7-risk s7-risk--${row.difficulty}">${row.difficulty ?? '—'}</span>
        <span class="s7-risk s7-risk--${row.riskWA}">${row.riskWA ?? '—'}</span>
        <span class="s7-risk s7-risk--${row.riskTLE}">${row.riskTLE ?? '—'}</span>
      `;
      table.appendChild(rowEl);
    });

    panel.appendChild(table);
  }

  function _fallbackComparison() {
    return _directions.map(d => ({
      id        : d.id,
      label     : d.label,
      complexity: d.complexity ?? '—',
      difficulty: 'medium',
      riskWA    : 'medium',
      riskTLE   : 'low',
    }));
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper) {
    const body = (wrapper ?? document).querySelector('#s7-panel-aside-body');
    if (!body) return;
    body.innerHTML = '';

    const dir = _getSelectedDir();
    if (!dir) {
      body.innerHTML = '<div class="s7-panel-empty">← Select a direction to see summary</div>';
      return;
    }

    // Selected direction
    const dirSec = document.createElement('div');
    dirSec.className = 's7-aside-section';
    dirSec.innerHTML = `
      <div class="s7-aside-section-title">Selected direction</div>
      <div class="s7-aside-dir-name">${dir.label}</div>
      <code class="s7-aside-complexity">${dir.complexity ?? ''}</code>
    `;
    body.appendChild(dirSec);

    // Why
    if (dir.why) {
      const whySec = document.createElement('div');
      whySec.className = 's7-aside-section';
      whySec.innerHTML = `
        <div class="s7-aside-section-title">Why this approach</div>
        <div class="s7-aside-why">${dir.why}</div>
      `;
      body.appendChild(whySec);
    }

    // Verify before coding
    if (dir.verifyBefore) {
      const verSec = document.createElement('div');
      verSec.className = 's7-aside-section s7-aside-section--verify';
      verSec.innerHTML = `
        <div class="s7-aside-section-title">Verify first</div>
        <div class="s7-aside-verify">${dir.verifyBefore}</div>
      `;
      body.appendChild(verSec);
    }

    // Watch outs
    if (dir.watchOut?.length) {
      const woSec = document.createElement('div');
      woSec.className = 's7-aside-section s7-aside-section--warn';
      woSec.innerHTML = `<div class="s7-aside-section-title">Watch outs</div>`;
      dir.watchOut.forEach(w => {
        const el = document.createElement('div');
        el.className = 's7-aside-wo';
        el.innerHTML = `⚠ ${w}`;
        woSec.appendChild(el);
      });
      body.appendChild(woSec);
    }

    // Confidence score
    const score = _state?.answers?.stage6_5?.score;
    if (score !== null && score !== undefined) {
      const band  = _getBandLabel(score);
      const color = score >= 85 ? 'green' : score >= 65 ? 'yellow' : 'red';
      const confSec = document.createElement('div');
      confSec.className = 's7-aside-section';
      confSec.innerHTML = `
        <div class="s7-aside-section-title">Confidence</div>
        <div class="s7-aside-score s7-aside-score--${color}">${score}/100 · ${band}</div>
      `;
      body.appendChild(confSec);
    }

    // Completion gate
    const gate = document.createElement('div');
    gate.className = 's7-aside-gate s7-aside-gate--ready';
    gate.textContent = '✓ Analysis complete — start coding!';
    body.appendChild(gate);
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  function _resolveDirections(state) {
    const existing = state.output?.directions ?? [];
    if (existing.length) return existing;
    const DB = typeof DirectionBuilder !== 'undefined' ? DirectionBuilder : null;
    if (DB) return DB.buildDirections?.(state.answers ?? {}) ?? [];
    return _fallbackDirections(state);
  }

  function _fallbackDirections(state) {
    const s3     = state.answers?.stage3 ?? {};
    const s4_5   = state.answers?.stage4_5 ?? {};
    const props  = s3.properties ?? {};
    const dirs   = [];

    if (props.subproblemOverlap === 'yes_direct') {
      dirs.push({ id: 'dp_direction', label: 'Dynamic Programming', complexity: 'O(n²) or O(n)', why: 'Overlapping subproblems detected with optimal substructure', verifyBefore: 'Define state clearly — dp[i] = ? before writing any code', watchOut: ['State must be complete — captures ALL info needed for future states', 'Fill order matters — ensure dp[i] only uses previously computed values'], codeShape: '# State: dp[i] = ...\n# Base: dp[0] = ...\n# Transition: dp[i] = max/min(dp[i-1] + val, ...)\nfor i in range(1, n+1):\n    dp[i] = transition(dp[i-1], ...)' });
    }

    if (props.feasibilityBoundary && props.orderSensitivity !== 'position_matters') {
      dirs.push({ id: 'greedy_direction', label: 'Greedy Algorithm', complexity: 'O(n log n)', why: 'Local optimality confirmed — greedy choice leads to global optimum', verifyBefore: 'Test counter-example on n=4 adversarial input before coding', watchOut: ['Verify exchange argument — swapping greedy choice never improves result', 'Sort order matters — confirm sorting criterion before proceeding'], codeShape: '# Sort by key criterion\narr.sort(key=lambda x: ...)\nresult = []\nfor item in arr:\n    if can_include(item):\n        result.append(item)\n        update_state(item)' });
    }

    if (props.feasibilityBoundary === 'has_boundary') {
      dirs.push({ id: 'binary_search_direction', label: 'Binary Search on Answer', complexity: 'O(n log n)', why: 'Feasibility function is monotone — binary search on answer space', verifyBefore: 'Confirm isFeasible(X) is monotone before writing binary search', watchOut: ['Monotonicity must hold — if X works, X+1 must also work (or X-1)', 'Binary search bounds: lo=minimum_answer, hi=maximum_answer'], codeShape: '# lo, hi = bounds on answer\nlo, hi = min_possible, max_possible\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if is_feasible(mid):\n        hi = mid  # or lo = mid+1 for maximizing\n    else:\n        lo = mid + 1\nreturn lo' });
    }

    if (!dirs.length) {
      const variant = s4_5.variantSelected;
      dirs.push({ id: 'general_direction', label: variant ? `Algorithm: ${variant.replace(/_/g,' ')}` : 'Determine from structural analysis', complexity: s4_5.variantComplexity ?? 'TBD', why: 'Selected from structural property analysis', verifyBefore: 'Test all critical edge cases from Stage 6 before coding', watchOut: ['Verify approach on small example (n=3) by hand before coding'], codeShape: '# Write your solution here\n# Remember to handle: n=0, n=1, all-same, max-N' });
    }

    return dirs;
  }

  function _getSelectedDir() {
    return _directions.find(d => d.id === _selectedDirection) ?? _directions[0] ?? null;
  }

  function _getBandLabel(score) {
    if (score >= 85) return 'High Confidence';
    if (score >= 65) return 'Moderate Confidence';
    return 'Low Confidence';
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete() {
    const valid = _directions.length > 0 && !!_selectedDirection;
    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(valid);

    if (valid) {
      const dir = _getSelectedDir();
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage7',
          answers: {
            directions       : _directions,
            selectedDirection: _selectedDirection,
            primaryDirection : dir?.label      ?? null,
            primaryFamily    : dir?.family     ?? null,
            primaryComplexity: dir?.complexity ?? null,
          },
        },
      }));
    }
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s7-styles')) return;
    const style = document.createElement('style');
    style.id = 's7-styles';
    style.textContent = `
    .s7-shell {
      --s7-bg      : #f7f4ef;
      --s7-surface : #ffffff;
      --s7-surface2: #faf8f5;
      --s7-border  : rgba(0,0,0,.09);
      --s7-border2 : rgba(0,0,0,.16);
      --s7-ink     : #1a1814;
      --s7-ink2    : #4a4540;
      --s7-muted   : #8a8070;
      --s7-blue    : #2563eb;
      --s7-blue-bg : rgba(37,99,235,.07);
      --s7-blue-b  : rgba(37,99,235,.24);
      --s7-green   : #059669;
      --s7-green-bg: rgba(5,150,105,.07);
      --s7-green-b : rgba(5,150,105,.28);
      --s7-warn    : #d97706;
      --s7-warn-bg : rgba(217,119,6,.07);
      --s7-warn-b  : rgba(217,119,6,.28);
      --s7-red     : #dc2626;
      --s7-red-bg  : rgba(220,38,38,.06);
      --s7-red-b   : rgba(220,38,38,.22);
      --s7-mono    : 'Space Mono', monospace;
      --s7-sans    : 'DM Sans', system-ui, sans-serif;
      display      : flex;
      gap          : 24px;
      align-items  : flex-start;
      background   : var(--s7-bg);
      min-height   : 100%;
      font-family  : var(--s7-sans);
      color        : var(--s7-ink);
      padding      : 28px;
    }
    .s7-main  { flex: 1; display: flex; flex-direction: column; gap: 24px; min-width: 0; }
    .s7-rule  { font-family: var(--s7-mono); font-size: .71rem; color: var(--s7-muted); padding: 10px 16px; background: var(--s7-surface); border: 1px solid var(--s7-border); border-left: 3px solid var(--s7-green); border-radius: 0 8px 8px 0; line-height: 1.6; }
    .s7-hidden { display: none !important; }
    .s7-empty  { font-size: .76rem; color: var(--s7-muted); font-style: italic; padding: 20px; background: var(--s7-surface2); border: 1px dashed var(--s7-border); border-radius: 8px; }

    /* Summary strip */
    .s7-summary-strip { background: var(--s7-surface); border: 1.5px solid var(--s7-border); border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
    .s7-summary-row   { display: flex; align-items: baseline; gap: 12px; padding: 8px 16px; border-bottom: 1px solid rgba(0,0,0,.04); }
    .s7-summary-row:last-of-type { border-bottom: none; }
    .s7-summary-label { font-family: var(--s7-mono); font-size: .6rem; letter-spacing: 1px; text-transform: uppercase; color: var(--s7-muted); min-width: 80px; flex-shrink: 0; }
    .s7-summary-value { font-size: .8rem; color: var(--s7-ink); font-weight: 500; line-height: 1.4; }

    /* Tabs */
    .s7-tab-bar { display: flex; flex-wrap: wrap; gap: 6px; }
    .s7-tab     { padding: 8px 16px; background: var(--s7-surface); border: 1.5px solid var(--s7-border); border-radius: 8px; cursor: pointer; font-size: .78rem; font-weight: 500; color: var(--s7-muted); transition: all .12s; user-select: none; }
    .s7-tab:hover   { border-color: var(--s7-green-b); color: var(--s7-ink2); }
    .s7-tab--active { border-color: var(--s7-green); background: var(--s7-green-bg); color: var(--s7-green); }

    /* Panels */
    .s7-panels { display: flex; flex-direction: column; gap: 12px; }
    .s7-tab-panel { display: flex; flex-direction: column; gap: 12px; }
    .s7-panel-intro { font-size: .76rem; color: var(--s7-ink2); padding: 10px 14px; background: var(--s7-surface2); border: 1px solid var(--s7-border); border-radius: 8px; line-height: 1.6; }

    /* Direction cards */
    .s7-dir-card { background: var(--s7-surface); border: 1.5px solid var(--s7-border); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; transition: all .14s; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .s7-dir-card--primary  { border-color: var(--s7-green-b); }
    .s7-dir-card--selected { border-color: var(--s7-green); background: var(--s7-green-bg); box-shadow: 0 0 0 3px rgba(5,150,105,.08); }
    .s7-dir-header    { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .s7-dir-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .s7-primary-badge   { font-family: var(--s7-mono); font-size: .6rem; letter-spacing: 1.2px; text-transform: uppercase; background: var(--s7-green-bg); color: var(--s7-green); border: 1px solid var(--s7-green-b); padding: 2px 8px; border-radius: 9999px; flex-shrink: 0; }
    .s7-secondary-badge { font-family: var(--s7-mono); font-size: .6rem; letter-spacing: 1.2px; text-transform: uppercase; background: var(--s7-surface2); color: var(--s7-muted); border: 1px solid var(--s7-border); padding: 2px 8px; border-radius: 9999px; flex-shrink: 0; }
    .s7-dir-label     { font-size: .94rem; font-weight: 700; color: var(--s7-ink); }
    .s7-dir-complexity{ font-family: var(--s7-mono); font-size: .76rem; color: var(--s7-blue); background: var(--s7-blue-bg); padding: 3px 9px; border-radius: 5px; border: 1px solid var(--s7-blue-b); flex-shrink: 0; }
    .s7-dir-why    { font-size: .78rem; color: var(--s7-ink2); line-height: 1.6; }
    .s7-why-label  { font-weight: 600; color: var(--s7-blue); margin-right: 4px; }
    .s7-dir-verify { font-size: .76rem; color: var(--s7-ink2); line-height: 1.5; padding: 8px 12px; background: var(--s7-blue-bg); border: 1px solid var(--s7-blue-b); border-radius: 7px; }
    .s7-verify-label { font-weight: 600; color: var(--s7-blue); margin-right: 4px; }
    .s7-transform-notice { font-size: .74rem; color: var(--s7-muted); padding: 6px 10px; background: var(--s7-surface2); border: 1px solid var(--s7-border); border-radius: 6px; }
    .s7-dir-wos  { display: flex; flex-direction: column; gap: 5px; }
    .s7-watchout { font-size: .74rem; color: var(--s7-warn); padding: 6px 10px; background: var(--s7-warn-bg); border: 1px solid var(--s7-warn-b); border-radius: 6px; line-height: 1.4; }
    .s7-meta-badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .s7-meta-badge { display: flex; flex-direction: column; align-items: center; padding: 5px 10px; border-radius: 7px; border: 1px solid; gap: 2px; }
    .s7-meta-badge--green  { background: var(--s7-green-bg); border-color: var(--s7-green-b); }
    .s7-meta-badge--yellow { background: var(--s7-warn-bg);  border-color: var(--s7-warn-b); }
    .s7-meta-badge--red    { background: var(--s7-red-bg);   border-color: var(--s7-red-b); }
    .s7-meta-badge--gray   { background: var(--s7-surface2); border-color: var(--s7-border); }
    .s7-meta-label { font-family: var(--s7-mono); font-size: .54rem; letter-spacing: 1px; text-transform: uppercase; color: var(--s7-muted); }
    .s7-meta-value { font-size: .72rem; font-weight: 600; }
    .s7-meta-badge--green  .s7-meta-value { color: var(--s7-green); }
    .s7-meta-badge--yellow .s7-meta-value { color: var(--s7-warn); }
    .s7-meta-badge--red    .s7-meta-value { color: var(--s7-red); }
    .s7-meta-badge--gray   .s7-meta-value { color: var(--s7-muted); }
    .s7-select-btn { align-self: flex-start; padding: 9px 20px; border: 1.5px solid var(--s7-border); border-radius: 8px; background: var(--s7-surface2); font-size: .8rem; font-weight: 500; cursor: pointer; transition: all .14s; color: var(--s7-muted); }
    .s7-select-btn:hover   { border-color: var(--s7-green-b); color: var(--s7-green); background: var(--s7-green-bg); }
    .s7-select-btn--on     { border-color: var(--s7-green); background: var(--s7-green-bg); color: var(--s7-green); font-weight: 600; }

    /* Code shape */
    .s7-collapsible { border: 1.5px solid var(--s7-border); border-radius: 8px; overflow: hidden; }
    .s7-collapsible-summary { padding: 7px 14px; background: var(--s7-surface2); cursor: pointer; font-family: var(--s7-mono); font-size: .6rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s7-muted); list-style: none; }
    .s7-collapsible-summary:hover { color: var(--s7-ink2); }
    .s7-code-shape { font-family: var(--s7-mono); font-size: .72rem; background: var(--s7-surface2); color: var(--s7-ink); padding: 14px 16px; margin: 0; line-height: 1.8; white-space: pre; overflow-x: auto; }
    .s7-fix-body   { font-size: .76rem; color: var(--s7-ink2); padding: 10px 14px; line-height: 1.6; background: var(--s7-surface2); }

    /* Failure cards */
    .s7-failure-card { background: var(--s7-surface); border: 1.5px solid var(--s7-border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 9px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .s7-failure-condition { display: flex; align-items: flex-start; gap: 8px; font-size: .86rem; font-weight: 600; color: var(--s7-ink); line-height: 1.4; }
    .s7-fail-icon  { color: var(--s7-red); flex-shrink: 0; }
    .s7-failure-row{ font-size: .76rem; color: var(--s7-ink2); line-height: 1.5; }
    .s7-fail-key   { font-weight: 600; color: var(--s7-muted); margin-right: 4px; }

    /* Action cards */
    .s7-action-card { background: var(--s7-surface); border: 1.5px solid var(--s7-border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 9px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .s7-action-header { display: flex; align-items: center; gap: 12px; }
    .s7-action-num  { font-family: var(--s7-mono); font-size: .72rem; font-weight: 700; color: #fff; background: var(--s7-green); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .s7-action-text { font-size: .88rem; font-weight: 600; color: var(--s7-ink); }
    .s7-action-detail { font-size: .76rem; color: var(--s7-ink2); line-height: 1.6; }

    /* Tradeoffs */
    .s7-recommendation { padding: 12px 16px; background: var(--s7-green-bg); border: 1.5px solid var(--s7-green-b); border-radius: 9px; font-size: .82rem; display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
    .s7-rec-label  { font-weight: 600; color: var(--s7-muted); }
    .s7-rec-value  { font-weight: 700; color: var(--s7-green); }
    .s7-rec-reason { color: var(--s7-ink2); }
    .s7-tradeoff-table { background: var(--s7-surface); border: 1.5px solid var(--s7-border); border-radius: 10px; overflow: hidden; }
    .s7-tradeoff-header,
    .s7-tradeoff-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 0; border-bottom: 1px solid rgba(0,0,0,.05); }
    .s7-tradeoff-row:last-of-type { border-bottom: none; }
    .s7-tradeoff-header { background: var(--s7-surface2); }
    .s7-tradeoff-header > span { font-family: var(--s7-mono); font-size: .58rem; letter-spacing: 1.2px; text-transform: uppercase; color: var(--s7-muted); padding: 8px 12px; }
    .s7-tradeoff-row > span { padding: 9px 12px; font-size: .76rem; color: var(--s7-ink2); }
    .s7-tradeoff-row--rec { background: rgba(5,150,105,.03); }
    .s7-tradeoff-code { font-family: var(--s7-mono); font-size: .68rem; color: var(--s7-blue); }
    .s7-risk { font-size: .72rem; font-weight: 600; }
    .s7-risk--easy,.s7-risk--low,.s7-risk--short { color: var(--s7-green); }
    .s7-risk--medium { color: var(--s7-warn); }
    .s7-risk--hard,.s7-risk--high { color: var(--s7-red); }

    /* Aside panel */
    .s7-panel-aside { width: 268px; flex-shrink: 0; background: var(--s7-surface); border: 1.5px solid var(--s7-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s7-panel-aside-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s7-border); background: #f6f4f0; }
    .s7-panel-aside-title  { font-size: .82rem; font-weight: 700; color: var(--s7-ink); }
    .s7-panel-aside-sub    { font-size: .66rem; color: var(--s7-muted); margin-top: 2px; }
    .s7-panel-aside-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s7-panel-empty { font-size: .74rem; color: var(--s7-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s7-aside-section { display: flex; flex-direction: column; gap: 6px; }
    .s7-aside-section--verify { background: var(--s7-blue-bg); border: 1px solid var(--s7-blue-b); border-radius: 8px; padding: 10px 12px; }
    .s7-aside-section--warn   { background: var(--s7-warn-bg); border: 1px solid var(--s7-warn-b); border-radius: 8px; padding: 10px 12px; }
    .s7-aside-section-title { font-family: var(--s7-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s7-muted); margin-bottom: 2px; }
    .s7-aside-section--verify .s7-aside-section-title { color: var(--s7-blue); }
    .s7-aside-section--warn   .s7-aside-section-title { color: var(--s7-warn); }
    .s7-aside-dir-name  { font-size: .86rem; font-weight: 700; color: var(--s7-ink); }
    .s7-aside-complexity{ font-family: var(--s7-mono); font-size: .72rem; color: var(--s7-blue); background: var(--s7-blue-bg); padding: 2px 7px; border-radius: 4px; border: 1px solid var(--s7-blue-b); display: inline-block; }
    .s7-aside-why  { font-size: .74rem; color: var(--s7-ink2); line-height: 1.5; }
    .s7-aside-verify{ font-size: .74rem; color: var(--s7-ink2); line-height: 1.5; }
    .s7-aside-wo   { font-size: .72rem; color: var(--s7-warn); padding: 3px 0; line-height: 1.4; }
    .s7-aside-score { font-family: var(--s7-mono); font-size: .76rem; font-weight: 700; padding: 3px 8px; border-radius: 5px; display: inline-block; }
    .s7-aside-score--green  { color: var(--s7-green); background: var(--s7-green-bg); border: 1px solid var(--s7-green-b); }
    .s7-aside-score--yellow { color: var(--s7-warn);  background: var(--s7-warn-bg);  border: 1px solid var(--s7-warn-b); }
    .s7-aside-score--red    { color: var(--s7-red);   background: var(--s7-red-bg);   border: 1px solid var(--s7-red-b); }
    .s7-aside-gate { padding: 12px 14px; border-radius: 8px; font-size: .78rem; font-weight: 600; text-align: center; }
    .s7-aside-gate--ready { background: var(--s7-green-bg); border: 1.5px solid var(--s7-green-b); color: var(--s7-green); }
    .s7-panel-aside-body::-webkit-scrollbar { width: 3px; }
    .s7-panel-aside-body::-webkit-scrollbar-thumb { background: var(--s7-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s7-shell { flex-direction: column; padding: 16px; }
      .s7-panel-aside { width: 100%; position: static; max-height: none; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage7;
    if (saved?.selectedDirection || _directions.length > 0) {
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state             = null;
    _directions        = [];
    _selectedDirection = null;
    _activeTab         = 'directions';
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage7;