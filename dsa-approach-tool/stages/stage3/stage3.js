// stages/stage3/stage3.js
// Structural Properties — cream/white theme, self-contained styles
// Same pattern as stage0/stage1/stage2/stage2-5

const Stage3 = (() => {

  let _state     = null;
  let _answers   = {};
  let _dpSubtype = null;
  let _graphGoal = null;

  const PROPERTY_MODULES = {
    orderSensitivity    : typeof OrderSensitivity    !== 'undefined' ? OrderSensitivity    : null,
    subproblemOverlap   : typeof SubproblemOverlap   !== 'undefined' ? SubproblemOverlap   : null,
    feasibilityBoundary : typeof FeasibilityBoundary !== 'undefined' ? FeasibilityBoundary : null,
    localOptimality     : typeof LocalOptimality     !== 'undefined' ? LocalOptimality     : null,
    stateSpace          : typeof StateSpace          !== 'undefined' ? StateSpace          : null,
    dependencyStructure : typeof DependencyStructure !== 'undefined' ? DependencyStructure : null,
    searchSpace         : typeof SearchSpace         !== 'undefined' ? SearchSpace         : null,
  };

  const PROPERTY_ORDER = [
    'orderSensitivity',
    'subproblemOverlap',
    'feasibilityBoundary',
    'localOptimality',
    'stateSpace',
    'dependencyStructure',
    'searchSpace',
  ];

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state     = state;
    const saved = state.answers?.stage3 ?? {};
    _answers   = { ...(saved.properties ?? {}) };
    _dpSubtype = saved.dpSubtype ?? null;
    _graphGoal = saved.graphGoal ?? null;

    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 's3-shell';

    const inputTypes  = state.answers?.stage1?.inputTypes ?? [];
    const graphInputs = ['graph_edge_list', 'graph_adjacency', 'implicit_graph', 'grid'];
    const hasGraph    = inputTypes.some(t => graphInputs.includes(t));
    const isDPLikely  = _answers.subproblemOverlap === 'yes_direct';
    const answered    = Object.keys(_answers).length;

    wrapper.innerHTML = `
      <div class="s3-main">

        <div class="s3-rule">
          Answer structural questions — not "what algorithm". The algorithm follows from structure.
          Seven properties narrow the approach. Sub-classifiers activate when relevant.
        </div>

        <!-- Progress strip -->
        <div class="s3-progress-strip" id="s3-progress-strip"></div>

        <!-- Section 01: Property questions -->
        <section class="s3-section">
          <div class="s3-section-header">
            <span class="s3-section-num">01</span>
            <div>
              <div class="s3-section-title">Seven structural property questions</div>
              <div class="s3-section-sub">Answer at least 5 — the algorithm family emerges from your answers</div>
            </div>
          </div>
          <div class="s3-prop-list" id="s3-prop-list"></div>
        </section>

        <!-- Section 02: DP sub-classifier (conditional) -->
        <section class="s3-section" id="s3-dp-section" style="display:${isDPLikely ? '' : 'none'}">
          <div class="s3-section-header">
            <span class="s3-section-num s3-section-num--blue">02</span>
            <div>
              <div class="s3-section-title">DP Sub-Classifier</div>
              <div class="s3-section-sub">Overlapping subproblems detected — identify which DP variant</div>
            </div>
          </div>
          <div id="s3-dp-content"></div>
        </section>

        <!-- Section 03: Graph deep-dive (conditional) -->
        <section class="s3-section" id="s3-graph-section" style="display:${hasGraph ? '' : 'none'}">
          <div class="s3-section-header">
            <span class="s3-section-num s3-section-num--violet">03</span>
            <div>
              <div class="s3-section-title">Graph Deep-Dive</div>
              <div class="s3-section-sub">Graph input detected — characterize and identify goal</div>
            </div>
          </div>
          <div id="s3-graph-content"></div>
        </section>

      </div>

      <!-- Live side panel -->
      <aside class="s3-panel">
        <div class="s3-panel-header">
          <div class="s3-panel-title">Structural findings</div>
          <div class="s3-panel-sub">Updates as you answer</div>
        </div>
        <div class="s3-panel-body" id="s3-panel-body">
          <div class="s3-panel-empty">← Answer property questions to see findings</div>
        </div>
      </aside>
    `;

    _buildProgressStrip(wrapper, saved);
    _buildPropList(wrapper, saved);
    _buildDPContent(wrapper, saved);
    _buildGraphContent(wrapper, saved, hasGraph);

    setTimeout(() => _updatePanel(wrapper), 0);

    return wrapper;
  }

  // ─── PROGRESS STRIP ────────────────────────────────────────────────────────

  function _buildProgressStrip(wrapper, saved) {
    const strip = wrapper.querySelector('#s3-progress-strip');
    if (!strip) return;

    PROPERTY_ORDER.forEach((propId, idx) => {
      const mod    = PROPERTY_MODULES[propId];
      const prop   = mod?.getProperty?.() ?? { label: propId };
      const answer = saved.properties?.[propId];
      const isUnsure = answer === 'unsure';

      const dot = document.createElement('div');
      dot.className = `s3-prog-dot ${answer ? (isUnsure ? 's3-prog-dot--unsure' : 's3-prog-dot--done') : ''}`;
      dot.dataset.propId = propId;
      dot.innerHTML = `
        <span class="s3-prog-dot-num">${idx + 1}</span>
        <span class="s3-prog-dot-label">${prop.label?.replace(/3[A-Z] — /, '') ?? propId}</span>
      `;
      dot.addEventListener('click', () => {
        const block = wrapper.querySelector(`#s3-prop-${propId}`);
        if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      strip.appendChild(dot);
    });
  }

  function _refreshProgressStrip(wrapper) {
    PROPERTY_ORDER.forEach(propId => {
      const dot = wrapper.querySelector(`[data-prop-id="${propId}"]`);
      if (!dot) return;
      const answer = _answers[propId];
      dot.classList.toggle('s3-prog-dot--done',   !!answer && answer !== 'unsure');
      dot.classList.toggle('s3-prog-dot--unsure',  answer === 'unsure');
    });
  }

  // ─── PROPERTY LIST ─────────────────────────────────────────────────────────

  function _buildPropList(wrapper, saved) {
    const list = wrapper.querySelector('#s3-prop-list');
    if (!list) return;

    PROPERTY_ORDER.forEach((propId, idx) => {
      const mod  = PROPERTY_MODULES[propId];
      if (!mod) return;
      const prop = mod.getProperty();
      const savedAnswer = saved.properties?.[propId] ?? null;

      const block = document.createElement('div');
      block.className = `s3-prop-block ${savedAnswer ? 's3-prop-block--answered' : ''}`;
      block.id = `s3-prop-${propId}`;

      // Build answer options HTML
      const optionsHTML = prop.answers.map(ans => `
        <div class="s3-ans-card s3-ans-card--${ans.color} ${savedAnswer === ans.id ? 's3-ans-card--on' : ''}"
             data-prop="${propId}" data-ans="${ans.id}">
          <div class="s3-ans-check">✓</div>
          <div class="s3-ans-label">${ans.label}</div>
          <div class="s3-ans-sub">${ans.sublabel ?? ''}</div>
        </div>
      `).join('');

      block.innerHTML = `
        <div class="s3-prop-num">${idx + 1}</div>
        <div class="s3-prop-content">
          <div class="s3-prop-label">${prop.label}</div>
          <div class="s3-prop-question">${prop.question}</div>
          <div class="s3-prop-why"><span class="s3-why-label">Why this matters:</span> ${prop.why}</div>
          <div class="s3-ans-grid">${optionsHTML}</div>
          <div class="s3-prop-impact" id="s3-impact-${propId}"></div>
        </div>
      `;

      // Wire answer cards
      block.querySelectorAll('.s3-ans-card').forEach(card => {
        card.addEventListener('click', () => {
          const ansId = card.dataset.ans;
          _onPropertyAnswer(propId, ansId, mod, wrapper);
        });
      });

      // Render existing impact
      if (savedAnswer) {
        const impactEl = block.querySelector(`#s3-impact-${propId}`);
        if (impactEl) _renderImpact(impactEl, prop, savedAnswer);
      }

      list.appendChild(block);
    });
  }

  function _onPropertyAnswer(propId, answerId, mod, wrapper) {
    _answers[propId] = answerId;

    const list = wrapper.querySelector('#s3-prop-list');
    if (list) {
      list.querySelectorAll(`[data-prop="${propId}"]`).forEach(card => {
        card.classList.toggle('s3-ans-card--on', card.dataset.ans === answerId);
      });
    }

    const block = wrapper.querySelector(`#s3-prop-${propId}`);
    if (block) block.classList.add('s3-prop-block--answered');

    const impactEl = wrapper.querySelector(`#s3-impact-${propId}`);
    if (impactEl) {
      const mod2 = PROPERTY_MODULES[propId];
      _renderImpact(impactEl, mod2?.getProperty?.() ?? {}, answerId);
    }

    _refreshProgressStrip(wrapper);

    // Show/hide DP section
    if (propId === 'subproblemOverlap') {
      const dpSec = wrapper.querySelector('#s3-dp-section');
      if (dpSec) dpSec.style.display = (answerId === 'yes_direct') ? '' : 'none';
    }

    State.setAnswer('stage3', { properties: { ..._answers } });
    _updatePanel(wrapper);
    _checkComplete();
  }

  function _renderImpact(container, prop, answerId) {
    container.innerHTML = '';
    const answer = prop.answers?.find(a => a.id === answerId);
    if (!answer) return;

    if (answer.followUp) {
      const el = document.createElement('div');
      el.className = 's3-followup';
      el.innerHTML = `<span class="s3-followup-arrow">→</span><span>${answer.followUp}</span>`;
      container.appendChild(el);
    }

    if (answerId === 'unsure') {
      const el = document.createElement('div');
      el.className = 's3-unsure-warn';
      el.innerHTML = `⚠ Unsure answers reduce confidence score. Try to determine before proceeding.`;
      container.appendChild(el);
      return;
    }

    if (answer.opens?.length) {
      const el = document.createElement('div');
      el.className = 's3-impact-row';
      el.innerHTML = `
        <span class="s3-impact-opens-label">Opens:</span>
        ${answer.opens.map(o => `<span class="s3-opens-tag">${o}</span>`).join('')}
      `;
      container.appendChild(el);
    }

    if (answer.eliminates?.length) {
      const el = document.createElement('div');
      el.className = 's3-impact-row';
      el.innerHTML = `
        <span class="s3-impact-elim-label">Eliminates:</span>
        ${answer.eliminates.map(e => `<span class="s3-elim-tag">${e}</span>`).join('')}
      `;
      container.appendChild(el);
    }
  }

  // ─── DP CONTENT ────────────────────────────────────────────────────────────

  function _buildDPContent(wrapper, saved) {
    const content = wrapper.querySelector('#s3-dp-content');
    if (!content) return;

    const DPC = typeof DPClassifier !== 'undefined' ? DPClassifier : null;
    const q   = DPC?.getQuestions?.()?.[0];
    if (!q) {
      content.innerHTML = '<div class="s3-unavailable">DP classifier not loaded.</div>';
      return;
    }

    content.innerHTML = `
      <div class="s3-dp-q">${q.text}</div>
      <div class="s3-dp-sub">${q.sublabel ?? ''}</div>
      <div class="s3-dp-grid" id="s3-dp-grid"></div>
      <div class="s3-dp-detail" id="s3-dp-detail"></div>
    `;

    const grid = content.querySelector('#s3-dp-grid');
    q.options.forEach(opt => {
      const card = document.createElement('div');
      const isOn = saved.dpSubtype === opt.leadsTo;
      card.className = `s3-dp-card ${isOn ? 's3-dp-card--on' : ''}`;
      card.dataset.typeId = opt.leadsTo;
      card.innerHTML = `
        <div class="s3-dp-card-check">✓</div>
        <div class="s3-dp-card-label">${opt.label}</div>
        <div class="s3-dp-card-sub">${opt.sublabel ?? ''}</div>
      `;
      card.addEventListener('click', () => _onDPSelect(opt, wrapper));
      grid.appendChild(card);
    });

    if (saved.dpSubtype) {
      const detail = content.querySelector('#s3-dp-detail');
      if (detail) _renderDPDetail(detail, saved.dpSubtype);
    }
  }

  function _onDPSelect(option, wrapper) {
    _dpSubtype = option.leadsTo;

    wrapper.querySelectorAll('.s3-dp-card').forEach(c =>
      c.classList.toggle('s3-dp-card--on', c.dataset.typeId === option.leadsTo)
    );

    const detail = wrapper.querySelector('#s3-dp-detail');
    if (detail) _renderDPDetail(detail, option.leadsTo);

    State.setAnswer('stage3', { dpSubtype: _dpSubtype });
    _updatePanel(wrapper);
    _checkComplete();
  }

  function _renderDPDetail(container, typeId) {
    container.innerHTML = '';
    const DPC = typeof DPClassifier !== 'undefined' ? DPClassifier : null;
    if (!DPC) return;

    const summary = DPC.buildTypeSummary?.(typeId);
    if (!summary?.type) return;
    const { type, optimizations } = summary;

    const woHTML = (type.watchOut ?? []).map(w =>
      `<div class="s3-dp-warn">⚠ ${w}</div>`
    ).join('');

    const optHTML = (optimizations ?? []).map(o =>
      `<span class="s3-dp-opt-tag">${o.label}: ${o.tagline}</span>`
    ).join('');

    container.innerHTML = `
      <div class="s3-dp-detail-card">
        <div class="s3-dp-detail-name">${type.label}</div>
        <div class="s3-dp-detail-row"><span class="s3-dp-detail-key">State:</span> <code class="s3-dp-code">${type.stateShape}</code> — ${type.stateExample}</div>
        <div class="s3-dp-detail-row"><span class="s3-dp-detail-key">Base case:</span> ${type.baseCase}</div>
        <div class="s3-dp-detail-row"><span class="s3-dp-detail-key">Fill order:</span> ${type.fillOrder}</div>
        <div class="s3-dp-detail-row"><span class="s3-dp-detail-key">Complexity:</span> <code class="s3-dp-code">${type.complexity}</code></div>
        ${woHTML}
        ${optHTML ? `<div class="s3-dp-opts-row"><span class="s3-dp-detail-key">Optimizations:</span> ${optHTML}</div>` : ''}
      </div>
    `;
  }

  // ─── GRAPH CONTENT ─────────────────────────────────────────────────────────

  function _buildGraphContent(wrapper, saved, hasGraph) {
    const content = wrapper.querySelector('#s3-graph-content');
    if (!content || !hasGraph) return;

    const savedProps = saved.graphProperties ?? {};
    const GG = typeof GraphGoals !== 'undefined' ? GraphGoals : null;

    const goalsHTML = (GG?.getAll?.() ?? _fallbackGoals()).map(goal => `
      <div class="s3-goal-card ${saved.graphGoal === goal.id ? 's3-goal-card--on' : ''}"
           data-goal="${goal.id}">
        <div class="s3-goal-check">✓</div>
        <div class="s3-goal-label">${goal.label}</div>
        <div class="s3-goal-q">${goal.question}</div>
      </div>
    `).join('');

    content.innerHTML = `
      <div class="s3-graph-props-title">First — characterize the graph</div>
      <div class="s3-graph-props-list">
        <div class="s3-graph-prop-row" id="s3-gprop-directed">
          <span class="s3-graph-prop-q">Are edges directed?</span>
          <div class="s3-graph-prop-btns">
            <button class="s3-gprop-btn ${savedProps.directed==='yes'?'s3-gprop-btn--on':''}" data-gprop="directed" data-val="yes">Yes</button>
            <button class="s3-gprop-btn ${savedProps.directed==='no' ?'s3-gprop-btn--on':''}" data-gprop="directed" data-val="no">No</button>
          </div>
        </div>
        <div class="s3-graph-prop-row" id="s3-gprop-weighted">
          <span class="s3-graph-prop-q">Do edges have weights?</span>
          <div class="s3-graph-prop-btns">
            <button class="s3-gprop-btn ${savedProps.weighted==='yes'?'s3-gprop-btn--on':''}" data-gprop="weighted" data-val="yes">Yes</button>
            <button class="s3-gprop-btn ${savedProps.weighted==='no' ?'s3-gprop-btn--on':''}" data-gprop="weighted" data-val="no">No</button>
          </div>
        </div>
        <div class="s3-graph-prop-row ${savedProps.weighted!=='yes'?'s3-hidden':''}" id="s3-gprop-negative">
          <span class="s3-graph-prop-q">Can edge weights be negative?</span>
          <div class="s3-graph-prop-btns">
            <button class="s3-gprop-btn ${savedProps.negative==='yes'?'s3-gprop-btn--on':''}" data-gprop="negative" data-val="yes">Yes</button>
            <button class="s3-gprop-btn ${savedProps.negative==='no' ?'s3-gprop-btn--on':''}" data-gprop="negative" data-val="no">No</button>
          </div>
        </div>
      </div>

      <div class="s3-graph-goals-title">What is the primary goal on the graph?</div>
      <div class="s3-goal-grid">${goalsHTML}</div>
      <div class="s3-graph-rec" id="s3-graph-rec"></div>
    `;

    // Wire graph prop buttons
    content.querySelectorAll('.s3-gprop-btn').forEach(btn => {
      btn.addEventListener('click', () => _onGraphProp(btn.dataset.gprop, btn.dataset.val, wrapper));
    });

    // Wire goal cards
    content.querySelectorAll('.s3-goal-card').forEach(card => {
      card.addEventListener('click', () => _onGraphGoal(card.dataset.goal, wrapper));
    });

    // Initial recommendation
    if (saved.graphGoal) {
      const rec = content.querySelector('#s3-graph-rec');
      if (rec) _renderGraphRec(rec, saved);
    }
  }

  function _onGraphProp(propId, value, wrapper) {
    const savedProps = State.getAnswer('stage3')?.graphProperties ?? {};
    savedProps[propId] = value;

    wrapper.querySelectorAll(`[data-gprop="${propId}"]`).forEach(btn =>
      btn.classList.toggle('s3-gprop-btn--on', btn.dataset.val === value)
    );

    if (propId === 'weighted') {
      const negRow = wrapper.querySelector('#s3-gprop-negative');
      if (negRow) negRow.classList.toggle('s3-hidden', value !== 'yes');
    }

    State.setAnswer('stage3', { graphProperties: savedProps });
    _refreshGraphRec(wrapper);
    _checkComplete();
  }

  function _onGraphGoal(goalId, wrapper) {
    _graphGoal = goalId;
    wrapper.querySelectorAll('.s3-goal-card').forEach(c =>
      c.classList.toggle('s3-goal-card--on', c.dataset.goal === goalId)
    );
    State.setAnswer('stage3', { graphGoal: goalId });
    _refreshGraphRec(wrapper);
    _updatePanel(wrapper);
    _checkComplete();
  }

  function _refreshGraphRec(wrapper) {
    const saved = State.getAnswer('stage3') ?? {};
    const rec   = wrapper.querySelector('#s3-graph-rec');
    if (rec) _renderGraphRec(rec, saved);
  }

  function _renderGraphRec(container, saved) {
    container.innerHTML = '';
    if (!saved.graphGoal) return;

    const GC = typeof GraphClassifier !== 'undefined' ? GraphClassifier : null;
    const conditions = {
      goal    : saved.graphGoal,
      directed: saved.graphProperties?.directed === 'yes',
      weighted: saved.graphProperties?.weighted === 'yes',
      negative: saved.graphProperties?.negative === 'yes',
    };

    const summary = GC?.buildSummary?.(conditions);
    const alg     = summary?.algorithm;
    if (!alg) {
      // Fallback recommendation based on conditions
      const rec = _fallbackGraphRec(conditions);
      container.innerHTML = `
        <div class="s3-graph-rec-card">
          <div class="s3-graph-rec-algo">${rec.algorithm}</div>
          <div class="s3-graph-rec-why">${rec.why}</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="s3-graph-rec-card">
        <div class="s3-graph-rec-algo">${alg.algorithm}</div>
        <div class="s3-graph-rec-complexity">${alg.complexity}</div>
        <div class="s3-graph-rec-why">${alg.why}</div>
        ${alg.watchOut ? `<div class="s3-graph-rec-warn">⚠ ${alg.watchOut}</div>` : ''}
      </div>
    `;
  }

  function _fallbackGraphRec(conditions) {
    if (conditions.goal === 'shortest_path') {
      if (!conditions.weighted)  return { algorithm: 'BFS', why: 'Unweighted graph — BFS gives shortest path in O(V+E)' };
      if (conditions.negative)   return { algorithm: 'Bellman-Ford', why: 'Negative edge weights — Dijkstra fails, use Bellman-Ford O(VE)' };
      return { algorithm: 'Dijkstra', why: 'Weighted non-negative — Dijkstra with priority queue O((V+E)logV)' };
    }
    if (conditions.goal === 'mst')         return { algorithm: 'Kruskal / Prim', why: 'Minimum spanning tree — Kruskal for sparse, Prim for dense' };
    if (conditions.goal === 'cycle')       return { algorithm: 'DFS cycle detection', why: conditions.directed ? 'DFS with 3-color (white/grey/black)' : 'DFS with parent tracking' };
    if (conditions.goal === 'components')  return { algorithm: 'BFS/DFS or Union Find', why: 'Connected components — Union Find for dynamic, BFS/DFS for static' };
    if (conditions.goal === 'topo_sort')   return { algorithm: "Kahn's / DFS topo sort", why: 'Topological ordering — requires DAG (no cycles)' };
    return { algorithm: 'BFS / DFS', why: 'Standard graph traversal' };
  }

  function _fallbackGoals() {
    return [
      { id: 'shortest_path', label: 'Shortest path',      question: 'Minimum cost / hops from A to B' },
      { id: 'mst',           label: 'Minimum spanning tree', question: 'Connect all nodes with minimum total edge weight' },
      { id: 'components',    label: 'Connected components', question: 'Find groups of connected nodes' },
      { id: 'cycle',         label: 'Cycle detection',    question: 'Does a cycle exist? Find it?' },
      { id: 'topo_sort',     label: 'Topological sort',   question: 'Order nodes respecting directed edges (DAG only)' },
      { id: 'flow',          label: 'Max flow / matching', question: 'Maximum flow from source to sink' },
    ];
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper) {
    const body = (wrapper ?? document).querySelector('#s3-panel-body');
    if (!body) return;
    body.innerHTML = '';

    const answered = Object.keys(_answers).length;
    if (answered === 0 && !_dpSubtype && !_graphGoal) {
      body.innerHTML = '<div class="s3-panel-empty">← Answer property questions to see findings</div>';
      return;
    }

    // Progress
    const progSec = document.createElement('div');
    progSec.className = 's3-panel-section';
    progSec.innerHTML = `
      <div class="s3-panel-section-title">Progress</div>
      <div class="s3-panel-progress-track">
        <div class="s3-panel-progress-fill" style="width:${Math.round(answered/PROPERTY_ORDER.length*100)}%"></div>
      </div>
      <div class="s3-panel-progress-label">${answered} / ${PROPERTY_ORDER.length} properties answered</div>
    `;
    body.appendChild(progSec);

    // Property answers
    const answeredProps = PROPERTY_ORDER.filter(p => _answers[p]);
    if (answeredProps.length) {
      const propSec = document.createElement('div');
      propSec.className = 's3-panel-section';
      propSec.innerHTML = `<div class="s3-panel-section-title">Property answers</div>`;

      answeredProps.forEach(propId => {
        const mod    = PROPERTY_MODULES[propId];
        const prop   = mod?.getProperty?.() ?? { label: propId, answers: [] };
        const answId = _answers[propId];
        const ans    = prop.answers?.find(a => a.id === answId);
        if (!ans) return;

        const el = document.createElement('div');
        el.className = `s3-panel-prop-row s3-panel-prop-row--${ans.color ?? 'gray'}`;
        el.innerHTML = `
          <div class="s3-panel-prop-label">${prop.label?.replace(/3[A-Z] — /, '') ?? propId}</div>
          <div class="s3-panel-prop-answer">${ans.label}</div>
        `;
        propSec.appendChild(el);
      });

      body.appendChild(propSec);
    }

    // Opened families
    const allOpens = new Set();
    const allElims = new Set();
    answeredProps.forEach(propId => {
      const mod  = PROPERTY_MODULES[propId];
      const prop = mod?.getProperty?.() ?? { answers: [] };
      const ans  = prop.answers?.find(a => a.id === _answers[propId]);
      ans?.opens?.forEach(o => allOpens.add(o));
      ans?.eliminates?.forEach(e => allElims.add(e));
    });

    if (allOpens.size) {
      const sec = document.createElement('div');
      sec.className = 's3-panel-section';
      sec.innerHTML = `<div class="s3-panel-section-title">Opens</div>`;
      allOpens.forEach(o => {
        const tag = document.createElement('div');
        tag.className = 's3-panel-open-tag';
        tag.textContent = o;
        sec.appendChild(tag);
      });
      body.appendChild(sec);
    }

    if (allElims.size) {
      const sec = document.createElement('div');
      sec.className = 's3-panel-section';
      sec.innerHTML = `<div class="s3-panel-section-title">Eliminated</div>`;
      allElims.forEach(e => {
        const tag = document.createElement('div');
        tag.className = 's3-panel-elim-tag';
        tag.textContent = e;
        sec.appendChild(tag);
      });
      body.appendChild(sec);
    }

    // DP subtype
    if (_dpSubtype) {
      const DPC = typeof DPClassifier !== 'undefined' ? DPClassifier : null;
      const type = DPC?.getTypeById?.(_dpSubtype);
      const sec = document.createElement('div');
      sec.className = 's3-panel-section s3-panel-section--dp';
      sec.innerHTML = `
        <div class="s3-panel-section-title">DP variant</div>
        <div class="s3-panel-dp-badge">${type?.label ?? _dpSubtype}</div>
        ${type?.complexity ? `<div class="s3-panel-dp-complexity">${type.complexity}</div>` : ''}
      `;
      body.appendChild(sec);
    }

    // Graph goal
    if (_graphGoal) {
      const GG   = typeof GraphGoals !== 'undefined' ? GraphGoals : null;
      const goal = GG?.getById?.(_graphGoal) ?? _fallbackGoals().find(g => g.id === _graphGoal);
      const sec  = document.createElement('div');
      sec.className = 's3-panel-section s3-panel-section--graph';
      sec.innerHTML = `
        <div class="s3-panel-section-title">Graph goal</div>
        <div class="s3-panel-graph-badge">${goal?.label ?? _graphGoal}</div>
      `;
      body.appendChild(sec);
    }

    // Completion gate
    const saved      = State.getAnswer('stage3') ?? {};
    const inputTypes = _state?.answers?.stage1?.inputTypes ?? [];
    const graphInputs= ['graph_edge_list','graph_adjacency','implicit_graph','grid'];
    const hasGraph   = inputTypes.some(t => graphInputs.includes(t));
    const isDPLikely = _answers.subproblemOverlap === 'yes_direct';
    const dpOk       = !isDPLikely || !!_dpSubtype;
    const graphOk    = !hasGraph    || !!_graphGoal;
    const isReady    = answered >= 5 && dpOk && graphOk;

    const gate = document.createElement('div');
    gate.className = `s3-panel-gate ${isReady ? 's3-panel-gate--ready' : ''}`;
    if (isReady) {
      gate.textContent = '✓ Ready to proceed to Stage 3.5';
    } else {
      const needs = [];
      if (answered < 5) needs.push(`${5 - answered} more propert${5 - answered === 1 ? 'y' : 'ies'}`);
      if (!dpOk)    needs.push('DP variant selection');
      if (!graphOk) needs.push('graph goal selection');
      gate.textContent = `Need: ${needs.join(', ')}`;
    }
    body.appendChild(gate);
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete() {
    const saved      = State.getAnswer('stage3') ?? {};
    const answered   = Object.keys(saved.properties ?? {}).length;
    const inputTypes = _state?.answers?.stage1?.inputTypes ?? [];
    const graphInputs= ['graph_edge_list','graph_adjacency','implicit_graph','grid'];
    const hasGraph   = inputTypes.some(t => graphInputs.includes(t));
    const isDPLikely = saved.properties?.subproblemOverlap === 'yes_direct';
    const dpOk       = !isDPLikely || !!saved.dpSubtype;
    const graphOk    = !hasGraph    || !!saved.graphGoal;
    const valid      = answered >= 5 && dpOk && graphOk;

    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage3',
          answers: {
            properties     : saved.properties ?? {},
            dpSubtype      : saved.dpSubtype  ?? null,
            graphGoal      : saved.graphGoal  ?? null,
            graphProperties: saved.graphProperties ?? {},
          },
        },
      }));
    }
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s3-styles')) return;
    const style = document.createElement('style');
    style.id = 's3-styles';
    style.textContent = `
    .s3-shell {
      --s3-bg      : #f7f4ef;
      --s3-surface : #ffffff;
      --s3-surface2: #faf8f5;
      --s3-border  : rgba(0,0,0,.09);
      --s3-border2 : rgba(0,0,0,.16);
      --s3-ink     : #1a1814;
      --s3-ink2    : #4a4540;
      --s3-muted   : #8a8070;
      --s3-blue    : #2563eb;
      --s3-blue-bg : rgba(37,99,235,.07);
      --s3-blue-b  : rgba(37,99,235,.24);
      --s3-green   : #059669;
      --s3-green-bg: rgba(5,150,105,.07);
      --s3-green-b : rgba(5,150,105,.28);
      --s3-warn    : #d97706;
      --s3-warn-bg : rgba(217,119,6,.07);
      --s3-warn-b  : rgba(217,119,6,.28);
      --s3-red     : #dc2626;
      --s3-red-bg  : rgba(220,38,38,.06);
      --s3-red-b   : rgba(220,38,38,.22);
      --s3-violet  : #7c3aed;
      --s3-violet-bg: rgba(124,58,237,.07);
      --s3-violet-b : rgba(124,58,237,.24);
      --s3-indigo  : #4f46e5;
      --s3-indigo-bg: rgba(79,70,229,.07);
      --s3-indigo-b : rgba(79,70,229,.24);
      --s3-mono    : 'Space Mono', monospace;
      --s3-sans    : 'DM Sans', system-ui, sans-serif;
      display      : flex;
      gap          : 24px;
      align-items  : flex-start;
      background   : var(--s3-bg);
      min-height   : 100%;
      font-family  : var(--s3-sans);
      color        : var(--s3-ink);
      padding      : 28px;
    }
    .s3-main { flex: 1; display: flex; flex-direction: column; gap: 32px; min-width: 0; }
    .s3-rule { font-family: var(--s3-mono); font-size: .71rem; color: var(--s3-muted); padding: 10px 16px; background: var(--s3-surface); border: 1px solid var(--s3-border); border-left: 3px solid var(--s3-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }

    /* Progress strip */
    .s3-progress-strip { display: flex; flex-wrap: wrap; gap: 6px; }
    .s3-prog-dot { display: flex; align-items: center; gap: 7px; padding: 5px 10px; background: var(--s3-surface); border: 1.5px solid var(--s3-border); border-radius: 9999px; cursor: pointer; transition: all .12s; font-size: .72rem; user-select: none; }
    .s3-prog-dot:hover   { border-color: var(--s3-blue-b); }
    .s3-prog-dot--done   { border-color: var(--s3-green-b); background: var(--s3-green-bg); }
    .s3-prog-dot--unsure { border-color: var(--s3-warn-b);  background: var(--s3-warn-bg); }
    .s3-prog-dot-num  { font-family: var(--s3-mono); font-size: .6rem; font-weight: 700; color: #fff; background: var(--s3-muted); width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .12s; }
    .s3-prog-dot--done   .s3-prog-dot-num { background: var(--s3-green); }
    .s3-prog-dot--unsure .s3-prog-dot-num { background: var(--s3-warn);  }
    .s3-prog-dot-label { color: var(--s3-ink2); font-size: .72rem; }

    /* Sections */
    .s3-section { display: flex; flex-direction: column; gap: 14px; }
    .s3-section-header { display: flex; align-items: flex-start; gap: 14px; }
    .s3-section-num { font-family: var(--s3-mono); font-size: .65rem; font-weight: 700; color: #fff; background: var(--s3-blue); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .s3-section-num--blue   { background: var(--s3-indigo); }
    .s3-section-num--violet { background: var(--s3-violet); }
    .s3-section-title { font-size: .92rem; font-weight: 600; color: var(--s3-ink); }
    .s3-section-sub   { font-size: .73rem; color: var(--s3-muted); margin-top: 2px; }

    /* Property blocks */
    .s3-prop-list { display: flex; flex-direction: column; gap: 10px; }
    .s3-prop-block { background: var(--s3-surface); border: 1.5px solid var(--s3-border); border-radius: 12px; padding: 18px; display: flex; gap: 14px; transition: border-color .14s; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .s3-prop-block:hover         { border-color: var(--s3-border2); }
    .s3-prop-block--answered     { border-color: var(--s3-green-b); }
    .s3-prop-num { font-family: var(--s3-mono); font-size: .65rem; font-weight: 700; color: #fff; background: var(--s3-muted); width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; transition: background .14s; }
    .s3-prop-block--answered .s3-prop-num { background: var(--s3-green); }
    .s3-prop-content { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .s3-prop-label    { font-family: var(--s3-mono); font-size: .6rem; letter-spacing: 1.2px; text-transform: uppercase; color: var(--s3-muted); }
    .s3-prop-question { font-size: .9rem; font-weight: 600; color: var(--s3-ink); line-height: 1.4; }
    .s3-prop-why      { font-size: .73rem; color: var(--s3-ink2); line-height: 1.5; padding: 7px 10px; background: var(--s3-surface2); border-radius: 6px; border-left: 2px solid var(--s3-border2); }
    .s3-why-label     { font-weight: 600; color: var(--s3-blue); margin-right: 4px; }

    /* Answer cards */
    .s3-ans-grid  { display: flex; flex-wrap: wrap; gap: 7px; }
    .s3-ans-card  { position: relative; flex: 1; min-width: 130px; background: var(--s3-surface2); border: 1.5px solid var(--s3-border); border-radius: 9px; padding: 10px 12px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; transition: all .13s; user-select: none; }
    .s3-ans-card:hover { border-color: var(--s3-border2); box-shadow: 0 2px 6px rgba(0,0,0,.06); }
    /* Color variants */
    .s3-ans-card--green.s3-ans-card--on  { border-color: var(--s3-green-b);  background: var(--s3-green-bg); }
    .s3-ans-card--red.s3-ans-card--on    { border-color: var(--s3-red-b);    background: var(--s3-red-bg); }
    .s3-ans-card--yellow.s3-ans-card--on { border-color: var(--s3-warn-b);   background: var(--s3-warn-bg); }
    .s3-ans-card--blue.s3-ans-card--on   { border-color: var(--s3-blue-b);   background: var(--s3-blue-bg); }
    .s3-ans-card--pur.s3-ans-card--on    { border-color: var(--s3-violet-b); background: var(--s3-violet-bg); }
    .s3-ans-card--gray.s3-ans-card--on   { border-color: var(--s3-border2);  background: var(--s3-surface2); }
    .s3-ans-check { position: absolute; top: 7px; right: 7px; width: 16px; height: 16px; background: var(--s3-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .56rem; color: #fff; font-weight: 700; opacity: 0; transform: scale(.6); transition: opacity .13s, transform .13s; }
    .s3-ans-card--on .s3-ans-check { opacity: 1; transform: scale(1); }
    .s3-ans-label { font-size: .8rem; font-weight: 600; color: var(--s3-ink); line-height: 1.3; }
    .s3-ans-sub   { font-size: .68rem; color: var(--s3-muted); line-height: 1.3; }

    /* Impact */
    .s3-prop-impact   { display: flex; flex-direction: column; gap: 6px; }
    .s3-impact-row    { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font-size: .72rem; }
    .s3-impact-opens-label { font-family: var(--s3-mono); font-size: .6rem; font-weight: 700; color: var(--s3-green); text-transform: uppercase; letter-spacing: 1px; }
    .s3-impact-elim-label  { font-family: var(--s3-mono); font-size: .6rem; font-weight: 700; color: var(--s3-red);   text-transform: uppercase; letter-spacing: 1px; }
    .s3-opens-tag { padding: 2px 8px; background: var(--s3-green-bg); border: 1px solid var(--s3-green-b); border-radius: 9999px; font-family: var(--s3-mono); font-size: .62rem; color: var(--s3-green); font-weight: 600; }
    .s3-elim-tag  { padding: 2px 8px; background: var(--s3-red-bg);   border: 1px solid var(--s3-red-b);   border-radius: 9999px; font-family: var(--s3-mono); font-size: .62rem; color: var(--s3-red);   font-weight: 600; text-decoration: line-through; }
    .s3-followup  { display: flex; align-items: flex-start; gap: 7px; font-size: .76rem; color: var(--s3-ink2); padding: 7px 10px; background: var(--s3-indigo-bg); border: 1px solid var(--s3-indigo-b); border-radius: 7px; }
    .s3-followup-arrow { color: var(--s3-indigo); font-weight: 700; flex-shrink: 0; }
    .s3-unsure-warn { font-size: .74rem; color: var(--s3-warn); padding: 7px 10px; background: var(--s3-warn-bg); border: 1px solid var(--s3-warn-b); border-radius: 7px; }

    /* DP section */
    .s3-dp-q    { font-size: .88rem; font-weight: 600; color: var(--s3-ink); }
    .s3-dp-sub  { font-size: .73rem; color: var(--s3-muted); margin-top: 3px; margin-bottom: 12px; }
    .s3-dp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin-bottom: 14px; }
    .s3-dp-card { position: relative; background: var(--s3-surface); border: 1.5px solid var(--s3-border); border-radius: 10px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: all .13s; user-select: none; }
    .s3-dp-card:hover  { border-color: var(--s3-indigo-b); box-shadow: 0 2px 6px rgba(0,0,0,.06); }
    .s3-dp-card--on    { border-color: var(--s3-indigo); background: var(--s3-indigo-bg); box-shadow: 0 0 0 3px rgba(79,70,229,.08); }
    .s3-dp-card-check  { position: absolute; top: 8px; right: 8px; width: 16px; height: 16px; background: var(--s3-indigo); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .56rem; color: #fff; font-weight: 700; opacity: 0; transform: scale(.6); transition: opacity .13s, transform .13s; }
    .s3-dp-card--on .s3-dp-card-check { opacity: 1; transform: scale(1); }
    .s3-dp-card-label { font-size: .8rem; font-weight: 600; color: var(--s3-ink); }
    .s3-dp-card-sub   { font-size: .68rem; color: var(--s3-muted); line-height: 1.3; }
    .s3-dp-detail-card { background: var(--s3-surface); border: 1.5px solid var(--s3-indigo-b); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .s3-dp-detail-name { font-size: .88rem; font-weight: 700; color: var(--s3-indigo); }
    .s3-dp-detail-row  { font-size: .76rem; color: var(--s3-ink2); line-height: 1.5; }
    .s3-dp-detail-key  { font-family: var(--s3-mono); font-size: .62rem; text-transform: uppercase; letter-spacing: 1px; color: var(--s3-muted); margin-right: 5px; }
    .s3-dp-code        { font-family: var(--s3-mono); font-size: .72rem; background: var(--s3-surface2); color: var(--s3-blue); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--s3-border); }
    .s3-dp-warn        { font-size: .73rem; color: var(--s3-warn); padding: 5px 9px; background: var(--s3-warn-bg); border: 1px solid var(--s3-warn-b); border-radius: 6px; }
    .s3-dp-opt-tag     { display: inline-block; padding: 2px 8px; background: var(--s3-green-bg); border: 1px solid var(--s3-green-b); border-radius: 9999px; font-family: var(--s3-mono); font-size: .62rem; color: var(--s3-green); margin: 2px; }
    .s3-dp-opts-row    { font-size: .74rem; color: var(--s3-ink2); display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
    .s3-unavailable    { font-size: .76rem; color: var(--s3-muted); padding: 12px; background: var(--s3-surface2); border-radius: 8px; }

    /* Graph section */
    .s3-graph-props-title,
    .s3-graph-goals-title { font-size: .82rem; font-weight: 600; color: var(--s3-ink); margin-bottom: 10px; }
    .s3-graph-goals-title { margin-top: 18px; }
    .s3-graph-props-list  { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
    .s3-graph-prop-row    { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--s3-surface); border: 1.5px solid var(--s3-border); border-radius: 9px; }
    .s3-graph-prop-q      { font-size: .82rem; color: var(--s3-ink); flex: 1; }
    .s3-graph-prop-btns   { display: flex; gap: 6px; }
    .s3-gprop-btn         { padding: 5px 14px; border: 1.5px solid var(--s3-border); border-radius: 7px; background: var(--s3-surface2); font-size: .76rem; font-weight: 500; cursor: pointer; transition: all .12s; color: var(--s3-muted); }
    .s3-gprop-btn:hover   { border-color: var(--s3-border2); color: var(--s3-ink); }
    .s3-gprop-btn--on     { border-color: var(--s3-violet-b); background: var(--s3-violet-bg); color: var(--s3-violet); font-weight: 600; }
    .s3-goal-grid         { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 7px; margin-bottom: 14px; }
    .s3-goal-card         { position: relative; background: var(--s3-surface); border: 1.5px solid var(--s3-border); border-radius: 10px; padding: 11px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: all .13s; user-select: none; }
    .s3-goal-card:hover   { border-color: var(--s3-violet-b); box-shadow: 0 2px 6px rgba(0,0,0,.06); }
    .s3-goal-card--on     { border-color: var(--s3-violet); background: var(--s3-violet-bg); box-shadow: 0 0 0 3px rgba(124,58,237,.08); }
    .s3-goal-check        { position: absolute; top: 7px; right: 7px; width: 16px; height: 16px; background: var(--s3-violet); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .56rem; color: #fff; font-weight: 700; opacity: 0; transform: scale(.6); transition: opacity .13s, transform .13s; }
    .s3-goal-card--on .s3-goal-check { opacity: 1; transform: scale(1); }
    .s3-goal-label  { font-size: .8rem; font-weight: 600; color: var(--s3-ink); }
    .s3-goal-q      { font-size: .68rem; color: var(--s3-muted); line-height: 1.3; }
    .s3-graph-rec-card       { background: var(--s3-surface); border: 1.5px solid var(--s3-violet-b); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
    .s3-graph-rec-algo       { font-size: .9rem; font-weight: 700; color: var(--s3-violet); }
    .s3-graph-rec-complexity { font-family: var(--s3-mono); font-size: .7rem; color: var(--s3-muted); }
    .s3-graph-rec-why        { font-size: .76rem; color: var(--s3-ink2); line-height: 1.5; }
    .s3-graph-rec-warn       { font-size: .73rem; color: var(--s3-warn); padding: 5px 9px; background: var(--s3-warn-bg); border: 1px solid var(--s3-warn-b); border-radius: 6px; }
    .s3-hidden { display: none !important; }

    /* Side panel */
    .s3-panel { width: 268px; flex-shrink: 0; background: var(--s3-surface); border: 1.5px solid var(--s3-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s3-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s3-border); background: #f6f4f0; }
    .s3-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s3-ink); }
    .s3-panel-sub    { font-size: .66rem; color: var(--s3-muted); margin-top: 2px; }
    .s3-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s3-panel-empty  { font-size: .74rem; color: var(--s3-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s3-panel-section { display: flex; flex-direction: column; gap: 7px; }
    .s3-panel-section--dp    { background: var(--s3-indigo-bg); border: 1px solid var(--s3-indigo-b); border-radius: 8px; padding: 10px 12px; }
    .s3-panel-section--graph { background: var(--s3-violet-bg); border: 1px solid var(--s3-violet-b); border-radius: 8px; padding: 10px 12px; }
    .s3-panel-section-title  { font-family: var(--s3-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s3-muted); margin-bottom: 2px; }
    .s3-panel-section--dp    .s3-panel-section-title { color: var(--s3-indigo); }
    .s3-panel-section--graph .s3-panel-section-title { color: var(--s3-violet); }
    .s3-panel-prop-row    { padding: 6px 9px; background: var(--s3-surface2); border: 1px solid var(--s3-border); border-radius: 6px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .s3-panel-prop-row--green  { background: var(--s3-green-bg); border-color: var(--s3-green-b); }
    .s3-panel-prop-row--red    { background: var(--s3-red-bg);   border-color: var(--s3-red-b);   }
    .s3-panel-prop-row--yellow { background: var(--s3-warn-bg);  border-color: var(--s3-warn-b);  }
    .s3-panel-prop-row--blue   { background: var(--s3-blue-bg);  border-color: var(--s3-blue-b);  }
    .s3-panel-prop-row--pur    { background: var(--s3-violet-bg);border-color: var(--s3-violet-b);}
    .s3-panel-prop-label  { font-size: .68rem; color: var(--s3-muted); }
    .s3-panel-prop-answer { font-size: .72rem; font-weight: 600; color: var(--s3-ink2); text-align: right; }
    .s3-panel-open-tag { padding: 2px 8px; background: var(--s3-green-bg); border: 1px solid var(--s3-green-b); border-radius: 9999px; font-family: var(--s3-mono); font-size: .62rem; color: var(--s3-green); font-weight: 600; margin-bottom: 2px; }
    .s3-panel-elim-tag { padding: 2px 8px; background: var(--s3-red-bg);   border: 1px solid var(--s3-red-b);   border-radius: 9999px; font-family: var(--s3-mono); font-size: .62rem; color: var(--s3-red);   font-weight: 600; margin-bottom: 2px; text-decoration: line-through; }
    .s3-panel-dp-badge    { font-size: .8rem; font-weight: 600; color: var(--s3-indigo); }
    .s3-panel-dp-complexity{ font-family: var(--s3-mono); font-size: .66rem; color: var(--s3-muted); }
    .s3-panel-graph-badge { font-size: .8rem; font-weight: 600; color: var(--s3-violet); }
    .s3-panel-progress-track { height: 6px; background: var(--s3-surface2); border-radius: 9999px; overflow: hidden; border: 1px solid var(--s3-border); }
    .s3-panel-progress-fill  { height: 100%; background: var(--s3-blue); border-radius: 9999px; transition: width .3s ease; }
    .s3-panel-progress-label { font-size: .68rem; color: var(--s3-muted); }
    .s3-panel-gate { padding: 10px 12px; border-radius: 8px; font-size: .74rem; font-weight: 500; text-align: center; background: var(--s3-surface2); border: 1.5px solid var(--s3-border); color: var(--s3-muted); }
    .s3-panel-gate--ready { background: var(--s3-green-bg); border-color: var(--s3-green-b); color: var(--s3-green); }
    .s3-panel-body::-webkit-scrollbar { width: 3px; }
    .s3-panel-body::-webkit-scrollbar-thumb { background: var(--s3-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s3-shell  { flex-direction: column; padding: 16px; }
      .s3-panel  { width: 100%; position: static; max-height: none; }
      .s3-ans-grid { flex-direction: column; }
      .s3-dp-grid  { grid-template-columns: 1fr 1fr; }
      .s3-goal-grid{ grid-template-columns: 1fr 1fr; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved   = state.answers?.stage3;
    const answered = Object.keys(saved?.properties ?? {}).length;
    if (answered >= 5 && typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
  }

  function cleanup() {
    _state     = null;
    _answers   = {};
    _dpSubtype = null;
    _graphGoal = null;
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage3;