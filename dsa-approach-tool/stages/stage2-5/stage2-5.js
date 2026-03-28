// stages/stage2/stage2.js
// Output Anatomy — cream/white theme, self-contained styles
// Same pattern as stage1.js

const Stage2 = (() => {

  let _state         = null;
  let _selectedForm  = null;
  let _selectedOpt   = null;
  let _selectedDepth = null;

  // ─── DATA ──────────────────────────────────────────────────────────────────

  const OUTPUT_FORMS = [
    {
      id      : 'single_value',
      icon    : '42',
      label   : 'Single value',
      sublabel: 'One number, boolean, or string',
      example : 'max sum, minimum cost, "YES"/"NO"',
      opens   : ['Binary Search on Answer', 'Greedy', 'DP 1D'],
      watchOut: null,
    },
    {
      id      : 'index_position',
      icon    : '[i]',
      label   : 'Index / Position',
      sublabel: 'Location in the input structure',
      example : 'pivot index, insertion point',
      opens   : ['Binary Search', 'Two Pointer'],
      watchOut: '0-indexed or 1-indexed? Read carefully.',
    },
    {
      id      : 'subarray_substring',
      icon    : '[l..r]',
      label   : 'Subarray / Substring',
      sublabel: 'Contiguous segment of the input',
      example : 'longest valid substring, max subarray',
      opens   : ['Sliding Window', 'Prefix Sum', 'Two Pointer', 'Kadane\'s'],
      watchOut: 'Contiguous only. If non-contiguous → subsequence, different approach.',
    },
    {
      id      : 'subsequence',
      icon    : '[ _ i _ j ]',
      label   : 'Subsequence',
      sublabel: 'Non-contiguous elements in order',
      example : 'LIS, LCS, edit distance',
      opens   : ['2D DP', 'DP 1D with patience sorting'],
      watchOut: null,
    },
    {
      id      : 'full_array',
      icon    : '[...]',
      label   : 'Full array / permutation',
      sublabel: 'Reordered or modified input',
      example : 'sort result, next permutation',
      opens   : ['Sorting', 'Greedy', 'Backtracking (small n)'],
      watchOut: null,
    },
    {
      id      : 'count',
      icon    : '#',
      label   : 'Count',
      sublabel: 'Number of ways / combinations',
      example : 'count subarrays, number of paths',
      opens   : ['DP counting', 'Combinatorics', 'Prefix Sum'],
      watchOut: 'Count mod 10⁹+7 — apply mod at every step.',
    },
    {
      id      : 'tree_graph',
      icon    : '⬡',
      label   : 'Tree / Graph structure',
      sublabel: 'Output is itself a tree or graph',
      example : 'MST, shortest path tree',
      opens   : ['Kruskal / Prim (MST)', 'Dijkstra path', 'DFS tree'],
      watchOut: null,
    },
    {
      id      : 'boolean',
      icon    : 'T/F',
      label   : 'Boolean / Existence',
      sublabel: 'Does X exist? Is X possible?',
      example : '"YES"/"NO", true/false',
      opens   : ['Binary Search on Answer', 'BFS reachability', 'Union Find'],
      watchOut: 'If "possible" → try Binary Search on Answer. Monotone feasibility.',
    },
  ];

  const OPT_TYPES = [
    {
      id         : 'maximize',
      label      : 'Maximize',
      sublabel   : 'Find the largest valid value',
      implication: 'Opens Binary Search on Answer if feasibility is monotone. Opens Greedy if choices are independent.',
      opens      : ['Binary Search on Answer', 'Greedy', 'DP max'],
      eliminates : [],
    },
    {
      id         : 'minimize',
      label      : 'Minimize',
      sublabel   : 'Find the smallest valid value',
      implication: 'Same as maximize — Binary Search on Answer if monotone. Shortest path if graph.',
      opens      : ['Binary Search on Answer', 'Dijkstra', 'DP min'],
      eliminates : [],
    },
    {
      id         : 'max_min',
      label      : 'Maximize the minimum',
      sublabel   : 'Maximize the worst case',
      implication: 'Classic Binary Search on Answer pattern. Monotone: if X works, X-1 also works.',
      opens      : ['Binary Search on Answer'],
      eliminates : ['direct greedy without binary search'],
    },
    {
      id         : 'min_max',
      label      : 'Minimize the maximum',
      sublabel   : 'Minimize the worst case',
      implication: 'Classic Binary Search on Answer — same monotone structure as max_min.',
      opens      : ['Binary Search on Answer'],
      eliminates : [],
    },
    {
      id         : 'count_all',
      label      : 'Count all',
      sublabel   : 'Count every valid configuration',
      implication: 'DP counting. Combinatorics. NOT a greedy or search problem.',
      opens      : ['DP counting', 'Combinatorics'],
      eliminates : ['Greedy', 'Binary Search on Answer'],
    },
    {
      id         : 'exact_match',
      label      : 'Exact match',
      sublabel   : 'Find exactly the required value',
      implication: 'Hashing for equality. Binary Search if sorted. Sliding Window if contiguous.',
      opens      : ['Hashing', 'Binary Search', 'Sliding Window'],
      eliminates : [],
    },
    {
      id         : 'feasibility',
      label      : 'Feasibility check',
      sublabel   : 'Is it possible?',
      implication: 'BFS/DFS for reachability. Union Find for connectivity. Topo sort for ordering.',
      opens      : ['BFS / DFS', 'Union Find', 'Topo Sort'],
      eliminates : [],
    },
  ];

  const DEPTHS = [
    {
      id      : 'value_only',
      label   : 'Value only',
      sublabel: 'Just the answer number',
      example : 'return 42',
      watchOut: null,
      opens   : ['DP without path reconstruction'],
    },
    {
      id      : 'one_solution',
      label   : 'One valid solution',
      sublabel: 'Any correct configuration',
      example : 'return one valid permutation',
      watchOut: null,
      opens   : ['Backtracking', 'Greedy construction'],
    },
    {
      id      : 'all_solutions',
      label   : 'All solutions',
      sublabel: 'Enumerate every valid configuration',
      example : 'return all subsets',
      watchOut: 'Exponential output — n must be very small (≤ 15). Cannot do better than O(2^n) output.',
      opens   : ['Backtracking with full enumeration'],
    },
    {
      id      : 'reconstruct_path',
      label   : 'Reconstruct path / sequence',
      sublabel: 'The actual sequence, not just the value',
      example : 'return the actual shortest path nodes',
      watchOut: 'Requires parent/prev array alongside DP table. Extra O(n) space.',
      opens   : ['DP with parent tracking', 'Dijkstra with prev array'],
    },
    {
      id      : 'lexicographic',
      label   : 'Lexicographically smallest / largest',
      sublabel: 'Among all optimal, pick by lex order',
      example : 'smallest string that achieves min cost',
      watchOut: 'Changes approach — greedy ordering by char, or DP with lex tiebreak.',
      opens   : ['Greedy (lex order)', 'DP with lex comparison'],
    },
  ];

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state         = state;
    const saved    = state.answers?.stage2 ?? {};
    _selectedForm  = saved.outputForm       ?? null;
    _selectedOpt   = saved.optimizationType ?? null;
    _selectedDepth = saved.solutionDepth    ?? null;

    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 's2-shell';
    wrapper.innerHTML = `
      <div class="s2-main">

        <div class="s2-rule">
          What you must produce constrains the approach as much as what you are given.
          Output form, optimization type, and solution depth each eliminate different families.
        </div>

        <!-- Section 01: Output form -->
        <section class="s2-section">
          <div class="s2-section-header">
            <span class="s2-section-num">01</span>
            <div>
              <div class="s2-section-title">What form is the answer?</div>
              <div class="s2-section-sub">Pick one — this is what you return</div>
            </div>
          </div>
          <div class="s2-form-grid" id="s2-form-grid"></div>
        </section>

        <!-- Section 02: Optimization type -->
        <section class="s2-section">
          <div class="s2-section-header">
            <span class="s2-section-num">02</span>
            <div>
              <div class="s2-section-title">What kind of optimization?</div>
              <div class="s2-section-sub">Pick one — what are you trying to achieve</div>
            </div>
          </div>
          <div class="s2-opt-grid" id="s2-opt-grid"></div>
        </section>

        <!-- Section 03: Solution depth -->
        <section class="s2-section">
          <div class="s2-section-header">
            <span class="s2-section-num">03</span>
            <div>
              <div class="s2-section-title">How much must you output?</div>
              <div class="s2-section-sub">Pick one — affects complexity and reconstruction</div>
            </div>
          </div>
          <div class="s2-depth-grid" id="s2-depth-grid"></div>
        </section>

      </div>

      <!-- Live side panel -->
      <aside class="s2-panel">
        <div class="s2-panel-header">
          <div class="s2-panel-title">What this opens</div>
          <div class="s2-panel-sub">Updates as you select</div>
        </div>
        <div class="s2-panel-body" id="s2-panel-body">
          <div class="s2-panel-empty">← Select output form to see implications</div>
        </div>
      </aside>
    `;

    // Build grids
    _buildFormGrid(wrapper);
    _buildOptGrid(wrapper);
    _buildDepthGrid(wrapper);

    // Initial panel render
    setTimeout(() => _updatePanel(wrapper), 0);

    return wrapper;
  }

  // ─── FORM GRID ─────────────────────────────────────────────────────────────

  function _buildFormGrid(wrapper) {
    const grid = wrapper.querySelector('#s2-form-grid');
    if (!grid) return;

    OUTPUT_FORMS.forEach(form => {
      const card = document.createElement('div');
      card.className = `s2-card ${_selectedForm === form.id ? 's2-card--on' : ''}`;
      card.dataset.id = form.id;
      card.innerHTML = `
        <div class="s2-card-icon">${form.icon}</div>
        <div class="s2-card-label">${form.label}</div>
        <div class="s2-card-sub">${form.sublabel}</div>
        <div class="s2-card-example">${form.example}</div>
        ${form.watchOut ? `<div class="s2-card-warn">⚠ ${form.watchOut}</div>` : ''}
        <div class="s2-card-check">✓</div>
      `;
      card.addEventListener('click', () => {
        _selectedForm = form.id;
        wrapper.querySelectorAll('#s2-form-grid .s2-card').forEach(c =>
          c.classList.toggle('s2-card--on', c.dataset.id === form.id)
        );
        State.setAnswer('stage2', { outputForm: form.id });
        _updatePanel(wrapper);
        _checkComplete();
      });
      grid.appendChild(card);
    });
  }

  // ─── OPT GRID ──────────────────────────────────────────────────────────────

  function _buildOptGrid(wrapper) {
    const grid = wrapper.querySelector('#s2-opt-grid');
    if (!grid) return;

    OPT_TYPES.forEach(opt => {
      const card = document.createElement('div');
      card.className = `s2-opt-card ${_selectedOpt === opt.id ? 's2-opt-card--on' : ''}`;
      card.dataset.id = opt.id;
      card.innerHTML = `
        <div class="s2-opt-dot"></div>
        <div class="s2-opt-content">
          <div class="s2-opt-label">${opt.label}</div>
          <div class="s2-opt-sub">${opt.sublabel}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        _selectedOpt = opt.id;
        wrapper.querySelectorAll('#s2-opt-grid .s2-opt-card').forEach(c =>
          c.classList.toggle('s2-opt-card--on', c.dataset.id === opt.id)
        );
        State.setAnswer('stage2', { optimizationType: opt.id });
        _updatePanel(wrapper);
        _checkComplete();
      });
      grid.appendChild(card);
    });
  }

  // ─── DEPTH GRID ────────────────────────────────────────────────────────────

  function _buildDepthGrid(wrapper) {
    const grid = wrapper.querySelector('#s2-depth-grid');
    if (!grid) return;

    DEPTHS.forEach(depth => {
      const card = document.createElement('div');
      card.className = `s2-depth-card ${_selectedDepth === depth.id ? 's2-depth-card--on' : ''}`;
      card.dataset.id = depth.id;
      card.innerHTML = `
        <div class="s2-depth-dot"></div>
        <div class="s2-depth-content">
          <div class="s2-depth-label">${depth.label}</div>
          <div class="s2-depth-sub">${depth.sublabel}</div>
          <div class="s2-depth-example">${depth.example}</div>
          ${depth.watchOut ? `<div class="s2-depth-warn">⚠ ${depth.watchOut}</div>` : ''}
        </div>
      `;
      card.addEventListener('click', () => {
        _selectedDepth = depth.id;
        wrapper.querySelectorAll('#s2-depth-grid .s2-depth-card').forEach(c =>
          c.classList.toggle('s2-depth-card--on', c.dataset.id === depth.id)
        );
        State.setAnswer('stage2', { solutionDepth: depth.id });
        _updatePanel(wrapper);
        _checkComplete();
      });
      grid.appendChild(card);
    });
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper) {
    const body = (wrapper ?? document).querySelector('#s2-panel-body');
    if (!body) return;
    body.innerHTML = '';

    const hasAny = _selectedForm || _selectedOpt || _selectedDepth;
    if (!hasAny) {
      body.innerHTML = '<div class="s2-panel-empty">← Select output form to see implications</div>';
      return;
    }

    // Output form implications
    if (_selectedForm) {
      const form = OUTPUT_FORMS.find(f => f.id === _selectedForm);
      if (form) {
        const sec = document.createElement('div');
        sec.className = 's2-panel-section';
        sec.innerHTML = `<div class="s2-panel-section-title">Output form opens</div>`;
        form.opens.forEach(o => {
          const tag = document.createElement('div');
          tag.className = 's2-panel-algo-tag';
          tag.textContent = o;
          sec.appendChild(tag);
        });
        if (form.watchOut) {
          const w = document.createElement('div');
          w.className = 's2-panel-warn';
          w.innerHTML = `<span>⚠</span><span>${form.watchOut}</span>`;
          sec.appendChild(w);
        }
        body.appendChild(sec);
      }
    }

    // Optimization implications
    if (_selectedOpt) {
      const opt = OPT_TYPES.find(o => o.id === _selectedOpt);
      if (opt) {
        const sec = document.createElement('div');
        sec.className = 's2-panel-section';
        sec.innerHTML = `<div class="s2-panel-section-title">Optimization opens</div>`;

        opt.opens.forEach(o => {
          const tag = document.createElement('div');
          tag.className = 's2-panel-algo-tag';
          tag.textContent = o;
          sec.appendChild(tag);
        });

        const impl = document.createElement('div');
        impl.className = 's2-panel-impl';
        impl.innerHTML = `→ ${opt.implication}`;
        sec.appendChild(impl);

        if (opt.eliminates?.length) {
          const el = document.createElement('div');
          el.className = 's2-panel-elim';
          el.innerHTML = `<span class="s2-panel-elim-label">Eliminates:</span> ${opt.eliminates.join(', ')}`;
          sec.appendChild(el);
        }

        body.appendChild(sec);
      }
    }

    // Depth implications
    if (_selectedDepth) {
      const depth = DEPTHS.find(d => d.id === _selectedDepth);
      if (depth) {
        const sec = document.createElement('div');
        sec.className = 's2-panel-section';
        sec.innerHTML = `<div class="s2-panel-section-title">Depth opens</div>`;
        depth.opens.forEach(o => {
          const tag = document.createElement('div');
          tag.className = 's2-panel-algo-tag';
          tag.textContent = o;
          sec.appendChild(tag);
        });
        if (depth.watchOut) {
          const w = document.createElement('div');
          w.className = 's2-panel-warn';
          w.innerHTML = `<span>⚠</span><span>${depth.watchOut}</span>`;
          sec.appendChild(w);
        }
        body.appendChild(sec);
      }
    }

    // Combined summary if all 3 selected
    if (_selectedForm && _selectedOpt && _selectedDepth) {
      const allOpens = new Set([
        ...((OUTPUT_FORMS.find(f => f.id === _selectedForm)?.opens) ?? []),
        ...((OPT_TYPES.find(o => o.id === _selectedOpt)?.opens) ?? []),
        ...((DEPTHS.find(d => d.id === _selectedDepth)?.opens) ?? []),
      ]);

      const form  = OUTPUT_FORMS.find(f => f.id === _selectedForm);
      const opt   = OPT_TYPES.find(o => o.id === _selectedOpt);
      const depth = DEPTHS.find(d => d.id === _selectedDepth);

      const sec = document.createElement('div');
      sec.className = 's2-panel-section s2-panel-section--summary';
      sec.innerHTML = `
        <div class="s2-panel-section-title">Output summary</div>
        <div class="s2-panel-summary-row"><span class="s2-panel-summary-key">Form</span><span>${form?.label ?? ''}</span></div>
        <div class="s2-panel-summary-row"><span class="s2-panel-summary-key">Goal</span><span>${opt?.label ?? ''}</span></div>
        <div class="s2-panel-summary-row"><span class="s2-panel-summary-key">Depth</span><span>${depth?.label ?? ''}</span></div>
        <div class="s2-panel-section-title" style="margin-top:8px">All candidate families</div>
      `;
      allOpens.forEach(o => {
        const tag = document.createElement('div');
        tag.className = 's2-panel-algo-tag';
        tag.textContent = o;
        sec.appendChild(tag);
      });
      body.appendChild(sec);
    }
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete() {
    const valid = _selectedForm && _selectedOpt && _selectedDepth;
    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(!!valid);
    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage2',
          answers: {
            outputForm      : _selectedForm,
            optimizationType: _selectedOpt,
            solutionDepth   : _selectedDepth,
          },
        },
      }));
    }
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s2-styles')) return;
    const style = document.createElement('style');
    style.id = 's2-styles';
    style.textContent = `
    .s2-shell {
      --s2-bg      : #f7f4ef;
      --s2-surface : #ffffff;
      --s2-surface2: #faf8f5;
      --s2-border  : rgba(0,0,0,.09);
      --s2-border2 : rgba(0,0,0,.16);
      --s2-ink     : #1a1814;
      --s2-ink2    : #4a4540;
      --s2-muted   : #8a8070;
      --s2-blue    : #2563eb;
      --s2-blue-bg : rgba(37,99,235,.07);
      --s2-blue-b  : rgba(37,99,235,.25);
      --s2-green   : #059669;
      --s2-green-bg: rgba(5,150,105,.07);
      --s2-green-b : rgba(5,150,105,.28);
      --s2-warn    : #d97706;
      --s2-warn-bg : rgba(217,119,6,.07);
      --s2-warn-b  : rgba(217,119,6,.28);
      --s2-red     : #dc2626;
      --s2-mono    : 'Space Mono', monospace;
      --s2-sans    : 'DM Sans', system-ui, sans-serif;
      display      : flex;
      gap          : 24px;
      align-items  : flex-start;
      background   : var(--s2-bg);
      min-height   : 100%;
      font-family  : var(--s2-sans);
      color        : var(--s2-ink);
      padding      : 28px;
    }
    .s2-main { flex: 1; display: flex; flex-direction: column; gap: 36px; min-width: 0; }
    .s2-rule { font-family: var(--s2-mono); font-size: .71rem; color: var(--s2-muted); padding: 10px 16px; background: var(--s2-surface); border: 1px solid var(--s2-border); border-left: 3px solid var(--s2-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }

    /* Sections */
    .s2-section { display: flex; flex-direction: column; gap: 14px; }
    .s2-section-header { display: flex; align-items: flex-start; gap: 14px; }
    .s2-section-num { font-family: var(--s2-mono); font-size: .65rem; font-weight: 700; color: #fff; background: var(--s2-blue); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .s2-section-title { font-size: .92rem; font-weight: 600; color: var(--s2-ink); line-height: 1.3; }
    .s2-section-sub   { font-size: .73rem; color: var(--s2-muted); margin-top: 2px; }

    /* Output form cards */
    .s2-form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
    .s2-card { position: relative; background: var(--s2-surface); border: 1.5px solid var(--s2-border); border-radius: 12px; padding: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 5px; transition: all .14s; user-select: none; }
    .s2-card:hover   { border-color: var(--s2-blue-b); transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .s2-card--on     { border-color: var(--s2-blue); background: var(--s2-blue-bg); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
    .s2-card-icon    { font-family: var(--s2-mono); font-size: .82rem; color: var(--s2-blue); font-weight: 700; line-height: 1; margin-bottom: 4px; }
    .s2-card-label   { font-size: .82rem; font-weight: 600; color: var(--s2-ink); line-height: 1.3; }
    .s2-card-sub     { font-size: .68rem; color: var(--s2-muted); line-height: 1.4; }
    .s2-card-example { font-family: var(--s2-mono); font-size: .62rem; color: var(--s2-muted); background: var(--s2-surface2); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--s2-border); align-self: flex-start; margin-top: 2px; }
    .s2-card-warn    { font-size: .66rem; color: var(--s2-warn); line-height: 1.4; margin-top: 2px; }
    .s2-card-check   { position: absolute; top: 9px; right: 9px; width: 18px; height: 18px; background: var(--s2-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .6rem; color: #fff; font-weight: 700; opacity: 0; transform: scale(.6); transition: opacity .14s, transform .14s; }
    .s2-card--on .s2-card-check { opacity: 1; transform: scale(1); }

    /* Opt cards */
    .s2-opt-grid { display: flex; flex-direction: column; gap: 5px; }
    .s2-opt-card { display: flex; align-items: center; gap: 12px; padding: 11px 16px; background: var(--s2-surface); border: 1.5px solid var(--s2-border); border-radius: 9px; cursor: pointer; transition: all .14s; user-select: none; }
    .s2-opt-card:hover  { border-color: var(--s2-border2); background: var(--s2-surface2); }
    .s2-opt-card--on    { border-color: var(--s2-blue); background: var(--s2-blue-bg); }
    .s2-opt-dot { width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--s2-border2); flex-shrink: 0; transition: all .14s; }
    .s2-opt-card--on .s2-opt-dot { border-color: var(--s2-blue); background: var(--s2-blue); }
    .s2-opt-label { font-size: .84rem; font-weight: 600; color: var(--s2-ink); }
    .s2-opt-sub   { font-size: .7rem; color: var(--s2-muted); margin-top: 1px; }

    /* Depth cards */
    .s2-depth-grid { display: flex; flex-direction: column; gap: 6px; }
    .s2-depth-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; background: var(--s2-surface); border: 1.5px solid var(--s2-border); border-radius: 9px; cursor: pointer; transition: all .14s; user-select: none; }
    .s2-depth-card:hover { border-color: var(--s2-border2); background: var(--s2-surface2); }
    .s2-depth-card--on   { border-color: var(--s2-green); background: var(--s2-green-bg); }
    .s2-depth-dot { width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--s2-border2); flex-shrink: 0; margin-top: 4px; transition: all .14s; }
    .s2-depth-card--on .s2-depth-dot { border-color: var(--s2-green); background: var(--s2-green); }
    .s2-depth-label   { font-size: .84rem; font-weight: 600; color: var(--s2-ink); }
    .s2-depth-sub     { font-size: .7rem; color: var(--s2-muted); margin-top: 1px; line-height: 1.4; }
    .s2-depth-example { font-family: var(--s2-mono); font-size: .62rem; color: var(--s2-muted); background: var(--s2-surface2); padding: 2px 7px; border-radius: 4px; border: 1px solid var(--s2-border); align-self: flex-start; margin-top: 4px; }
    .s2-depth-warn    { font-size: .68rem; color: var(--s2-warn); margin-top: 4px; line-height: 1.4; }

    /* Side panel */
    .s2-panel { width: 268px; flex-shrink: 0; background: var(--s2-surface); border: 1.5px solid var(--s2-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s2-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s2-border); background: #f6f4f0; }
    .s2-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s2-ink); }
    .s2-panel-sub    { font-size: .66rem; color: var(--s2-muted); margin-top: 2px; }
    .s2-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 18px; }
    .s2-panel-empty  { font-size: .74rem; color: var(--s2-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s2-panel-section { display: flex; flex-direction: column; gap: 7px; }
    .s2-panel-section--summary { background: #f0f7ff; border: 1px solid var(--s2-blue-b); border-radius: 9px; padding: 12px; }
    .s2-panel-section-title { font-family: var(--s2-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s2-muted); margin-bottom: 2px; }
    .s2-panel-algo-tag { display: inline-block; padding: 3px 9px; background: var(--s2-blue-bg); border: 1px solid var(--s2-blue-b); border-radius: 4px; font-family: var(--s2-mono); font-size: .64rem; color: var(--s2-blue); font-weight: 600; margin-bottom: 3px; }
    .s2-panel-warn  { display: flex; align-items: flex-start; gap: 5px; font-size: .7rem; color: var(--s2-warn); line-height: 1.5; padding: 6px 9px; background: var(--s2-warn-bg); border: 1px solid var(--s2-warn-b); border-radius: 6px; margin-top: 2px; }
    .s2-panel-impl  { font-size: .7rem; color: var(--s2-ink2); line-height: 1.5; padding: 6px 9px; background: var(--s2-surface2); border: 1px solid var(--s2-border); border-radius: 6px; }
    .s2-panel-elim  { font-size: .68rem; color: var(--s2-red); margin-top: 2px; }
    .s2-panel-elim-label { font-weight: 600; margin-right: 4px; }
    .s2-panel-summary-row { display: flex; gap: 8px; font-size: .76rem; color: var(--s2-ink2); }
    .s2-panel-summary-key { font-family: var(--s2-mono); font-size: .6rem; color: var(--s2-muted); text-transform: uppercase; letter-spacing: 1px; min-width: 38px; padding-top: 1px; }
    .s2-panel-body::-webkit-scrollbar { width: 3px; }
    .s2-panel-body::-webkit-scrollbar-thumb { background: var(--s2-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s2-shell { flex-direction: column; padding: 16px; }
      .s2-panel { width: 100%; position: static; max-height: none; }
      .s2-form-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage2;
    if (saved?.outputForm && saved?.optimizationType && saved?.solutionDepth) {
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state = null;
    _selectedForm = null;
    _selectedOpt  = null;
    _selectedDepth = null;
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage2;