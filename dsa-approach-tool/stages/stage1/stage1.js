// stages/stage1/stage1.js
// Input Anatomy stage — fully self-contained with cream/white theme
// Live side panel updates as user makes selections
// Module contract: render(state), onMount(state), cleanup()

const Stage1 = (() => {

  // ─── DATA ──────────────────────────────────────────────────────────────────

  const INPUT_TYPES = [
    {
      id     : 'single_array',
      icon   : '▤',
      label  : 'Single array',
      desc   : 'One sequence of values',
      example: 'nums = [1,3,2,5,4]\nheights = [2,1,5,6,2,3]',
      warn   : 'Check if order matters before sorting',
      opens  : ['Two Pointer', 'Sliding Window', 'Prefix Sum', 'Binary Search', 'DP 1D', 'Sorting + Greedy'],
    },
    {
      id     : 'two_arrays',
      icon   : '▤▤',
      label  : 'Two arrays',
      desc   : 'Two sequences — merge, compare, combine',
      example: 'nums1, nums2\nA[], B[]',
      warn   : 'Are both sorted? Does relative order matter?',
      opens  : ['Two Pointer (merge)', 'Binary Search on one', '2D DP'],
    },
    {
      id     : 'single_string',
      icon   : '"..."',
      label  : 'Single string',
      desc   : 'One character sequence',
      example: 's = "abcabc"\nword = "leetcode"',
      warn   : 'Substring vs subsequence — contiguous or not?',
      opens  : ['Sliding Window', 'KMP / Z-Algorithm', 'DP on string', 'Hashing'],
    },
    {
      id     : 'two_strings',
      icon   : '"s1""s2"',
      label  : 'Two strings',
      desc   : 'Compare, align, or transform',
      example: 's = "horse", t = "ros"\ntext, pattern',
      warn   : 'Edit distance is 2D DP. Pattern matching is KMP.',
      opens  : ['2D DP (LCS, Edit Distance)', 'KMP', 'Two Pointer'],
    },
    {
      id     : 'multiple_strings',
      icon   : '["..."]',
      label  : 'Multiple strings',
      desc   : 'Array of strings — search or match',
      example: 'words = ["eat","tea","tan"]',
      warn   : 'Trie for prefix queries. Hashing for grouping.',
      opens  : ['Trie', 'Hashing', 'Sorting + group'],
    },
    {
      id     : 'matrix_grid',
      icon   : '⊞',
      label  : 'Matrix / Grid',
      desc   : '2D array — cells, rows, columns',
      example: 'grid[i][j]\nmatrix[r][c]',
      warn   : 'BFS on grid for shortest path. DFS for connected components.',
      opens  : ['BFS on grid', 'DFS flood fill', '2D DP', '2D Prefix Sum'],
    },
    {
      id     : 'graph_edge_list',
      icon   : '◉—◉',
      label  : 'Graph — edge list',
      desc   : 'Explicit edges given as pairs',
      example: 'edges = [[0,1],[1,2]]\nconnections = [[a,b,cost]]',
      warn   : 'Weighted or unweighted? Directed or undirected?',
      opens  : ['BFS/DFS', 'Dijkstra', 'Union Find', 'Topo Sort', 'MST'],
    },
    {
      id     : 'graph_adjacency',
      icon   : '◉→◉',
      label  : 'Graph — adjacency',
      desc   : 'Neighbors given directly',
      example: 'graph[i] = [neighbors]\nadj[u][v] = weight',
      warn   : 'Adjacency matrix for n > 4000 is 40GB — use list',
      opens  : ['BFS/DFS', 'Dijkstra', 'Floyd-Warshall (matrix only)'],
    },
    {
      id     : 'implicit_graph',
      icon   : '◎⟿◎',
      label  : 'Implicit graph',
      desc   : 'Graph defined by a rule — not stored',
      example: 'grid cells connected by movement\nwords connected by one edit',
      warn   : 'Generate neighbors on the fly — do NOT build explicit adjacency list',
      opens  : ['BFS on states', 'DFS with visited set'],
    },
    {
      id     : 'tree_explicit',
      icon   : '⬡',
      label  : 'Tree — explicit',
      desc   : 'Given as root node or parent array',
      example: 'root = TreeNode(1)\nparent[i] = parent of node i',
      warn   : 'Recursive DFS on skewed tree n=10⁵ → stack overflow. Use iterative.',
      opens  : ['Tree DP', 'DFS post-order', 'LCA', 'Euler Tour'],
    },
    {
      id     : 'intervals',
      icon   : '[——]',
      label  : 'Intervals / ranges',
      desc   : 'Start and end pairs',
      example: 'intervals = [[1,3],[2,6],[8,10]]\nmeetings = [[s,e]]',
      warn   : 'Sort by start time first. Check if touching endpoints count as overlap.',
      opens  : ['Sort + Greedy', 'Line Sweep', 'Priority Queue', 'Difference Array'],
    },
    {
      id     : 'single_number',
      icon   : '42',
      label  : 'Single number',
      desc   : 'One integer — large or small',
      example: 'n = 12\nnum = 1234567890',
      warn   : 'If n up to 10^18 and property depends on digits → Digit DP',
      opens  : ['Math / Number Theory', 'Digit DP', 'Binary Search', 'GCD / LCM'],
    },
    {
      id     : 'multiple_numbers',
      icon   : 'a b c',
      label  : 'Multiple independent numbers',
      desc   : 'Not a sequence — separate values',
      example: 'a = 3, b = 5, k = 2\nn, m, q given separately',
      warn   : 'Check for overflow when multiplying large values',
      opens  : ['Math', 'Modular Arithmetic', 'GCD / LCM', 'Binary Search'],
    },
  ];

  const SECONDARY_SIGNALS = [
    { id: 'sorted',       text: 'Input is already sorted',                    tag: 'ordering',          opens: 'Binary Search and Two Pointer become directly applicable' },
    { id: 'small_range',  text: 'Values are in a small range (0–26, 0–9, 0–1)',tag: 'values',           opens: 'Use direct array indexing instead of HashMap. Frequency arrays over HashMaps.' },
    { id: 'duplicates',   text: 'Input contains duplicates',                   tag: 'values',            opens: 'Must handle duplicate counting explicitly in Two Pointer / Backtracking.' },
    { id: 'distinct',     text: 'All values are distinct',                     tag: 'values',            opens: 'Permutation-style reasoning possible. No duplicate handling needed.' },
    { id: 'non_negative', text: 'All values are non-negative',                 tag: 'values',            opens: 'Sliding Window validity is monotone — can use standard shrink pattern.' },
    { id: 'negative',     text: 'Values can be negative',                      tag: 'values',            opens: 'Sliding Window breaks. Use Prefix Sum + HashMap for subarray sum problems.' },
    { id: 'weighted',     text: 'Graph edges are weighted',                    tag: 'graph',             opens: 'BFS gives wrong shortest path. Use Dijkstra (non-neg) or Bellman-Ford (neg).' },
    { id: 'directed',     text: 'Graph is directed',                           tag: 'graph',             opens: 'Topological sort is valid. SCC algorithms (Tarjan) apply. Union Find does NOT.' },
    { id: 'rooted',       text: 'Tree is rooted',                              tag: 'tree',              opens: 'DFS from root. Tree DP. Binary Lifting for LCA.' },
    { id: 'large_values', text: 'Values can be very large (up to 10⁹ or 10¹⁸)',tag: 'values',          opens: 'Cannot use value as array index. Coordinate compression + BIT/Seg Tree.' },
    { id: 'modulo',       text: 'Answer requires modulo 10⁹+7',               tag: 'output',            opens: 'Apply mod after every addition and multiplication. (a*b)%MOD — use long long.' },
    { id: 'binary',       text: 'Values are binary (0 or 1)',                  tag: 'values',            opens: 'XOR tricks apply. Bit manipulation. Sliding window with at-most-2-distinct.' },
    { id: 'geometry',     text: 'Input is 2D points / coordinates',            tag: 'geometry',          opens: 'Convex Hull. Sweep Line. Distance calculations — watch floating point.' },
    { id: 'parent_array', text: 'Array where a[i] = parent of node i',        tag: 'implicit_structure', opens: 'Build tree from parent array. Tree DP applies.' },
    { id: 'next_state',   text: 'Array where a[i] = next state from i',       tag: 'implicit_structure', opens: 'Functional graph — rho structure with cycles. Each node has out-degree 1. ⚠ Do not confuse with general directed graph' },
  ];

  const QUERY_TYPES = [
    { id: 'none',    label: 'No queries',                    desc: 'Single computation on the full input',        opens: 'No preprocessing needed — solve directly' },
    { id: 'one',     label: 'One query',                     desc: 'q = 1, answer one specific question',         opens: 'No data structure overhead needed. Direct O(n) or O(n log n) solve.' },
    { id: 'offline', label: 'Multiple queries — offline',    desc: 'All queries known upfront — can sort them',   opens: "Mo's Algorithm. Sort queries by right endpoint. Offline divide & conquer." },
    { id: 'online',  label: 'Multiple queries — online',     desc: 'Must answer each query before seeing next',   opens: 'Segment Tree or BIT. Persistent data structures. Cannot sort queries.' },
    { id: 'updates', label: 'Updates AND queries both',      desc: 'Modify data and answer range questions',      opens: 'Segment Tree with lazy propagation. BIT for point updates + range queries.' },
  ];

  const COMBINATION_SIGNALS = [
    {
      trigger: ['single_array', 'tree_explicit'],
      label  : 'Array + Tree',
      effect : 'Cartesian Tree (implicitly defined). Stack-based construction.',
      hint   : 'Cartesian Tree → Stack construction → Tree DP',
    },
    {
      trigger: ['graph_edge_list', 'graph_adjacency'],
      label  : 'Graph + Many queries',
      effect : 'Preprocess graph structure. BFS/DFS once, answer queries in O(1) or O(log n).',
      hint   : 'BFS + Sparse Table for LCA queries',
    },
    {
      trigger: ['intervals'],
      label  : 'Intervals + Point queries',
      effect : 'Coordinate compression then Segment Tree or BIT',
      hint   : 'Coordinate Compression → Segment Tree',
    },
  ];

  // ─── STATE ─────────────────────────────────────────────────────────────────

  let _selectedTypes   = new Set();
  let _selectedSignals = new Set();
  let _queryType       = null;
  let _state           = null;

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage1 ?? {};

    _selectedTypes   = new Set(saved.inputTypes       ?? []);
    _selectedSignals = new Set(saved.secondarySignals  ?? []);
    _queryType       = saved.queryType                 ?? null;

    const wrapper = document.createElement('div');
    wrapper.className = 's1-shell';
    wrapper.innerHTML = `
      <div class="s1-main" id="s1-main">
        <div class="s1-rule">Understand what you are given before thinking about what to do with it.</div>

        <!-- Input types -->
        <section class="s1-section" id="s1-section-types">
          <div class="s1-section-header">
            <span class="s1-section-num">01</span>
            <div>
              <div class="s1-section-title">What is the primary input shape?</div>
              <div class="s1-section-sub">Select all that apply — secondary signals narrow further</div>
            </div>
          </div>
          <div class="s1-type-grid" id="s1-type-grid"></div>
        </section>

        <!-- Secondary signals -->
        <section class="s1-section" id="s1-section-signals">
          <div class="s1-section-header">
            <span class="s1-section-num">02</span>
            <div>
              <div class="s1-section-title">Secondary signals</div>
              <div class="s1-section-sub">Additional properties of the input — check all that apply</div>
            </div>
          </div>
          <div class="s1-signals-list" id="s1-signals-list"></div>
        </section>

        <!-- Query type -->
        <section class="s1-section" id="s1-section-queries">
          <div class="s1-section-header">
            <span class="s1-section-num">03</span>
            <div>
              <div class="s1-section-title">Are there queries on top of the input?</div>
              <div class="s1-section-sub">This determines which data structures are available</div>
            </div>
          </div>
          <div class="s1-query-grid" id="s1-query-grid"></div>
        </section>
      </div>

      <!-- Live side panel -->
      <aside class="s1-panel" id="s1-panel">
        <div class="s1-panel-header">
          <div class="s1-panel-title">What this opens</div>
          <div class="s1-panel-sub">Updates as you select</div>
        </div>
        <div class="s1-panel-body" id="s1-panel-body">
          <div class="s1-panel-empty">← Select input types to see implications</div>
        </div>
      </aside>
    `;

    // Inject type cards
    const typeGrid = wrapper.querySelector('#s1-type-grid');
    INPUT_TYPES.forEach(t => {
      typeGrid.appendChild(_buildTypeCard(t));
    });

    // Inject signal checkboxes
    const signalsList = wrapper.querySelector('#s1-signals-list');
    SECONDARY_SIGNALS.forEach(s => {
      signalsList.appendChild(_buildSignalRow(s));
    });

    // Inject query options
    const queryGrid = wrapper.querySelector('#s1-query-grid');
    QUERY_TYPES.forEach(q => {
      queryGrid.appendChild(_buildQueryCard(q));
    });

    // Attach styles
    _injectStyles();

    // Initial panel render
    setTimeout(() => _updatePanel(wrapper), 0);

    return wrapper;
  }

  // ─── TYPE CARD ─────────────────────────────────────────────────────────────

  function _buildTypeCard(type) {
    const isSelected = _selectedTypes.has(type.id);
    const card = document.createElement('label');
    card.className = `s1-type-card ${isSelected ? 's1-type-card--on' : ''}`;
    card.dataset.id = type.id;
    card.innerHTML = `
      <input type="checkbox" class="s1-type-cb" ${isSelected ? 'checked' : ''} data-id="${type.id}">
      <div class="s1-type-card-inner">
        <div class="s1-type-icon">${type.icon}</div>
        <div class="s1-type-label">${type.label}</div>
        <div class="s1-type-desc">${type.desc}</div>
        <div class="s1-type-check">✓</div>
      </div>
    `;

    card.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) {
        _selectedTypes.add(type.id);
        card.classList.add('s1-type-card--on');
      } else {
        _selectedTypes.delete(type.id);
        card.classList.remove('s1-type-card--on');
      }
      _onChange();
    });

    return card;
  }

  // ─── SIGNAL ROW ────────────────────────────────────────────────────────────

  function _buildSignalRow(signal) {
    const isSelected = _selectedSignals.has(signal.id);
    const row = document.createElement('label');
    row.className = `s1-signal-row ${isSelected ? 's1-signal-row--on' : ''}`;
    row.dataset.id = signal.id;
    row.innerHTML = `
      <input type="checkbox" class="s1-signal-cb" ${isSelected ? 'checked' : ''} data-id="${signal.id}">
      <div class="s1-signal-row-inner">
        <div class="s1-signal-text">${signal.text}</div>
        <span class="s1-signal-tag">${signal.tag}</span>
      </div>
    `;

    row.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) {
        _selectedSignals.add(signal.id);
        row.classList.add('s1-signal-row--on');
      } else {
        _selectedSignals.delete(signal.id);
        row.classList.remove('s1-signal-row--on');
      }
      _onChange();
    });

    return row;
  }

  // ─── QUERY CARD ────────────────────────────────────────────────────────────

  function _buildQueryCard(qtype) {
    const isSelected = _queryType === qtype.id;
    const card = document.createElement('div');
    card.className = `s1-query-card ${isSelected ? 's1-query-card--on' : ''}`;
    card.dataset.id = qtype.id;
    card.innerHTML = `
      <div class="s1-query-dot"></div>
      <div class="s1-query-content">
        <div class="s1-query-label">${qtype.label}</div>
        <div class="s1-query-desc">${qtype.desc}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.s1-query-card').forEach(c => c.classList.remove('s1-query-card--on'));
      card.classList.add('s1-query-card--on');
      _queryType = qtype.id;
      _onChange();
    });

    return card;
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper) {
    const body = (wrapper ?? document).querySelector('#s1-panel-body');
    if (!body) return;

    body.innerHTML = '';

    const hasAny = _selectedTypes.size > 0 || _selectedSignals.size > 0 || _queryType;

    if (!hasAny) {
      body.innerHTML = '<div class="s1-panel-empty">← Select input types to see implications</div>';
      return;
    }

    // ── Input type implications ────────────────────────────────────────────
    if (_selectedTypes.size > 0) {
      const section = document.createElement('div');
      section.className = 's1-panel-section';
      section.innerHTML = '<div class="s1-panel-section-title">Input type opens</div>';

      const allOpens = new Set();
      _selectedTypes.forEach(id => {
        const t = INPUT_TYPES.find(x => x.id === id);
        if (t) t.opens.forEach(o => allOpens.add(o));
      });

      allOpens.forEach(o => {
        const tag = document.createElement('div');
        tag.className = 's1-panel-algo-tag';
        tag.textContent = o;
        section.appendChild(tag);
      });

      body.appendChild(section);

      // Warnings for selected types
      const warnSection = document.createElement('div');
      warnSection.className = 's1-panel-section';
      let hasWarn = false;

      _selectedTypes.forEach(id => {
        const t = INPUT_TYPES.find(x => x.id === id);
        if (t?.warn) {
          hasWarn = true;
          const w = document.createElement('div');
          w.className = 's1-panel-warn';
          w.innerHTML = `<span class="s1-panel-warn-icon">⚠</span><span>${t.warn}</span>`;
          warnSection.appendChild(w);
        }
      });

      if (hasWarn) {
        warnSection.insertAdjacentHTML('afterbegin', '<div class="s1-panel-section-title">Watch out</div>');
        body.appendChild(warnSection);
      }
    }

    // ── Signal implications ────────────────────────────────────────────────
    if (_selectedSignals.size > 0) {
      const section = document.createElement('div');
      section.className = 's1-panel-section';
      section.innerHTML = '<div class="s1-panel-section-title">Signal implications</div>';

      _selectedSignals.forEach(id => {
        const s = SECONDARY_SIGNALS.find(x => x.id === id);
        if (!s) return;
        const item = document.createElement('div');
        item.className = 's1-panel-signal-item';
        item.innerHTML = `
          <div class="s1-panel-signal-name">${s.text}</div>
          <div class="s1-panel-signal-opens">→ ${s.opens}</div>
        `;
        section.appendChild(item);
      });

      body.appendChild(section);
    }

    // ── Query implications ─────────────────────────────────────────────────
    if (_queryType) {
      const q = QUERY_TYPES.find(x => x.id === _queryType);
      if (q) {
        const section = document.createElement('div');
        section.className = 's1-panel-section';
        section.innerHTML = `
          <div class="s1-panel-section-title">Query structure</div>
          <div class="s1-panel-query-item">
            <div class="s1-panel-query-label">${q.label}</div>
            <div class="s1-panel-query-opens">${q.opens}</div>
          </div>
        `;
        body.appendChild(section);
      }
    }

    // ── Combination signals ────────────────────────────────────────────────
    const combos = COMBINATION_SIGNALS.filter(c =>
      c.trigger.every(t => _selectedTypes.has(t))
    );

    if (combos.length > 0) {
      const section = document.createElement('div');
      section.className = 's1-panel-section s1-panel-section--highlight';
      section.innerHTML = '<div class="s1-panel-section-title">Combination detected</div>';

      combos.forEach(combo => {
        const item = document.createElement('div');
        item.className = 's1-panel-combo';
        item.innerHTML = `
          <div class="s1-panel-combo-label">${combo.label}</div>
          <div class="s1-panel-combo-effect">${combo.effect}</div>
          <div class="s1-panel-combo-hint">Template: ${combo.hint}</div>
        `;
        section.appendChild(item);
      });

      body.appendChild(section);
    }

    // ── Bipartite check ───────────────────────────────────────────────────
    const hasUndirectedGraph = _selectedTypes.has('graph_edge_list') || _selectedTypes.has('graph_adjacency');
    const isDirected = _selectedSignals.has('directed');
    if (hasUndirectedGraph && !isDirected) {
      const note = document.createElement('div');
      note.className = 's1-panel-bipartite';
      note.innerHTML = '🔍 Undirected graph — check if 2-colorable (bipartite). May open matching.';
      body.appendChild(note);
    }
  }

  // ─── CHANGE HANDLER ────────────────────────────────────────────────────────

  function _onChange() {
    // Update panel
    _updatePanel();

    // Save answers
    const answers = {
      inputTypes      : [..._selectedTypes],
      secondarySignals: [..._selectedSignals],
      queryType       : _queryType,
    };

    if (typeof State !== 'undefined') {
      State.setAnswer('stage1', answers);
    }

    // Fire answer update event
    document.dispatchEvent(new CustomEvent('dsa:answer-update', {
      detail: { stageId: 'stage1', key: 'inputTypes', value: [..._selectedTypes] }
    }));

    // Check completion
    const isComplete = _selectedTypes.size > 0 && _queryType !== null;
    if (typeof Renderer !== 'undefined') {
      Renderer.setNextEnabled(isComplete);
    }

    if (isComplete) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: { stageId: 'stage1', answers }
      }));
    }
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s1-styles')) return;

    const style = document.createElement('style');
    style.id = 's1-styles';
    style.textContent = `

    /* ── Cream/white theme tokens ────────────────────────────────────── */
    .s1-shell {
      --s1-bg      : #faf8f4;
      --s1-surface : #ffffff;
      --s1-border  : #e8e2d8;
      --s1-border2 : #d4ccb8;
      --s1-ink     : #1a1a2e;
      --s1-ink2    : #4a4560;
      --s1-muted   : #8a8070;
      --s1-accent  : #2563eb;
      --s1-accent-bg: rgba(37,99,235,.06);
      --s1-accent-border: rgba(37,99,235,.25);
      --s1-green   : #059669;
      --s1-green-bg: rgba(5,150,105,.06);
      --s1-green-border: rgba(5,150,105,.25);
      --s1-amber   : #d97706;
      --s1-amber-bg: rgba(217,119,6,.06);
      --s1-amber-border: rgba(217,119,6,.25);
      --s1-r       : 8px;
      --s1-r-sm    : 5px;
      --s1-r-lg    : 12px;
      --s1-font    : 'DM Sans', 'Syne', system-ui, sans-serif;
      --s1-mono    : 'JetBrains Mono', 'Space Mono', monospace;
    }

    /* ── Layout ──────────────────────────────────────────────────────── */
    .s1-shell {
      display        : flex;
      gap            : 24px;
      align-items    : flex-start;
      background     : var(--s1-bg);
      min-height     : 100%;
      font-family    : var(--s1-font);
      color          : var(--s1-ink);
      padding        : 28px;
    }

    .s1-main {
      flex           : 1;
      display        : flex;
      flex-direction : column;
      gap            : 36px;
      min-width      : 0;
    }

    /* ── Rule ────────────────────────────────────────────────────────── */
    .s1-rule {
      font-family    : var(--s1-mono);
      font-size      : .72rem;
      color          : var(--s1-muted);
      letter-spacing : 0.5px;
      padding        : 10px 16px;
      background     : var(--s1-surface);
      border         : 1px solid var(--s1-border);
      border-left    : 3px solid var(--s1-accent);
      border-radius  : 0 var(--s1-r) var(--s1-r) 0;
    }

    /* ── Sections ────────────────────────────────────────────────────── */
    .s1-section { display: flex; flex-direction: column; gap: 14px; }

    .s1-section-header {
      display    : flex;
      align-items: flex-start;
      gap        : 14px;
    }

    .s1-section-num {
      font-family    : var(--s1-mono);
      font-size      : .65rem;
      font-weight    : 700;
      color          : var(--s1-surface);
      background     : var(--s1-accent);
      width          : 26px;
      height         : 26px;
      border-radius  : 50%;
      display        : flex;
      align-items    : center;
      justify-content: center;
      flex-shrink    : 0;
      margin-top     : 1px;
      letter-spacing : .5px;
    }

    .s1-section-title {
      font-size  : .92rem;
      font-weight: 600;
      color      : var(--s1-ink);
      line-height: 1.3;
    }

    .s1-section-sub {
      font-size  : .73rem;
      color      : var(--s1-muted);
      margin-top : 2px;
    }

    /* ── Type cards grid ─────────────────────────────────────────────── */
    .s1-type-grid {
      display              : grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap                  : 8px;
    }

    .s1-type-card {
      position      : relative;
      background    : var(--s1-surface);
      border        : 1.5px solid var(--s1-border);
      border-radius : var(--s1-r-lg);
      cursor        : pointer;
      transition    : border-color .15s, box-shadow .15s, background .15s;
      display       : block;
      user-select   : none;
    }

    .s1-type-card:hover {
      border-color: var(--s1-accent-border);
      box-shadow  : 0 2px 8px rgba(37,99,235,.06);
    }

    .s1-type-card--on {
      border-color: var(--s1-accent);
      background  : var(--s1-accent-bg);
      box-shadow  : 0 0 0 3px rgba(37,99,235,.08);
    }

    .s1-type-card input[type="checkbox"] {
      position: absolute;
      opacity : 0;
      width   : 0;
      height  : 0;
    }

    .s1-type-card-inner {
      padding : 14px 14px 12px;
      position: relative;
    }

    .s1-type-icon {
      font-family : var(--s1-mono);
      font-size   : .82rem;
      color       : var(--s1-accent);
      font-weight : 700;
      margin-bottom: 8px;
      line-height : 1;
    }

    .s1-type-label {
      font-size  : .8rem;
      font-weight: 600;
      color      : var(--s1-ink);
      margin-bottom: 3px;
      line-height: 1.3;
    }

    .s1-type-desc {
      font-size  : .68rem;
      color      : var(--s1-muted);
      line-height: 1.4;
    }

    .s1-type-check {
      position     : absolute;
      top          : 10px;
      right        : 10px;
      width        : 18px;
      height       : 18px;
      background   : var(--s1-accent);
      border-radius: 50%;
      display      : flex;
      align-items  : center;
      justify-content: center;
      font-size    : .6rem;
      color        : #fff;
      font-weight  : 700;
      opacity      : 0;
      transform    : scale(0.6);
      transition   : opacity .15s, transform .15s;
    }

    .s1-type-card--on .s1-type-check {
      opacity  : 1;
      transform: scale(1);
    }

    /* ── Signal rows ─────────────────────────────────────────────────── */
    .s1-signals-list {
      display       : flex;
      flex-direction: column;
      gap           : 4px;
    }

    .s1-signal-row {
      display      : flex;
      align-items  : center;
      gap          : 10px;
      padding      : 9px 14px;
      background   : var(--s1-surface);
      border       : 1.5px solid var(--s1-border);
      border-radius: var(--s1-r);
      cursor       : pointer;
      transition   : border-color .15s, background .15s;
      user-select  : none;
    }

    .s1-signal-row:hover  { border-color: var(--s1-border2); background: #fcfaf7; }
    .s1-signal-row--on    { border-color: var(--s1-green); background: var(--s1-green-bg); }

    .s1-signal-row input[type="checkbox"] {
      width       : 15px;
      height      : 15px;
      accent-color: var(--s1-green);
      cursor      : pointer;
      flex-shrink : 0;
    }

    .s1-signal-row-inner {
      display    : flex;
      align-items: center;
      gap        : 10px;
      flex       : 1;
      min-width  : 0;
    }

    .s1-signal-text {
      font-size  : .78rem;
      color      : var(--s1-ink2);
      flex       : 1;
      line-height: 1.4;
    }

    .s1-signal-row--on .s1-signal-text { color: var(--s1-ink); font-weight: 500; }

    .s1-signal-tag {
      font-family   : var(--s1-mono);
      font-size     : .56rem;
      color         : var(--s1-muted);
      background    : var(--s1-bg);
      padding       : 1px 6px;
      border-radius : 4px;
      border        : 1px solid var(--s1-border);
      text-transform: uppercase;
      letter-spacing: .5px;
      white-space   : nowrap;
      flex-shrink   : 0;
    }

    /* ── Query cards ─────────────────────────────────────────────────── */
    .s1-query-grid {
      display       : flex;
      flex-direction: column;
      gap           : 6px;
    }

    .s1-query-card {
      display      : flex;
      align-items  : center;
      gap          : 12px;
      padding      : 12px 16px;
      background   : var(--s1-surface);
      border       : 1.5px solid var(--s1-border);
      border-radius: var(--s1-r);
      cursor       : pointer;
      transition   : border-color .15s, background .15s;
      user-select  : none;
    }

    .s1-query-card:hover  { border-color: var(--s1-border2); }
    .s1-query-card--on    { border-color: var(--s1-accent); background: var(--s1-accent-bg); }

    .s1-query-dot {
      width        : 10px;
      height       : 10px;
      border-radius: 50%;
      border       : 2px solid var(--s1-border2);
      flex-shrink  : 0;
      transition   : border-color .15s, background .15s;
    }

    .s1-query-card--on .s1-query-dot {
      border-color: var(--s1-accent);
      background  : var(--s1-accent);
    }

    .s1-query-label {
      font-size  : .82rem;
      font-weight: 600;
      color      : var(--s1-ink);
    }

    .s1-query-desc {
      font-size  : .71rem;
      color      : var(--s1-muted);
      margin-top : 1px;
    }

    /* ── Side panel ──────────────────────────────────────────────────── */
    .s1-panel {
      width         : 280px;
      flex-shrink   : 0;
      background    : var(--s1-surface);
      border        : 1.5px solid var(--s1-border);
      border-radius : var(--s1-r-lg);
      overflow      : hidden;
      position      : sticky;
      top            : 80px;
      max-height     : calc(100vh - 120px);
      display        : flex;
      flex-direction : column;
    }

    .s1-panel-header {
      padding      : 14px 16px 12px;
      border-bottom: 1px solid var(--s1-border);
      background   : #f6f4f0;
    }

    .s1-panel-title {
      font-size  : .82rem;
      font-weight: 700;
      color      : var(--s1-ink);
    }

    .s1-panel-sub {
      font-size  : .66rem;
      color      : var(--s1-muted);
      margin-top : 2px;
    }

    .s1-panel-body {
      flex       : 1;
      overflow-y : auto;
      padding    : 14px 16px;
      display    : flex;
      flex-direction: column;
      gap        : 18px;
    }

    .s1-panel-empty {
      font-size  : .74rem;
      color      : var(--s1-muted);
      font-style : italic;
      text-align : center;
      padding    : 24px 0;
      line-height: 1.6;
    }

    /* Panel sections */
    .s1-panel-section {
      display       : flex;
      flex-direction: column;
      gap           : 7px;
    }

    .s1-panel-section--highlight {
      background   : #fffbf0;
      border       : 1px solid var(--s1-amber-border);
      border-radius: var(--s1-r);
      padding      : 10px 12px;
    }

    .s1-panel-section-title {
      font-family   : var(--s1-mono);
      font-size     : .58rem;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color         : var(--s1-muted);
      margin-bottom : 2px;
    }

    /* Algo tags */
    .s1-panel-algo-tag {
      display      : inline-block;
      padding      : 3px 9px;
      background   : var(--s1-accent-bg);
      border       : 1px solid var(--s1-accent-border);
      border-radius: 4px;
      font-family  : var(--s1-mono);
      font-size    : .65rem;
      color        : var(--s1-accent);
      font-weight  : 600;
      margin-bottom: 3px;
    }

    /* Warnings in panel */
    .s1-panel-warn {
      display    : flex;
      align-items: flex-start;
      gap        : 6px;
      font-size  : .71rem;
      color      : var(--s1-amber);
      line-height: 1.5;
    }

    .s1-panel-warn-icon { flex-shrink: 0; }

    /* Signal items in panel */
    .s1-panel-signal-item {
      padding      : 7px 10px;
      background   : var(--s1-bg);
      border       : 1px solid var(--s1-border);
      border-radius: var(--s1-r-sm);
      display      : flex;
      flex-direction: column;
      gap          : 3px;
    }

    .s1-panel-signal-name {
      font-size  : .71rem;
      font-weight: 500;
      color      : var(--s1-ink2);
      line-height: 1.3;
    }

    .s1-panel-signal-opens {
      font-size  : .68rem;
      color      : var(--s1-green);
      line-height: 1.4;
    }

    /* Query in panel */
    .s1-panel-query-item {
      padding      : 8px 10px;
      background   : var(--s1-accent-bg);
      border       : 1px solid var(--s1-accent-border);
      border-radius: var(--s1-r-sm);
    }

    .s1-panel-query-label { font-size: .74rem; font-weight: 600; color: var(--s1-ink); }
    .s1-panel-query-opens { font-size: .68rem; color: var(--s1-ink2); margin-top: 3px; line-height: 1.5; }

    /* Combos */
    .s1-panel-combo {
      display       : flex;
      flex-direction: column;
      gap           : 3px;
    }

    .s1-panel-combo-label  { font-size: .76rem; font-weight: 600; color: var(--s1-amber); }
    .s1-panel-combo-effect { font-size: .7rem;  color: var(--s1-ink2); line-height: 1.4; }
    .s1-panel-combo-hint   {
      font-family  : var(--s1-mono);
      font-size    : .62rem;
      color        : var(--s1-muted);
      padding      : 3px 7px;
      background   : var(--s1-bg);
      border-radius: 4px;
      margin-top   : 2px;
    }

    /* Bipartite note */
    .s1-panel-bipartite {
      font-size    : .7rem;
      color        : var(--s1-ink2);
      background   : var(--s1-bg);
      border       : 1px solid var(--s1-border2);
      border-radius: var(--s1-r-sm);
      padding      : 8px 10px;
      line-height  : 1.5;
    }

    /* Panel scrollbar */
    .s1-panel-body::-webkit-scrollbar       { width: 3px; }
    .s1-panel-body::-webkit-scrollbar-track { background: transparent; }
    .s1-panel-body::-webkit-scrollbar-thumb { background: var(--s1-border2); border-radius: 4px; }

    /* Responsive — hide panel on small screens */
    @media (max-width: 900px) {
      .s1-shell   { flex-direction: column; padding: 16px; }
      .s1-panel   { width: 100%; position: static; max-height: none; }
      .s1-type-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    }
    `;

    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage1;
    if (!saved) return;
    const isComplete = (saved.inputTypes?.length ?? 0) > 0 && saved.queryType !== null;
    if (isComplete && typeof Renderer !== 'undefined') {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _selectedTypes   = new Set();
    _selectedSignals = new Set();
    _queryType       = null;
    _state           = null;
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage1;
}