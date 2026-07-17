// stages/fastpath/fastpath.js
// Fast Path — collects only input type, output type, and the direction the
// user already has in mind, then hands control to Stage 5 (Verification)
// and Stage 6 (Edge Cases), skipping Stages 0–4.5 entirely.
// Only reachable when entry.path === 'fast' (see core/router.js skipIf).
// Module contract: render(state), onMount(state), cleanup()

const StageFastpath = (() => {

  // Deliberately the same ids Stage 1 uses, so downstream readers (Stage 6's
  // edge-case library selection, Stage 3's graph-input detection if the user
  // ever backtracks) still work without special-casing the fast path.
  const INPUT_TYPES = [
    { id: 'single_array',     label: 'Single array' },
    { id: 'two_arrays',       label: 'Two arrays' },
    { id: 'single_string',    label: 'Single string' },
    { id: 'two_strings',      label: 'Two strings' },
    { id: 'multiple_strings', label: 'Multiple strings' },
    { id: 'matrix_grid',      label: 'Matrix / Grid' },
    { id: 'graph_edge_list',  label: 'Graph — edge list' },
    { id: 'graph_adjacency',  label: 'Graph — adjacency' },
    { id: 'implicit_graph',   label: 'Implicit graph' },
    { id: 'tree_explicit',    label: 'Tree — explicit' },
    { id: 'intervals',        label: 'Intervals / ranges' },
    { id: 'single_number',    label: 'Single number' },
    { id: 'multiple_numbers', label: 'Multiple numbers' },
  ];

  // Same ids Stage 2 uses.
  const OUTPUT_FORMS = [
    { id: 'single_value',        label: 'Single value' },
    { id: 'index_position',      label: 'Index / Position' },
    { id: 'subarray_substring',  label: 'Subarray / Substring' },
    { id: 'subsequence',         label: 'Subsequence' },
    { id: 'full_array',          label: 'Full array / permutation' },
    { id: 'count',               label: 'Count' },
    { id: 'tree_graph',          label: 'Tree / Graph structure' },
    { id: 'boolean',             label: 'Boolean / Existence' },
  ];

  // Family ids intentionally overlap with the substrings Stage 5/6.5 already
  // match on ('greedy', 'binary_search', 'dp', 'graph') so the right
  // verifiers activate without any fast-path-specific branching there.
  const DIRECTIONS = [
    { id: 'greedy',               label: 'Greedy' },
    { id: 'binary_search_answer', label: 'Binary Search on Answer' },
    { id: 'dp',                   label: 'Dynamic Programming' },
    { id: 'backtracking',         label: 'Backtracking' },
    { id: 'divide_conquer',       label: 'Divide and Conquer' },
    { id: 'graph',                label: 'Graph Traversal / Algorithm' },
    { id: 'two_pointer',          label: 'Two Pointer / Sliding Window' },
    { id: 'other',                label: 'Other — describe below' },
  ];

  let _state          = null;
  let _inputTypes     = new Set();
  let _outputForm     = null;
  let _directionFamily = null;
  let _directionText   = '';

  function render(state) {
    _state = state;
    const saved = state.answers?.fastpath ?? {};

    _inputTypes      = new Set(saved.inputTypes ?? []);
    _outputForm      = saved.outputForm ?? null;
    _directionFamily = saved.directionFamily ?? null;
    _directionText   = saved.direction ?? '';

    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 'sfp-shell';
    wrapper.innerHTML = `
      <div class="sfp-rule">
        Fast path — the minimum needed to reach Verification and Edge Cases directly.
        Structural analysis (Stages 0–4.5) is skipped; Stage 5 will verify whatever you pick here.
      </div>

      <section class="sfp-section">
        <div class="sfp-section-title">01 — Input type</div>
        <div class="sfp-chip-grid" id="sfp-input-grid"></div>
      </section>

      <section class="sfp-section">
        <div class="sfp-section-title">02 — Output form</div>
        <div class="sfp-chip-grid sfp-chip-grid--single" id="sfp-output-grid"></div>
      </section>

      <section class="sfp-section">
        <div class="sfp-section-title">03 — Direction you're already leaning toward</div>
        <div class="sfp-chip-grid sfp-chip-grid--single" id="sfp-direction-grid"></div>
        <div class="sfp-other-wrap ${_directionFamily === 'other' ? '' : 'sfp-hidden'}" id="sfp-other-wrap">
          <input type="text" id="sfp-other-input" class="sfp-other-input"
                 placeholder="e.g. Union-Find with path compression"
                 value="${_directionText && _directionFamily === 'other' ? _directionText.replace(/"/g, '&quot;') : ''}">
        </div>
      </section>
    `;

    _buildChips(wrapper, '#sfp-input-grid', INPUT_TYPES, _inputTypes, true, (id) => _onInputToggle(id, wrapper));
    _buildChips(wrapper, '#sfp-output-grid', OUTPUT_FORMS, _outputForm ? new Set([_outputForm]) : new Set(), false, (id) => _onOutputSelect(id, wrapper));
    _buildChips(wrapper, '#sfp-direction-grid', DIRECTIONS, _directionFamily ? new Set([_directionFamily]) : new Set(), false, (id) => _onDirectionSelect(id, wrapper));

    wrapper.querySelector('#sfp-other-input')?.addEventListener('input', (e) => {
      _directionText = e.target.value;
      _persist();
      _checkComplete();
    });

    return wrapper;
  }

  function _buildChips(wrapper, gridSel, items, selectedSet, multi, onClick) {
    const grid = wrapper.querySelector(gridSel);
    if (!grid) return;
    items.forEach(item => {
      const isOn = selectedSet.has(item.id);
      const chip = document.createElement('div');
      chip.className = `sfp-chip ${isOn ? 'sfp-chip--on' : ''}`;
      chip.dataset.id = item.id;
      chip.textContent = item.label;
      chip.addEventListener('click', () => onClick(item.id));
      grid.appendChild(chip);
    });
  }

  function _onInputToggle(id, wrapper) {
    if (_inputTypes.has(id)) _inputTypes.delete(id);
    else _inputTypes.add(id);

    wrapper.querySelectorAll('#sfp-input-grid .sfp-chip').forEach(c =>
      c.classList.toggle('sfp-chip--on', _inputTypes.has(c.dataset.id))
    );

    _persist();
    _checkComplete();
  }

  function _onOutputSelect(id, wrapper) {
    _outputForm = id;
    wrapper.querySelectorAll('#sfp-output-grid .sfp-chip').forEach(c =>
      c.classList.toggle('sfp-chip--on', c.dataset.id === id)
    );
    _persist();
    _checkComplete();
  }

  function _onDirectionSelect(id, wrapper) {
    _directionFamily = id;
    wrapper.querySelectorAll('#sfp-direction-grid .sfp-chip').forEach(c =>
      c.classList.toggle('sfp-chip--on', c.dataset.id === id)
    );

    const otherWrap = wrapper.querySelector('#sfp-other-wrap');
    if (otherWrap) otherWrap.classList.toggle('sfp-hidden', id !== 'other');

    if (id !== 'other') {
      const known = DIRECTIONS.find(d => d.id === id);
      _directionText = known?.label ?? id;
    } else {
      _directionText = wrapper.querySelector('#sfp-other-input')?.value ?? '';
    }

    _persist();
    _checkComplete();
  }

  function _persist() {
    State.setAnswer('fastpath', {
      inputTypes     : [..._inputTypes],
      outputForm     : _outputForm,
      direction      : _directionText,
      directionFamily: _directionFamily,
    });

    // Mirror into Stage 1 / Stage 2's own answer slots so any existing
    // downstream reader (Stage 6 edge-case library, session summaries,
    // Stage 3 graph-input detection if the user ever backtracks) keeps
    // working unmodified — the fast path is additive, not a special case
    // those readers need to know about.
    State.setAnswer('stage1', {
      inputTypes      : [..._inputTypes],
      secondarySignals: [],
      queryType       : 'one',
    });
    State.setAnswer('stage2', {
      outputForm      : _outputForm,
      optimizationType: null,
      solutionDepth   : null,
    });
  }

  function _checkComplete() {
    const isComplete = _inputTypes.size > 0 && !!_outputForm && !!_directionFamily &&
      (_directionFamily !== 'other' || _directionText.trim().length > 0);

    // All 3 fields required, not the usual 60% — this is already the
    // deliberately minimal set (that's the entire point of the fast path),
    // so partial credit here would defeat it. Still reported for the badge.
    if (typeof GateStandard !== 'undefined') {
      const answered = (_inputTypes.size > 0 ? 1 : 0) + (_outputForm ? 1 : 0) + (_directionFamily ? 1 : 0);
      GateStandard.report('fastpath', { answered, total: 3, thresholdCount: 3, meetsThreshold: isComplete, alternateMet: false, valid: isComplete });
    }

    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(isComplete);

    if (isComplete) {
      const saved = State.getAnswer('fastpath') ?? {};
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: { stageId: 'fastpath', answers: saved },
      }));
    }
  }

  function onMount(state) {
    const saved = state.answers?.fastpath;
    if (!saved) return;
    const isComplete = (saved.inputTypes?.length ?? 0) > 0 && !!saved.outputForm && !!saved.directionFamily;
    if (typeof GateStandard !== 'undefined') {
      const answered = ((saved.inputTypes?.length ?? 0) > 0 ? 1 : 0) + (saved.outputForm ? 1 : 0) + (saved.directionFamily ? 1 : 0);
      GateStandard.report('fastpath', { answered, total: 3, thresholdCount: 3, meetsThreshold: isComplete, alternateMet: false, valid: isComplete });
    }
    if (isComplete && typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
  }

  function cleanup() {
    _state           = null;
    _inputTypes      = new Set();
    _outputForm      = null;
    _directionFamily = null;
    _directionText   = '';
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('sfp-styles')) return;
    const style = document.createElement('style');
    style.id = 'sfp-styles';
    style.textContent = `
    .sfp-shell {
      --sfp-bg: #f7f4ef; --sfp-surface: #ffffff; --sfp-border: rgba(0,0,0,.1); --sfp-border2: rgba(0,0,0,.18);
      --sfp-ink: #1a1a2e; --sfp-ink2: #4a4560; --sfp-muted: #8a8070; --sfp-accent: #2563eb;
      --sfp-accent-bg: rgba(37,99,235,.07); --sfp-accent-b: rgba(37,99,235,.3);
      display: flex; flex-direction: column; gap: 30px; max-width: 760px; margin: 0 auto;
      padding: 32px 28px 60px; background: var(--sfp-bg); min-height: 100%;
      font-family: 'DM Sans', system-ui, sans-serif; color: var(--sfp-ink);
    }
    .sfp-rule {
      font-family: 'Space Mono', monospace; font-size: .72rem; color: var(--sfp-muted); line-height: 1.6;
      padding: 10px 16px; background: var(--sfp-surface); border: 1px solid var(--sfp-border);
      border-left: 3px solid var(--sfp-accent); border-radius: 0 8px 8px 0;
    }
    .sfp-section { display: flex; flex-direction: column; gap: 10px; }
    .sfp-section-title { font-size: .82rem; font-weight: 700; color: var(--sfp-ink); }
    .sfp-chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .sfp-chip {
      padding: 8px 14px; border-radius: 20px; border: 1.5px solid var(--sfp-border2);
      background: var(--sfp-surface); font-size: .8rem; cursor: pointer;
      transition: border-color .15s, background .15s, color .15s;
    }
    .sfp-chip:hover { border-color: var(--sfp-accent-b); }
    .sfp-chip--on { border-color: var(--sfp-accent); background: var(--sfp-accent-bg); color: var(--sfp-accent); font-weight: 600; }
    .sfp-other-wrap { margin-top: 4px; }
    .sfp-other-input {
      width: 100%; padding: 10px 14px; border-radius: 8px; border: 1.5px solid var(--sfp-border2);
      background: var(--sfp-surface); font-family: 'DM Sans', sans-serif; font-size: .84rem; color: var(--sfp-ink);
    }
    .sfp-other-input:focus { outline: none; border-color: var(--sfp-accent-b); }
    .sfp-hidden { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = StageFastpath;
