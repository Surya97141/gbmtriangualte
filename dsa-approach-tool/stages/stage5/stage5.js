// stages/stage5/stage5.js
// Verification Challenges — cream/white theme, self-contained styles
// Same pattern as stage0/1/2/2-5/3/3-5/4/4-5

const Stage5 = (() => {

  let _state          = null;
  let _verifierStates = {};

  // ─── ACTIVE VERIFIERS ──────────────────────────────────────────────────────

  function _getActiveVerifiers(state) {
    const directions = state?.output?.directions ?? [];
    const families   = directions.map(d => d.family ?? d.id ?? '');
    const active     = [];

    if (families.some(f => f.includes('greedy')))
      active.push({ id: 'greedy',       label: 'Greedy counter-example test',   icon: '⚡' });
    if (families.some(f => f.includes('binary_search')))
      active.push({ id: 'monotonicity', label: 'Monotonicity verification',      icon: '↗' });
    if (families.some(f => f.includes('dp')))
      active.push({ id: 'dp_state',     label: 'DP state verification',          icon: '⬡' });
    if (families.some(f => f.includes('graph')))
      active.push({ id: 'graph',        label: 'Graph property verification',    icon: '◉' });

    active.push({ id: 'keyword', label: 'Keyword cross-check', icon: '🔍' });

    // If no direction-specific verifiers, show all
    if (active.length === 1) {
      active.unshift(
        { id: 'greedy',       label: 'Greedy counter-example test',  icon: '⚡' },
        { id: 'monotonicity', label: 'Monotonicity verification',     icon: '↗' },
        { id: 'dp_state',     label: 'DP state verification',         icon: '⬡' }
      );
    }

    return active;
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state          = state;
    const saved     = state.answers?.stage5 ?? {};
    _verifierStates = saved.verifierStates ?? {};

    _injectStyles();

    const activeVerifiers = _getActiveVerifiers(state);

    const wrapper = document.createElement('div');
    wrapper.className = 's5-shell';

    wrapper.innerHTML = `
      <div class="s5-main">

        <div class="s5-rule">
          Verify before coding — structural analysis is not enough.
          ${activeVerifiers.length} verifier(s) active based on your candidate directions.
        </div>

        <!-- Tab bar -->
        <div class="s5-tab-bar" id="s5-tab-bar"></div>

        <!-- Panels -->
        <div class="s5-panels" id="s5-panels"></div>

      </div>

      <!-- Live side panel -->
      <aside class="s5-panel">
        <div class="s5-panel-header">
          <div class="s5-panel-title">Verification status</div>
          <div class="s5-panel-sub">Updates as you complete checks</div>
        </div>
        <div class="s5-panel-body" id="s5-panel-body">
          <div class="s5-panel-empty">← Complete verifiers to see status</div>
        </div>
      </aside>
    `;

    _buildTabs(wrapper, activeVerifiers, saved);
    _buildPanels(wrapper, activeVerifiers, saved);
    setTimeout(() => _updatePanel(wrapper, activeVerifiers, saved), 0);

    return wrapper;
  }

  // ─── TABS ──────────────────────────────────────────────────────────────────

  function _buildTabs(wrapper, activeVerifiers, saved) {
    const bar = wrapper.querySelector('#s5-tab-bar');
    if (!bar) return;

    activeVerifiers.forEach((v, idx) => {
      const isDone = _isVerifierDone(v.id, saved);
      const tab    = document.createElement('div');
      tab.className = `s5-tab ${idx === 0 ? 's5-tab--active' : ''} ${isDone ? 's5-tab--done' : ''}`;
      tab.dataset.verifierId = v.id;
      tab.innerHTML = `
        <span class="s5-tab-icon">${v.icon}</span>
        <span class="s5-tab-label">${v.label}</span>
        ${isDone ? '<span class="s5-tab-check">✓</span>' : ''}
      `;
      tab.addEventListener('click', () => _switchTab(v.id, wrapper, activeVerifiers));
      bar.appendChild(tab);
    });
  }

  function _switchTab(verifierId, wrapper, activeVerifiers) {
    wrapper.querySelectorAll('.s5-tab').forEach(t =>
      t.classList.toggle('s5-tab--active', t.dataset.verifierId === verifierId)
    );
    activeVerifiers.forEach(v => {
      const panel = wrapper.querySelector(`#s5-vp-${v.id}`);
      if (panel) panel.classList.toggle('s5-hidden', v.id !== verifierId);
    });
  }

  // ─── PANELS ────────────────────────────────────────────────────────────────

  function _buildPanels(wrapper, activeVerifiers, saved) {
    const container = wrapper.querySelector('#s5-panels');
    if (!container) return;

    activeVerifiers.forEach((v, idx) => {
      const panel = document.createElement('div');
      panel.id = `s5-vp-${v.id}`;
      panel.className = `s5-verifier-panel ${idx !== 0 ? 's5-hidden' : ''}`;

      const vState = saved.verifierStates?.[v.id] ?? {};

      switch (v.id) {
        case 'greedy':       _buildGreedyPanel(panel, vState, wrapper, activeVerifiers);       break;
        case 'monotonicity': _buildMonotonicityPanel(panel, vState, wrapper, activeVerifiers); break;
        case 'dp_state':     _buildDPStatePanel(panel, vState, wrapper, activeVerifiers);      break;
        case 'graph':        _buildGraphPanel(panel, vState, wrapper, activeVerifiers);        break;
        case 'keyword':      _buildKeywordPanel(panel, vState, wrapper, activeVerifiers);      break;
      }

      container.appendChild(panel);
    });
  }

  // ─── GREEDY PANEL ──────────────────────────────────────────────────────────

  function _buildGreedyPanel(panel, vState, wrapper, activeVerifiers) {
    const GV = typeof GreedyVerifier !== 'undefined' ? GreedyVerifier : null;
    const framework = GV?.getFramework?.() ?? _fallbackGreedyFramework();

    panel.innerHTML = `
      <div class="s5-panel-title">Greedy Counter-Example Test</div>
      <div class="s5-panel-subtitle">State the rule clearly. Try to break it with a small adversarial input.</div>

      <div class="s5-field">
        <label class="s5-label" for="s5-greedy-rule">State your greedy rule in one sentence:</label>
        <textarea id="s5-greedy-rule" class="s5-textarea" placeholder="At each step, I always pick ___" rows="2">${vState.greedyRule ?? ''}</textarea>
      </div>

      <div class="s5-steps">
        ${framework.steps.slice(1).map(step => `
          <div class="s5-step">
            <div class="s5-step-num">Step ${step.step}</div>
            <div class="s5-step-label">${step.label}</div>
            <div class="s5-step-desc">${step.desc}</div>
            <div class="s5-step-example"><span class="s5-ex-label">e.g.</span> ${step.example}</div>
          </div>
        `).join('')}
      </div>

      <div class="s5-verdict-section">
        <div class="s5-verdict-label">After testing — what did you find?</div>
        <div class="s5-verdict-btns">
          <button class="s5-verdict-btn s5-verdict-btn--red   ${vState.verdict==='found'     ?'s5-verdict-btn--on':''}" data-id="greedy" data-val="found">✗ Counter-example FOUND — greedy fails</button>
          <button class="s5-verdict-btn s5-verdict-btn--green ${vState.verdict==='not_found' ?'s5-verdict-btn--on':''}" data-id="greedy" data-val="not_found">✓ No counter-example found — greedy holds</button>
        </div>
      </div>
      <div id="s5-greedy-result"></div>

      <details class="s5-collapsible">
        <summary class="s5-collapsible-summary">Common greedy traps</summary>
        <div class="s5-traps">
          ${(GV?.getCommonTraps?.() ?? _fallbackGreedyTraps()).map(trap => `
            <div class="s5-trap">
              <div class="s5-trap-label">${trap.label}</div>
              <div class="s5-trap-trap">${trap.trap}</div>
              <div class="s5-trap-test"><span class="s5-ex-label">Test:</span> ${trap.test}</div>
            </div>
          `).join('')}
        </div>
      </details>
    `;

    if (vState.verdict) _renderGreedyResult(panel.querySelector('#s5-greedy-result'), vState.verdict);

    panel.querySelector('#s5-greedy-rule')?.addEventListener('input', e => {
      _updateVerifierState('greedy', { greedyRule: e.target.value }, wrapper, activeVerifiers);
    });

    panel.querySelectorAll('.s5-verdict-btn[data-id="greedy"]').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.s5-verdict-btn[data-id="greedy"]').forEach(b => b.classList.remove('s5-verdict-btn--on'));
        btn.classList.add('s5-verdict-btn--on');
        _updateVerifierState('greedy', { verdict: btn.dataset.val }, wrapper, activeVerifiers);
        _renderGreedyResult(panel.querySelector('#s5-greedy-result'), btn.dataset.val);
      });
    });
  }

  function _renderGreedyResult(container, verdict) {
    if (!container) return;
    const isFound = verdict === 'found';
    container.innerHTML = `
      <div class="s5-result-card s5-result-card--${isFound ? 'fail' : 'pass'}">
        <span class="s5-result-icon">${isFound ? '✗' : '✓'}</span>
        <span class="s5-result-message">${isFound ? 'Greedy FAILS — use Dynamic Programming instead' : 'Greedy likely correct — proceed but verify formally if possible'}</span>
      </div>
    `;
  }

  // ─── MONOTONICITY PANEL ────────────────────────────────────────────────────

  function _buildMonotonicityPanel(panel, vState, wrapper, activeVerifiers) {
    const MV = typeof MonotonicityVerifier !== 'undefined' ? MonotonicityVerifier : null;
    const framework = MV?.getFramework?.() ?? _fallbackMonoFramework();
    const directions = MV?.getDirectionTemplates?.() ?? _fallbackMonoDirections();

    panel.innerHTML = `
      <div class="s5-panel-title">Monotonicity Verification</div>
      <div class="s5-panel-subtitle">Confirm isFeasible(X) is monotone before writing Binary Search.</div>

      <div class="s5-steps">
        ${framework.steps.map(step => `
          <div class="s5-step">
            <div class="s5-step-num">Step ${step.step}</div>
            <div class="s5-step-label">${step.label}</div>
            <div class="s5-step-desc">${step.desc}</div>
            <div class="s5-step-example"><span class="s5-ex-label">e.g.</span> ${step.example}</div>
          </div>
        `).join('')}
      </div>

      <div class="s5-verdict-section">
        <div class="s5-verdict-label">Are you minimizing or maximizing?</div>
        <div class="s5-verdict-btns">
          ${directions.map(t => `
            <button class="s5-verdict-btn s5-verdict-btn--blue ${vState.direction===t.id?'s5-verdict-btn--on':''}" data-id="mono_dir" data-val="${t.id}">${t.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="s5-verdict-section">
        <div class="s5-verdict-label">Is isFeasible(X) monotone?</div>
        <div class="s5-verdict-btns">
          <button class="s5-verdict-btn s5-verdict-btn--green ${vState.verdict==='yes'?'s5-verdict-btn--on':''}" data-id="mono" data-val="yes">✓ Yes — monotone, Binary Search is valid</button>
          <button class="s5-verdict-btn s5-verdict-btn--red   ${vState.verdict==='no' ?'s5-verdict-btn--on':''}" data-id="mono" data-val="no">✗ No — NOT monotone, Binary Search will fail</button>
        </div>
      </div>

      <div id="s5-mono-template"></div>
    `;

    if (vState.verdict === 'yes' && vState.direction) {
      _renderMonoTemplate(panel.querySelector('#s5-mono-template'), vState.direction, directions);
    }

    panel.querySelectorAll('.s5-verdict-btn[data-id="mono_dir"]').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.s5-verdict-btn[data-id="mono_dir"]').forEach(b => b.classList.remove('s5-verdict-btn--on'));
        btn.classList.add('s5-verdict-btn--on');
        _updateVerifierState('monotonicity', { direction: btn.dataset.val }, wrapper, activeVerifiers);
        const cur = _verifierStates.monotonicity ?? {};
        if (cur.verdict === 'yes') _renderMonoTemplate(panel.querySelector('#s5-mono-template'), btn.dataset.val, directions);
      });
    });

    panel.querySelectorAll('.s5-verdict-btn[data-id="mono"]').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.s5-verdict-btn[data-id="mono"]').forEach(b => b.classList.remove('s5-verdict-btn--on'));
        btn.classList.add('s5-verdict-btn--on');
        const dir = (_verifierStates.monotonicity ?? {}).direction;
        _updateVerifierState('monotonicity', { verdict: btn.dataset.val }, wrapper, activeVerifiers);
        if (btn.dataset.val === 'yes' && dir) _renderMonoTemplate(panel.querySelector('#s5-mono-template'), dir, directions);
        else panel.querySelector('#s5-mono-template').innerHTML = '';
      });
    });
  }

  function _renderMonoTemplate(container, dirId, directions) {
    if (!container) return;
    const t = directions.find(d => d.id === dirId);
    if (!t?.template) return;
    container.innerHTML = `
      <details class="s5-collapsible" open>
        <summary class="s5-collapsible-summary">Binary Search template</summary>
        <pre class="s5-code-block">${t.template}</pre>
      </details>
    `;
  }

  // ─── DP STATE PANEL ────────────────────────────────────────────────────────

  function _buildDPStatePanel(panel, vState, wrapper, activeVerifiers) {
    const DPS = typeof DPStateVerifier !== 'undefined' ? DPStateVerifier : null;
    const checks = DPS?.getChecks?.() ?? _fallbackDPChecks();

    panel.innerHTML = `
      <div class="s5-panel-title">DP State Verification</div>
      <div class="s5-panel-subtitle">Confirm state is complete (captures all info) and non-redundant.</div>
      <div class="s5-dp-checklist" id="s5-dp-checklist"></div>
      <div id="s5-dp-result"></div>
    `;

    const list = panel.querySelector('#s5-dp-checklist');

    checks.forEach(check => {
      const savedAnswer = vState.checkAnswers?.[check.id];
      const item = document.createElement('div');
      item.className = `s5-dp-check ${savedAnswer ? 's5-dp-check--answered' : ''}`;
      item.id = `s5-dpc-${check.id}`;

      const exText = check.example?.badState
        ? `Bad: ${check.example.badState} → Good: ${check.example.goodState}`
        : (check.example?.fix ?? '');

      item.innerHTML = `
        <div class="s5-dp-check-label">${check.label}</div>
        <div class="s5-dp-check-question">${check.question}</div>
        <div class="s5-dp-check-example"><span class="s5-ex-label">Example:</span> ${exText}</div>
        <div class="s5-dp-check-btns">
          <button class="s5-verdict-btn s5-verdict-btn--green ${savedAnswer==='pass'?'s5-verdict-btn--on':''}" data-check="${check.id}" data-val="pass">✓ Pass</button>
          <button class="s5-verdict-btn s5-verdict-btn--red   ${savedAnswer==='fail'?'s5-verdict-btn--on':''}" data-check="${check.id}" data-val="fail">✗ Issue found</button>
        </div>
      `;

      item.querySelectorAll('.s5-verdict-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          item.querySelectorAll('.s5-verdict-btn').forEach(b => b.classList.remove('s5-verdict-btn--on'));
          btn.classList.add('s5-verdict-btn--on');
          item.classList.add('s5-dp-check--answered');

          const cur = _verifierStates.dp_state?.checkAnswers ?? {};
          cur[btn.dataset.check] = btn.dataset.val;
          _updateVerifierState('dp_state', { checkAnswers: { ...cur } }, wrapper, activeVerifiers);

          if (checks.every(c => cur[c.id])) {
            const allPass = checks.every(c => cur[c.id] === 'pass');
            const result  = panel.querySelector('#s5-dp-result');
            if (result) result.innerHTML = `
              <div class="s5-result-card s5-result-card--${allPass ? 'pass' : 'warn'}">
                <span class="s5-result-icon">${allPass ? '✓' : '~'}</span>
                <span class="s5-result-message">${allPass ? 'DP state verified — all checks passed' : 'Issues found — review failed checks before coding'}</span>
              </div>
            `;
          }
        });
      });

      list.appendChild(item);
    });
  }

  // ─── GRAPH PANEL ───────────────────────────────────────────────────────────

  function _buildGraphPanel(panel, vState, wrapper, activeVerifiers) {
    const GV = typeof GraphVerifier !== 'undefined' ? GraphVerifier : null;
    const checks = GV?.getChecks?.() ?? _fallbackGraphChecks();

    panel.innerHTML = `
      <div class="s5-panel-title">Graph Property Verification</div>
      <div class="s5-panel-subtitle">Confirm graph type before choosing algorithm.</div>
      ${checks.map(check => `
        <div class="s5-graph-check" id="s5-gc-${check.id}">
          <div class="s5-graph-check-q">${check.question}</div>
          <div class="s5-graph-check-why">${check.why}</div>
          <div class="s5-graph-check-opts">
            ${(check.options ?? []).map(opt => `
              <div class="s5-graph-opt ${(vState.checkAnswers?.[check.id]===opt.id)?'s5-graph-opt--on':''}"
                   data-check="${check.id}" data-opt="${opt.id}">
                <div class="s5-graph-opt-label">${opt.label}</div>
                <div class="s5-graph-opt-impl">${opt.implication}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div id="s5-graph-rec"></div>
    `;

    panel.querySelectorAll('.s5-graph-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const checkId = opt.dataset.check;
        const optId   = opt.dataset.opt;
        panel.querySelectorAll(`.s5-graph-opt[data-check="${checkId}"]`).forEach(o =>
          o.classList.toggle('s5-graph-opt--on', o.dataset.opt === optId)
        );

        const cur = _verifierStates.graph?.checkAnswers ?? {};
        cur[checkId] = optId;
        _updateVerifierState('graph', { checkAnswers: { ...cur } }, wrapper, activeVerifiers);

        if (GV) {
          const rec = GV.getAlgorithmForConditions?.({
            weighted: cur.weighted_check === 'weighted',
            negative: cur.negative_check === 'negative',
            directed: cur.directed_check === 'directed',
            goal    : _state?.answers?.stage3?.graphGoal ?? 'shortest_path',
          });
          if (rec) {
            const recEl = panel.querySelector('#s5-graph-rec');
            if (recEl) recEl.innerHTML = `<div class="s5-graph-rec">Recommended algorithm: <code class="s5-code">${rec}</code></div>`;
            _updateVerifierState('graph', { algorithmRecommendation: rec }, wrapper, activeVerifiers);
          }
        }
      });
    });
  }

  // ─── KEYWORD PANEL ─────────────────────────────────────────────────────────

  function _buildKeywordPanel(panel, vState, wrapper, activeVerifiers) {
    const KC = typeof KeywordCrosscheck !== 'undefined' ? KeywordCrosscheck : null;

    panel.innerHTML = `
      <div class="s5-panel-title">Keyword Cross-Check</div>
      <div class="s5-panel-subtitle">Warning only — takes 30 seconds. Catches late misidentifications.</div>

      <div class="s5-field">
        <label class="s5-label" for="s5-kw-input">Paste key phrases from the problem statement:</label>
        <textarea id="s5-kw-input" class="s5-textarea" placeholder="e.g. minimum path, connected components, subarray sum..." rows="3">${vState.problemText ?? ''}</textarea>
      </div>

      <div class="s5-keyword-matches" id="s5-kw-matches"></div>

      <div class="s5-verdict-section">
        <div class="s5-verdict-label">Are you satisfied language matches your approach?</div>
        <div class="s5-verdict-btns">
          <button class="s5-verdict-btn s5-verdict-btn--green   ${vState.verdict==='confirmed'?'s5-verdict-btn--on':''}" data-id="kw" data-val="confirmed">✓ Yes — language and approach align</button>
          <button class="s5-verdict-btn s5-verdict-btn--yellow  ${vState.verdict==='mismatch' ?'s5-verdict-btn--on':''}" data-id="kw" data-val="mismatch">⚠ Possible mismatch — need to reconsider</button>
        </div>
      </div>
    `;

    if (vState.problemText) _renderKeywordMatches(panel.querySelector('#s5-kw-matches'), vState.problemText, KC);

    panel.querySelector('#s5-kw-input')?.addEventListener('input', e => {
      _updateVerifierState('keyword', { problemText: e.target.value }, wrapper, activeVerifiers);
      _renderKeywordMatches(panel.querySelector('#s5-kw-matches'), e.target.value, KC);
    });

    panel.querySelectorAll('.s5-verdict-btn[data-id="kw"]').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.s5-verdict-btn[data-id="kw"]').forEach(b => b.classList.remove('s5-verdict-btn--on'));
        btn.classList.add('s5-verdict-btn--on');
        _updateVerifierState('keyword', { verdict: btn.dataset.val }, wrapper, activeVerifiers);
      });
    });
  }

  function _renderKeywordMatches(container, text, KC) {
    if (!container) return;
    container.innerHTML = '';
    if (!text.trim()) return;

    const matches = KC?.scanProblemText?.(text) ?? [];
    if (!matches.length) {
      container.innerHTML = `<div class="s5-kw-empty">No recognized keyword signals found</div>`;
      return;
    }

    matches.forEach(m => {
      const el = document.createElement('div');
      el.className = 's5-kw-match';
      el.innerHTML = `
        <div class="s5-kw-match-kws">${(m.keywords ?? []).join(', ')}</div>
        <div class="s5-kw-match-note">${m.note ?? ''}</div>
      `;
      container.appendChild(el);
    });

    const directions = _state?.output?.directions ?? [];
    const report     = KC?.buildReport?.(matches, directions);
    if (report?.mismatches?.length) {
      report.mismatches.forEach(mm => {
        const el = document.createElement('div');
        el.className = 's5-kw-mismatch';
        el.innerHTML = `⚠ ${mm.warning}`;
        container.appendChild(el);
      });
    }
  }

  // ─── VERIFIER STATE ────────────────────────────────────────────────────────

  function _updateVerifierState(verifierId, updates, wrapper, activeVerifiers) {
    if (!_verifierStates[verifierId]) _verifierStates[verifierId] = {};
    Object.assign(_verifierStates[verifierId], updates);
    State.setAnswer('stage5', { verifierStates: { ..._verifierStates } });

    // Update tab done state
    const saved  = State.getAnswer('stage5') ?? {};
    const isDone = _isVerifierDone(verifierId, saved);
    const tab    = wrapper.querySelector(`.s5-tab[data-verifier-id="${verifierId}"]`);
    if (tab) {
      tab.classList.toggle('s5-tab--done', isDone);
      const existing = tab.querySelector('.s5-tab-check');
      if (!existing && isDone) {
        const check = document.createElement('span');
        check.className = 's5-tab-check';
        check.textContent = '✓';
        tab.appendChild(check);
      } else if (existing && !isDone) {
        existing.remove();
      }
    }

    _updatePanel(wrapper, activeVerifiers, saved);
    _checkComplete(activeVerifiers);
  }

  function _isVerifierDone(verifierId, saved) {
    const vState = saved.verifierStates?.[verifierId] ?? {};
    switch (verifierId) {
      case 'greedy':       return !!vState.verdict;
      case 'monotonicity': return !!vState.verdict;
      case 'dp_state': {
        const checks = typeof DPStateVerifier !== 'undefined' ? DPStateVerifier.getChecks?.() ?? [] : _fallbackDPChecks();
        return checks.length > 0 && checks.every(c => vState.checkAnswers?.[c.id]);
      }
      case 'graph': {
        const checks = typeof GraphVerifier !== 'undefined' ? GraphVerifier.getChecks?.() ?? [] : _fallbackGraphChecks();
        return checks.length > 0 && checks.every(c => vState.checkAnswers?.[c.id]);
      }
      case 'keyword': return !!vState.verdict;
      default:        return false;
    }
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper, activeVerifiers, saved) {
    const body = wrapper.querySelector('#s5-panel-body');
    if (!body) return;
    body.innerHTML = '';

    const doneCount = activeVerifiers.filter(v => _isVerifierDone(v.id, saved)).length;
    const total     = activeVerifiers.length;

    if (doneCount === 0) {
      body.innerHTML = '<div class="s5-panel-empty">← Complete verifiers to see status</div>';
      return;
    }

    // Progress
    const progSec = document.createElement('div');
    progSec.className = 's5-panel-section';
    progSec.innerHTML = `
      <div class="s5-panel-section-title">Overall progress</div>
      <div class="s5-panel-progress-track">
        <div class="s5-panel-progress-fill" style="width:${Math.round(doneCount/total*100)}%"></div>
      </div>
      <div class="s5-panel-progress-label">${doneCount} / ${total} verifiers completed</div>
    `;
    body.appendChild(progSec);

    // Individual results
    activeVerifiers.forEach(v => {
      const vState = (saved.verifierStates ?? {})[v.id] ?? {};
      const isDone = _isVerifierDone(v.id, saved);
      if (!isDone) return;

      const sec = document.createElement('div');
      sec.className = 's5-panel-section';
      sec.innerHTML = `<div class="s5-panel-section-title">${v.icon} ${v.label}</div>`;

      let resultHTML = '';

      switch (v.id) {
        case 'greedy':
          resultHTML = vState.verdict === 'found'
            ? `<div class="s5-panel-result s5-panel-result--fail">✗ Counter-example found — use DP</div>`
            : `<div class="s5-panel-result s5-panel-result--pass">✓ No counter-example — greedy holds</div>`;
          break;
        case 'monotonicity':
          resultHTML = vState.verdict === 'yes'
            ? `<div class="s5-panel-result s5-panel-result--pass">✓ Monotone — Binary Search valid</div>`
            : `<div class="s5-panel-result s5-panel-result--fail">✗ NOT monotone — Binary Search fails</div>`;
          break;
        case 'dp_state': {
          const checks = _fallbackDPChecks();
          const allPass = checks.every(c => vState.checkAnswers?.[c.id] === 'pass');
          resultHTML = allPass
            ? `<div class="s5-panel-result s5-panel-result--pass">✓ State verified</div>`
            : `<div class="s5-panel-result s5-panel-result--warn">~ Issues found — review</div>`;
          break;
        }
        case 'keyword':
          resultHTML = vState.verdict === 'confirmed'
            ? `<div class="s5-panel-result s5-panel-result--pass">✓ Language aligns with approach</div>`
            : `<div class="s5-panel-result s5-panel-result--warn">⚠ Possible mismatch detected</div>`;
          break;
        case 'graph':
          resultHTML = `<div class="s5-panel-result s5-panel-result--pass">✓ Graph properties verified</div>`;
          if (vState.algorithmRecommendation) {
            resultHTML += `<div class="s5-panel-algo"><code class="s5-panel-code">${vState.algorithmRecommendation}</code></div>`;
          }
          break;
      }

      sec.innerHTML += resultHTML;
      body.appendChild(sec);
    });

    // Gate
    const needed  = Math.ceil(total / 2);
    const isReady = doneCount >= needed;
    const gate    = document.createElement('div');
    gate.className = `s5-panel-gate ${isReady ? 's5-panel-gate--ready' : ''}`;
    gate.textContent = isReady
      ? '✓ Ready to proceed to Stage 6'
      : `Complete ${needed - doneCount} more verifier${needed - doneCount !== 1 ? 's' : ''} to proceed`;
    body.appendChild(gate);
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete(activeVerifiers) {
    const saved     = State.getAnswer('stage5') ?? {};
    const doneCount = activeVerifiers.filter(v => _isVerifierDone(v.id, saved)).length;
    const valid     = doneCount >= Math.ceil(activeVerifiers.length / 2);

    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage5',
          answers: { ...saved, passed: activeVerifiers.filter(v => _isVerifierDone(v.id, saved)).map(v => v.id) },
        },
      }));
    }
  }

  // ─── FALLBACKS ─────────────────────────────────────────────────────────────

  function _fallbackGreedyFramework() {
    return {
      steps: [
        { step: 1, label: 'State the rule', desc: 'Write it in one sentence', example: 'Always pick the interval with the earliest end time' },
        { step: 2, label: 'Try small adversarial input (n=3)', desc: 'Build a case designed to break the rule', example: '[0,10], [1,2], [1,3] — does earliest end time still win?' },
        { step: 3, label: 'Try n=4 if n=3 worked', desc: 'Increase by one — many traps need 4 elements to surface', example: '[0,5],[1,3],[2,6],[4,7] — test your rule again' },
        { step: 4, label: 'Exchange argument', desc: 'Prove: swapping the greedy choice with any other choice never improves the result', example: 'If we swap interval A for B, we can\'t gain more intervals' },
      ],
    };
  }

  function _fallbackGreedyTraps() {
    return [
      { label: 'Fractional vs 0/1 Knapsack', trap: 'Greedy works for fractional but fails for 0/1', test: 'Items [val=6,wt=4],[val=4,wt=3],[val=3,wt=2], capacity=5' },
      { label: 'Coin change (non-canonical denominations)', trap: 'Greedy fails for coins like [1,3,4] with target=6', test: 'Coins=[1,3,4], target=6: greedy gives 4+1+1=3 coins, optimal is 3+3=2 coins' },
      { label: 'Dijkstra vs BFS', trap: 'Using BFS (greedy by level) on weighted graphs', test: 'Add a path with small hop count but large total weight' },
    ];
  }

  function _fallbackMonoFramework() {
    return {
      steps: [
        { step: 1, label: 'Define isFeasible(X)', desc: 'What does it mean for X to be feasible?', example: 'isFeasible(days) = can we ship all packages in \'days\' days?' },
        { step: 2, label: 'Check monotonicity', desc: 'If X is feasible, is X+1 also feasible?', example: 'If 10 days works, surely 11 days also works → monotone' },
        { step: 3, label: 'Identify direction', desc: 'Are you finding the minimum feasible X or maximum?', example: 'Minimum days to ship → find smallest X where isFeasible(X) = true' },
        { step: 4, label: 'Set binary search bounds', desc: 'What is the minimum and maximum possible answer?', example: 'lo = max(weights), hi = sum(weights)' },
      ],
    };
  }

  function _fallbackMonoDirections() {
    return [
      { id: 'minimize', label: 'Minimizing', template: 'lo, hi = lower_bound, upper_bound\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if isFeasible(mid):\n        hi = mid\n    else:\n        lo = mid + 1\nreturn lo' },
      { id: 'maximize', label: 'Maximizing', template: 'lo, hi = lower_bound, upper_bound\nwhile lo < hi:\n    mid = (lo + hi + 1) // 2\n    if isFeasible(mid):\n        lo = mid\n    else:\n        hi = mid - 1\nreturn lo' },
    ];
  }

  function _fallbackDPChecks() {
    return [
      { id: 'dp_completeness',  label: 'State completeness',  question: 'Does the state capture ALL information needed to compute future states?', example: { badState: 'dp[i] = max coins',              goodState: 'dp[i][remaining] = max coins with i items and remaining capacity' } },
      { id: 'dp_nonredundant',  label: 'No redundancy',       question: 'Are any dimensions of the state redundant (derivable from others)?',     example: { fix: 'If dp[i][j] always has j = i*(i+1)/2, drop j — it\'s redundant' } },
      { id: 'dp_transition',    label: 'Transition validity', question: 'Does each transition correctly move from smaller to larger subproblems?', example: { badState: 'dp[i] = dp[i+1] + val[i] (future dependency)', goodState: 'dp[i] = dp[i-1] + val[i] (past dependency only)' } },
      { id: 'dp_base_case',     label: 'Base case coverage',  question: 'Are all boundary conditions explicitly set?',                            example: { fix: 'dp[0] = 0, dp[negative] = -infinity (or handled)' } },
    ];
  }

  function _fallbackGraphChecks() {
    return [
      { id: 'weighted_check',  question: 'Are edge weights present and relevant?',    why: 'Determines BFS vs Dijkstra vs Bellman-Ford', options: [{ id: 'weighted',   label: 'Weighted',   implication: 'Cannot use BFS for shortest path — use Dijkstra or Bellman-Ford' }, { id: 'unweighted', label: 'Unweighted', implication: 'BFS gives optimal shortest path in O(V+E)' }] },
      { id: 'directed_check',  question: 'Are edges directed?',                       why: 'Affects cycle detection and connectivity algorithms', options: [{ id: 'directed',   label: 'Directed',   implication: 'Use SCC (Kosaraju/Tarjan) for strong connectivity, 3-color DFS for cycles' }, { id: 'undirected', label: 'Undirected', implication: 'Simple parent-tracking DFS for cycle detection' }] },
      { id: 'negative_check',  question: 'Can edge weights be negative?',             why: 'Dijkstra FAILS with negative weights', options: [{ id: 'negative',    label: 'Yes — negative weights', implication: 'MUST use Bellman-Ford O(VE) or SPFA. Dijkstra is WRONG here.' }, { id: 'non_negative', label: 'No — all non-negative', implication: 'Dijkstra with priority queue is optimal: O((V+E)logV)' }] },
    ];
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s5-styles')) return;
    const style = document.createElement('style');
    style.id = 's5-styles';
    style.textContent = `
    .s5-shell {
      --s5-bg      : #f7f4ef;
      --s5-surface : #ffffff;
      --s5-surface2: #faf8f5;
      --s5-border  : rgba(0,0,0,.09);
      --s5-border2 : rgba(0,0,0,.16);
      --s5-ink     : #1a1814;
      --s5-ink2    : #4a4540;
      --s5-muted   : #8a8070;
      --s5-blue    : #2563eb;
      --s5-blue-bg : rgba(37,99,235,.07);
      --s5-blue-b  : rgba(37,99,235,.24);
      --s5-green   : #059669;
      --s5-green-bg: rgba(5,150,105,.07);
      --s5-green-b : rgba(5,150,105,.28);
      --s5-warn    : #d97706;
      --s5-warn-bg : rgba(217,119,6,.07);
      --s5-warn-b  : rgba(217,119,6,.28);
      --s5-red     : #dc2626;
      --s5-red-bg  : rgba(220,38,38,.06);
      --s5-red-b   : rgba(220,38,38,.22);
      --s5-mono    : 'Space Mono', monospace;
      --s5-sans    : 'DM Sans', system-ui, sans-serif;
      display      : flex;
      gap          : 24px;
      align-items  : flex-start;
      background   : var(--s5-bg);
      min-height   : 100%;
      font-family  : var(--s5-sans);
      color        : var(--s5-ink);
      padding      : 28px;
    }
    .s5-main   { flex: 1; display: flex; flex-direction: column; gap: 24px; min-width: 0; }
    .s5-rule   { font-family: var(--s5-mono); font-size: .71rem; color: var(--s5-muted); padding: 10px 16px; background: var(--s5-surface); border: 1px solid var(--s5-border); border-left: 3px solid var(--s5-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }
    .s5-hidden { display: none !important; }

    /* Tabs */
    .s5-tab-bar { display: flex; flex-wrap: wrap; gap: 6px; }
    .s5-tab { display: flex; align-items: center; gap: 7px; padding: 8px 14px; background: var(--s5-surface); border: 1.5px solid var(--s5-border); border-radius: 8px; cursor: pointer; font-size: .78rem; font-weight: 500; color: var(--s5-muted); transition: all .12s; user-select: none; }
    .s5-tab:hover   { border-color: var(--s5-border2); color: var(--s5-ink2); }
    .s5-tab--active { border-color: var(--s5-blue); background: var(--s5-blue-bg); color: var(--s5-blue); }
    .s5-tab--done   { border-color: var(--s5-green-b); background: var(--s5-green-bg); color: var(--s5-green); }
    .s5-tab-icon  { font-size: .86rem; }
    .s5-tab-label { font-size: .76rem; }
    .s5-tab-check { font-family: var(--s5-mono); font-size: .7rem; font-weight: 700; }

    /* Verifier panels */
    .s5-panels        { display: flex; flex-direction: column; }
    .s5-verifier-panel{ background: var(--s5-surface); border: 1.5px solid var(--s5-border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .s5-panel-title    { font-size: .92rem; font-weight: 700; color: var(--s5-ink); }
    .s5-panel-subtitle { font-size: .74rem; color: var(--s5-muted); line-height: 1.5; margin-top: -8px; }

    /* Steps */
    .s5-steps { display: flex; flex-direction: column; gap: 8px; }
    .s5-step  { padding: 10px 14px; background: var(--s5-surface2); border: 1px solid var(--s5-border); border-radius: 8px; border-left: 2px solid var(--s5-border2); display: flex; flex-direction: column; gap: 3px; }
    .s5-step-num   { font-family: var(--s5-mono); font-size: .58rem; letter-spacing: 1px; text-transform: uppercase; color: var(--s5-muted); }
    .s5-step-label { font-size: .82rem; font-weight: 600; color: var(--s5-ink); }
    .s5-step-desc  { font-size: .74rem; color: var(--s5-ink2); line-height: 1.5; }
    .s5-step-example{ font-size: .72rem; color: var(--s5-muted); line-height: 1.4; margin-top: 2px; }
    .s5-ex-label   { font-weight: 600; color: var(--s5-blue); margin-right: 4px; }

    /* Fields */
    .s5-field  { display: flex; flex-direction: column; gap: 5px; }
    .s5-label  { font-size: .78rem; font-weight: 500; color: var(--s5-ink2); }
    .s5-textarea { background: var(--s5-surface); border: 1.5px solid var(--s5-border); border-radius: 8px; padding: 9px 12px; font-family: var(--s5-sans); font-size: .82rem; color: var(--s5-ink); outline: none; resize: vertical; transition: border-color .12s, box-shadow .12s; width: 100%; line-height: 1.5; }
    .s5-textarea:focus { border-color: var(--s5-blue); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
    .s5-textarea::placeholder { color: var(--s5-muted); }

    /* Verdict section */
    .s5-verdict-section { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; background: var(--s5-surface2); border-radius: 9px; border: 1px solid var(--s5-border); }
    .s5-verdict-label   { font-size: .8rem; font-weight: 500; color: var(--s5-ink); }
    .s5-verdict-btns    { display: flex; flex-wrap: wrap; gap: 7px; }
    .s5-verdict-btn     { padding: 7px 14px; border: 1.5px solid var(--s5-border); border-radius: 7px; background: var(--s5-surface); font-size: .78rem; font-weight: 500; cursor: pointer; transition: all .12s; color: var(--s5-muted); }
    .s5-verdict-btn:hover   { border-color: var(--s5-border2); color: var(--s5-ink); }
    .s5-verdict-btn--green.s5-verdict-btn--on  { background: var(--s5-green-bg); border-color: var(--s5-green-b); color: var(--s5-green); font-weight: 600; }
    .s5-verdict-btn--red.s5-verdict-btn--on    { background: var(--s5-red-bg);   border-color: var(--s5-red-b);   color: var(--s5-red);   font-weight: 600; }
    .s5-verdict-btn--yellow.s5-verdict-btn--on { background: var(--s5-warn-bg);  border-color: var(--s5-warn-b);  color: var(--s5-warn);  font-weight: 600; }
    .s5-verdict-btn--blue.s5-verdict-btn--on   { background: var(--s5-blue-bg);  border-color: var(--s5-blue-b);  color: var(--s5-blue);  font-weight: 600; }

    /* Result card */
    .s5-result-card { display: flex; align-items: flex-start; gap: 12px; padding: 13px 16px; border-radius: 9px; border: 1.5px solid; }
    .s5-result-card--pass { background: var(--s5-green-bg); border-color: var(--s5-green-b); }
    .s5-result-card--fail { background: var(--s5-red-bg);   border-color: var(--s5-red-b); }
    .s5-result-card--warn { background: var(--s5-warn-bg);  border-color: var(--s5-warn-b); }
    .s5-result-icon       { font-family: var(--s5-mono); font-size: 1.2rem; font-weight: 700; flex-shrink: 0; line-height: 1.2; }
    .s5-result-card--pass .s5-result-icon { color: var(--s5-green); }
    .s5-result-card--fail .s5-result-icon { color: var(--s5-red); }
    .s5-result-card--warn .s5-result-icon { color: var(--s5-warn); }
    .s5-result-message { font-size: .84rem; font-weight: 500; color: var(--s5-ink); line-height: 1.5; }

    /* Collapsible */
    .s5-collapsible { border: 1.5px solid var(--s5-border); border-radius: 8px; overflow: hidden; }
    .s5-collapsible-summary { padding: 8px 14px; background: var(--s5-surface2); cursor: pointer; font-family: var(--s5-mono); font-size: .62rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s5-muted); list-style: none; }
    .s5-collapsible-summary:hover { color: var(--s5-ink2); }
    .s5-code-block { font-family: var(--s5-mono); font-size: .72rem; background: var(--s5-surface2); color: var(--s5-ink); padding: 14px 16px; margin: 0; line-height: 1.8; white-space: pre; overflow-x: auto; }

    /* Greedy traps */
    .s5-traps { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
    .s5-trap  { padding: 9px 12px; background: var(--s5-surface2); border: 1px solid var(--s5-border); border-radius: 7px; display: flex; flex-direction: column; gap: 3px; }
    .s5-trap-label { font-size: .78rem; font-weight: 600; color: var(--s5-ink); }
    .s5-trap-trap  { font-size: .72rem; color: var(--s5-ink2); line-height: 1.4; }
    .s5-trap-test  { font-size: .7rem; color: var(--s5-muted); line-height: 1.4; }

    /* DP checklist */
    .s5-dp-checklist { display: flex; flex-direction: column; gap: 8px; }
    .s5-dp-check { background: var(--s5-surface); border: 1.5px solid var(--s5-border); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; transition: border-color .12s; }
    .s5-dp-check:hover          { border-color: var(--s5-border2); }
    .s5-dp-check--answered      { border-color: rgba(37,99,235,.2); background: rgba(37,99,235,.02); }
    .s5-dp-check-label    { font-family: var(--s5-mono); font-size: .6rem; letter-spacing: 1.2px; text-transform: uppercase; color: var(--s5-muted); }
    .s5-dp-check-question { font-size: .84rem; font-weight: 500; color: var(--s5-ink); line-height: 1.4; }
    .s5-dp-check-example  { font-size: .72rem; color: var(--s5-ink2); padding: 6px 9px; background: var(--s5-blue-bg); border: 1px solid var(--s5-blue-b); border-radius: 6px; line-height: 1.5; }
    .s5-dp-check-btns     { display: flex; gap: 7px; }

    /* Graph checks */
    .s5-graph-check     { background: var(--s5-surface); border: 1.5px solid var(--s5-border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .s5-graph-check-q   { font-size: .86rem; font-weight: 500; color: var(--s5-ink); }
    .s5-graph-check-why { font-size: .72rem; color: var(--s5-muted); line-height: 1.4; }
    .s5-graph-check-opts{ display: flex; flex-wrap: wrap; gap: 7px; }
    .s5-graph-opt { flex: 1; min-width: 160px; background: var(--s5-surface2); border: 1.5px solid var(--s5-border); border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: all .12s; user-select: none; }
    .s5-graph-opt:hover   { border-color: var(--s5-border2); }
    .s5-graph-opt--on     { border-color: var(--s5-blue); background: var(--s5-blue-bg); }
    .s5-graph-opt-label { font-size: .8rem; font-weight: 600; color: var(--s5-ink); margin-bottom: 3px; }
    .s5-graph-opt-impl  { font-size: .7rem; color: var(--s5-muted); line-height: 1.4; }
    .s5-graph-rec { font-size: .8rem; color: var(--s5-ink2); padding: 9px 12px; background: var(--s5-green-bg); border: 1px solid var(--s5-green-b); border-radius: 7px; }
    .s5-code { font-family: var(--s5-mono); font-size: .72rem; background: var(--s5-surface); color: var(--s5-blue); padding: 1px 5px; border-radius: 4px; border: 1px solid var(--s5-border); }

    /* Keyword */
    .s5-keyword-matches { display: flex; flex-direction: column; gap: 5px; }
    .s5-kw-empty    { font-size: .74rem; color: var(--s5-muted); font-style: italic; padding: 8px 12px; background: var(--s5-surface2); border-radius: 6px; }
    .s5-kw-match    { padding: 8px 12px; background: var(--s5-blue-bg); border: 1px solid var(--s5-blue-b); border-radius: 7px; }
    .s5-kw-match-kws  { font-family: var(--s5-mono); font-size: .68rem; font-weight: 700; color: var(--s5-blue); margin-bottom: 3px; }
    .s5-kw-match-note { font-size: .72rem; color: var(--s5-ink2); line-height: 1.4; }
    .s5-kw-mismatch { font-size: .74rem; color: var(--s5-warn); padding: 7px 10px; background: var(--s5-warn-bg); border: 1px solid var(--s5-warn-b); border-radius: 7px; }

    /* Side panel */
    .s5-panel { width: 268px; flex-shrink: 0; background: var(--s5-surface); border: 1.5px solid var(--s5-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s5-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s5-border); background: #f6f4f0; }
    .s5-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s5-ink); }
    .s5-panel-sub    { font-size: .66rem; color: var(--s5-muted); margin-top: 2px; }
    .s5-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s5-panel-empty  { font-size: .74rem; color: var(--s5-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s5-panel-section { display: flex; flex-direction: column; gap: 6px; }
    .s5-panel-section-title { font-family: var(--s5-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s5-muted); margin-bottom: 2px; }
    .s5-panel-result          { font-size: .76rem; font-weight: 500; padding: 5px 9px; border-radius: 5px; line-height: 1.4; }
    .s5-panel-result--pass    { background: var(--s5-green-bg); color: var(--s5-green); border: 1px solid var(--s5-green-b); }
    .s5-panel-result--fail    { background: var(--s5-red-bg);   color: var(--s5-red);   border: 1px solid var(--s5-red-b); }
    .s5-panel-result--warn    { background: var(--s5-warn-bg);  color: var(--s5-warn);  border: 1px solid var(--s5-warn-b); }
    .s5-panel-algo    { font-size: .7rem; color: var(--s5-muted); }
    .s5-panel-code    { font-family: var(--s5-mono); font-size: .68rem; color: var(--s5-blue); background: var(--s5-blue-bg); padding: 1px 6px; border-radius: 4px; }
    .s5-panel-progress-track { height: 6px; background: var(--s5-surface2); border-radius: 9999px; overflow: hidden; border: 1px solid var(--s5-border); }
    .s5-panel-progress-fill  { height: 100%; background: var(--s5-blue); border-radius: 9999px; transition: width .3s ease; }
    .s5-panel-progress-label { font-size: .68rem; color: var(--s5-muted); }
    .s5-panel-gate { padding: 10px 12px; border-radius: 8px; font-size: .74rem; font-weight: 500; text-align: center; background: var(--s5-surface2); border: 1.5px solid var(--s5-border); color: var(--s5-muted); }
    .s5-panel-gate--ready { background: var(--s5-green-bg); border-color: var(--s5-green-b); color: var(--s5-green); }
    .s5-panel-body::-webkit-scrollbar { width: 3px; }
    .s5-panel-body::-webkit-scrollbar-thumb { background: var(--s5-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s5-shell { flex-direction: column; padding: 16px; }
      .s5-panel { width: 100%; position: static; max-height: none; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved           = state.answers?.stage5;
    const activeVerifiers = _getActiveVerifiers(state);
    const doneCount       = activeVerifiers.filter(v => _isVerifierDone(v.id, saved ?? {})).length;
    if (doneCount >= Math.ceil(activeVerifiers.length / 2)) {
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state          = null;
    _verifierStates = {};
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage5;