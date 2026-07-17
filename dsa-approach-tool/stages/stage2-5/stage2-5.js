// stages/stage2-5/stage2-5.js
// Problem Decomposition — cream/white theme, self-contained styles
// Same pattern as stage0/1/2/3-5
// Module contract: render(state), onMount(state), cleanup()
// Data source: DecompositionChecks (stages/stage2-5/decomposition-checks.js)

const Stage2_5 = (() => {

  // ─── STATE ─────────────────────────────────────────────────────────────────

  let _state             = null;
  let _selectedPattern   = null;
  let _reframeAnswers    = {};
  let _implicitAnswers   = {};
  let _preprocessingText = '';

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage2_5 ?? {};

    _selectedPattern   = saved.selectedPattern    ?? null;
    _reframeAnswers    = { ...(saved.reframeAnswers  ?? {}) };
    _implicitAnswers   = { ...(saved.implicitAnswers ?? {}) };
    _preprocessingText = saved.preprocessingStep     ?? '';

    _injectStyles();

    const DC = typeof DecompositionChecks !== 'undefined' ? DecompositionChecks : null;

    const patterns  = DC?.getAllPatterns?.()      ?? _fallbackPatterns();
    const reframeQs = DC?.getReframeQuestions?.() ?? _fallbackReframes();
    const implicit  = DC?.getImplicitChecks?.()   ?? _fallbackImplicit();

    const stage0Answers = state.answers?.stage0 ?? {};
    const stage1Answers = state.answers?.stage1 ?? {};
    const likelihood = DC?.estimateDecompositionLikelihood?.(stage0Answers, stage1Answers)
      ?? { score: 0, likely: false, veryLikely: false, reason: 'No strong decomposition signals — likely a single unified problem' };

    const wrapper = document.createElement('div');
    wrapper.className = 's25-shell';

    wrapper.innerHTML = `
      <div class="s25-main">

        <div class="s25-rule">
          Is this one problem or multiple problems chained together?
          Forcing a single approach onto a multi-part problem is the most common source of wrong architecture.
        </div>

        <div class="s25-likelihood s25-likelihood--${likelihood.veryLikely ? 'high' : likelihood.likely ? 'medium' : 'low'}" id="s25-likelihood">
          <span class="s25-likelihood-icon">${likelihood.veryLikely ? '⚡' : likelihood.likely ? '◆' : '○'}</span>
          <div>
            <div class="s25-likelihood-label">
              ${likelihood.veryLikely ? 'Decomposition very likely' : likelihood.likely ? 'Decomposition possible' : 'Decomposition unlikely'}
            </div>
            <div class="s25-likelihood-reason">${likelihood.reason}</div>
          </div>
        </div>

        <!-- Section 01: Decomposition pattern -->
        <section class="s25-section">
          <div class="s25-section-header">
            <span class="s25-section-num">01</span>
            <div>
              <div class="s25-section-title">Which pattern best describes this problem?</div>
              <div class="s25-section-sub">Pick one — including "single unified problem" if nothing splits cleanly</div>
            </div>
          </div>
          <div class="s25-pattern-grid" id="s25-pattern-grid"></div>
          <div id="s25-pattern-detail"></div>
          <div id="s25-preprocessing-input"></div>
        </section>

        <!-- Section 02: Reframe questions -->
        <section class="s25-section">
          <div class="s25-section-header">
            <span class="s25-section-num">02</span>
            <div>
              <div class="s25-section-title">Forced perspective shifts</div>
              <div class="s25-section-sub">A "yes" may reveal a hidden structure or transformation</div>
            </div>
          </div>
          <div class="s25-reframe-list" id="s25-reframe-list"></div>
          <div id="s25-transform-hints"></div>
        </section>

        <!-- Section 03: Implicit structure checks -->
        <section class="s25-section">
          <div class="s25-section-header">
            <span class="s25-section-num">03</span>
            <div>
              <div class="s25-section-title">Hidden structure checks</div>
              <div class="s25-section-sub">A "yes" changes the approach entirely</div>
            </div>
          </div>
          <div class="s25-implicit-list" id="s25-implicit-list"></div>
        </section>

      </div>

      <!-- Live side panel -->
      <aside class="s25-panel">
        <div class="s25-panel-header">
          <div class="s25-panel-title">Decomposition summary</div>
          <div class="s25-panel-sub">Updates as you answer</div>
        </div>
        <div class="s25-panel-body" id="s25-panel-body">
          <div class="s25-panel-empty">← Pick a pattern to see the summary</div>
        </div>
      </aside>
    `;

    _buildPatternGrid(wrapper, patterns, DC);
    _buildReframeList(wrapper, reframeQs, DC);
    _buildImplicitList(wrapper, implicit);

    if (_selectedPattern) {
      _renderPatternDetail(wrapper, patterns, DC);
      _renderPreprocessingInput(wrapper);
    }

    setTimeout(() => _updatePanel(wrapper, patterns, DC), 0);

    return wrapper;
  }

  // ─── PATTERN GRID ──────────────────────────────────────────────────────────

  function _buildPatternGrid(wrapper, patterns, DC) {
    const grid = wrapper.querySelector('#s25-pattern-grid');
    if (!grid) return;

    patterns.forEach(p => {
      const isOn = _selectedPattern === p.id;
      const card = document.createElement('div');
      card.className = `s25-pattern-card ${isOn ? 's25-pattern-card--on' : ''} ${p.isNegative ? 's25-pattern-card--negative' : ''}`;
      card.dataset.id = p.id;
      card.innerHTML = `
        <div class="s25-pattern-check">✓</div>
        <div class="s25-pattern-label">${p.label}</div>
        <div class="s25-pattern-question">${p.question}</div>
      `;
      card.addEventListener('click', () => _onPatternSelect(p.id, wrapper, patterns, DC));
      grid.appendChild(card);
    });
  }

  function _onPatternSelect(patternId, wrapper, patterns, DC) {
    _selectedPattern = patternId;

    wrapper.querySelectorAll('.s25-pattern-card').forEach(card => {
      card.classList.toggle('s25-pattern-card--on', card.dataset.id === patternId);
    });

    _renderPatternDetail(wrapper, patterns, DC);
    _renderPreprocessingInput(wrapper);
    _persist(DC);
    _updatePanel(wrapper, patterns, DC);
    _checkComplete();
  }

  function _renderPatternDetail(wrapper, patterns, DC) {
    const region = wrapper.querySelector('#s25-pattern-detail');
    if (!region) return;
    region.innerHTML = '';

    const pattern = patterns.find(p => p.id === _selectedPattern);
    if (!pattern) return;

    const subproblems = DC?.buildSubproblems?.(pattern.id) ?? [];

    const detail = document.createElement('div');
    detail.className = `s25-pattern-detail ${pattern.isNegative ? 's25-pattern-detail--single' : ''}`;
    detail.innerHTML = `
      <div class="s25-pattern-detail-signal"><span class="s25-signal-label">Signal:</span> ${pattern.yesSignal}</div>
      <div class="s25-pattern-detail-impl">${pattern.implication}</div>
      ${pattern.examples?.length ? `
        <div class="s25-ex-title">Examples:</div>
        <div class="s25-ex-list">
          ${pattern.examples.map(ex => `<div class="s25-ex-item"><span class="s25-ex-bullet">·</span>${ex}</div>`).join('')}
        </div>
      ` : ''}
      ${subproblems.length ? `
        <div class="s25-sub-title">Sub-problems to analyze separately:</div>
        <div class="s25-sub-chips">
          ${subproblems.map((s, i) => `<div class="s25-sub-chip"><span class="s25-sub-chip-num">${i + 1}</span><span>${s.label}</span></div>`).join('')}
        </div>
      ` : ''}
    `;
    region.appendChild(detail);
  }

  function _renderPreprocessingInput(wrapper) {
    const region = wrapper.querySelector('#s25-preprocessing-input');
    if (!region) return;
    region.innerHTML = '';

    if (_selectedPattern !== 'dp_preprocessing') return;

    const box = document.createElement('div');
    box.className = 's25-preprocess-box';
    box.innerHTML = `
      <label class="s25-preprocess-label" for="s25-preprocess-textarea">
        Describe the preprocessing step (optional)
      </label>
      <textarea class="s25-preprocess-textarea" id="s25-preprocess-textarea"
                placeholder="e.g. Sort intervals by start time before greedy merge">${_preprocessingText}</textarea>
    `;
    box.querySelector('textarea').addEventListener('input', (e) => {
      _preprocessingText = e.target.value;
      _persist(typeof DecompositionChecks !== 'undefined' ? DecompositionChecks : null);
    });
    region.appendChild(box);
  }

  // ─── REFRAME LIST ──────────────────────────────────────────────────────────

  function _buildReframeList(wrapper, questions, DC) {
    const list = wrapper.querySelector('#s25-reframe-list');
    if (!list) return;

    questions.forEach(q => {
      const answer = _reframeAnswers[q.id] ?? null;
      const row = document.createElement('div');
      row.className = `s25-reframe-row ${answer ? 's25-reframe-row--answered' : ''}`;
      row.id = `s25-rr-${q.id}`;
      row.innerHTML = `
        <div class="s25-reframe-q">${q.question}</div>
        <div class="s25-reframe-purpose">${q.purpose}</div>
        <div class="s25-ans-btns">
          <button class="s25-ans-btn s25-ans-btn--yes ${answer === 'yes' ? 's25-ans-btn--on-yes' : ''}" data-val="yes">✓ Yes</button>
          <button class="s25-ans-btn s25-ans-btn--no  ${answer === 'no'  ? 's25-ans-btn--on-no'  : ''}" data-val="no">✗ No</button>
        </div>
        <div class="s25-reframe-example ${answer === 'yes' ? '' : 's25-hidden'}" id="s25-rex-${q.id}">
          <span class="s25-ex-label">Example:</span> ${q.example ?? ''}
        </div>
      `;
      row.querySelectorAll('.s25-ans-btn').forEach(btn => {
        btn.addEventListener('click', () => _onReframe(q.id, btn.dataset.val, wrapper, DC));
      });
      list.appendChild(row);
    });
  }

  function _onReframe(questionId, value, wrapper, DC) {
    _reframeAnswers[questionId] = value;

    const row = wrapper.querySelector(`#s25-rr-${questionId}`);
    if (row) {
      row.classList.add('s25-reframe-row--answered');
      row.querySelectorAll('.s25-ans-btn').forEach(btn => {
        btn.classList.toggle('s25-ans-btn--on-yes', btn.dataset.val === 'yes' && value === 'yes');
        btn.classList.toggle('s25-ans-btn--on-no',  btn.dataset.val === 'no'  && value === 'no');
      });
      const ex = row.querySelector(`#s25-rex-${questionId}`);
      if (ex) ex.classList.toggle('s25-hidden', value !== 'yes');
    }

    _renderTransformHints(wrapper, DC);
    _persist(DC);

    const patterns = DC?.getAllPatterns?.() ?? _fallbackPatterns();
    _updatePanel(wrapper, patterns, DC);
  }

  function _renderTransformHints(wrapper, DC) {
    const container = wrapper.querySelector('#s25-transform-hints');
    if (!container) return;
    container.innerHTML = '';

    const hints = _collectTransformHints(DC);
    if (!hints.length) return;

    container.innerHTML = '<div class="s25-hints-title">🔄 Transformation signals detected</div>';
    hints.forEach(hintId => {
      const card = document.createElement('div');
      card.className = 's25-hint-card';
      card.innerHTML = `
        <span class="s25-hint-icon">🔄</span>
        <span class="s25-hint-text">Consider transformation: ${hintId.replace(/^tr_/, '').replace(/_/g, ' ')}</span>
        <span class="s25-hint-note">Will be explored in detail in Stage 3.5</span>
      `;
      container.appendChild(card);
    });
  }

  function _collectTransformHints(DC) {
    const hints = [];
    Object.entries(_reframeAnswers).forEach(([qId, val]) => {
      const hint = DC?.getTransformationHint?.(qId, val === 'yes');
      if (hint && !hints.includes(hint)) hints.push(hint);
    });
    return hints;
  }

  // ─── IMPLICIT STRUCTURE CHECKS ─────────────────────────────────────────────

  function _buildImplicitList(wrapper, checks) {
    const list = wrapper.querySelector('#s25-implicit-list');
    if (!list) return;

    checks.forEach(c => {
      const answer      = _implicitAnswers[c.id] ?? null;
      const isTriggered = answer === 'yes';

      const row = document.createElement('div');
      row.className = `s25-implicit-row ${isTriggered ? 's25-implicit-row--triggered' : ''}`;
      row.id = `s25-ir-${c.id}`;
      row.innerHTML = `
        <div class="s25-implicit-check">${c.check}</div>
        <div class="s25-ans-btns">
          <button class="s25-ans-btn s25-ans-btn--yes ${answer === 'yes' ? 's25-ans-btn--on-yes' : ''}" data-val="yes">✓ Yes</button>
          <button class="s25-ans-btn s25-ans-btn--no  ${answer === 'no'  ? 's25-ans-btn--on-no'  : ''}" data-val="no">✗ No</button>
        </div>
        <div class="s25-implicit-ifyes ${isTriggered ? '' : 's25-hidden'}" id="s25-iy-${c.id}">
          <span class="s25-ifyes-arrow">→</span>
          <div>
            <div class="s25-ifyes-text">${c.ifYes}</div>
            <div class="s25-ifyes-example">e.g. ${c.example}</div>
          </div>
        </div>
      `;
      row.querySelectorAll('.s25-ans-btn').forEach(btn => {
        btn.addEventListener('click', () => _onImplicit(c.id, btn.dataset.val, wrapper));
      });
      list.appendChild(row);
    });
  }

  function _onImplicit(checkId, value, wrapper) {
    _implicitAnswers[checkId] = value;

    const row = wrapper.querySelector(`#s25-ir-${checkId}`);
    if (row) {
      row.classList.toggle('s25-implicit-row--triggered', value === 'yes');
      row.querySelectorAll('.s25-ans-btn').forEach(btn => {
        btn.classList.toggle('s25-ans-btn--on-yes', btn.dataset.val === 'yes' && value === 'yes');
        btn.classList.toggle('s25-ans-btn--on-no',  btn.dataset.val === 'no'  && value === 'no');
      });
      const ifyes = row.querySelector(`#s25-iy-${checkId}`);
      if (ifyes) ifyes.classList.toggle('s25-hidden', value !== 'yes');
    }

    const DC = typeof DecompositionChecks !== 'undefined' ? DecompositionChecks : null;
    _persist(DC);

    const patterns = DC?.getAllPatterns?.() ?? _fallbackPatterns();
    _updatePanel(wrapper, patterns, DC);
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper, patterns, DC) {
    const body = wrapper.querySelector('#s25-panel-body');
    if (!body) return;
    body.innerHTML = '';

    if (!_selectedPattern) {
      body.innerHTML = '<div class="s25-panel-empty">← Pick a pattern to see the summary</div>';
      return;
    }

    const pattern     = patterns.find(p => p.id === _selectedPattern);
    const subproblems = DC?.buildSubproblems?.(_selectedPattern) ?? [];

    // Pattern
    const patSection = document.createElement('div');
    patSection.className = 's25-panel-section';
    patSection.innerHTML = `
      <div class="s25-panel-section-title">Pattern</div>
      <div class="s25-panel-pattern-value">${pattern?.label ?? _selectedPattern}</div>
    `;
    body.appendChild(patSection);

    // Sub-problems
    if (subproblems.length) {
      const subSection = document.createElement('div');
      subSection.className = 's25-panel-section';
      subSection.innerHTML = `<div class="s25-panel-section-title">Sub-problems</div>`;
      subproblems.forEach(s => {
        const item = document.createElement('div');
        item.className = 's25-panel-sub-item';
        item.textContent = s.label;
        subSection.appendChild(item);
      });
      body.appendChild(subSection);
    }

    // Reframe progress
    const totalR = (DC?.getReframeQuestions?.() ?? _fallbackReframes()).length;
    const rAnswered = Object.keys(_reframeAnswers).length;
    const reframeSection = document.createElement('div');
    reframeSection.className = 's25-panel-section';
    reframeSection.innerHTML = `
      <div class="s25-panel-section-title">Reframe</div>
      <div class="s25-panel-progress">${rAnswered} / ${totalR} questions answered</div>
    `;
    body.appendChild(reframeSection);

    // Transform hints
    const hints = _collectTransformHints(DC);
    if (hints.length) {
      const hintSection = document.createElement('div');
      hintSection.className = 's25-panel-section s25-panel-section--highlight';
      hintSection.innerHTML = `<div class="s25-panel-section-title">Transforms detected</div>`;
      hints.forEach(h => {
        const tag = document.createElement('div');
        tag.className = 's25-panel-hint-tag';
        tag.textContent = h.replace(/^tr_/, '').replace(/_/g, ' ');
        hintSection.appendChild(tag);
      });
      body.appendChild(hintSection);
    }

    // Triggered implicit structures
    const triggeredIds = Object.entries(_implicitAnswers).filter(([, v]) => v === 'yes').map(([k]) => k);
    if (triggeredIds.length) {
      const checks = DC?.getImplicitChecks?.() ?? _fallbackImplicit();
      const impSection = document.createElement('div');
      impSection.className = 's25-panel-section';
      impSection.innerHTML = `<div class="s25-panel-section-title">Hidden structures detected</div>`;
      triggeredIds.forEach(id => {
        const c = checks.find(x => x.id === id);
        if (!c) return;
        const item = document.createElement('div');
        item.className = 's25-panel-triggered-item';
        item.innerHTML = `<span class="s25-panel-triggered-icon">!</span><span>${c.ifYes}</span>`;
        impSection.appendChild(item);
      });
      body.appendChild(impSection);
    }

    // Gate
    const gate = document.createElement('div');
    gate.className = 's25-panel-gate s25-panel-gate--ready';
    gate.textContent = '✓ Ready to proceed';
    body.appendChild(gate);
  }

  // ─── PERSIST + COMPLETION ──────────────────────────────────────────────────

  function _persist(DC) {
    const pattern = (DC?.getAllPatterns?.() ?? _fallbackPatterns()).find(p => p.id === _selectedPattern);

    State.setAnswer('stage2_5', {
      checked           : true,
      selectedPattern   : _selectedPattern,
      isDecomposed      : !!pattern && !pattern.isNegative,
      subproblems       : DC?.buildSubproblems?.(_selectedPattern) ?? [],
      preprocessingStep : _selectedPattern === 'dp_preprocessing' ? (_preprocessingText || null) : null,
      reframeAnswers    : { ..._reframeAnswers },
      implicitAnswers   : { ..._implicitAnswers },
      transformationHints: _collectTransformHints(DC),
    });

    document.dispatchEvent(new CustomEvent('dsa:answer-update', {
      detail: { stageId: 'stage2_5', key: 'selectedPattern', value: _selectedPattern },
    }));
  }

  function _checkComplete() {
    const isComplete = !!_selectedPattern;
    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(isComplete);

    if (isComplete) {
      const saved = State.getAnswer('stage2_5') ?? {};
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: { stageId: 'stage2_5', answers: saved },
      }));
    }
  }

  // ─── FALLBACKS (used only if DecompositionChecks failed to load) ──────────

  function _fallbackPatterns() {
    return [
      { id: 'dp_not_decomposable', label: 'Single unified problem', question: 'Is this a single problem with no natural split point?', yesSignal: 'All parts interact — cannot separate.', implication: 'Do not force decomposition. Proceed to Stage 3.', examples: [], subproblems: [], isNegative: true },
    ];
  }

  function _fallbackReframes() {
    return [
      { id: 'rq_element_as_node', question: 'What if each element is a node — what would the edges be?', purpose: 'Reveals hidden graph structure.', example: 'Word ladder → BFS shortest path' },
    ];
  }

  function _fallbackImplicit() {
    return [
      { id: 'ic_hidden_dag', check: 'Does element A constrain or depend on element B?', ifYes: 'Hidden DAG — model as directed graph, apply topological sort', example: 'Task A before task B → DAG → topological DP' },
    ];
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s25-styles')) return;
    const style = document.createElement('style');
    style.id = 's25-styles';
    style.textContent = `

    .s25-shell {
      --s25-bg      : #f7f4ef;
      --s25-surface : #ffffff;
      --s25-surface2: #faf8f5;
      --s25-border  : rgba(0,0,0,.09);
      --s25-border2 : rgba(0,0,0,.16);
      --s25-ink     : #1a1814;
      --s25-ink2    : #4a4540;
      --s25-muted   : #8a8070;
      --s25-accent  : #2563eb;
      --s25-accent-bg: rgba(37,99,235,.06);
      --s25-accent-b : rgba(37,99,235,.25);
      --s25-green   : #059669;
      --s25-green-bg: rgba(5,150,105,.07);
      --s25-green-b : rgba(5,150,105,.25);
      --s25-amber   : #d97706;
      --s25-amber-bg: rgba(217,119,6,.09);
      --s25-amber-b : rgba(217,119,6,.3);
      --s25-red     : #dc2626;
      --s25-red-bg  : rgba(220,38,38,.06);
      --s25-red-b   : rgba(220,38,38,.22);
      --s25-r       : 8px;
      --s25-r-sm    : 5px;
      --s25-r-lg    : 12px;
      --s25-font    : 'DM Sans', 'Syne', system-ui, sans-serif;
      --s25-mono    : 'JetBrains Mono', 'Space Mono', monospace;
    }

    .s25-shell {
      display        : flex;
      gap            : 24px;
      align-items    : flex-start;
      background     : var(--s25-bg);
      min-height     : 100%;
      font-family    : var(--s25-font);
      color          : var(--s25-ink);
      padding        : 28px;
    }

    .s25-main {
      flex           : 1;
      display        : flex;
      flex-direction : column;
      gap            : 30px;
      min-width      : 0;
    }

    .s25-rule {
      font-family    : var(--s25-mono);
      font-size      : .72rem;
      color          : var(--s25-muted);
      line-height    : 1.6;
      padding        : 10px 16px;
      background     : var(--s25-surface);
      border         : 1px solid var(--s25-border);
      border-left    : 3px solid var(--s25-amber);
      border-radius  : 0 var(--s25-r) var(--s25-r) 0;
    }

    /* Likelihood banner */
    .s25-likelihood {
      display       : flex;
      align-items   : flex-start;
      gap           : 12px;
      padding       : 12px 16px;
      border-radius : var(--s25-r);
      border        : 1.5px solid var(--s25-border);
      background    : var(--s25-surface);
    }
    .s25-likelihood--high   { background: var(--s25-amber-bg); border-color: var(--s25-amber-b); }
    .s25-likelihood--medium { background: var(--s25-accent-bg); border-color: var(--s25-accent-b); }
    .s25-likelihood-icon    { font-size: 1.05rem; flex-shrink: 0; margin-top: 1px; }
    .s25-likelihood-label   { font-size: .84rem; font-weight: 600; color: var(--s25-ink); margin-bottom: 3px; }
    .s25-likelihood-reason  { font-size: .73rem; color: var(--s25-muted); line-height: 1.5; }

    /* Sections */
    .s25-section { display: flex; flex-direction: column; gap: 14px; }
    .s25-section-header { display: flex; align-items: flex-start; gap: 14px; }
    .s25-section-num {
      font-family: var(--s25-mono); font-size: .65rem; font-weight: 700;
      color: #fff; background: var(--s25-accent);
      width: 26px; height: 26px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 1px; letter-spacing: .5px;
    }
    .s25-section-title { font-size: .92rem; font-weight: 600; color: var(--s25-ink); line-height: 1.3; }
    .s25-section-sub   { font-size: .73rem; color: var(--s25-muted); margin-top: 2px; }

    /* Pattern grid */
    .s25-pattern-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    }
    .s25-pattern-card {
      position: relative;
      background: var(--s25-surface);
      border: 1.5px solid var(--s25-border);
      border-radius: var(--s25-r-lg);
      padding: 12px 14px;
      cursor: pointer;
      transition: border-color .15s, background .15s, transform .1s;
    }
    .s25-pattern-card:hover  { border-color: var(--s25-amber-b); transform: translateY(-1px); }
    .s25-pattern-card--on    { border-color: var(--s25-amber); background: var(--s25-amber-bg); }
    .s25-pattern-card--negative { border-style: dashed; }
    .s25-pattern-card--negative.s25-pattern-card--on { border-style: solid; border-color: var(--s25-muted); background: rgba(138,128,112,.08); }
    .s25-pattern-label    { font-size: .82rem; font-weight: 600; color: var(--s25-ink); margin-bottom: 4px; }
    .s25-pattern-question { font-size: .71rem; color: var(--s25-muted); line-height: 1.5; }
    .s25-pattern-check {
      position: absolute; top: 10px; right: 10px;
      width: 18px; height: 18px; background: var(--s25-amber); color: #fff;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: .6rem; font-weight: 700; opacity: 0; transform: scale(.6);
      transition: opacity .15s, transform .15s;
    }
    .s25-pattern-card--on .s25-pattern-check { opacity: 1; transform: scale(1); }

    /* Pattern detail */
    .s25-pattern-detail {
      background: var(--s25-surface);
      border: 1.5px solid var(--s25-amber-b);
      border-radius: var(--s25-r-lg);
      padding: 14px 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .s25-pattern-detail--single { border-color: var(--s25-border); }
    .s25-pattern-detail-signal { font-size: .78rem; color: var(--s25-ink); line-height: 1.5; }
    .s25-signal-label { font-family: var(--s25-mono); font-size: .65rem; color: var(--s25-muted); text-transform: uppercase; letter-spacing: 1px; margin-right: 4px; }
    .s25-pattern-detail-impl { font-size: .78rem; color: var(--s25-muted); line-height: 1.6; padding: 8px 10px; background: var(--s25-surface2); border-radius: var(--s25-r-sm); }
    .s25-ex-title, .s25-sub-title { font-family: var(--s25-mono); font-size: .6rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s25-muted); }
    .s25-ex-list { display: flex; flex-direction: column; gap: 4px; }
    .s25-ex-item { display: flex; gap: 7px; font-size: .74rem; color: var(--s25-ink); }
    .s25-ex-bullet { color: var(--s25-muted); flex-shrink: 0; }
    .s25-sub-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .s25-sub-chip {
      display: flex; align-items: center; gap: 6px; padding: 5px 10px;
      background: var(--s25-accent-bg); border: 1px solid var(--s25-accent-b);
      border-radius: 20px; font-size: .72rem;
    }
    .s25-sub-chip-num {
      font-family: var(--s25-mono); font-size: .62rem; font-weight: 700;
      background: var(--s25-accent); color: #fff; width: 16px; height: 16px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    /* Preprocessing textarea */
    .s25-preprocess-box { display: flex; flex-direction: column; gap: 6px; }
    .s25-preprocess-label { font-size: .72rem; color: var(--s25-muted); font-weight: 500; }
    .s25-preprocess-textarea {
      width: 100%; min-height: 64px; resize: vertical;
      font-family: var(--s25-font); font-size: .78rem; color: var(--s25-ink);
      background: var(--s25-surface); border: 1.5px solid var(--s25-border);
      border-radius: var(--s25-r); padding: 10px 12px;
    }
    .s25-preprocess-textarea:focus { outline: none; border-color: var(--s25-accent-b); }

    /* Reframe + implicit rows (shared shape) */
    .s25-reframe-list, .s25-implicit-list { display: flex; flex-direction: column; gap: 8px; }
    .s25-reframe-row, .s25-implicit-row {
      background: var(--s25-surface); border: 1.5px solid var(--s25-border);
      border-radius: var(--s25-r-lg); padding: 12px 14px;
      display: flex; flex-direction: column; gap: 8px;
      transition: border-color .2s, background .2s;
    }
    .s25-reframe-row--answered { border-color: var(--s25-accent-b); }
    .s25-implicit-row--triggered { border-color: var(--s25-red-b); background: var(--s25-red-bg); }
    .s25-reframe-q, .s25-implicit-check { font-size: .82rem; font-weight: 500; color: var(--s25-ink); line-height: 1.5; }
    .s25-reframe-purpose { font-size: .71rem; color: var(--s25-muted); line-height: 1.4; }

    .s25-ans-btns { display: flex; gap: 7px; }
    .s25-ans-btn {
      padding: 5px 14px; border: 1.5px solid var(--s25-border2); border-radius: var(--s25-r-sm);
      background: var(--s25-bg); font-family: var(--s25-mono); font-size: .7rem;
      cursor: pointer; transition: border-color .15s, background .15s; color: var(--s25-ink);
    }
    .s25-ans-btn:hover { border-color: var(--s25-amber-b); }
    .s25-ans-btn--on-yes { background: var(--s25-green-bg); border-color: var(--s25-green); color: #024d37; }
    .s25-ans-btn--on-no  { background: rgba(138,128,112,.12); border-color: var(--s25-muted); color: var(--s25-muted); }

    .s25-reframe-example {
      font-size: .72rem; color: var(--s25-ink); background: var(--s25-accent-bg);
      border: 1px solid var(--s25-accent-b); border-radius: var(--s25-r-sm); padding: 6px 10px; line-height: 1.5;
    }
    .s25-ex-label { font-family: var(--s25-mono); font-size: .62rem; color: var(--s25-muted); text-transform: uppercase; letter-spacing: 1px; margin-right: 4px; }

    .s25-implicit-ifyes {
      display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px;
      background: var(--s25-red-bg); border: 1px solid var(--s25-red-b); border-radius: var(--s25-r-sm);
    }
    .s25-ifyes-arrow { font-family: var(--s25-mono); font-size: .9rem; color: var(--s25-red); font-weight: 700; }
    .s25-ifyes-text { font-size: .76rem; color: var(--s25-ink); font-weight: 500; line-height: 1.5; }
    .s25-ifyes-example { font-size: .7rem; color: var(--s25-muted); font-style: italic; line-height: 1.4; margin-top: 2px; }

    .s25-hidden { display: none !important; }

    /* Transform hints */
    .s25-hints-title { font-family: var(--s25-mono); font-size: .62rem; letter-spacing: 2px; text-transform: uppercase; color: var(--s25-muted); margin-bottom: 6px; }
    .s25-hint-card {
      display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px;
      background: rgba(192,84,252,.06); border: 1.5px solid rgba(192,84,252,.25); border-radius: var(--s25-r-sm);
      margin-bottom: 6px;
    }
    .s25-hint-icon { font-size: .9rem; flex-shrink: 0; }
    .s25-hint-text { font-size: .76rem; color: var(--s25-ink); font-weight: 500; flex: 1; }
    .s25-hint-note { font-size: .65rem; color: var(--s25-muted); font-style: italic; }

    /* Side panel */
    .s25-panel {
      width: 280px; flex-shrink: 0; background: var(--s25-surface);
      border: 1.5px solid var(--s25-border); border-radius: var(--s25-r-lg);
      overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px);
      display: flex; flex-direction: column;
    }
    .s25-panel-header { padding: 14px 16px 12px; border-bottom: 1px solid var(--s25-border); background: var(--s25-surface2); }
    .s25-panel-title { font-size: .82rem; font-weight: 700; color: var(--s25-ink); }
    .s25-panel-sub   { font-size: .66rem; color: var(--s25-muted); margin-top: 2px; }
    .s25-panel-body  { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s25-panel-empty { font-size: .74rem; color: var(--s25-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }

    .s25-panel-section { display: flex; flex-direction: column; gap: 6px; }
    .s25-panel-section--highlight { background: #fffbf0; border: 1px solid var(--s25-amber-b); border-radius: var(--s25-r); padding: 10px 12px; }
    .s25-panel-section-title { font-family: var(--s25-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s25-muted); }
    .s25-panel-pattern-value { font-size: .82rem; font-weight: 600; color: var(--s25-ink); }
    .s25-panel-sub-item {
      font-size: .71rem; color: var(--s25-ink2); padding: 6px 9px;
      background: var(--s25-bg); border: 1px solid var(--s25-border); border-radius: var(--s25-r-sm);
    }
    .s25-panel-progress { font-size: .74rem; color: var(--s25-ink2); }
    .s25-panel-hint-tag {
      display: inline-block; padding: 3px 9px; background: rgba(192,84,252,.08);
      border: 1px solid rgba(192,84,252,.25); border-radius: 4px;
      font-family: var(--s25-mono); font-size: .64rem; color: #a855f7; font-weight: 600; margin-bottom: 3px;
    }
    .s25-panel-triggered-item { display: flex; align-items: flex-start; gap: 8px; font-size: .74rem; color: var(--s25-ink); line-height: 1.5; }
    .s25-panel-triggered-icon {
      font-family: var(--s25-mono); font-size: .62rem; font-weight: 700; background: var(--s25-red); color: #fff;
      width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
    }
    .s25-panel-gate {
      padding: 10px 12px; border-radius: 8px; font-size: .74rem; font-weight: 500; text-align: center;
      background: var(--s25-surface2); border: 1.5px solid var(--s25-border); color: var(--s25-muted);
    }
    .s25-panel-gate--ready { background: var(--s25-green-bg); border-color: var(--s25-green-b); color: var(--s25-green); }

    .s25-panel-body::-webkit-scrollbar { width: 3px; }
    .s25-panel-body::-webkit-scrollbar-track { background: transparent; }
    .s25-panel-body::-webkit-scrollbar-thumb { background: var(--s25-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s25-shell { flex-direction: column; padding: 16px; }
      .s25-panel { width: 100%; position: static; max-height: none; }
      .s25-pattern-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage2_5;
    if (!saved) return;
    if (saved.selectedPattern && typeof Renderer !== 'undefined') {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state             = null;
    _selectedPattern   = null;
    _reframeAnswers    = {};
    _implicitAnswers   = {};
    _preprocessingText = '';
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage2_5;
