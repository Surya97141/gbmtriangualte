// stages/stage3-5/stage3-5.js
// Reframing Check — cream/white theme, self-contained styles
// Same pattern as stage0/1/2/2-5/3

const Stage3_5 = (() => {

  let _state               = null;
  let _selectedTransform   = null;
  let _reframeAnswers      = {};
  let _disguiseAnswers     = {};
  let _verifyChecklist     = {};
  let _transformationHints = [];

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state               = state;
    const saved          = state.answers?.stage3_5 ?? {};
    _selectedTransform   = saved.transformationApplied ?? null;
    _reframeAnswers      = saved.reframeAnswers        ?? {};
    _disguiseAnswers     = saved.disguiseAnswers        ?? {};
    _verifyChecklist     = saved.verifyChecklist        ?? {};
    _transformationHints = saved.transformationHints    ?? [];

    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 's35-shell';

    const directions  = state.output?.directions ?? [];
    const inputTypes  = state.answers?.stage1?.inputTypes       ?? [];
    const outputForm  = state.answers?.stage2?.outputForm       ?? null;
    const optType     = state.answers?.stage2?.optimizationType ?? null;

    const DC  = typeof DisguiseChecks    !== 'undefined' ? DisguiseChecks    : null;
    const RQ  = typeof ReframeQuestions  !== 'undefined' ? ReframeQuestions  : null;
    const TL  = typeof TransformationList!== 'undefined' ? TransformationList: null;

    const disguiseChecks = DC?.getRelevant?.(directions) ?? _fallbackDisguises();
    const reframeQs      = RQ?.getAll?.()                ?? _fallbackReframes();
    const suggested      = TL?.getRelevant?.(inputTypes, outputForm, optType) ?? [];
    const allTransforms  = TL?.getAll?.()                ?? _fallbackTransforms();

    wrapper.innerHTML = `
      <div class="s35-main">

        <div class="s35-rule">
          Check: is this problem disguised as something else?
          A reframe or transformation may reveal a much simpler approach. Check before coding.
        </div>

        <!-- Section 01: Disguise checks -->
        <section class="s35-section">
          <div class="s35-section-header">
            <span class="s35-section-num">01</span>
            <div>
              <div class="s35-section-title">Disguise checks</div>
              <div class="s35-section-sub">Does this look like X but actually is Y?</div>
            </div>
          </div>
          <div class="s35-note">
            The most common misidentifications. A "yes" means your Stage 3 direction may be wrong — reconsider before Stage 4.
          </div>
          <div class="s35-disguise-list" id="s35-disguise-list"></div>
        </section>

        <!-- Section 02: Reframe questions -->
        <section class="s35-section">
          <div class="s35-section-header">
            <span class="s35-section-num">02</span>
            <div>
              <div class="s35-section-title">Forced perspective shifts</div>
              <div class="s35-section-sub">Answer each — a "yes" may reveal a transformation</div>
            </div>
          </div>
          <div class="s35-reframe-list" id="s35-reframe-list"></div>
          <div id="s35-transform-hints"></div>
        </section>

        <!-- Section 03: Apply a transformation -->
        <section class="s35-section">
          <div class="s35-section-header">
            <span class="s35-section-num">03</span>
            <div>
              <div class="s35-section-title">Apply a transformation</div>
              <div class="s35-section-sub">Only if a reframe question triggered one — otherwise click "No transformation needed"</div>
            </div>
          </div>
          <div id="s35-transform-section"></div>
        </section>

        <!-- Section 04: Verify (conditional) -->
        <section class="s35-section s35-hidden" id="s35-verify-section">
          <div class="s35-section-header">
            <span class="s35-section-num">04</span>
            <div>
              <div class="s35-section-title">Verify the transformation</div>
              <div class="s35-section-sub">Check each step before committing — use real checkboxes</div>
            </div>
          </div>
          <div id="s35-verify-list"></div>
        </section>

      </div>

      <!-- Live side panel -->
      <aside class="s35-panel">
        <div class="s35-panel-header">
          <div class="s35-panel-title">Reframing analysis</div>
          <div class="s35-panel-sub">Updates as you answer</div>
        </div>
        <div class="s35-panel-body" id="s35-panel-body">
          <div class="s35-panel-empty">← Answer checks to see analysis</div>
        </div>
      </aside>
    `;

    _buildDisguiseList(wrapper, disguiseChecks, saved);
    _buildReframeList(wrapper, reframeQs, saved);
    _buildTransformSection(wrapper, suggested, allTransforms, saved);

    if (_selectedTransform && _selectedTransform !== 'none') {
      setTimeout(() => _renderVerifySection(wrapper, _selectedTransform, saved), 0);
    }

    setTimeout(() => _updatePanel(wrapper), 0);

    return wrapper;
  }

  // ─── DISGUISE LIST ─────────────────────────────────────────────────────────

  function _buildDisguiseList(wrapper, checks, saved) {
    const list = wrapper.querySelector('#s35-disguise-list');
    if (!list) return;

    checks.forEach(check => {
      const answer      = saved.disguiseAnswers?.[check.id] ?? null;
      const isTriggered = answer === 'yes';

      const row = document.createElement('div');
      row.className = `s35-disguise-row ${isTriggered ? 's35-disguise-row--triggered' : ''} ${answer ? 's35-disguise-row--answered' : ''}`;
      row.id = `s35-dr-${check.id}`;
      row.innerHTML = `
        <div class="s35-disguise-header">
          <div class="s35-disguise-labels">
            <span class="s35-looks-tag">${check.looksLike}</span>
            <span class="s35-arrow">→</span>
            <span class="s35-actually-tag">${check.actuallyIs}</span>
          </div>
          <div class="s35-disguise-signal">${check.signal}</div>
        </div>
        <div class="s35-disguise-test"><span class="s35-test-label">Test:</span> ${check.test}</div>
        <div class="s35-ans-btns">
          <button class="s35-ans-btn s35-ans-btn--yes ${answer==='yes'?'s35-ans-btn--on-yes':''}" data-id="${check.id}" data-val="yes">✓ Yes — this is a disguise</button>
          <button class="s35-ans-btn s35-ans-btn--no  ${answer==='no' ?'s35-ans-btn--on-no' :''}" data-id="${check.id}" data-val="no">✗ No — direction is correct</button>
        </div>
        <div class="s35-disguise-example ${isTriggered?'':'s35-hidden'}" id="s35-dex-${check.id}">
          <span class="s35-ex-label">Example:</span> ${check.example ?? ''}
        </div>
        <div class="s35-disguise-warn ${isTriggered?'':'s35-hidden'}" id="s35-dwarn-${check.id}">
          ⚠ Reconsider Stage 3 direction — this may be <strong>${check.actuallyIs}</strong> not ${check.looksLike}
        </div>
      `;

      row.querySelectorAll('.s35-ans-btn').forEach(btn => {
        btn.addEventListener('click', () => _onDisguise(check.id, btn.dataset.val, wrapper));
      });
      list.appendChild(row);
    });
  }

  function _onDisguise(checkId, value, wrapper) {
    _disguiseAnswers[checkId] = value;

    const row = wrapper.querySelector(`#s35-dr-${checkId}`);
    if (row) {
      row.classList.toggle('s35-disguise-row--triggered', value === 'yes');
      row.classList.add('s35-disguise-row--answered');
      row.querySelectorAll('.s35-ans-btn').forEach(btn => {
        btn.classList.toggle('s35-ans-btn--on-yes', btn.dataset.val === 'yes' && value === 'yes');
        btn.classList.toggle('s35-ans-btn--on-no',  btn.dataset.val === 'no'  && value === 'no');
      });
      const ex   = row.querySelector(`#s35-dex-${checkId}`);
      const warn = row.querySelector(`#s35-dwarn-${checkId}`);
      if (ex)   ex.classList.toggle('s35-hidden',   value !== 'yes');
      if (warn) warn.classList.toggle('s35-hidden', value !== 'yes');
    }

    State.setAnswer('stage3_5', { disguiseAnswers: { ..._disguiseAnswers }, checked: true });
    _updatePanel(wrapper);
    _checkComplete();
  }

  // ─── REFRAME LIST ──────────────────────────────────────────────────────────

  function _buildReframeList(wrapper, questions, saved) {
    const list = wrapper.querySelector('#s35-reframe-list');
    if (!list) return;

    questions.forEach(q => {
      const answer = saved.reframeAnswers?.[q.id] ?? null;
      const row = document.createElement('div');
      row.className = `s35-reframe-row ${answer ? 's35-reframe-row--answered' : ''}`;
      row.id = `s35-rr-${q.id}`;
      row.innerHTML = `
        <div class="s35-reframe-q">${q.question}</div>
        <div class="s35-reframe-purpose">${q.purpose}</div>
        <div class="s35-ans-btns">
          <button class="s35-ans-btn s35-ans-btn--yes ${answer==='yes'?'s35-ans-btn--on-yes':''}" data-id="${q.id}" data-val="yes">✓ Yes</button>
          <button class="s35-ans-btn s35-ans-btn--no  ${answer==='no' ?'s35-ans-btn--on-no' :''}" data-id="${q.id}" data-val="no">✗ No</button>
        </div>
        <div class="s35-reframe-example ${answer==='yes'?'':'s35-hidden'}" id="s35-rex-${q.id}">
          <span class="s35-ex-label">Example:</span> ${q.example ?? ''}
        </div>
      `;
      row.querySelectorAll('.s35-ans-btn').forEach(btn => {
        btn.addEventListener('click', () => _onReframe(q.id, btn.dataset.val, wrapper));
      });
      list.appendChild(row);
    });
  }

  function _onReframe(questionId, value, wrapper) {
    _reframeAnswers[questionId] = value;

    const row = wrapper.querySelector(`#s35-rr-${questionId}`);
    if (row) {
      row.classList.add('s35-reframe-row--answered');
      row.querySelectorAll('.s35-ans-btn').forEach(btn => {
        btn.classList.toggle('s35-ans-btn--on-yes', btn.dataset.val === 'yes' && value === 'yes');
        btn.classList.toggle('s35-ans-btn--on-no',  btn.dataset.val === 'no'  && value === 'no');
      });
      const ex = row.querySelector(`#s35-rex-${questionId}`);
      if (ex) ex.classList.toggle('s35-hidden', value !== 'yes');
    }

    // Transformation hints
    const RQ = typeof ReframeQuestions !== 'undefined' ? ReframeQuestions : null;
    const hint = RQ?.getTransformHint?.(questionId, value === 'yes');
    if (hint && !_transformationHints.includes(hint)) {
      _transformationHints.push(hint);
    } else if (value === 'no') {
      const hintForThis = RQ?.getTransformHint?.(questionId, true);
      if (hintForThis) _transformationHints = _transformationHints.filter(h => h !== hintForThis);
    }

    const RQall      = RQ?.getAll?.() ?? _fallbackReframes();
    const allAnswered = RQall.every(q => _reframeAnswers[q.id]);

    State.setAnswer('stage3_5', {
      reframeAnswers     : { ..._reframeAnswers },
      transformationHints: [..._transformationHints],
      reframeAnswered    : allAnswered,
      checked            : true,
    });

    _renderTransformHints(wrapper);
    _updatePanel(wrapper);
    _checkComplete();
  }

  function _renderTransformHints(wrapper) {
    const container = wrapper.querySelector('#s35-transform-hints');
    if (!container) return;
    container.innerHTML = '';
    if (!_transformationHints.length) return;

    const TL = typeof TransformationList !== 'undefined' ? TransformationList : null;
    container.innerHTML = `<div class="s35-hints-title">🔄 Transformation signals detected — consider applying:</div>`;

    _transformationHints.forEach(hintId => {
      const t = TL?.getById?.(hintId) ?? _fallbackTransforms().find(x => x.id === hintId);
      if (!t) return;
      const el = document.createElement('div');
      el.className = 's35-hint-card';
      el.innerHTML = `
        <div>
          <div class="s35-hint-label">${t.label}</div>
          <div class="s35-hint-tagline">${t.tagline}</div>
        </div>
        <button class="s35-apply-btn" data-id="${t.id}">Apply →</button>
      `;
      el.querySelector('.s35-apply-btn').addEventListener('click', () =>
        _onTransformSelect(t.id, wrapper)
      );
      container.appendChild(el);
    });
  }

  // ─── TRANSFORM SECTION ─────────────────────────────────────────────────────

  function _buildTransformSection(wrapper, suggested, allTransforms, saved) {
    const section = wrapper.querySelector('#s35-transform-section');
    if (!section) return;

    // Suggested
    if (suggested.length) {
      const sugTitle = document.createElement('div');
      sugTitle.className = 's35-suggested-title';
      sugTitle.textContent = 'Suggested based on your input/output:';
      section.appendChild(sugTitle);

      const sugGrid = document.createElement('div');
      sugGrid.className = 's35-transform-grid';
      suggested.forEach(t => {
        sugGrid.appendChild(_buildTransformCard(t, saved.transformationApplied === t.id, true, wrapper));
      });
      section.appendChild(sugGrid);
    }

    // All transforms (collapsible)
    const details = document.createElement('details');
    details.className = 's35-collapsible';
    const summary = document.createElement('summary');
    summary.className = 's35-collapsible-summary';
    summary.textContent = 'All transformations';
    details.appendChild(summary);

    const allGrid = document.createElement('div');
    allGrid.className = 's35-transform-grid s35-transform-grid--all';
    const filteredAll = allTransforms.filter(t => !suggested.find(s => s.id === t.id));
    filteredAll.forEach(t => {
      allGrid.appendChild(_buildTransformCard(t, saved.transformationApplied === t.id, false, wrapper));
    });
    details.appendChild(allGrid);
    section.appendChild(details);

    // Transform detail
    const detail = document.createElement('div');
    detail.id = 's35-transform-detail';
    section.appendChild(detail);
    if (saved.transformationApplied && saved.transformationApplied !== 'none') {
      _renderTransformDetail(detail, saved.transformationApplied);
    }

    // No transform button
    const noBtn = document.createElement('button');
    noBtn.id = 's35-no-transform-btn';
    noBtn.className = `s35-no-transform-btn ${saved.transformationApplied === 'none' ? 's35-no-transform-btn--on' : ''}`;
    noBtn.textContent = '✓ No transformation needed — proceed with current approach';
    noBtn.addEventListener('click', () => _onTransformSelect('none', wrapper));
    section.appendChild(noBtn);
  }

  function _buildTransformCard(t, isOn, isSuggested, wrapper) {
    const card = document.createElement('div');
    card.className = `s35-transform-card ${isOn ? 's35-transform-card--on' : ''} ${isSuggested ? 's35-transform-card--suggested' : ''}`;
    card.dataset.id = t.id;
    card.innerHTML = `
      <div class="s35-transform-check">✓</div>
      <div class="s35-transform-label">${t.label}</div>
      <div class="s35-transform-tagline">${t.tagline}</div>
    `;
    card.addEventListener('click', () => _onTransformSelect(t.id, wrapper));
    return card;
  }

  function _onTransformSelect(transformId, wrapper) {
    _selectedTransform = transformId;

    wrapper.querySelectorAll('.s35-transform-card').forEach(c =>
      c.classList.toggle('s35-transform-card--on', c.dataset.id === transformId)
    );

    const noBtn = wrapper.querySelector('#s35-no-transform-btn');
    if (noBtn) noBtn.classList.toggle('s35-no-transform-btn--on', transformId === 'none');

    State.setAnswer('stage3_5', { transformationApplied: transformId, checked: true });

    // Render detail
    const detail = wrapper.querySelector('#s35-transform-detail');
    if (detail) {
      detail.innerHTML = '';
      if (transformId !== 'none') _renderTransformDetail(detail, transformId);
    }

    // Render verify section
    _renderVerifySection(wrapper, transformId, State.getAnswer('stage3_5') ?? {});

    _updatePanel(wrapper);
    _checkComplete();
  }

  function _renderTransformDetail(container, transformId) {
    container.innerHTML = '';
    const TL = typeof TransformationList !== 'undefined' ? TransformationList : null;
    const t  = TL?.getById?.(transformId) ?? _fallbackTransforms().find(x => x.id === transformId);
    if (!t) return;

    const ba = t.beforeAfter ?? {};
    const exHTML = (t.examples ?? []).map(ex => `
      <div class="s35-transform-example">
        <div class="s35-tex-problem">${ex.problem}</div>
        <div class="s35-tex-row"><span class="s35-tex-key">Algorithm:</span> <code class="s35-code">${ex.algorithm}</code></div>
        <div class="s35-tex-row"><span class="s35-tex-key">Complexity:</span> <code class="s35-code">${ex.complexity}</code></div>
      </div>
    `).join('');

    const opensHTML = (t.opens ?? []).map(o =>
      `<span class="s35-opens-tag">${o}</span>`
    ).join('');

    container.innerHTML = `
      <div class="s35-transform-detail-card">
        <div class="s35-transform-detail-name">${t.label}</div>
        ${ba.before ? `
          <div class="s35-ba">
            <div class="s35-ba-row"><span class="s35-ba-key">Before:</span> ${ba.before}</div>
            <div class="s35-ba-arrow">↓</div>
            <div class="s35-ba-row"><span class="s35-ba-key">After:</span> ${ba.after ?? ''}</div>
          </div>
        ` : ''}
        ${opensHTML ? `<div class="s35-opens-row"><span class="s35-opens-label">Opens:</span> ${opensHTML}</div>` : ''}
        ${exHTML ? `<div class="s35-transform-examples">${exHTML}</div>` : ''}
        ${t.watchOut ? `<div class="s35-transform-warn">⚠ ${t.watchOut}</div>` : ''}
      </div>
    `;
  }

  // ─── VERIFY SECTION ────────────────────────────────────────────────────────

  function _renderVerifySection(wrapper, transformId, saved) {
    const section  = wrapper.querySelector('#s35-verify-section');
    const listEl   = wrapper.querySelector('#s35-verify-list');
    if (!section || !listEl) return;

    if (!transformId || transformId === 'none') {
      section.classList.add('s35-hidden');
      listEl.innerHTML = '';
      return;
    }

    const TL       = typeof TransformationList !== 'undefined' ? TransformationList : null;
    const checklist = TL?.buildVerificationChecklist?.(transformId) ?? _fallbackChecklist(transformId);
    if (!checklist.length) { section.classList.add('s35-hidden'); return; }

    section.classList.remove('s35-hidden');
    listEl.innerHTML = '';

    const savedChecks = saved.verifyChecklist?.[transformId] ?? {};

    checklist.forEach(item => {
      const isChecked = savedChecks[item.id] ?? false;
      const row = document.createElement('label');
      row.className = `s35-verify-row ${isChecked ? 's35-verify-row--checked' : ''}`;
      row.id = `s35-vr-${item.id}`;
      row.innerHTML = `
        <input type="checkbox" class="s35-verify-cb" ${isChecked ? 'checked' : ''} data-id="${item.id}">
        <div class="s35-verify-content">
          <div class="s35-verify-step">Step ${item.step}</div>
          <div class="s35-verify-text">${item.text}</div>
        </div>
      `;
      const cb = row.querySelector('input');
      cb.addEventListener('change', () => {
        row.classList.toggle('s35-verify-row--checked', cb.checked);
        _onVerifyCheck(transformId, item.id, cb.checked, wrapper);
      });
      listEl.appendChild(row);
    });

    // Progress
    const checkedCount = Object.values(savedChecks).filter(Boolean).length;
    const prog = document.createElement('div');
    prog.className = 's35-verify-progress';
    prog.id = 's35-verify-progress';
    prog.textContent = `${checkedCount} / ${checklist.length} steps verified`;
    listEl.appendChild(prog);
  }

  function _onVerifyCheck(transformId, itemId, checked, wrapper) {
    if (!_verifyChecklist[transformId]) _verifyChecklist[transformId] = {};
    _verifyChecklist[transformId][itemId] = checked;

    const TL        = typeof TransformationList !== 'undefined' ? TransformationList : null;
    const checklist = TL?.buildVerificationChecklist?.(transformId) ?? _fallbackChecklist(transformId);
    const count     = Object.values(_verifyChecklist[transformId]).filter(Boolean).length;

    const prog = wrapper.querySelector('#s35-verify-progress');
    if (prog) prog.textContent = `${count} / ${checklist.length} steps verified`;

    State.setAnswer('stage3_5', { verifyChecklist: { ..._verifyChecklist } });
    _checkComplete();
  }

  function _fallbackChecklist(transformId) {
    return [
      { id: 'vc1', step: 1, text: 'The transformation preserves the problem constraints' },
      { id: 'vc2', step: 2, text: 'The solution to the transformed problem maps back correctly' },
      { id: 'vc3', step: 3, text: 'Edge cases still hold after transformation' },
    ];
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper) {
    const body = (wrapper ?? document).querySelector('#s35-panel-body');
    if (!body) return;
    body.innerHTML = '';

    const dAnswered = Object.keys(_disguiseAnswers).length;
    const rAnswered = Object.keys(_reframeAnswers).length;

    if (dAnswered === 0 && rAnswered === 0) {
      body.innerHTML = '<div class="s35-panel-empty">← Answer checks to see analysis</div>';
      return;
    }

    const DC        = typeof DisguiseChecks   !== 'undefined' ? DisguiseChecks   : null;
    const RQ        = typeof ReframeQuestions !== 'undefined' ? ReframeQuestions : null;
    const TL        = typeof TransformationList!== 'undefined'? TransformationList: null;
    const totalD    = DC?.getTotal?.()  ?? _fallbackDisguises().length;
    const totalR    = RQ?.getTotal?.()  ?? _fallbackReframes().length;
    const triggeredD = Object.entries(_disguiseAnswers).filter(([,v]) => v === 'yes');
    const yesR       = Object.entries(_reframeAnswers).filter(([,v]) => v === 'yes');

    // Progress
    const progSec = document.createElement('div');
    progSec.className = 's35-panel-section';
    progSec.innerHTML = `
      <div class="s35-panel-section-title">Progress</div>
      <div class="s35-panel-prog-row">
        <span class="s35-panel-prog-label">Disguise checks</span>
        <span class="s35-panel-prog-count">${dAnswered} / ${totalD}</span>
      </div>
      <div class="s35-panel-prog-row">
        <span class="s35-panel-prog-label">Reframe questions</span>
        <span class="s35-panel-prog-count">${rAnswered} / ${totalR}</span>
      </div>
    `;
    body.appendChild(progSec);

    // Triggered disguises
    if (triggeredD.length) {
      const sec = document.createElement('div');
      sec.className = 's35-panel-section s35-panel-section--warn';
      sec.innerHTML = `<div class="s35-panel-section-title">⚠ Disguises detected</div>`;
      triggeredD.forEach(([id]) => {
        const check = DC?.getById?.(id) ?? _fallbackDisguises().find(c => c.id === id);
        if (!check) return;
        const el = document.createElement('div');
        el.className = 's35-panel-disguise';
        el.innerHTML = `
          <span class="s35-panel-looks">${check.looksLike}</span>
          <span>→</span>
          <span class="s35-panel-actually">${check.actuallyIs}</span>
        `;
        sec.appendChild(el);
      });
      body.appendChild(sec);
    }

    // Yes reframes
    if (yesR.length) {
      const sec = document.createElement('div');
      sec.className = 's35-panel-section';
      sec.innerHTML = `<div class="s35-panel-section-title">Yes reframes</div>`;
      yesR.forEach(([id]) => {
        const q = (RQ?.getAll?.() ?? _fallbackReframes()).find(x => x.id === id);
        if (!q) return;
        const el = document.createElement('div');
        el.className = 's35-panel-yes-item';
        el.textContent = q.question.slice(0, 65) + (q.question.length > 65 ? '…' : '');
        sec.appendChild(el);
      });
      body.appendChild(sec);
    }

    // Transformation hints
    if (_transformationHints.length) {
      const sec = document.createElement('div');
      sec.className = 's35-panel-section s35-panel-section--transform';
      sec.innerHTML = `<div class="s35-panel-section-title">Transform signals</div>`;
      _transformationHints.forEach(h => {
        const t = TL?.getById?.(h) ?? _fallbackTransforms().find(x => x.id === h);
        const el = document.createElement('div');
        el.className = 's35-panel-transform-tag';
        el.textContent = t?.label ?? h.replace(/_/g, ' ');
        sec.appendChild(el);
      });
      body.appendChild(sec);
    }

    // Selected transform
    if (_selectedTransform) {
      const sec = document.createElement('div');
      sec.className = `s35-panel-section ${_selectedTransform !== 'none' ? 's35-panel-section--transform' : 's35-panel-section--ok'}`;
      sec.innerHTML = `<div class="s35-panel-section-title">Transform decision</div>`;
      const badge = document.createElement('div');
      badge.className = _selectedTransform !== 'none' ? 's35-panel-transform-badge' : 's35-panel-ok-badge';
      if (_selectedTransform === 'none') {
        badge.textContent = '✓ No transformation — proceed as-is';
      } else {
        const t = TL?.getById?.(_selectedTransform) ?? _fallbackTransforms().find(x => x.id === _selectedTransform);
        badge.textContent = t?.label ?? _selectedTransform.replace(/_/g, ' ');
      }
      sec.appendChild(badge);
      body.appendChild(sec);
    }

    // Completion gate
    const saved      = State.getAnswer('stage3_5') ?? {};
    const enoughR    = rAnswered >= Math.ceil(totalR / 2);
    const isReady    = enoughR && !!saved.transformationApplied;
    const gate = document.createElement('div');
    gate.className = `s35-panel-gate ${isReady ? 's35-panel-gate--ready' : ''}`;
    if (isReady) {
      gate.textContent = '✓ Ready to proceed to Stage 4';
    } else {
      const needs = [];
      if (!enoughR) needs.push(`${Math.ceil(totalR/2) - rAnswered} more reframe answer${Math.ceil(totalR/2) - rAnswered !== 1 ? 's' : ''}`);
      if (!saved.transformationApplied) needs.push('transform decision');
      gate.textContent = `Need: ${needs.join(', ')}`;
    }
    body.appendChild(gate);
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete() {
    const saved      = State.getAnswer('stage3_5') ?? {};
    const RQ         = typeof ReframeQuestions !== 'undefined' ? ReframeQuestions : null;
    const totalR     = RQ?.getTotal?.() ?? _fallbackReframes().length;
    const rAnswered  = Object.keys(saved.reframeAnswers ?? {}).length;
    const enoughR    = rAnswered >= Math.ceil(totalR / 2);
    const valid      = enoughR && !!saved.transformationApplied;

    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage3_5',
          answers: { ...saved, checked: true, reframeAnswered: rAnswered >= totalR, disguiseChecked: true },
        },
      }));
    }
  }

  // ─── FALLBACKS ─────────────────────────────────────────────────────────────

  function _fallbackDisguises() {
    return [
      { id: 'dc_interval_sort',    looksLike: 'Complex interval logic', actuallyIs: 'Sort + Greedy',    signal: 'Overlapping intervals, merging, scheduling', test: 'Sort by start/end time — does greedy work then?', example: 'Meeting rooms → sort by end time, count max overlap' },
      { id: 'dc_array_graph',      looksLike: 'Array DP',               actuallyIs: 'Hidden graph',     signal: 'Elements connected if condition holds',       test: 'Can each element be a node? What would edges be?', example: 'Jump game → directed graph, BFS for reachability' },
      { id: 'dc_optimization_bs',  looksLike: 'Direct optimization',    actuallyIs: 'Binary Search on Answer', signal: 'min/max of something + feasibility check', test: 'Is "is X feasible" easier than "find optimal X"?', example: 'Min days to ship → binary search on days, greedy check' },
      { id: 'dc_count_complement', looksLike: 'Count valid directly',   actuallyIs: 'Complement counting', signal: 'Counting with complex inclusion/exclusion',  test: 'Is counting the complement simpler?', example: 'Pairs with sum > K → count all pairs minus pairs with sum ≤ K' },
      { id: 'dc_string_dp',        looksLike: '2D DP on strings',       actuallyIs: 'LCS / Edit Distance canonical', signal: 'Two strings, transform/align/match', test: 'Does this reduce to LCS, Edit Distance, or LCS variant?', example: 'Min deletions to make equal → LCS length of both' },
    ];
  }

  function _fallbackReframes() {
    return [
      { id: 'rf_binary_search',  question: 'Can you binary search on the answer instead of computing it directly?', purpose: 'Monotone feasibility → search instead of optimize', example: 'Min cost → binary search + feasibility check' },
      { id: 'rf_complement',     question: 'Can you count / solve the complement and subtract?',                    purpose: 'Often easier to count what you do NOT want',      example: 'Count invalid pairs, subtract from n*(n-1)/2' },
      { id: 'rf_sort_first',     question: 'Does sorting / reordering reveal a simpler structure?',                purpose: 'Many problems become trivial after sorting',       example: 'Sort by end time → interval scheduling greedy' },
      { id: 'rf_graph_reduction',question: 'Can each element be a node with edges defined by a rule?',             purpose: 'Hidden graph may unlock BFS/Union Find',           example: 'Elements connected if |a-b| ≤ k → BFS on graph' },
      { id: 'rf_fix_dimension',  question: 'Can you fix one dimension and solve a simpler problem on the rest?',   purpose: 'Reduce 2D to 1D, multi-variate to single',        example: 'Fix left endpoint, slide right endpoint' },
      { id: 'rf_canonical',      question: 'Does this reduce to a known canonical problem (LIS, LCS, MST)?',       purpose: 'Recognizing canonical form gives the algorithm',   example: 'Min cost to connect all → MST (Kruskal)' },
    ];
  }

  function _fallbackTransforms() {
    return [
      { id: 'tr_sort_then_greedy',     label: 'Sort → Greedy',            tagline: 'Sort input, then apply greedy rule',      opens: ['Greedy'],              beforeAfter: { before: 'Unsorted array with complex comparisons', after: 'Sorted array where greedy rule applies trivially' } },
      { id: 'tr_optimization_to_bs',   label: 'Optimization → Binary Search', tagline: 'Convert min/max to feasibility check', opens: ['Binary Search on Answer'], beforeAfter: { before: 'Find minimum X satisfying condition', after: 'Binary search on X, check if feasible' } },
      { id: 'tr_element_to_node',      label: 'Elements → Graph nodes',   tagline: 'Each element becomes a node',             opens: ['BFS/DFS', 'Union Find'], beforeAfter: { before: 'Array with relationship condition', after: 'Directed/undirected graph — apply graph algorithms' } },
      { id: 'tr_sequence_to_dag',      label: 'Sequence → DAG',           tagline: 'Dependencies form a DAG',                 opens: ['Topo Sort', 'DP on DAG'], beforeAfter: { before: 'Sequence with ordering constraints', after: 'DAG where edges = dependencies, topo sort applies' } },
      { id: 'tr_coordinate_compress',  label: 'Coordinate Compression',   tagline: 'Large values → small indices',            opens: ['BIT/Segment Tree'],      beforeAfter: { before: 'Values up to 10^9', after: 'Values compressed to [0, n) — use as array indices' } },
    ];
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s35-styles')) return;
    const style = document.createElement('style');
    style.id = 's35-styles';
    style.textContent = `
    .s35-shell {
      --s35-bg      : #f7f4ef;
      --s35-surface : #ffffff;
      --s35-surface2: #faf8f5;
      --s35-border  : rgba(0,0,0,.09);
      --s35-border2 : rgba(0,0,0,.16);
      --s35-ink     : #1a1814;
      --s35-ink2    : #4a4540;
      --s35-muted   : #8a8070;
      --s35-blue    : #2563eb;
      --s35-blue-bg : rgba(37,99,235,.07);
      --s35-blue-b  : rgba(37,99,235,.24);
      --s35-green   : #059669;
      --s35-green-bg: rgba(5,150,105,.07);
      --s35-green-b : rgba(5,150,105,.28);
      --s35-warn    : #d97706;
      --s35-warn-bg : rgba(217,119,6,.07);
      --s35-warn-b  : rgba(217,119,6,.28);
      --s35-red     : #dc2626;
      --s35-red-bg  : rgba(220,38,38,.06);
      --s35-red-b   : rgba(220,38,38,.22);
      --s35-violet  : #7c3aed;
      --s35-violet-bg: rgba(124,58,237,.07);
      --s35-violet-b : rgba(124,58,237,.24);
      --s35-mono    : 'Space Mono', monospace;
      --s35-sans    : 'DM Sans', system-ui, sans-serif;
      display       : flex;
      gap           : 24px;
      align-items   : flex-start;
      background    : var(--s35-bg);
      min-height    : 100%;
      font-family   : var(--s35-sans);
      color         : var(--s35-ink);
      padding       : 28px;
    }
    .s35-main { flex: 1; display: flex; flex-direction: column; gap: 36px; min-width: 0; }
    .s35-rule { font-family: var(--s35-mono); font-size: .71rem; color: var(--s35-muted); padding: 10px 16px; background: var(--s35-surface); border: 1px solid var(--s35-border); border-left: 3px solid var(--s35-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }
    .s35-note { font-size: .76rem; color: var(--s35-ink2); padding: 10px 14px; background: var(--s35-surface2); border: 1px solid var(--s35-border); border-radius: 8px; line-height: 1.6; }
    .s35-hidden { display: none !important; }

    /* Sections */
    .s35-section { display: flex; flex-direction: column; gap: 14px; }
    .s35-section-header { display: flex; align-items: flex-start; gap: 14px; }
    .s35-section-num { font-family: var(--s35-mono); font-size: .65rem; font-weight: 700; color: #fff; background: var(--s35-blue); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .s35-section-title { font-size: .92rem; font-weight: 600; color: var(--s35-ink); }
    .s35-section-sub   { font-size: .73rem; color: var(--s35-muted); margin-top: 2px; }

    /* Answer buttons (shared) */
    .s35-ans-btns { display: flex; gap: 8px; flex-wrap: wrap; }
    .s35-ans-btn  { padding: 6px 14px; border: 1.5px solid var(--s35-border); border-radius: 7px; background: var(--s35-surface2); font-size: .78rem; font-weight: 500; cursor: pointer; transition: all .12s; color: var(--s35-muted); }
    .s35-ans-btn:hover      { border-color: var(--s35-border2); color: var(--s35-ink); }
    .s35-ans-btn--on-yes    { background: var(--s35-green-bg); border-color: var(--s35-green-b); color: var(--s35-green); font-weight: 600; }
    .s35-ans-btn--on-no     { background: var(--s35-surface2); border-color: var(--s35-border2); color: var(--s35-ink2); font-weight: 600; }
    .s35-ex-label           { font-weight: 600; color: var(--s35-blue); margin-right: 4px; }

    /* Disguise list */
    .s35-disguise-list { display: flex; flex-direction: column; gap: 8px; }
    .s35-disguise-row  { background: var(--s35-surface); border: 1.5px solid var(--s35-border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; transition: all .14s; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .s35-disguise-row:hover          { border-color: var(--s35-border2); }
    .s35-disguise-row--answered      { border-color: rgba(37,99,235,.2); }
    .s35-disguise-row--triggered     { border-color: var(--s35-warn-b); background: var(--s35-warn-bg); }
    .s35-disguise-header    { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .s35-disguise-labels    { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .s35-looks-tag    { font-family: var(--s35-mono); font-size: .72rem; font-weight: 700; background: var(--s35-warn-bg); color: var(--s35-warn); padding: 2px 8px; border-radius: 5px; }
    .s35-arrow        { color: var(--s35-muted); font-weight: 700; }
    .s35-actually-tag { font-family: var(--s35-mono); font-size: .72rem; font-weight: 700; background: var(--s35-green-bg); color: var(--s35-green); padding: 2px 8px; border-radius: 5px; }
    .s35-disguise-signal  { font-size: .72rem; color: var(--s35-muted); line-height: 1.4; max-width: 260px; }
    .s35-disguise-test    { font-size: .76rem; color: var(--s35-ink2); line-height: 1.5; padding: 7px 10px; background: var(--s35-surface2); border-radius: 6px; }
    .s35-test-label       { font-weight: 600; color: var(--s35-blue); margin-right: 4px; }
    .s35-disguise-example { font-size: .74rem; color: var(--s35-ink2); background: var(--s35-blue-bg); border: 1px solid var(--s35-blue-b); border-radius: 7px; padding: 7px 10px; line-height: 1.5; }
    .s35-disguise-warn    { font-size: .74rem; color: var(--s35-warn); line-height: 1.5; }

    /* Reframe list */
    .s35-reframe-list { display: flex; flex-direction: column; gap: 6px; }
    .s35-reframe-row  { background: var(--s35-surface); border: 1.5px solid var(--s35-border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; transition: border-color .14s; }
    .s35-reframe-row:hover         { border-color: var(--s35-border2); }
    .s35-reframe-row--answered     { border-color: rgba(37,99,235,.2); background: rgba(37,99,235,.02); }
    .s35-reframe-q       { font-size: .86rem; font-weight: 500; color: var(--s35-ink); line-height: 1.4; }
    .s35-reframe-purpose { font-size: .71rem; color: var(--s35-muted); margin-top: 2px; line-height: 1.4; }
    .s35-reframe-example { font-size: .74rem; color: var(--s35-ink2); background: var(--s35-blue-bg); border: 1px solid var(--s35-blue-b); border-radius: 7px; padding: 7px 10px; line-height: 1.5; }

    /* Transform hints */
    .s35-hints-title { font-size: .8rem; font-weight: 600; color: var(--s35-violet); margin-bottom: 8px; margin-top: 10px; }
    .s35-hint-card   { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--s35-violet-bg); border: 1px solid var(--s35-violet-b); border-radius: 8px; margin-bottom: 5px; }
    .s35-hint-label  { font-size: .8rem; font-weight: 600; color: var(--s35-violet); }
    .s35-hint-tagline{ font-size: .7rem; color: var(--s35-muted); margin-top: 2px; }
    .s35-apply-btn   { padding: 5px 12px; border: 1.5px solid var(--s35-violet-b); border-radius: 6px; background: var(--s35-surface); font-size: .74rem; font-weight: 600; color: var(--s35-violet); cursor: pointer; transition: all .12s; white-space: nowrap; }
    .s35-apply-btn:hover { background: var(--s35-violet-bg); }

    /* Transform section */
    .s35-suggested-title { font-size: .78rem; font-weight: 600; color: var(--s35-ink2); margin-bottom: 8px; }
    .s35-transform-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin-bottom: 12px; }
    .s35-transform-grid--all { margin-top: 10px; }
    .s35-transform-card  { position: relative; background: var(--s35-surface); border: 1.5px solid var(--s35-border); border-radius: 10px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: all .13s; user-select: none; }
    .s35-transform-card:hover  { border-color: var(--s35-violet-b); box-shadow: 0 2px 8px rgba(0,0,0,.06); transform: translateY(-1px); }
    .s35-transform-card--on    { border-color: var(--s35-violet); background: var(--s35-violet-bg); box-shadow: 0 0 0 3px rgba(124,58,237,.08); }
    .s35-transform-card--suggested { border-color: var(--s35-blue-b); }
    .s35-transform-check  { position: absolute; top: 8px; right: 8px; width: 16px; height: 16px; background: var(--s35-violet); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .56rem; color: #fff; font-weight: 700; opacity: 0; transform: scale(.6); transition: opacity .13s, transform .13s; }
    .s35-transform-card--on .s35-transform-check { opacity: 1; transform: scale(1); }
    .s35-transform-label   { font-size: .82rem; font-weight: 600; color: var(--s35-ink); }
    .s35-transform-tagline { font-size: .68rem; color: var(--s35-muted); line-height: 1.3; }

    /* Collapsible */
    .s35-collapsible { border: 1.5px solid var(--s35-border); border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
    .s35-collapsible-summary { padding: 8px 14px; background: var(--s35-surface2); cursor: pointer; font-family: var(--s35-mono); font-size: .62rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s35-muted); list-style: none; user-select: none; }
    .s35-collapsible-summary:hover { background: var(--s35-surface2); color: var(--s35-ink2); }

    /* Transform detail */
    .s35-transform-detail-card { background: var(--s35-surface); border: 1.5px solid var(--s35-violet-b); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
    .s35-transform-detail-name { font-size: .9rem; font-weight: 700; color: var(--s35-violet); }
    .s35-ba       { display: flex; flex-direction: column; gap: 4px; padding: 10px; background: var(--s35-surface2); border-radius: 7px; border: 1px solid var(--s35-border); }
    .s35-ba-row   { font-size: .76rem; color: var(--s35-ink2); line-height: 1.5; }
    .s35-ba-key   { font-weight: 600; color: var(--s35-muted); margin-right: 5px; }
    .s35-ba-arrow { font-family: var(--s35-mono); font-size: .8rem; color: var(--s35-muted); text-align: center; }
    .s35-opens-row   { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font-size: .74rem; }
    .s35-opens-label { font-family: var(--s35-mono); font-size: .6rem; font-weight: 700; color: var(--s35-green); text-transform: uppercase; letter-spacing: 1px; margin-right: 4px; }
    .s35-opens-tag   { padding: 2px 8px; background: var(--s35-green-bg); border: 1px solid var(--s35-green-b); border-radius: 9999px; font-family: var(--s35-mono); font-size: .62rem; color: var(--s35-green); font-weight: 600; }
    .s35-transform-examples { display: flex; flex-direction: column; gap: 8px; }
    .s35-transform-example  { padding: 10px 12px; background: var(--s35-surface2); border: 1px solid var(--s35-border); border-radius: 7px; display: flex; flex-direction: column; gap: 4px; }
    .s35-tex-problem { font-size: .78rem; font-weight: 500; color: var(--s35-ink); }
    .s35-tex-row     { font-size: .72rem; color: var(--s35-ink2); }
    .s35-tex-key     { font-family: var(--s35-mono); font-size: .6rem; color: var(--s35-muted); text-transform: uppercase; letter-spacing: .8px; margin-right: 5px; }
    .s35-code        { font-family: var(--s35-mono); font-size: .68rem; background: var(--s35-surface); color: var(--s35-blue); padding: 1px 5px; border-radius: 4px; border: 1px solid var(--s35-border); }
    .s35-transform-warn { font-size: .74rem; color: var(--s35-warn); padding: 7px 10px; background: var(--s35-warn-bg); border: 1px solid var(--s35-warn-b); border-radius: 7px; }

    /* No transform button */
    .s35-no-transform-btn { display: block; width: 100%; padding: 11px 16px; border: 1.5px dashed var(--s35-border); border-radius: 9px; background: transparent; font-size: .82rem; font-weight: 500; color: var(--s35-muted); cursor: pointer; transition: all .13s; margin-top: 6px; text-align: left; }
    .s35-no-transform-btn:hover   { border-color: var(--s35-green-b); color: var(--s35-green); background: var(--s35-green-bg); border-style: solid; }
    .s35-no-transform-btn--on     { border-color: var(--s35-green-b); border-style: solid; background: var(--s35-green-bg); color: var(--s35-green); font-weight: 600; }

    /* Verify section */
    .s35-verify-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; background: var(--s35-surface); border: 1.5px solid var(--s35-border); border-radius: 9px; cursor: pointer; transition: all .13s; margin-bottom: 5px; user-select: none; }
    .s35-verify-row:hover        { border-color: var(--s35-border2); }
    .s35-verify-row--checked     { background: var(--s35-green-bg); border-color: var(--s35-green-b); }
    .s35-verify-cb               { width: 15px; height: 15px; accent-color: var(--s35-green); cursor: pointer; flex-shrink: 0; margin-top: 2px; }
    .s35-verify-content          { display: flex; flex-direction: column; gap: 2px; }
    .s35-verify-step             { font-family: var(--s35-mono); font-size: .6rem; letter-spacing: 1px; text-transform: uppercase; color: var(--s35-muted); }
    .s35-verify-text             { font-size: .8rem; color: var(--s35-ink2); line-height: 1.4; }
    .s35-verify-progress         { font-family: var(--s35-mono); font-size: .68rem; color: var(--s35-muted); text-align: right; padding: 4px 0; }

    /* Side panel */
    .s35-panel { width: 268px; flex-shrink: 0; background: var(--s35-surface); border: 1.5px solid var(--s35-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s35-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s35-border); background: #f6f4f0; }
    .s35-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s35-ink); }
    .s35-panel-sub    { font-size: .66rem; color: var(--s35-muted); margin-top: 2px; }
    .s35-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s35-panel-empty  { font-size: .74rem; color: var(--s35-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s35-panel-section { display: flex; flex-direction: column; gap: 7px; }
    .s35-panel-section--warn      { background: var(--s35-warn-bg);   border: 1px solid var(--s35-warn-b);   border-radius: 8px; padding: 10px 12px; }
    .s35-panel-section--transform { background: var(--s35-violet-bg); border: 1px solid var(--s35-violet-b); border-radius: 8px; padding: 10px 12px; }
    .s35-panel-section--ok        { background: var(--s35-green-bg);  border: 1px solid var(--s35-green-b);  border-radius: 8px; padding: 10px 12px; }
    .s35-panel-section-title      { font-family: var(--s35-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s35-muted); margin-bottom: 2px; }
    .s35-panel-section--warn      .s35-panel-section-title { color: var(--s35-warn);   }
    .s35-panel-section--transform .s35-panel-section-title { color: var(--s35-violet); }
    .s35-panel-section--ok        .s35-panel-section-title { color: var(--s35-green);  }
    .s35-panel-prog-row    { display: flex; justify-content: space-between; font-size: .72rem; color: var(--s35-ink2); }
    .s35-panel-prog-label  { color: var(--s35-muted); }
    .s35-panel-prog-count  { font-family: var(--s35-mono); font-size: .68rem; font-weight: 700; color: var(--s35-blue); }
    .s35-panel-disguise    { display: flex; align-items: center; gap: 6px; font-size: .74rem; }
    .s35-panel-looks       { font-family: var(--s35-mono); font-size: .68rem; color: var(--s35-warn); font-weight: 600; }
    .s35-panel-actually    { font-family: var(--s35-mono); font-size: .68rem; color: var(--s35-green); font-weight: 600; }
    .s35-panel-yes-item    { font-size: .7rem; color: var(--s35-ink2); padding: 4px 8px; background: var(--s35-blue-bg); border: 1px solid var(--s35-blue-b); border-radius: 5px; line-height: 1.4; }
    .s35-panel-transform-tag  { display: inline-block; padding: 3px 9px; background: var(--s35-violet-bg); border: 1px solid var(--s35-violet-b); border-radius: 4px; font-family: var(--s35-mono); font-size: .64rem; color: var(--s35-violet); font-weight: 600; margin-bottom: 3px; }
    .s35-panel-transform-badge{ font-size: .82rem; font-weight: 600; color: var(--s35-violet); padding: 4px 10px; background: var(--s35-violet-bg); border: 1px solid var(--s35-violet-b); border-radius: 6px; }
    .s35-panel-ok-badge   { font-size: .78rem; font-weight: 500; color: var(--s35-green); }
    .s35-panel-gate { padding: 10px 12px; border-radius: 8px; font-size: .74rem; font-weight: 500; text-align: center; background: var(--s35-surface2); border: 1.5px solid var(--s35-border); color: var(--s35-muted); }
    .s35-panel-gate--ready { background: var(--s35-green-bg); border-color: var(--s35-green-b); color: var(--s35-green); }
    .s35-panel-body::-webkit-scrollbar { width: 3px; }
    .s35-panel-body::-webkit-scrollbar-thumb { background: var(--s35-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s35-shell { flex-direction: column; padding: 16px; }
      .s35-panel { width: 100%; position: static; max-height: none; }
      .s35-transform-grid { grid-template-columns: 1fr 1fr; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage3_5;
    if (!saved) return;
    const RQ       = typeof ReframeQuestions !== 'undefined' ? ReframeQuestions : null;
    const totalR   = RQ?.getTotal?.() ?? _fallbackReframes().length;
    const rCount   = Object.keys(saved.reframeAnswers ?? {}).length;
    if (rCount >= Math.ceil(totalR / 2) && saved.transformationApplied) {
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state               = null;
    _selectedTransform   = null;
    _reframeAnswers      = {};
    _disguiseAnswers     = {};
    _verifyChecklist     = {};
    _transformationHints = [];
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage3_5;