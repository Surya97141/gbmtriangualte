// stages/stage6/stage6.js
// Edge Case Generator — cream/white theme, self-contained styles
// Same pattern as stage0/1/2/2-5/3/3-5/4/4-5/5

const Stage6 = (() => {

  let _state        = null;
  let _acknowledged = new Set();
  let _customCases  = [];
  let _activeTab    = 'critical';

  const INPUT_TYPE_TO_MODULES = {
    single_array    : ['universal', 'array'],
    two_arrays      : ['universal', 'array'],
    single_string   : ['universal', 'string'],
    two_strings     : ['universal', 'string'],
    multiple_strings: ['universal', 'string'],
    matrix_grid     : ['universal', 'array', 'graph'],
    graph_edge_list : ['universal', 'graph'],
    graph_adjacency : ['universal', 'graph'],
    implicit_graph  : ['universal', 'graph'],
    tree_explicit   : ['universal', 'tree'],
    intervals       : ['universal', 'interval'],
    single_number   : ['universal', 'numeric'],
    multiple_numbers: ['universal', 'numeric'],
  };

  const CASE_MODULES_MAP = {
    universal: typeof UniversalCases !== 'undefined' ? UniversalCases : null,
    array    : typeof ArrayCases     !== 'undefined' ? ArrayCases     : null,
    string   : typeof StringCases    !== 'undefined' ? StringCases    : null,
    tree     : typeof TreeCases      !== 'undefined' ? TreeCases      : null,
    graph    : typeof GraphCases     !== 'undefined' ? GraphCases     : null,
    interval : typeof IntervalCases  !== 'undefined' ? IntervalCases  : null,
    numeric  : typeof NumericCases   !== 'undefined' ? NumericCases   : null,
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state        = state;
    const saved   = state.answers?.stage6 ?? {};
    _acknowledged = new Set(saved.cases    ?? []);
    _customCases  = saved.customCases       ?? [];
    _activeTab    = 'critical';

    _injectStyles();

    const activeCases = _getActiveCases(state);
    const critical    = activeCases.filter(c => c.priority === 'critical').length;
    const high        = activeCases.filter(c => c.priority === 'high').length;
    const medium      = activeCases.filter(c => c.priority === 'medium').length;
    const total       = activeCases.length;
    const acked       = _acknowledged.size;
    const pct         = total > 0 ? Math.round(acked / total * 100) : 0;

    const wrapper = document.createElement('div');
    wrapper.className = 's6-shell';

    wrapper.innerHTML = `
      <div class="s6-main">

        <div class="s6-rule">
          Test edge cases before coding — not after getting WA.
          ${total} edge cases generated for your input type. ${critical} critical.
        </div>

        <!-- Progress -->
        <div class="s6-progress-wrap">
          <div class="s6-progress-top">
            <span class="s6-progress-label" id="s6-prog-label">${acked} / ${total} cases reviewed</span>
            <span class="s6-progress-pct"   id="s6-prog-pct">${pct}%</span>
          </div>
          <div class="s6-progress-track">
            <div class="s6-progress-fill" id="s6-prog-fill" style="width:${pct}%"></div>
          </div>
        </div>

        <!-- Tab bar -->
        <div class="s6-tab-bar" id="s6-tab-bar"></div>

        <!-- Cases panel -->
        <div class="s6-case-panel" id="s6-case-panel"></div>

        <!-- Custom cases -->
        <section class="s6-section">
          <div class="s6-section-header">
            <span class="s6-section-num">+</span>
            <div>
              <div class="s6-section-title">Custom edge cases</div>
              <div class="s6-section-sub">Add problem-specific cases that generic categories miss</div>
            </div>
          </div>
          <div class="s6-custom-list" id="s6-custom-list"></div>
          <div class="s6-add-form">
            <textarea id="s6-custom-input" class="s6-custom-textarea" placeholder="Describe a specific edge case for this problem..." rows="2"></textarea>
            <button class="s6-add-btn" id="s6-add-btn">+ Add edge case</button>
          </div>
        </section>

      </div>

      <!-- Live side panel -->
      <aside class="s6-panel">
        <div class="s6-panel-header">
          <div class="s6-panel-title">Edge case coverage</div>
          <div class="s6-panel-sub">Updates as you review</div>
        </div>
        <div class="s6-panel-body" id="s6-panel-body">
          <div class="s6-panel-empty">← Review edge cases to see coverage</div>
        </div>
      </aside>
    `;

    // Build tabs
    _buildTabs(wrapper, activeCases);

    // Build initial case panel (critical tab)
    _renderCases(wrapper, activeCases, saved, 'critical');

    // Build custom list
    _buildCustomList(wrapper, saved);

    // Wire add button
    wrapper.querySelector('#s6-add-btn')?.addEventListener('click', () => {
      const input = wrapper.querySelector('#s6-custom-input');
      const val   = input?.value.trim();
      if (val) { _onAddCustom(val, wrapper, activeCases); input.value = ''; }
    });

    setTimeout(() => _updatePanel(wrapper, activeCases, saved), 0);

    return wrapper;
  }

  // ─── TABS ──────────────────────────────────────────────────────────────────

  function _buildTabs(wrapper, activeCases) {
    const bar = wrapper.querySelector('#s6-tab-bar');
    if (!bar) return;

    const TABS = [
      { id: 'critical', label: 'Critical', cls: 's6-tab--red'    },
      { id: 'high',     label: 'High',     cls: 's6-tab--yellow' },
      { id: 'medium',   label: 'Medium',   cls: 's6-tab--blue'   },
      { id: 'all',      label: 'All',      cls: ''               },
    ];

    TABS.forEach(t => {
      const count = t.id === 'all'
        ? activeCases.length
        : activeCases.filter(c => c.priority === t.id).length;
      if (count === 0) return;

      const tab = document.createElement('div');
      tab.className = `s6-tab ${t.cls} ${t.id === _activeTab ? 's6-tab--active' : ''}`;
      tab.dataset.tabId = t.id;
      tab.innerHTML = `<span class="s6-tab-label">${t.label}</span><span class="s6-tab-count">${count}</span>`;
      tab.addEventListener('click', () => {
        _activeTab = t.id;
        wrapper.querySelectorAll('.s6-tab').forEach(el =>
          el.classList.toggle('s6-tab--active', el.dataset.tabId === t.id)
        );
        _renderCases(wrapper, activeCases, State.getAnswer('stage6') ?? {}, t.id);
      });
      bar.appendChild(tab);
    });
  }

  // ─── CASE CARDS ────────────────────────────────────────────────────────────

  function _renderCases(wrapper, activeCases, saved, tabId) {
    const panel = wrapper.querySelector('#s6-case-panel');
    if (!panel) return;
    panel.innerHTML = '';

    const filtered = tabId === 'all'
      ? activeCases
      : activeCases.filter(c => c.priority === tabId);

    if (!filtered.length) {
      panel.innerHTML = `<div class="s6-empty">No ${tabId} priority cases for your input type</div>`;
      return;
    }

    filtered.forEach(ec => {
      const isAcked = _acknowledged.has(ec.id);
      const card    = document.createElement('div');
      card.className = `s6-case-card s6-case-card--${ec.priority} ${isAcked ? 's6-case-card--done' : ''}`;
      card.id = `s6-card-${ec.id}`;

      const examplesHTML = (ec.examples ?? []).map(ex => `
        <div class="s6-case-example">
          <code class="s6-code">${ex.input}</code>
          <span class="s6-ex-problem"> — ${ex.problem}</span>
          <span class="s6-ex-expected"> → ${ex.expected}</span>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="s6-card-header">
          <div class="s6-card-left">
            <span class="s6-priority-dot s6-priority-dot--${ec.priority}"></span>
            <span class="s6-card-label">${ec.label}</span>
          </div>
          ${isAcked ? `<span class="s6-done-badge">✓ Reviewed</span>` : ''}
        </div>
        <div class="s6-card-why">${ec.whyItMatters}</div>
        <div class="s6-card-check"><span class="s6-check-label">Check:</span> ${ec.checkQuestion}</div>
        <div class="s6-card-failure"><span class="s6-failure-label">Common failure:</span> ${ec.commonFailure}</div>
        <div class="s6-card-test">
          <div class="s6-test-row"><span class="s6-test-label">Test:</span> <code class="s6-code">${ec.testInput}</code></div>
          <div class="s6-test-row"><span class="s6-test-label">Expected:</span> ${ec.expected}</div>
        </div>
        ${examplesHTML ? `<div class="s6-card-examples">${examplesHTML}</div>` : ''}
        ${ec.fix ? `
          <details class="s6-collapsible">
            <summary class="s6-collapsible-summary">Hint / Fix</summary>
            <div class="s6-fix-content">${ec.fix}</div>
          </details>
        ` : ''}
        <button class="s6-ack-btn ${isAcked ? 's6-ack-btn--done' : ''}" data-case="${ec.id}">
          ${isAcked ? '✓ Reviewed' : 'Mark as reviewed'}
        </button>
      `;

      card.querySelector('.s6-ack-btn').addEventListener('click', e => {
        _onAck(ec.id, e.target, wrapper, activeCases);
      });

      panel.appendChild(card);
    });
  }

  function _onAck(caseId, btn, wrapper, activeCases) {
    const wasOn = _acknowledged.has(caseId);
    if (wasOn) _acknowledged.delete(caseId);
    else       _acknowledged.add(caseId);

    const card = wrapper.querySelector(`#s6-card-${caseId}`);
    if (card) {
      card.classList.toggle('s6-case-card--done', !wasOn);
      const doneBadge = card.querySelector('.s6-done-badge');
      const header    = card.querySelector('.s6-card-header');
      if (!wasOn && !doneBadge && header) {
        const badge = document.createElement('span');
        badge.className = 's6-done-badge';
        badge.textContent = '✓ Reviewed';
        header.appendChild(badge);
      } else if (wasOn && doneBadge) {
        doneBadge.remove();
      }
    }
    btn.classList.toggle('s6-ack-btn--done', !wasOn);
    btn.textContent = wasOn ? 'Mark as reviewed' : '✓ Reviewed';

    _refreshProgress(wrapper, activeCases);

    State.setAnswer('stage6', {
      cases: [..._acknowledged],
      universalReviewed   : _hasReviewedCategory('universal'),
      typeSpecificReviewed: true,
    });

    _updatePanel(wrapper, activeCases, State.getAnswer('stage6') ?? {});
    _checkComplete(activeCases);
  }

  function _refreshProgress(wrapper, activeCases) {
    const total = activeCases.length;
    const acked = _acknowledged.size;
    const pct   = total > 0 ? Math.round(acked / total * 100) : 0;
    const label = wrapper.querySelector('#s6-prog-label');
    const pctEl = wrapper.querySelector('#s6-prog-pct');
    const fill  = wrapper.querySelector('#s6-prog-fill');
    if (label) label.textContent = `${acked} / ${total} cases reviewed`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (fill)  fill.style.width  = `${pct}%`;
  }

  // ─── CUSTOM CASES ──────────────────────────────────────────────────────────

  function _buildCustomList(wrapper, saved) {
    const list = wrapper.querySelector('#s6-custom-list');
    if (!list) return;
    ;(_customCases ?? []).forEach((cc, idx) => {
      list.appendChild(_makeCustomRow(cc, idx, wrapper, _getActiveCases(_state)));
    });
  }

  function _makeCustomRow(cc, idx, wrapper, activeCases) {
    const row = document.createElement('div');
    row.className = 's6-custom-row';
    row.id = `s6-custom-${idx}`;
    row.innerHTML = `
      <span class="s6-custom-text">${cc.description}</span>
      <button class="s6-remove-btn" data-idx="${idx}">×</button>
    `;
    row.querySelector('.s6-remove-btn').addEventListener('click', () => {
      _onRemoveCustom(idx, wrapper, activeCases);
    });
    return row;
  }

  function _onAddCustom(description, wrapper, activeCases) {
    _customCases.push({ description, addedAt: Date.now() });
    const list = wrapper.querySelector('#s6-custom-list');
    if (list) {
      list.appendChild(_makeCustomRow({ description }, _customCases.length - 1, wrapper, activeCases));
    }
    State.setAnswer('stage6', { customCases: [..._customCases] });
    _updatePanel(wrapper, activeCases, State.getAnswer('stage6') ?? {});
    _checkComplete(activeCases);
  }

  function _onRemoveCustom(idx, wrapper, activeCases) {
    _customCases.splice(idx, 1);
    const list = wrapper.querySelector('#s6-custom-list');
    if (list) {
      list.innerHTML = '';
      _customCases.forEach((cc, i) => list.appendChild(_makeCustomRow(cc, i, wrapper, activeCases)));
    }
    State.setAnswer('stage6', { customCases: [..._customCases] });
    _updatePanel(wrapper, activeCases, State.getAnswer('stage6') ?? {});
    _checkComplete(activeCases);
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper, activeCases, saved) {
    const body = wrapper.querySelector('#s6-panel-body');
    if (!body) return;
    body.innerHTML = '';

    const total   = activeCases.length;
    const acked   = _acknowledged.size;
    const critical= activeCases.filter(c => c.priority === 'critical');
    const critDone= critical.filter(c => _acknowledged.has(c.id)).length;

    if (acked === 0 && _customCases.length === 0) {
      body.innerHTML = '<div class="s6-panel-empty">← Review edge cases to see coverage</div>';
      return;
    }

    // Progress
    const progSec = document.createElement('div');
    progSec.className = 's6-panel-section';
    progSec.innerHTML = `
      <div class="s6-panel-section-title">Overall coverage</div>
      <div class="s6-panel-big-pct">${total > 0 ? Math.round(acked/total*100) : 0}%</div>
      <div class="s6-panel-progress-track">
        <div class="s6-panel-progress-fill" style="width:${total>0?Math.round(acked/total*100):0}%"></div>
      </div>
      <div class="s6-panel-progress-label">${acked} / ${total} cases reviewed</div>
    `;
    body.appendChild(progSec);

    // Critical status
    const critSec = document.createElement('div');
    critSec.className = `s6-panel-section ${critDone === critical.length ? 's6-panel-section--pass' : 's6-panel-section--warn'}`;
    critSec.innerHTML = `
      <div class="s6-panel-section-title">Critical cases</div>
      <div class="s6-panel-crit">${critDone} / ${critical.length} reviewed</div>
      ${critDone < critical.length ? `
        <div class="s6-panel-crit-warn">⚠ ${critical.length - critDone} critical case${critical.length - critDone !== 1 ? 's' : ''} remaining</div>
      ` : `<div class="s6-panel-crit-pass">✓ All critical cases reviewed</div>`}
    `;
    body.appendChild(critSec);

    // By priority breakdown
    const breakdown = document.createElement('div');
    breakdown.className = 's6-panel-section';
    breakdown.innerHTML = `<div class="s6-panel-section-title">By priority</div>`;
    ['critical','high','medium'].forEach(p => {
      const grp  = activeCases.filter(c => c.priority === p);
      const done = grp.filter(c => _acknowledged.has(c.id)).length;
      if (!grp.length) return;
      const el = document.createElement('div');
      el.className = 's6-panel-breakdown-row';
      el.innerHTML = `
        <span class="s6-panel-priority-dot s6-panel-priority-dot--${p}"></span>
        <span class="s6-panel-breakdown-label">${p.charAt(0).toUpperCase()+p.slice(1)}</span>
        <span class="s6-panel-breakdown-count">${done}/${grp.length}</span>
      `;
      breakdown.appendChild(el);
    });
    body.appendChild(breakdown);

    // Custom cases
    if (_customCases.length) {
      const custSec = document.createElement('div');
      custSec.className = 's6-panel-section';
      custSec.innerHTML = `
        <div class="s6-panel-section-title">Custom cases</div>
        <div class="s6-panel-custom-count">${_customCases.length} case${_customCases.length !== 1 ? 's' : ''} added</div>
      `;
      body.appendChild(custSec);
    }

    // Completion gate
    const allCritDone = critDone === critical.length;
    const halfDone    = acked >= Math.ceil(total / 2);
    const isReady     = allCritDone || halfDone;

    const gate = document.createElement('div');
    gate.className = `s6-panel-gate ${isReady ? 's6-panel-gate--ready' : ''}`;
    if (isReady) {
      gate.textContent = '✓ Ready to proceed to Stage 6.5';
    } else {
      const needs = [];
      if (!allCritDone) needs.push(`${critical.length - critDone} more critical`);
      if (!halfDone)    needs.push(`${Math.ceil(total/2) - acked} more total`);
      gate.textContent = `Review: ${needs.join(' or ')} to proceed`;
    }
    body.appendChild(gate);
  }

  // ─── ACTIVE CASES ──────────────────────────────────────────────────────────

  function _getActiveCases(state) {
    const inputTypes      = state?.answers?.stage1?.inputTypes ?? [];
    const activeModuleIds = new Set(['universal']);

    inputTypes.forEach(type => {
      (INPUT_TYPE_TO_MODULES[type] ?? []).forEach(m => activeModuleIds.add(m));
    });

    const outputForm = state?.answers?.stage2?.outputForm;
    if (outputForm === 'single_value' || outputForm === 'count') {
      activeModuleIds.add('numeric');
    }

    const cases = [];
    const seen  = new Set();

    activeModuleIds.forEach(moduleId => {
      const mod = CASE_MODULES_MAP[moduleId];
      if (!mod) return;
      (mod.getAll?.() ?? []).forEach(c => {
        if (!seen.has(c.id)) { seen.add(c.id); cases.push({ ...c, sourceModule: moduleId }); }
      });
    });

    // If no cases loaded, use fallback
    if (!cases.length) return _fallbackCases();

    const order = { critical: 0, high: 1, medium: 2 };
    return cases.sort((a,b) => (order[a.priority]??3) - (order[b.priority]??3));
  }

  function _hasReviewedCategory(moduleId) {
    const mod = CASE_MODULES_MAP[moduleId];
    if (!mod) return false;
    return (mod.getAll?.() ?? []).some(c => _acknowledged.has(c.id));
  }

  function _fallbackCases() {
    return [
      { id: 'ec_empty_input',    priority: 'critical', label: 'Empty input',              whyItMatters: 'Many algorithms crash or return wrong value on empty input', checkQuestion: 'What does your algorithm return when n=0 or the input is empty?', commonFailure: 'Accessing index 0 of empty array — IndexError', testInput: 'n=0, arr=[]', expected: 'Defined output (0, -1, or empty) — no crash', fix: 'Add explicit guard: if not arr: return default_value' },
      { id: 'ec_single_element', priority: 'critical', label: 'Single element',           whyItMatters: 'Boundary between trivial and non-trivial — many loop conditions fail', checkQuestion: 'Does your algorithm handle n=1 correctly without entering loops incorrectly?', commonFailure: 'Off-by-one in loops — returns wrong index', testInput: 'arr=[42]', expected: 'The element itself (for max/min/search), or 0 (for count problems)', fix: 'Test loop bounds: range(n-1) vs range(n)' },
      { id: 'ec_all_same',       priority: 'critical', label: 'All elements identical',   whyItMatters: 'Breaks greedy assumptions, degenerate DP, binary search boundary confusion', checkQuestion: 'What happens when all elements are the same value?', commonFailure: 'Binary search infinite loops when lo==hi==mid, or greedy picks wrong end', testInput: 'arr=[3,3,3,3,3]', expected: 'Correct answer without infinite loop', fix: 'Check binary search: ensure lo or hi moves even when isFeasible(mid) is true' },
      { id: 'ec_negative_vals',  priority: 'high',     label: 'Negative values',          whyItMatters: 'Breaks assumptions about min/max, product sign, modular arithmetic', checkQuestion: 'Are negative values in the constraints? Does your algorithm handle them?', commonFailure: 'Initializing min_val=0 instead of float(\'inf\')', testInput: 'arr=[-5,-1,-3,-2]', expected: 'Correct min/max/sum handling', fix: 'Initialize max_sum = arr[0], not 0. Handle negative products.' },
      { id: 'ec_overflow',       priority: 'high',     label: 'Integer overflow',         whyItMatters: 'n=10^5, values up to 10^9 → products/sums can exceed 64-bit int', checkQuestion: 'Can any intermediate computation exceed 2^63?', commonFailure: 'Prefix products overflow before modular reduction is applied', testInput: 'arr=[10^9, 10^9, 10^9]', expected: 'Result under 10^9+7 (if mod required)', fix: 'Apply mod at each step, not at the end' },
      { id: 'ec_sorted_input',   priority: 'medium',   label: 'Already sorted input',     whyItMatters: 'Quicksort degrades to O(n²), some greedy algorithms need unsorted to be non-trivial', checkQuestion: 'Does your algorithm degrade on sorted/reverse-sorted input?', commonFailure: 'Naive quicksort pivot selection — worst case O(n²)', testInput: 'arr=[1,2,3,4,5,...,n]', expected: 'Same correct output without TLE', fix: 'Use random pivot, or prefer merge sort for guarantee' },
      { id: 'ec_duplicates',     priority: 'medium',   label: 'Duplicate values',         whyItMatters: 'Binary search boundaries shift when duplicates present', checkQuestion: 'Are there duplicates? Does your algorithm handle ties correctly?', commonFailure: 'Binary search returns first occurrence when last is needed (or vice versa)', testInput: 'arr=[1,2,2,2,3]', expected: 'Correct boundary — first or last occurrence as required', fix: 'Use lower_bound vs upper_bound pattern explicitly' },
      { id: 'ec_max_constraints','priority': 'medium', label: 'Maximum constraints',      whyItMatters: 'O(n²) with n=10^5 is 10^10 operations — guaranteed TLE', checkQuestion: 'What is your operation count at n=10^5? Is it within 10^8?', commonFailure: 'Nested loops at max n', testInput: 'n=100000', expected: 'Runs in ≤2 seconds', fix: 'Profile: identify innermost loop and reduce from O(n) to O(log n)' },
    ];
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete(activeCases) {
    const criticalCases   = activeCases.filter(c => c.priority === 'critical');
    const allCriticalDone = criticalCases.every(c => _acknowledged.has(c.id));
    const halfAllDone     = _acknowledged.size >= Math.ceil(activeCases.length / 2);
    const valid           = allCriticalDone || halfAllDone;

    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(valid);

    if (valid) {
      const saved = State.getAnswer('stage6') ?? {};
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage6',
          answers: { ...saved, cases: [..._acknowledged], customCases: _customCases, universalReviewed: _hasReviewedCategory('universal'), typeSpecificReviewed: true },
        },
      }));
    }
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s6-styles')) return;
    const style = document.createElement('style');
    style.id = 's6-styles';
    style.textContent = `
    .s6-shell {
      --s6-bg      : #f7f4ef;
      --s6-surface : #ffffff;
      --s6-surface2: #faf8f5;
      --s6-border  : rgba(0,0,0,.09);
      --s6-border2 : rgba(0,0,0,.16);
      --s6-ink     : #1a1814;
      --s6-ink2    : #4a4540;
      --s6-muted   : #8a8070;
      --s6-blue    : #2563eb;
      --s6-blue-bg : rgba(37,99,235,.07);
      --s6-blue-b  : rgba(37,99,235,.24);
      --s6-green   : #059669;
      --s6-green-bg: rgba(5,150,105,.07);
      --s6-green-b : rgba(5,150,105,.28);
      --s6-warn    : #d97706;
      --s6-warn-bg : rgba(217,119,6,.07);
      --s6-warn-b  : rgba(217,119,6,.28);
      --s6-red     : #dc2626;
      --s6-red-bg  : rgba(220,38,38,.06);
      --s6-red-b   : rgba(220,38,38,.22);
      --s6-mono    : 'Space Mono', monospace;
      --s6-sans    : 'DM Sans', system-ui, sans-serif;
      display      : flex;
      gap          : 24px;
      align-items  : flex-start;
      background   : var(--s6-bg);
      min-height   : 100%;
      font-family  : var(--s6-sans);
      color        : var(--s6-ink);
      padding      : 28px;
    }
    .s6-main   { flex: 1; display: flex; flex-direction: column; gap: 24px; min-width: 0; }
    .s6-rule   { font-family: var(--s6-mono); font-size: .71rem; color: var(--s6-muted); padding: 10px 16px; background: var(--s6-surface); border: 1px solid var(--s6-border); border-left: 3px solid var(--s6-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }

    /* Progress */
    .s6-progress-wrap { display: flex; flex-direction: column; gap: 6px; }
    .s6-progress-top  { display: flex; align-items: center; justify-content: space-between; }
    .s6-progress-label{ font-size: .76rem; color: var(--s6-ink2); }
    .s6-progress-pct  { font-family: var(--s6-mono); font-size: .72rem; font-weight: 700; color: var(--s6-blue); }
    .s6-progress-track{ height: 8px; background: var(--s6-surface2); border-radius: 9999px; overflow: hidden; border: 1px solid var(--s6-border); }
    .s6-progress-fill { height: 100%; background: var(--s6-blue); border-radius: 9999px; transition: width .3s ease; }

    /* Tabs */
    .s6-tab-bar { display: flex; flex-wrap: wrap; gap: 6px; }
    .s6-tab     { display: flex; align-items: center; gap: 7px; padding: 7px 14px; background: var(--s6-surface); border: 1.5px solid var(--s6-border); border-radius: 8px; cursor: pointer; font-size: .78rem; font-weight: 500; color: var(--s6-muted); transition: all .12s; user-select: none; }
    .s6-tab:hover   { border-color: var(--s6-border2); color: var(--s6-ink2); }
    .s6-tab--active { border-color: var(--s6-blue); background: var(--s6-blue-bg); color: var(--s6-blue); }
    .s6-tab--red.s6-tab--active    { border-color: var(--s6-red-b);   background: var(--s6-red-bg);  color: var(--s6-red);  }
    .s6-tab--yellow.s6-tab--active { border-color: var(--s6-warn-b);  background: var(--s6-warn-bg); color: var(--s6-warn); }
    .s6-tab--blue.s6-tab--active   { border-color: var(--s6-blue-b);  background: var(--s6-blue-bg); color: var(--s6-blue); }
    .s6-tab-label { font-size: .76rem; }
    .s6-tab-count { font-family: var(--s6-mono); font-size: .64rem; font-weight: 700; background: var(--s6-surface2); padding: 1px 6px; border-radius: 9999px; border: 1px solid var(--s6-border); }

    /* Case panel */
    .s6-case-panel { display: flex; flex-direction: column; gap: 9px; }
    .s6-empty { font-size: .76rem; color: var(--s6-muted); font-style: italic; padding: 20px; background: var(--s6-surface2); border: 1px dashed var(--s6-border); border-radius: 8px; text-align: center; }

    /* Case cards */
    .s6-case-card { background: var(--s6-surface); border: 1.5px solid var(--s6-border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; transition: all .14s; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .s6-case-card--critical { border-left: 3px solid var(--s6-red); }
    .s6-case-card--high     { border-left: 3px solid var(--s6-warn); }
    .s6-case-card--medium   { border-left: 3px solid var(--s6-blue); }
    .s6-case-card--done     { background: var(--s6-green-bg); border-color: var(--s6-green-b); }
    .s6-case-card--done.s6-case-card--critical,
    .s6-case-card--done.s6-case-card--high,
    .s6-case-card--done.s6-case-card--medium { border-left-color: var(--s6-green); }

    .s6-card-header   { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .s6-card-left     { display: flex; align-items: center; gap: 9px; }
    .s6-priority-dot  { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .s6-priority-dot--critical { background: var(--s6-red); }
    .s6-priority-dot--high     { background: var(--s6-warn); }
    .s6-priority-dot--medium   { background: var(--s6-blue); }
    .s6-card-label    { font-size: .86rem; font-weight: 600; color: var(--s6-ink); line-height: 1.3; }
    .s6-done-badge    { font-family: var(--s6-mono); font-size: .6rem; font-weight: 700; color: var(--s6-green); background: var(--s6-green-bg); border: 1px solid var(--s6-green-b); padding: 2px 8px; border-radius: 9999px; white-space: nowrap; }

    .s6-card-why       { font-size: .76rem; color: var(--s6-ink2); line-height: 1.6; }
    .s6-card-check     { font-size: .78rem; color: var(--s6-ink2); line-height: 1.5; padding: 7px 10px; background: var(--s6-blue-bg); border: 1px solid var(--s6-blue-b); border-radius: 7px; }
    .s6-check-label    { font-weight: 600; color: var(--s6-blue); margin-right: 4px; }
    .s6-card-failure   { font-size: .74rem; color: var(--s6-warn); line-height: 1.5; }
    .s6-failure-label  { font-weight: 600; margin-right: 4px; }
    .s6-card-test      { display: flex; flex-direction: column; gap: 3px; padding: 8px 12px; background: var(--s6-surface2); border-radius: 7px; border: 1px solid var(--s6-border); }
    .s6-test-row       { display: flex; align-items: center; gap: 6px; font-size: .74rem; color: var(--s6-ink2); flex-wrap: wrap; }
    .s6-test-label     { font-family: var(--s6-mono); font-size: .62rem; text-transform: uppercase; letter-spacing: .8px; color: var(--s6-muted); flex-shrink: 0; }
    .s6-code           { font-family: var(--s6-mono); font-size: .7rem; background: var(--s6-surface); color: var(--s6-blue); padding: 1px 5px; border-radius: 4px; border: 1px solid var(--s6-border); }
    .s6-card-examples  { display: flex; flex-direction: column; gap: 4px; }
    .s6-case-example   { font-size: .72rem; color: var(--s6-ink2); line-height: 1.4; }
    .s6-ex-problem     { color: var(--s6-muted); }
    .s6-ex-expected    { color: var(--s6-green); font-weight: 500; }
    .s6-collapsible    { border: 1.5px solid var(--s6-border); border-radius: 7px; overflow: hidden; }
    .s6-collapsible-summary { padding: 6px 12px; background: var(--s6-surface2); cursor: pointer; font-family: var(--s6-mono); font-size: .6rem; letter-spacing: 1.2px; text-transform: uppercase; color: var(--s6-muted); list-style: none; }
    .s6-collapsible-summary:hover { color: var(--s6-ink2); }
    .s6-fix-content    { font-size: .76rem; color: var(--s6-ink2); padding: 10px 12px; line-height: 1.6; background: var(--s6-surface2); }
    .s6-ack-btn        { align-self: flex-start; padding: 7px 16px; border: 1.5px solid var(--s6-border); border-radius: 7px; background: var(--s6-surface2); font-size: .78rem; font-weight: 500; cursor: pointer; transition: all .12s; color: var(--s6-muted); }
    .s6-ack-btn:hover  { border-color: var(--s6-green-b); color: var(--s6-green); background: var(--s6-green-bg); }
    .s6-ack-btn--done  { border-color: var(--s6-green-b); background: var(--s6-green-bg); color: var(--s6-green); font-weight: 600; }

    /* Custom section */
    .s6-section { display: flex; flex-direction: column; gap: 12px; }
    .s6-section-header { display: flex; align-items: flex-start; gap: 14px; }
    .s6-section-num    { font-family: var(--s6-mono); font-size: .7rem; font-weight: 700; color: #fff; background: var(--s6-muted); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .s6-section-title  { font-size: .88rem; font-weight: 600; color: var(--s6-ink); }
    .s6-section-sub    { font-size: .73rem; color: var(--s6-muted); margin-top: 2px; }
    .s6-custom-list  { display: flex; flex-direction: column; gap: 5px; }
    .s6-custom-row   { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; background: var(--s6-surface); border: 1.5px solid var(--s6-border); border-radius: 8px; }
    .s6-custom-text  { font-size: .78rem; color: var(--s6-ink2); flex: 1; line-height: 1.4; }
    .s6-remove-btn   { padding: 2px 8px; border: 1px solid var(--s6-border); border-radius: 5px; background: transparent; font-size: .78rem; color: var(--s6-muted); cursor: pointer; transition: all .12s; }
    .s6-remove-btn:hover { border-color: var(--s6-red-b); color: var(--s6-red); background: var(--s6-red-bg); }
    .s6-add-form       { display: flex; flex-direction: column; gap: 8px; }
    .s6-custom-textarea{ background: var(--s6-surface); border: 1.5px solid var(--s6-border); border-radius: 8px; padding: 9px 12px; font-family: var(--s6-sans); font-size: .82rem; color: var(--s6-ink); outline: none; resize: vertical; transition: border-color .12s; width: 100%; }
    .s6-custom-textarea:focus { border-color: var(--s6-blue); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
    .s6-custom-textarea::placeholder { color: var(--s6-muted); }
    .s6-add-btn        { align-self: flex-start; padding: 8px 18px; border: 1.5px solid var(--s6-blue-b); border-radius: 8px; background: var(--s6-blue-bg); font-size: .8rem; font-weight: 500; cursor: pointer; transition: all .12s; color: var(--s6-blue); }
    .s6-add-btn:hover  { background: var(--s6-blue); color: #fff; }

    /* Side panel */
    .s6-panel { width: 268px; flex-shrink: 0; background: var(--s6-surface); border: 1.5px solid var(--s6-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s6-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s6-border); background: #f6f4f0; }
    .s6-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s6-ink); }
    .s6-panel-sub    { font-size: .66rem; color: var(--s6-muted); margin-top: 2px; }
    .s6-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s6-panel-empty  { font-size: .74rem; color: var(--s6-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s6-panel-section { display: flex; flex-direction: column; gap: 6px; }
    .s6-panel-section--pass { background: var(--s6-green-bg); border: 1px solid var(--s6-green-b); border-radius: 8px; padding: 10px 12px; }
    .s6-panel-section--warn { background: var(--s6-warn-bg);  border: 1px solid var(--s6-warn-b);  border-radius: 8px; padding: 10px 12px; }
    .s6-panel-section-title { font-family: var(--s6-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s6-muted); margin-bottom: 2px; }
    .s6-panel-section--pass .s6-panel-section-title { color: var(--s6-green); }
    .s6-panel-section--warn .s6-panel-section-title { color: var(--s6-warn); }
    .s6-panel-big-pct { font-family: var(--s6-mono); font-size: 2.4rem; font-weight: 700; color: var(--s6-blue); line-height: 1; }
    .s6-panel-progress-track { height: 5px; background: var(--s6-surface2); border-radius: 9999px; overflow: hidden; border: 1px solid var(--s6-border); }
    .s6-panel-progress-fill  { height: 100%; background: var(--s6-blue); border-radius: 9999px; transition: width .3s ease; }
    .s6-panel-progress-label { font-size: .68rem; color: var(--s6-muted); }
    .s6-panel-crit      { font-size: .8rem; font-weight: 600; color: var(--s6-ink); }
    .s6-panel-crit-warn { font-size: .72rem; color: var(--s6-warn); margin-top: 2px; }
    .s6-panel-crit-pass { font-size: .72rem; color: var(--s6-green); margin-top: 2px; }
    .s6-panel-breakdown-row { display: flex; align-items: center; gap: 7px; font-size: .74rem; color: var(--s6-ink2); padding: 3px 0; }
    .s6-panel-priority-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .s6-panel-priority-dot--critical { background: var(--s6-red); }
    .s6-panel-priority-dot--high     { background: var(--s6-warn); }
    .s6-panel-priority-dot--medium   { background: var(--s6-blue); }
    .s6-panel-breakdown-label { flex: 1; color: var(--s6-muted); }
    .s6-panel-breakdown-count { font-family: var(--s6-mono); font-size: .68rem; font-weight: 700; color: var(--s6-ink2); }
    .s6-panel-custom-count { font-size: .76rem; color: var(--s6-ink2); }
    .s6-panel-gate { padding: 10px 12px; border-radius: 8px; font-size: .74rem; font-weight: 500; text-align: center; background: var(--s6-surface2); border: 1.5px solid var(--s6-border); color: var(--s6-muted); }
    .s6-panel-gate--ready { background: var(--s6-green-bg); border-color: var(--s6-green-b); color: var(--s6-green); }
    .s6-panel-body::-webkit-scrollbar { width: 3px; }
    .s6-panel-body::-webkit-scrollbar-thumb { background: var(--s6-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s6-shell { flex-direction: column; padding: 16px; }
      .s6-panel { width: 100%; position: static; max-height: none; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved         = state.answers?.stage6;
    const activeCases   = _getActiveCases(state);
    const criticalCases = activeCases.filter(c => c.priority === 'critical');
    const savedCases    = saved?.cases ?? [];
    const allCritDone   = criticalCases.every(c => savedCases.includes(c.id));
    const halfDone      = savedCases.length >= Math.ceil(activeCases.length / 2);
    if (allCritDone || halfDone) {
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state        = null;
    _acknowledged = new Set();
    _customCases  = [];
    _activeTab    = 'critical';
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage6;