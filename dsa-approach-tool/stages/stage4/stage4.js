// stages/stage4/stage4.js
// Constraint Interaction — cream/white theme, self-contained styles
// Same pattern as stage0/1/2/2-5/3/3-5

const Stage4 = (() => {

  let _state                  = null;
  let _selectedInteractions   = new Set();
  let _hiddenStructureAnswers = {};
  let _interactionFlags       = {};

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state                  = state;
    const saved             = state.answers?.stage4 ?? {};
    _selectedInteractions   = new Set(saved.interactions          ?? []);
    _hiddenStructureAnswers = saved.hiddenStructureAnswers         ?? {};
    _interactionFlags       = saved.interactionFlags              ?? {};

    _injectStyles();

    const CI = typeof ConstraintInteractions !== 'undefined' ? ConstraintInteractions : null;

    const n        = state.answers?.stage0?.n ?? 0;
    const q        = state.answers?.stage0?.q ?? 0;
    const warnings = CI?.getActiveWarnings?.(n, q, n) ?? [];
    const suggested= CI?.getRelevant?.(state.answers?.stage0, state.answers?.stage1) ?? [];
    const allInter = CI?.getAll?.()             ?? _fallbackInteractions();
    const hiddenSt = CI?.getHiddenStructures?.() ?? _fallbackHiddenStructures();

    const wrapper = document.createElement('div');
    wrapper.className = 's4-shell';

    wrapper.innerHTML = `
      <div class="s4-main">

        <div class="s4-rule">
          Constraints interact — N×Q, N×K, N×W each suggest different structures.
          Check how your constraints combine and whether a hidden structure was missed.
        </div>

        <!-- Auto warnings -->
        ${warnings.length ? `
          <div class="s4-warnings" id="s4-warnings">
            <div class="s4-warnings-title">⚡ Auto-detected constraint warnings</div>
            ${warnings.map(w => `
              <div class="s4-warn-item">⚠ ${w.warning}</div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Section 01: Constraint interactions -->
        <section class="s4-section">
          <div class="s4-section-header">
            <span class="s4-section-num">01</span>
            <div>
              <div class="s4-section-title">Which constraint combinations apply?</div>
              <div class="s4-section-sub">Click to select all that apply — each may suggest a different structure</div>
            </div>
          </div>
          ${suggested.length ? `<div class="s4-suggested-label">Suggested based on your constraints:</div>` : ''}
          <div class="s4-interaction-list" id="s4-interaction-list"></div>
        </section>

        <!-- Section 02: Hidden structures -->
        <section class="s4-section">
          <div class="s4-section-header">
            <span class="s4-section-num">02</span>
            <div>
              <div class="s4-section-title">Hidden structure check</div>
              <div class="s4-section-sub">Did you miss a simpler O(n) or O(n log n) structure?</div>
            </div>
          </div>
          <div class="s4-note">
            Each of these replaces an O(n²) approach with O(n) or O(n log n). Check if any applies before proceeding.
          </div>
          <div class="s4-hidden-list" id="s4-hidden-list"></div>
        </section>

      </div>

      <!-- Live side panel -->
      <aside class="s4-panel">
        <div class="s4-panel-header">
          <div class="s4-panel-title">Constraint analysis</div>
          <div class="s4-panel-sub">Updates as you select</div>
        </div>
        <div class="s4-panel-body" id="s4-panel-body">
          <div class="s4-panel-empty">← Select constraint patterns to see analysis</div>
        </div>
      </aside>
    `;

    _buildInteractionList(wrapper, allInter, suggested, saved);
    _buildHiddenList(wrapper, hiddenSt, saved);

    setTimeout(() => _updatePanel(wrapper), 0);

    return wrapper;
  }

  // ─── INTERACTION LIST ──────────────────────────────────────────────────────

  function _buildInteractionList(wrapper, allInter, suggested, saved) {
    const list = wrapper.querySelector('#s4-interaction-list');
    if (!list) return;

    allInter.forEach(interaction => {
      const isSuggested = suggested.some(s => s.id === interaction.id);
      const isSelected  = _selectedInteractions.has(interaction.id);

      const block = document.createElement('div');
      block.className = `s4-block ${isSelected ? 's4-block--on' : ''} ${isSuggested ? 's4-block--suggested' : ''}`;
      block.id = `s4-block-${interaction.id}`;

      const recognizeHTML = (interaction.recognize ?? []).map(r =>
        `<div class="s4-recognize-item"><span class="s4-recognize-bullet">·</span>${r}</div>`
      ).join('');

      block.innerHTML = `
        <div class="s4-block-header" data-id="${interaction.id}">
          <div class="s4-block-meta">
            <div class="s4-block-label">${interaction.label}</div>
            <div class="s4-block-pattern">${interaction.pattern}</div>
          </div>
          <div class="s4-block-right">
            ${isSuggested ? `<span class="s4-suggested-badge">Suggested</span>` : ''}
            <span class="s4-block-toggle">${isSelected ? '▲' : '▼'}</span>
          </div>
        </div>
        <div class="s4-block-recognize">${recognizeHTML}</div>
        <div class="s4-block-detail ${isSelected ? '' : 's4-hidden'}" id="s4-detail-${interaction.id}"></div>
      `;

      // Wire header click
      block.querySelector('.s4-block-header').addEventListener('click', () => {
        _onInteractionToggle(interaction.id, wrapper);
      });

      // Render detail if selected
      if (isSelected) {
        const detail = block.querySelector(`#s4-detail-${interaction.id}`);
        if (detail) _renderInteractionDetail(detail, interaction, saved);
      }

      list.appendChild(block);
    });
  }

  function _onInteractionToggle(interactionId, wrapper) {
    const wasSelected = _selectedInteractions.has(interactionId);
    if (wasSelected) {
      _selectedInteractions.delete(interactionId);
    } else {
      _selectedInteractions.add(interactionId);
    }

    const block    = wrapper.querySelector(`#s4-block-${interactionId}`);
    const detail   = wrapper.querySelector(`#s4-detail-${interactionId}`);
    const toggle   = block?.querySelector('.s4-block-toggle');
    const isNowOn  = !wasSelected;

    if (block)  block.classList.toggle('s4-block--on', isNowOn);
    if (detail) {
      detail.classList.toggle('s4-hidden', !isNowOn);
      if (isNowOn) {
        const CI = typeof ConstraintInteractions !== 'undefined' ? ConstraintInteractions : null;
        const interaction = CI?.getById?.(interactionId) ?? _fallbackInteractions().find(i => i.id === interactionId);
        if (interaction) _renderInteractionDetail(detail, interaction, State.getAnswer('stage4') ?? {});
      }
    }
    if (toggle) toggle.textContent = isNowOn ? '▲' : '▼';

    State.setAnswer('stage4', {
      interactions      : [..._selectedInteractions],
      interactionChecked: true,
    });

    _updatePanel(wrapper);
    _checkComplete();
  }

  function _renderInteractionDetail(container, interaction, saved) {
    container.innerHTML = '';

    // Analysis rows
    const table = document.createElement('div');
    table.className = 's4-analysis-table';

    (interaction.analysis ?? []).forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 's4-analysis-row';
      rowEl.innerHTML = `
        <div class="s4-analysis-condition">${row.condition}</div>
        <div class="s4-analysis-arrow">→</div>
        <div class="s4-analysis-verdict">${row.verdict}</div>
        ${row.structure ? `<span class="s4-structure-badge">${row.structure}</span>` : ''}
      `;
      table.appendChild(rowEl);
    });

    container.appendChild(table);

    // Complexity
    if (interaction.complexity?.best) {
      const comp = document.createElement('div');
      comp.className = 's4-complexity-row';
      comp.innerHTML = `<span class="s4-comp-label">Best complexity:</span> <code class="s4-comp-code">${interaction.complexity.best}</code>`;
      container.appendChild(comp);
    }

    // Watch outs
    if (interaction.watchOut?.length) {
      const wo = document.createElement('div');
      wo.className = 's4-watchouts';
      interaction.watchOut.forEach(w => {
        const el = document.createElement('div');
        el.className = 's4-watchout-item';
        el.innerHTML = `⚠ ${w}`;
        wo.appendChild(el);
      });
      container.appendChild(wo);
    }

    // Condition flags (for N+Q interaction)
    if (interaction.id === 'ci_n_and_q') {
      container.appendChild(_buildConditionFlags(interaction, saved));
    }
  }

  function _buildConditionFlags(interaction, saved) {
    const savedFlags = saved.interactionFlags?.[interaction.id] ?? {};
    const wrap = document.createElement('div');
    wrap.className = 's4-flags-wrap';
    wrap.innerHTML = `<div class="s4-flags-title">Your specific condition — check all that apply:</div>`;

    const flags = [
      { id: 'hasUpdates', label: 'Has updates (not just queries)' },
      { id: 'offline',    label: 'Queries can be sorted offline'  },
      { id: 'online',     label: 'Must answer queries online'      },
      { id: 'singleQuery',label: 'Only one query (Q = 1)'         },
    ];

    flags.forEach(flag => {
      const isChecked = savedFlags[flag.id] ?? false;
      const row = document.createElement('label');
      row.className = `s4-flag-row ${isChecked ? 's4-flag-row--on' : ''}`;
      row.innerHTML = `
        <input type="checkbox" class="s4-flag-cb" ${isChecked ? 'checked' : ''} data-interaction="${interaction.id}" data-flag="${flag.id}">
        <span class="s4-flag-label">${flag.label}</span>
      `;
      const cb = row.querySelector('input');
      cb.addEventListener('change', () => {
        row.classList.toggle('s4-flag-row--on', cb.checked);
        _onFlagChange(interaction.id, flag.id, cb.checked);
      });
      wrap.appendChild(row);
    });

    return wrap;
  }

  function _onFlagChange(interactionId, flagId, value) {
    if (!_interactionFlags[interactionId]) _interactionFlags[interactionId] = {};
    _interactionFlags[interactionId][flagId] = value;
    State.setAnswer('stage4', { interactionFlags: { ..._interactionFlags } });
    _checkComplete();
  }

  // ─── HIDDEN STRUCTURE LIST ─────────────────────────────────────────────────

  function _buildHiddenList(wrapper, hiddenStructures, saved) {
    const list = wrapper.querySelector('#s4-hidden-list');
    if (!list) return;

    hiddenStructures.forEach(hs => {
      const answer      = saved.hiddenStructureAnswers?.[hs.id] ?? null;
      const isApplicable = answer === 'yes';

      const row = document.createElement('div');
      row.className = `s4-hs-row ${isApplicable ? 's4-hs-row--applicable' : ''} ${answer ? 's4-hs-row--answered' : ''}`;
      row.id = `s4-hs-${hs.id}`;

      const examplesHTML = (hs.examples ?? []).map(ex =>
        `<div class="s4-hs-example">· ${ex}</div>`
      ).join('');

      row.innerHTML = `
        <div class="s4-hs-header">
          <div class="s4-hs-info">
            <div class="s4-hs-label">${hs.label}</div>
            <div class="s4-hs-signal">${hs.signal}</div>
          </div>
          <span class="s4-complexity-badge">${hs.complexity}</span>
        </div>
        <div class="s4-hs-btns">
          <button class="s4-ans-btn s4-ans-btn--yes ${answer==='yes'?'s4-ans-btn--on-yes':''}" data-id="${hs.id}" data-val="yes">✓ Applies</button>
          <button class="s4-ans-btn s4-ans-btn--no  ${answer==='no' ?'s4-ans-btn--on-no' :''}" data-id="${hs.id}" data-val="no">✗ Does not apply</button>
        </div>
        <div class="s4-hs-examples ${isApplicable ? '' : 's4-hidden'}" id="s4-hs-ex-${hs.id}">
          ${examplesHTML}
        </div>
      `;

      row.querySelectorAll('.s4-ans-btn').forEach(btn => {
        btn.addEventListener('click', () => _onHiddenStructure(hs.id, btn.dataset.val, wrapper));
      });

      list.appendChild(row);
    });
  }

  function _onHiddenStructure(hsId, value, wrapper) {
    _hiddenStructureAnswers[hsId] = value;

    const row = wrapper.querySelector(`#s4-hs-${hsId}`);
    if (row) {
      row.classList.toggle('s4-hs-row--applicable', value === 'yes');
      row.classList.add('s4-hs-row--answered');
      row.querySelectorAll('.s4-ans-btn').forEach(btn => {
        btn.classList.toggle('s4-ans-btn--on-yes', btn.dataset.val === 'yes' && value === 'yes');
        btn.classList.toggle('s4-ans-btn--on-no',  btn.dataset.val === 'no'  && value === 'no');
      });
      const ex = row.querySelector(`#s4-hs-ex-${hsId}`);
      if (ex) ex.classList.toggle('s4-hidden', value !== 'yes');
    }

    State.setAnswer('stage4', {
      hiddenStructureAnswers: { ..._hiddenStructureAnswers },
      hiddenStructureChecked: true,
    });

    _updatePanel(wrapper);
    _checkComplete();
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper) {
    const body = (wrapper ?? document).querySelector('#s4-panel-body');
    if (!body) return;
    body.innerHTML = '';

    const hasAny = _selectedInteractions.size > 0 || Object.keys(_hiddenStructureAnswers).length > 0;
    if (!hasAny) {
      body.innerHTML = '<div class="s4-panel-empty">← Select constraint patterns to see analysis</div>';
      return;
    }

    const CI       = typeof ConstraintInteractions !== 'undefined' ? ConstraintInteractions : null;
    const hiddenSt = CI?.getHiddenStructures?.() ?? _fallbackHiddenStructures();
    const allInter = CI?.getAll?.()              ?? _fallbackInteractions();
    const totalHS  = hiddenSt.length;
    const hsAns    = Object.keys(_hiddenStructureAnswers).length;

    // Selected interactions
    if (_selectedInteractions.size > 0) {
      const sec = document.createElement('div');
      sec.className = 's4-panel-section';
      sec.innerHTML = `<div class="s4-panel-section-title">Selected patterns</div>`;
      _selectedInteractions.forEach(id => {
        const inter = allInter.find(i => i.id === id);
        if (!inter) return;
        const el = document.createElement('div');
        el.className = 's4-panel-inter-badge';
        el.innerHTML = `
          <div class="s4-panel-inter-label">${inter.label}</div>
          <div class="s4-panel-inter-pattern">${inter.pattern}</div>
        `;
        sec.appendChild(el);
      });
      body.appendChild(sec);
    }

    // Hidden structure progress
    const progSec = document.createElement('div');
    progSec.className = 's4-panel-section';
    progSec.innerHTML = `
      <div class="s4-panel-section-title">Hidden structure check</div>
      <div class="s4-panel-progress-track">
        <div class="s4-panel-progress-fill" style="width:${Math.round(hsAns/totalHS*100)}%"></div>
      </div>
      <div class="s4-panel-progress-label">${hsAns} / ${totalHS} checked</div>
    `;
    body.appendChild(progSec);

    // Applicable hidden structures
    const applicable = Object.entries(_hiddenStructureAnswers)
      .filter(([,v]) => v === 'yes')
      .map(([id]) => hiddenSt.find(h => h.id === id))
      .filter(Boolean);

    if (applicable.length) {
      const sec = document.createElement('div');
      sec.className = 's4-panel-section s4-panel-section--found';
      sec.innerHTML = `<div class="s4-panel-section-title">Found structures</div>`;
      applicable.forEach(hs => {
        const el = document.createElement('div');
        el.className = 's4-panel-found-badge';
        el.innerHTML = `<span>${hs.label}</span><code class="s4-panel-complexity">${hs.complexity}</code>`;
        sec.appendChild(el);
      });
      body.appendChild(sec);
    }

    // Warnings
    const n        = _state?.answers?.stage0?.n ?? 0;
    const q        = _state?.answers?.stage0?.q ?? 0;
    const warnings = CI?.getActiveWarnings?.(n, q, n) ?? [];
    if (warnings.length) {
      const sec = document.createElement('div');
      sec.className = 's4-panel-section s4-panel-section--warn';
      sec.innerHTML = `<div class="s4-panel-section-title">⚠ Active warnings</div>`;
      warnings.forEach(w => {
        const el = document.createElement('div');
        el.className = 's4-panel-warn-item';
        el.textContent = w.warning;
        sec.appendChild(el);
      });
      body.appendChild(sec);
    }

    // Completion gate
    const saved         = State.getAnswer('stage4') ?? {};
    const interDone     = (saved.interactions ?? []).length > 0;
    const hiddenDone    = hsAns >= Math.ceil(totalHS / 2);
    const isReady       = interDone || hiddenDone;

    const gate = document.createElement('div');
    gate.className = `s4-panel-gate ${isReady ? 's4-panel-gate--ready' : ''}`;
    if (isReady) {
      gate.textContent = '✓ Ready to proceed to Stage 4.5';
    } else {
      const needs = [];
      if (!interDone)  needs.push('select at least 1 constraint pattern');
      if (!hiddenDone) needs.push(`check ${Math.ceil(totalHS/2) - hsAns} more hidden structures`);
      gate.textContent = `Need: ${needs.join(' or ')}`;
    }
    body.appendChild(gate);
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete() {
    const saved     = State.getAnswer('stage4') ?? {};
    const CI        = typeof ConstraintInteractions !== 'undefined' ? ConstraintInteractions : null;
    const totalHS   = CI?.getHiddenStructures?.()?.length ?? _fallbackHiddenStructures().length;
    const hsAnswered = Object.keys(saved.hiddenStructureAnswers ?? {}).length;
    const interDone  = (saved.interactions ?? []).length > 0;
    const hiddenDone = hsAnswered >= Math.ceil(totalHS / 2);
    const valid      = interDone || hiddenDone;

    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage4',
          answers: { ...saved, interactionChecked: true, hiddenStructureChecked: hiddenDone },
        },
      }));
    }
  }

  // ─── FALLBACKS ─────────────────────────────────────────────────────────────

  function _fallbackInteractions() {
    return [
      {
        id      : 'ci_n_and_q',
        label   : 'N elements + Q queries',
        pattern : 'N×Q',
        recognize: ['Q queries on array of N elements', 'Multiple queries on same data', 'Q range queries'],
        analysis: [
          { condition: 'Q = 1',                 verdict: 'Precompute nothing — solve directly',          structure: 'None' },
          { condition: 'Static array, many Q',  verdict: 'Precompute prefix sum or sparse table',        structure: 'Prefix Sum / Sparse Table' },
          { condition: 'With updates + queries', verdict: 'Need dynamic structure',                       structure: 'BIT / Segment Tree' },
          { condition: 'Q offline, no updates', verdict: 'Sort queries by right endpoint',                structure: "Mo's Algorithm" },
        ],
        complexity: { best: 'O(n + q)' },
        watchOut  : ['Never use O(n) per query if Q = n — that is O(n²) total'],
      },
      {
        id      : 'ci_n_and_k',
        label   : 'N elements + K constraint',
        pattern : 'N×K',
        recognize: ['k-sized window or group', 'At most k operations', 'k distinct elements'],
        analysis: [
          { condition: 'K fixed window size',       verdict: 'Sliding Window — O(n)',   structure: 'Sliding Window' },
          { condition: 'At most K distinct',        verdict: 'Sliding Window variant',  structure: 'Sliding Window + Map' },
          { condition: 'K items to select',        verdict: 'Knapsack DP — O(n×k)',     structure: 'DP[i][k]' },
        ],
        complexity: { best: 'O(n)' },
        watchOut  : ['K up to N makes it O(n²) — check if binary search on K helps'],
      },
      {
        id      : 'ci_n_and_w',
        label   : 'N items + W weight/value',
        pattern : 'N×W',
        recognize: ['Knapsack-style', 'Capacity constraint', 'Sum up to W'],
        analysis: [
          { condition: 'W ≤ 10⁴',           verdict: 'DP on weight — O(n×w)',           structure: 'DP[i][w]' },
          { condition: 'W up to 10⁹',       verdict: 'DP on count — O(n²) or binary search', structure: 'DP reframe' },
          { condition: 'Items unbounded',   verdict: 'Unbounded knapsack',               structure: 'DP[w] 1D' },
        ],
        complexity: { best: 'O(n×w)' },
        watchOut  : ['W up to 10⁹ → cannot use W as DP dimension — must reframe'],
      },
      {
        id      : 'ci_graph_edges',
        label   : 'Graph with edge constraints',
        pattern : 'V+E',
        recognize: ['Sparse graph E ≈ V', 'Dense graph E ≈ V²', 'Edge weights present'],
        analysis: [
          { condition: 'Sparse, no weights',  verdict: 'BFS/DFS — O(V+E)',             structure: 'Adjacency List' },
          { condition: 'Sparse, weighted',    verdict: 'Dijkstra — O((V+E) log V)',     structure: 'Priority Queue' },
          { condition: 'Dense graph',         verdict: 'Floyd-Warshall — O(V³)',        structure: 'Adjacency Matrix' },
          { condition: 'Negative weights',    verdict: 'Bellman-Ford — O(V×E)',         structure: 'Edge List' },
        ],
        complexity: { best: 'O(V+E)' },
        watchOut  : ['Never use adjacency matrix for n > 4000 — 40GB memory'],
      },
    ];
  }

  function _fallbackHiddenStructures() {
    return [
      { id: 'hs_prefix_sum',     label: 'Prefix Sum',           signal: 'Repeated range sum queries on static array',         complexity: 'O(1) query',    examples: ['Sum of subarray [l,r]', 'Count elements satisfying property in range'] },
      { id: 'hs_two_pointer',    label: 'Two Pointer',          signal: 'Pair sum, window condition, sorted array operations',  complexity: 'O(n)',          examples: ['Two sum in sorted array', 'Longest subarray with condition'] },
      { id: 'hs_monotonic_stack',label: 'Monotonic Stack',      signal: 'Next greater/smaller element for each position',      complexity: 'O(n)',          examples: ['Next greater element', 'Largest rectangle in histogram'] },
      { id: 'hs_sliding_window', label: 'Sliding Window',       signal: 'Contiguous subarray/substring with window condition', complexity: 'O(n)',          examples: ['Max sum subarray of size k', 'Longest substring with at most k distinct'] },
      { id: 'hs_binary_search',  label: 'Binary Search on Array', signal: 'Sorted or can-be-sorted array, find target/boundary',complexity: 'O(log n)',     examples: ['Search in sorted array', 'First position satisfying condition'] },
      { id: 'hs_bit_seg_tree',   label: 'BIT / Segment Tree',   signal: 'Point updates + range queries needed simultaneously',  complexity: 'O(log n) each', examples: ['Count inversions', 'Range sum with updates', 'Coordinate compression'] },
    ];
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s4-styles')) return;
    const style = document.createElement('style');
    style.id = 's4-styles';
    style.textContent = `
    .s4-shell {
      --s4-bg      : #f7f4ef;
      --s4-surface : #ffffff;
      --s4-surface2: #faf8f5;
      --s4-border  : rgba(0,0,0,.09);
      --s4-border2 : rgba(0,0,0,.16);
      --s4-ink     : #1a1814;
      --s4-ink2    : #4a4540;
      --s4-muted   : #8a8070;
      --s4-blue    : #2563eb;
      --s4-blue-bg : rgba(37,99,235,.07);
      --s4-blue-b  : rgba(37,99,235,.24);
      --s4-green   : #059669;
      --s4-green-bg: rgba(5,150,105,.07);
      --s4-green-b : rgba(5,150,105,.28);
      --s4-warn    : #d97706;
      --s4-warn-bg : rgba(217,119,6,.07);
      --s4-warn-b  : rgba(217,119,6,.28);
      --s4-red     : #dc2626;
      --s4-red-bg  : rgba(220,38,38,.06);
      --s4-red-b   : rgba(220,38,38,.22);
      --s4-violet  : #7c3aed;
      --s4-violet-bg: rgba(124,58,237,.07);
      --s4-violet-b : rgba(124,58,237,.24);
      --s4-mono    : 'Space Mono', monospace;
      --s4-sans    : 'DM Sans', system-ui, sans-serif;
      display      : flex;
      gap          : 24px;
      align-items  : flex-start;
      background   : var(--s4-bg);
      min-height   : 100%;
      font-family  : var(--s4-sans);
      color        : var(--s4-ink);
      padding      : 28px;
    }
    .s4-main  { flex: 1; display: flex; flex-direction: column; gap: 32px; min-width: 0; }
    .s4-rule  { font-family: var(--s4-mono); font-size: .71rem; color: var(--s4-muted); padding: 10px 16px; background: var(--s4-surface); border: 1px solid var(--s4-border); border-left: 3px solid var(--s4-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }
    .s4-note  { font-size: .76rem; color: var(--s4-ink2); padding: 10px 14px; background: var(--s4-surface2); border: 1px solid var(--s4-border); border-radius: 8px; line-height: 1.6; }
    .s4-hidden { display: none !important; }

    /* Warnings banner */
    .s4-warnings       { background: var(--s4-warn-bg); border: 1.5px solid var(--s4-warn-b); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
    .s4-warnings-title { font-size: .82rem; font-weight: 600; color: var(--s4-warn); }
    .s4-warn-item      { font-size: .76rem; color: var(--s4-ink2); padding: 6px 10px; background: rgba(255,255,255,.5); border: 1px solid var(--s4-warn-b); border-radius: 6px; }

    /* Sections */
    .s4-section        { display: flex; flex-direction: column; gap: 14px; }
    .s4-section-header { display: flex; align-items: flex-start; gap: 14px; }
    .s4-section-num    { font-family: var(--s4-mono); font-size: .65rem; font-weight: 700; color: #fff; background: var(--s4-blue); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .s4-section-title  { font-size: .92rem; font-weight: 600; color: var(--s4-ink); }
    .s4-section-sub    { font-size: .73rem; color: var(--s4-muted); margin-top: 2px; }
    .s4-suggested-label{ font-size: .76rem; font-weight: 500; color: var(--s4-blue); }

    /* Interaction blocks */
    .s4-interaction-list { display: flex; flex-direction: column; gap: 8px; }
    .s4-block { background: var(--s4-surface); border: 1.5px solid var(--s4-border); border-radius: 12px; overflow: hidden; transition: border-color .14s; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .s4-block:hover          { border-color: var(--s4-border2); }
    .s4-block--on            { border-color: var(--s4-blue); }
    .s4-block--suggested     { border-color: var(--s4-warn-b); }
    .s4-block--on.s4-block--suggested { border-color: var(--s4-blue); }
    .s4-block-header  { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; transition: background .14s; user-select: none; }
    .s4-block--on .s4-block-header    { background: var(--s4-blue-bg); }
    .s4-block-header:hover            { background: var(--s4-surface2); }
    .s4-block--on .s4-block-header:hover { background: var(--s4-blue-bg); }
    .s4-block-label   { font-size: .86rem; font-weight: 600; color: var(--s4-ink); margin-bottom: 2px; }
    .s4-block-pattern { font-family: var(--s4-mono); font-size: .7rem; color: var(--s4-muted); }
    .s4-block-right   { display: flex; align-items: center; gap: 8px; }
    .s4-block-toggle  { font-family: var(--s4-mono); font-size: .68rem; color: var(--s4-muted); }
    .s4-suggested-badge { font-family: var(--s4-mono); font-size: .58rem; letter-spacing: 1px; text-transform: uppercase; background: var(--s4-warn-bg); color: var(--s4-warn); padding: 2px 8px; border-radius: 5px; border: 1px solid var(--s4-warn-b); }

    .s4-block-recognize { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 4px; }
    .s4-recognize-item  { display: flex; align-items: flex-start; gap: 6px; font-size: .74rem; color: var(--s4-muted); line-height: 1.4; }
    .s4-recognize-bullet{ color: var(--s4-blue); flex-shrink: 0; }

    .s4-block-detail  { padding: 14px 16px; border-top: 1px solid var(--s4-border); background: var(--s4-surface2); display: flex; flex-direction: column; gap: 12px; animation: s4-fade .2s ease; }
    @keyframes s4-fade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }

    /* Analysis table */
    .s4-analysis-table { display: flex; flex-direction: column; gap: 4px; }
    .s4-analysis-row   { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 6px; padding: 8px 12px; background: var(--s4-surface); border: 1px solid var(--s4-border); border-radius: 7px; font-size: .74rem; }
    .s4-analysis-condition { font-family: var(--s4-mono); font-size: .68rem; color: var(--s4-muted); min-width: 140px; flex-shrink: 0; line-height: 1.4; }
    .s4-analysis-arrow     { color: var(--s4-muted); flex-shrink: 0; }
    .s4-analysis-verdict   { color: var(--s4-ink2); flex: 1; line-height: 1.4; }
    .s4-structure-badge    { font-family: var(--s4-mono); font-size: .62rem; background: var(--s4-blue-bg); color: var(--s4-blue); border: 1px solid var(--s4-blue-b); padding: 2px 8px; border-radius: 9999px; white-space: nowrap; flex-shrink: 0; font-weight: 600; }
    .s4-complexity-row     { display: flex; align-items: center; gap: 8px; font-size: .74rem; padding: 6px 10px; background: var(--s4-green-bg); border: 1px solid var(--s4-green-b); border-radius: 7px; }
    .s4-comp-label         { font-family: var(--s4-mono); font-size: .6rem; text-transform: uppercase; letter-spacing: 1px; color: var(--s4-green); }
    .s4-comp-code          { font-family: var(--s4-mono); font-size: .72rem; color: var(--s4-green); font-weight: 700; }
    .s4-watchouts          { display: flex; flex-direction: column; gap: 5px; }
    .s4-watchout-item      { font-size: .74rem; color: var(--s4-warn); padding: 6px 10px; background: var(--s4-warn-bg); border: 1px solid var(--s4-warn-b); border-radius: 6px; line-height: 1.4; }

    /* Condition flags */
    .s4-flags-wrap  { display: flex; flex-direction: column; gap: 6px; padding: 12px; background: var(--s4-surface); border: 1px solid var(--s4-border); border-radius: 8px; }
    .s4-flags-title { font-size: .76rem; font-weight: 600; color: var(--s4-ink2); margin-bottom: 4px; }
    .s4-flag-row    { display: flex; align-items: center; gap: 9px; padding: 7px 10px; background: var(--s4-surface2); border: 1.5px solid var(--s4-border); border-radius: 7px; cursor: pointer; transition: all .12s; user-select: none; }
    .s4-flag-row:hover   { border-color: var(--s4-border2); }
    .s4-flag-row--on     { border-color: var(--s4-blue-b); background: var(--s4-blue-bg); }
    .s4-flag-cb   { width: 14px; height: 14px; accent-color: var(--s4-blue); cursor: pointer; flex-shrink: 0; }
    .s4-flag-label{ font-size: .78rem; color: var(--s4-ink2); }

    /* Hidden structure list */
    .s4-hidden-list { display: flex; flex-direction: column; gap: 7px; }
    .s4-hs-row      { background: var(--s4-surface); border: 1.5px solid var(--s4-border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; transition: all .14s; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .s4-hs-row:hover          { border-color: var(--s4-border2); }
    .s4-hs-row--answered      { border-color: rgba(37,99,235,.2); }
    .s4-hs-row--applicable    { border-color: var(--s4-green-b); background: var(--s4-green-bg); }
    .s4-hs-header   { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .s4-hs-info     { flex: 1; }
    .s4-hs-label    { font-size: .84rem; font-weight: 600; color: var(--s4-ink); margin-bottom: 3px; }
    .s4-hs-signal   { font-size: .72rem; color: var(--s4-muted); line-height: 1.4; }
    .s4-complexity-badge { font-family: var(--s4-mono); font-size: .65rem; font-weight: 700; background: var(--s4-green-bg); color: var(--s4-green); border: 1px solid var(--s4-green-b); padding: 3px 9px; border-radius: 9999px; white-space: nowrap; }
    .s4-hs-btns     { display: flex; gap: 8px; flex-wrap: wrap; }
    .s4-ans-btn     { padding: 6px 14px; border: 1.5px solid var(--s4-border); border-radius: 7px; background: var(--s4-surface2); font-size: .78rem; font-weight: 500; cursor: pointer; transition: all .12s; color: var(--s4-muted); }
    .s4-ans-btn:hover      { border-color: var(--s4-border2); color: var(--s4-ink); }
    .s4-ans-btn--on-yes    { background: var(--s4-green-bg); border-color: var(--s4-green-b); color: var(--s4-green); font-weight: 600; }
    .s4-ans-btn--on-no     { background: var(--s4-surface2); border-color: var(--s4-border2); color: var(--s4-ink2); font-weight: 600; }
    .s4-hs-examples { display: flex; flex-direction: column; gap: 4px; padding: 9px 12px; background: var(--s4-blue-bg); border: 1px solid var(--s4-blue-b); border-radius: 7px; }
    .s4-hs-example  { font-size: .74rem; color: var(--s4-ink2); line-height: 1.4; }

    /* Side panel */
    .s4-panel { width: 268px; flex-shrink: 0; background: var(--s4-surface); border: 1.5px solid var(--s4-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s4-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s4-border); background: #f6f4f0; }
    .s4-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s4-ink); }
    .s4-panel-sub    { font-size: .66rem; color: var(--s4-muted); margin-top: 2px; }
    .s4-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s4-panel-empty  { font-size: .74rem; color: var(--s4-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s4-panel-section { display: flex; flex-direction: column; gap: 7px; }
    .s4-panel-section--found { background: var(--s4-green-bg); border: 1px solid var(--s4-green-b); border-radius: 8px; padding: 10px 12px; }
    .s4-panel-section--warn  { background: var(--s4-warn-bg);  border: 1px solid var(--s4-warn-b);  border-radius: 8px; padding: 10px 12px; }
    .s4-panel-section-title  { font-family: var(--s4-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s4-muted); margin-bottom: 2px; }
    .s4-panel-section--found .s4-panel-section-title { color: var(--s4-green); }
    .s4-panel-section--warn  .s4-panel-section-title { color: var(--s4-warn);  }
    .s4-panel-inter-badge   { padding: 8px 10px; background: var(--s4-blue-bg); border: 1px solid var(--s4-blue-b); border-radius: 7px; margin-bottom: 3px; }
    .s4-panel-inter-label   { font-size: .78rem; font-weight: 600; color: var(--s4-blue); }
    .s4-panel-inter-pattern { font-family: var(--s4-mono); font-size: .64rem; color: var(--s4-muted); margin-top: 1px; }
    .s4-panel-found-badge   { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: .76rem; font-weight: 500; color: var(--s4-green); padding: 4px 0; border-bottom: 1px solid rgba(5,150,105,.15); }
    .s4-panel-found-badge:last-of-type { border-bottom: none; }
    .s4-panel-complexity    { font-family: var(--s4-mono); font-size: .64rem; color: var(--s4-green); background: transparent; }
    .s4-panel-warn-item     { font-size: .72rem; color: var(--s4-ink2); line-height: 1.4; padding: 4px 0; border-bottom: 1px solid rgba(217,119,6,.15); }
    .s4-panel-warn-item:last-of-type { border-bottom: none; }
    .s4-panel-progress-track { height: 6px; background: var(--s4-surface2); border-radius: 9999px; overflow: hidden; border: 1px solid var(--s4-border); }
    .s4-panel-progress-fill  { height: 100%; background: var(--s4-blue); border-radius: 9999px; transition: width .3s ease; }
    .s4-panel-progress-label { font-size: .68rem; color: var(--s4-muted); }
    .s4-panel-gate  { padding: 10px 12px; border-radius: 8px; font-size: .74rem; font-weight: 500; text-align: center; background: var(--s4-surface2); border: 1.5px solid var(--s4-border); color: var(--s4-muted); }
    .s4-panel-gate--ready { background: var(--s4-green-bg); border-color: var(--s4-green-b); color: var(--s4-green); }
    .s4-panel-body::-webkit-scrollbar { width: 3px; }
    .s4-panel-body::-webkit-scrollbar-thumb { background: var(--s4-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s4-shell { flex-direction: column; padding: 16px; }
      .s4-panel { width: 100%; position: static; max-height: none; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved     = state.answers?.stage4;
    const CI        = typeof ConstraintInteractions !== 'undefined' ? ConstraintInteractions : null;
    const totalHS   = CI?.getHiddenStructures?.()?.length ?? _fallbackHiddenStructures().length;
    const hsAnswered = Object.keys(saved?.hiddenStructureAnswers ?? {}).length;
    if ((saved?.interactions ?? []).length > 0 || hsAnswered >= Math.ceil(totalHS / 2)) {
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state                  = null;
    _selectedInteractions   = new Set();
    _hiddenStructureAnswers = {};
    _interactionFlags       = {};
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage4;