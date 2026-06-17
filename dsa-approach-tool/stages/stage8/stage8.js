// stages/stage8/stage8.js
// Code Translation stage — walks through named code chunks one at a time,
// per-language, with an "I understand this" gate before advancing.
// Completion increments streak via pushToHistory and unlocks the pattern card.
//
// Module contract: { render(state) → HTMLElement, onMount(state), cleanup() }
// Dependencies (globals): State, CodeChunker, PatternMap, SessionUtils, Renderer

const Stage8 = (() => {

  // ─── MODULE STATE ──────────────────────────────────────────────────────────

  let _state       = null;
  let _chunks      = [];       // chunk objects from CodeChunker
  let _activeLang  = 'python'; // currently selected language
  let _activeChunk = 0;        // index of chunk displayed in right panel
  let _understood  = [];       // boolean[] parallel to _chunks
  let _wrapper     = null;     // root .s8-shell element

  // ─── PUBLIC: render ────────────────────────────────────────────────────────

  function render(state) {
    _state = state;

    const saved = state.answers?.stage8 ?? {};
    const dir   = _getDir();

    // Context for CodeChunker
    const graphGoal       = state.answers?.stage3?.graphGoal       ?? null;
    const dpSubtype       = state.answers?.stage3?.dpSubtype       ?? null;
    const inputType       = (state.answers?.stage1?.inputTypes ?? [])[0] ?? null;
    const graphProperties = state.answers?.stage3?.graphProperties ?? {};

    _chunks     = _resolveChunks(dir, graphGoal, dpSubtype, inputType, graphProperties, saved);
    _activeLang = saved.selectedLanguage ?? 'python';
    _understood = _chunks.map(c => {
      const sc = (saved.chunks ?? []).find(x => x.id === c.id);
      return sc?.understood ?? false;
    });

    // Jump past already-understood chunks
    const firstPending  = _understood.findIndex(u => !u);
    _activeChunk = firstPending >= 0 ? firstPending : 0;

    _persistState(dir);
    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 's8-shell';
    _wrapper = wrapper;

    wrapper.innerHTML = `
      <aside class="s8-nav" id="s8-nav">
        <div class="s8-nav-header">
          <span class="s8-stage-label">Stage 8</span>
          <div class="s8-nav-title">Code translation</div>
          ${dir ? `<div class="s8-nav-dir">${_esc(dir.label ?? '')}</div>` : ''}
        </div>

        <div class="s8-nav-block">
          <div class="s8-block-label">Language</div>
          <div class="s8-lang-grid" id="s8-lang-grid">
            ${['python','javascript','cpp','java'].map(lang => `
              <button class="s8-lang-btn${lang === _activeLang ? ' s8-lang-btn--on' : ''}"
                      data-lang="${lang}">${_langLabel(lang)}</button>
            `).join('')}
          </div>
        </div>

        <div class="s8-nav-block s8-nav-block--grow">
          <div class="s8-block-label">Steps</div>
          <div class="s8-chunk-nav" id="s8-chunk-nav"></div>
        </div>

        <div class="s8-nav-footer">
          <div class="s8-progress-track">
            <div class="s8-progress-fill" id="s8-progress-fill"></div>
          </div>
          <div class="s8-progress-label" id="s8-progress-label">
            0 / ${_chunks.length} understood
          </div>
        </div>
      </aside>

      <main class="s8-main" id="s8-main"></main>
    `;

    _buildChunkNav(wrapper);
    _wireLanguageButtons(wrapper);
    _refreshProgress(wrapper);

    const main = wrapper.querySelector('#s8-main');
    if (_chunks.length > 0 && _understood.every(Boolean)) {
      _buildCompletionState(main, dir);
    } else {
      _buildChunkView(main, _activeChunk, dir);
    }

    return wrapper;
  }

  // ─── PUBLIC: onMount ───────────────────────────────────────────────────────

  function onMount(state) {
    // Stage 8 handles its own exit — suppress the global Next button
    if (typeof Renderer !== 'undefined') {
      Renderer.setNextEnabled(false);
    }
    // Disable Back: leaving Stage 8 early would skip streak + pattern unlock
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.disabled = true;
      backBtn.style.visibility = 'hidden';
    }
  }

  // ─── PUBLIC: cleanup ───────────────────────────────────────────────────────

  function cleanup() {
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.disabled = false;
      backBtn.style.visibility = '';
    }
    _state       = null;
    _chunks      = [];
    _activeLang  = 'python';
    _activeChunk = 0;
    _understood  = [];
    _wrapper     = null;
  }

  // ─── CHUNK RESOLUTION ──────────────────────────────────────────────────────

  function _resolveChunks(dir, graphGoal, dpSubtype, inputType, graphProperties, saved) {
    // Restore from saved state so refresh doesn't re-chunk
    if ((saved.chunks ?? []).length > 0) {
      return saved.chunks.map(c => ({
        id             : c.id,
        stepNumber     : c.stepNumber,
        name           : c.name,
        mentalModelLine: c.mentalModelLine,
        code           : c.code,
      }));
    }

    if (typeof CodeChunker !== 'undefined' && dir) {
      const result = CodeChunker.chunkCodeShape(dir, graphGoal, dpSubtype, inputType, graphProperties);
      if (Array.isArray(result) && result.length > 0) return result;
    }

    if (dir?.codeShape) return _naiveChunk(dir.codeShape);

    return [{
      id             : 'chunk_1',
      stepNumber     : 1,
      name           : 'Algorithm',
      mentalModelLine: 'Connect this code to the mental model you built in earlier stages.',
      code: {
        python    : '# No code shape available for this direction.',
        javascript: '// No code shape available for this direction.',
        cpp       : '// No code shape available for this direction.',
        java      : '// No code shape available for this direction.',
      },
    }];
  }

  function _naiveChunk(codeShape) {
    const lines  = codeShape.trim().split('\n');
    const groups = [];
    let   buf    = [];
    lines.forEach(line => {
      if (line.trim() === '' && buf.length > 0) {
        groups.push(buf.join('\n'));
        buf = [];
      } else {
        buf.push(line);
      }
    });
    if (buf.length) groups.push(buf.join('\n'));
    if (!groups.length) groups.push(codeShape.trim());

    return groups.map((code, i) => ({
      id             : `chunk_${i + 1}`,
      stepNumber     : i + 1,
      name           : `Step ${i + 1}`,
      mentalModelLine: 'Connect this block to the overall structure of the algorithm.',
      code           : { python: code, javascript: code, cpp: code, java: code },
    }));
  }

  // ─── CHUNK NAV (left panel list) ───────────────────────────────────────────

  function _buildChunkNav(wrapper) {
    const nav = wrapper.querySelector('#s8-chunk-nav');
    if (!nav) return;
    nav.innerHTML = '';

    _chunks.forEach((chunk, idx) => {
      const item = document.createElement('button');
      item.className = [
        's8-nav-item',
        idx === _activeChunk ? 's8-nav-item--active' : '',
        _understood[idx]     ? 's8-nav-item--done'   : '',
      ].join(' ').trim();
      item.dataset.idx = idx;
      item.innerHTML = `
        <span class="s8-nav-num">${chunk.stepNumber}</span>
        <span class="s8-nav-name">${_esc(chunk.name)}</span>
        <span class="s8-nav-check" aria-hidden="true">✓</span>
      `;
      item.addEventListener('click', () => {
        _activeChunk = idx;
        _refreshNav();
        const main = _wrapper?.querySelector('#s8-main');
        if (main) _buildChunkView(main, idx, _getDir());
      });
      nav.appendChild(item);
    });
  }

  function _refreshNav() {
    if (!_wrapper) return;
    _wrapper.querySelectorAll('.s8-nav-item').forEach(item => {
      const idx = parseInt(item.dataset.idx, 10);
      item.classList.toggle('s8-nav-item--active', idx === _activeChunk);
      item.classList.toggle('s8-nav-item--done',   _understood[idx]);
    });
  }

  // ─── CHUNK VIEW (right panel) ─────────────────────────────────────────────

  function _buildChunkView(main, idx, dir) {
    main.innerHTML = '';
    const chunk = _chunks[idx];
    if (!chunk) return;

    const code     = chunk.code?.[_activeLang] ?? chunk.code?.python ?? '';
    const { lineNums } = _numberLines(code);
    const isDone   = _understood[idx];

    const view = document.createElement('div');
    view.className = 's8-chunk-view';
    view.innerHTML = `
      <div class="s8-chunk-header">
        <span class="s8-step-badge" aria-hidden="true">${chunk.stepNumber}</span>
        <h2 class="s8-chunk-name">${_esc(chunk.name)}</h2>
      </div>

      <div class="s8-callout">
        <div class="s8-callout-label">Why this exists</div>
        <p class="s8-callout-text">${_esc(chunk.mentalModelLine)}</p>
      </div>

      <div class="s8-code-wrap">
        <div class="s8-code-toolbar">
          <span class="s8-code-lang-tag">${_langLabel(_activeLang)}</span>
          <button class="s8-copy-btn" id="s8-copy-btn">Copy</button>
        </div>
        <div class="s8-code-block">
          <div class="s8-line-nums" aria-hidden="true">${lineNums}</div>
          <pre class="s8-code-pre">${_escCode(code)}</pre>
        </div>
      </div>

      <div class="s8-actions">
        <button class="s8-btn-understand${isDone ? ' s8-btn-understand--done' : ''}"
                id="s8-understand-btn"
                ${isDone ? 'disabled' : ''}>
          ${isDone ? '✓ Understood' : 'I understand this'}
        </button>
        <button class="s8-btn-explain" id="s8-explain-btn">
          Explain this chunk →
        </button>
      </div>
    `;

    view.querySelector('#s8-copy-btn').addEventListener('click', e => {
      _copyToClipboard(code, e.currentTarget);
    });

    if (!isDone) {
      view.querySelector('#s8-understand-btn').addEventListener('click', () => {
        _onUnderstood(idx, dir);
      });
    }

    view.querySelector('#s8-explain-btn').addEventListener('click', () => {
      _sendPrompt(chunk.name, code);
    });

    main.appendChild(view);
  }

  // ─── UNDERSTAND FLOW ───────────────────────────────────────────────────────

  function _onUnderstood(idx, dir) {
    _understood[idx] = true;
    _persistState(dir);
    _refreshProgress(_wrapper);
    _refreshNav();

    // Update button in place without rebuilding the whole view
    const btn = _wrapper?.querySelector('#s8-understand-btn');
    if (btn) {
      btn.textContent = '✓ Understood';
      btn.classList.add('s8-btn-understand--done');
      btn.disabled = true;
    }

    if (_understood.every(Boolean)) {
      setTimeout(() => {
        const main = _wrapper?.querySelector('#s8-main');
        if (main) _buildCompletionState(main, dir);
      }, 400);
      return;
    }

    // Advance to next ununderstood chunk (search forward, then wrap)
    const next = _understood.findIndex((u, i) => i > idx && !u);
    const target = next >= 0 ? next : _understood.findIndex(u => !u);
    if (target >= 0) {
      setTimeout(() => {
        _activeChunk = target;
        _refreshNav();
        const main = _wrapper?.querySelector('#s8-main');
        if (main) _buildChunkView(main, target, _getDir());
      }, 400);
    }
  }

  // ─── COMPLETION STATE ──────────────────────────────────────────────────────

  function _buildCompletionState(main, dir) {
    main.innerHTML = '';

    const el = document.createElement('div');
    el.className = 's8-completion';
    el.innerHTML = `
      <div class="s8-completion-icon" aria-hidden="true">✓</div>
      <h2 class="s8-completion-heading">You've got the full algorithm.</h2>
      <p class="s8-completion-sub">Mental model → code translation complete.</p>
      <div class="s8-completion-actions">
        <button class="s8-btn-home" id="s8-btn-home">Back to problem list</button>
        <button class="s8-btn-again" id="s8-btn-again">Try another problem</button>
      </div>
    `;

    el.querySelector('#s8-btn-home').addEventListener('click',  () => _onComplete(dir));
    el.querySelector('#s8-btn-again').addEventListener('click', () => _onComplete(dir));
    main.appendChild(el);
  }

  function _onComplete(dir) {
    const patternUnlocked = dir?.label ?? null;

    if (typeof State !== 'undefined') {
      State.setAnswer('stage8', {
        completedAt    : Date.now(),
        patternUnlocked: patternUnlocked,
      });
      State.markStageComplete('stage8');
    }

    if (typeof PatternMap !== 'undefined' && patternUnlocked) {
      PatternMap.unlock(patternUnlocked);
    }

    // pushToHistory after Stage.setAnswer so stage8 data is included
    if (typeof SessionUtils !== 'undefined' && typeof State !== 'undefined') {
      SessionUtils.pushToHistory(State.get());
    }

    document.dispatchEvent(new CustomEvent('dsa:reset', { detail: { reason: 'stage8_complete' } }));
  }

  // ─── LANGUAGE SWITCHING ────────────────────────────────────────────────────

  function _wireLanguageButtons(wrapper) {
    const grid = wrapper.querySelector('#s8-lang-grid');
    if (!grid) return;
    grid.querySelectorAll('.s8-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeLang = btn.dataset.lang;
        grid.querySelectorAll('.s8-lang-btn').forEach(b =>
          b.classList.toggle('s8-lang-btn--on', b.dataset.lang === _activeLang)
        );
        _persistState(_getDir());
        // Rebuild the code display for the active chunk
        const main = _wrapper?.querySelector('#s8-main');
        if (main && !(_chunks.length > 0 && _understood.every(Boolean))) {
          _buildChunkView(main, _activeChunk, _getDir());
        }
      });
    });
  }

  // ─── PROGRESS ──────────────────────────────────────────────────────────────

  function _refreshProgress(wrapper) {
    if (!wrapper) return;
    const done  = _understood.filter(Boolean).length;
    const total = _chunks.length;
    const pct   = total ? (done / total * 100) : 0;

    const fill  = wrapper.querySelector('#s8-progress-fill');
    const label = wrapper.querySelector('#s8-progress-label');
    if (fill)  fill.style.width = `${pct}%`;
    if (label) label.textContent = `${done} / ${total} understood`;
  }

  // ─── STATE PERSISTENCE ─────────────────────────────────────────────────────

  function _persistState(dir) {
    if (typeof State === 'undefined') return;
    State.setAnswer('stage8', {
      selectedLanguage: _activeLang,
      chunks: _chunks.map((c, i) => ({
        id             : c.id,
        stepNumber     : c.stepNumber,
        name           : c.name,
        mentalModelLine: c.mentalModelLine,
        code           : c.code,
        understood     : _understood[i] ?? false,
        timeSpent      : 0,
      })),
      patternUnlocked: dir?.label ?? null,
    });
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  function _getDir() {
    if (!_state) return null;
    const s7    = _state.answers?.stage7 ?? {};
    const dirId = s7.selectedDirection;
    const dirs  = _state.output?.directions ?? s7.directions ?? [];
    return dirs.find(d => d.id === dirId) ?? dirs[0] ?? null;
  }

  function _langLabel(lang) {
    return { python: 'Python', javascript: 'JavaScript', cpp: 'C++', java: 'Java' }[lang] ?? lang;
  }

  function _numberLines(code) {
    const lines    = code.split('\n');
    const lineNums = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
    return { lineNums };
  }

  function _copyToClipboard(text, btn) {
    const orig = btn.textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = orig; }, 1500); })
        .catch(() => { btn.textContent = 'Error';  setTimeout(() => { btn.textContent = orig; }, 1500); });
    } else {
      btn.textContent = 'N/A';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  }

  function _sendPrompt(chunkName, code) {
    const prompt = `Explain this code chunk to me as if I already understand the mental model but have never seen the syntax: ${chunkName} — ${code}`;
    const _showNotice = () => {
      const n = document.createElement('div');
      n.className   = 's8-prompt-notice';
      n.textContent = 'Prompt copied — open claude.ai and paste.';
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt)
        .then(_showNotice)
        .catch(() => window.open('https://claude.ai', '_blank', 'noopener,noreferrer'));
    } else {
      window.open('https://claude.ai', '_blank', 'noopener,noreferrer');
    }
  }

  function _esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _escCode(code) {
    return String(code ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s8-styles')) return;
    const style = document.createElement('style');
    style.id = 's8-styles';
    style.textContent = `
    /* Token inheritance — fall back to literals when global :root vars absent */
    .s8-shell {
      --s8-ink      : var(--ink,       #1a1a2e);
      --s8-bg       : var(--bg,        #f5f0e8);
      --s8-surface  : var(--surface,   #fffdf7);
      --s8-border   : var(--border,    #d4ccb8);
      --s8-muted    : var(--muted,     #8a8070);
      --s8-green    : var(--green,     #06d6a0);
      --s8-green-bg : var(--green-bg,  rgba(6,214,160,.08));
      --s8-mono     : var(--font-mono, 'Space Mono', monospace);
      --s8-sans     : var(--font-sans, 'DM Sans', sans-serif);
      --s8-accent   : #2563eb;
      --s8-accent-bg: rgba(37,99,235,.06);
      --s8-code-bg  : #1a1a2e;
      --s8-code-fg  : #e2e8f0;
      --s8-code-ln  : #4a5568;
      --s8-r        : 8px;
    }

    /* ── Shell ───────────────────────────────────────────────────────────── */
    .s8-shell {
      display      : flex;
      min-height   : 500px;
      font-family  : var(--s8-sans);
      color        : var(--s8-ink);
      background   : var(--s8-bg);
      border-radius: 12px;
      overflow     : hidden;
      border       : 1.5px solid var(--s8-border);
    }

    /* ── Left nav ────────────────────────────────────────────────────────── */
    .s8-nav {
      width         : 240px;
      flex-shrink   : 0;
      display       : flex;
      flex-direction: column;
      background    : var(--s8-surface);
      border-right  : 1.5px solid var(--s8-border);
      overflow-y    : auto;
    }

    .s8-nav-header {
      padding      : 16px 16px 12px;
      border-bottom: 1px solid var(--s8-border);
    }

    .s8-stage-label {
      font-family   : var(--s8-mono);
      font-size     : .58rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      color         : var(--s8-muted);
      display       : block;
    }

    .s8-nav-title {
      font-size  : .9rem;
      font-weight: 700;
      margin-top : 3px;
    }

    .s8-nav-dir {
      font-size  : .69rem;
      color      : var(--s8-muted);
      margin-top : 4px;
      line-height: 1.4;
    }

    .s8-nav-block {
      padding      : 12px 14px;
      border-bottom: 1px solid rgba(212,204,184,.4);
    }

    .s8-nav-block--grow {
      flex      : 1;
      overflow-y: auto;
    }

    .s8-block-label {
      font-family   : var(--s8-mono);
      font-size     : .57rem;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color         : var(--s8-muted);
      margin-bottom : 7px;
    }

    /* ── Language grid ───────────────────────────────────────────────────── */
    .s8-lang-grid {
      display              : grid;
      grid-template-columns: 1fr 1fr;
      gap                  : 5px;
    }

    .s8-lang-btn {
      padding      : 5px 0;
      border       : 1.5px solid var(--s8-border);
      border-radius: 6px;
      background   : var(--s8-bg);
      font-family  : var(--s8-mono);
      font-size    : .63rem;
      color        : var(--s8-muted);
      cursor       : pointer;
      transition   : border-color .13s, background .13s, color .13s;
    }

    .s8-lang-btn:hover            { border-color: var(--s8-accent); color: var(--s8-ink); }
    .s8-lang-btn--on              { background: var(--s8-accent-bg); border-color: var(--s8-accent); color: var(--s8-accent); font-weight: 700; }

    /* ── Chunk nav list ──────────────────────────────────────────────────── */
    .s8-chunk-nav { display: flex; flex-direction: column; gap: 2px; }

    .s8-nav-item {
      display      : flex;
      align-items  : center;
      gap          : 7px;
      padding      : 7px 10px;
      border       : 1.5px solid transparent;
      border-radius: 7px;
      background   : none;
      cursor       : pointer;
      text-align   : left;
      width        : 100%;
      transition   : background .12s, border-color .12s;
    }

    .s8-nav-item:hover          { background: var(--s8-bg); }
    .s8-nav-item--active        { background: var(--s8-accent-bg); border-color: rgba(37,99,235,.22); }
    .s8-nav-item--active .s8-nav-num { color: var(--s8-accent); }

    .s8-nav-num  { font-family: var(--s8-mono); font-size: .64rem; color: var(--s8-muted); flex-shrink: 0; min-width: 14px; text-align: center; }
    .s8-nav-name { font-size: .71rem; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 1.3; }
    .s8-nav-check { font-size: .64rem; color: var(--s8-green); flex-shrink: 0; opacity: 0; transition: opacity .14s; }
    .s8-nav-item--done .s8-nav-check { opacity: 1; }

    /* ── Progress ────────────────────────────────────────────────────────── */
    .s8-nav-footer  { padding: 12px 14px; border-top: 1px solid var(--s8-border); }
    .s8-progress-track { height: 5px; background: rgba(212,204,184,.5); border-radius: 99px; overflow: hidden; margin-bottom: 6px; }
    .s8-progress-fill  { height: 100%; background: var(--s8-green); border-radius: 99px; transition: width .3s ease; width: 0%; }
    .s8-progress-label { font-family: var(--s8-mono); font-size: .6rem; color: var(--s8-muted); }

    /* ── Right panel ─────────────────────────────────────────────────────── */
    .s8-main {
      flex      : 1;
      overflow-y: auto;
      padding   : 28px 32px;
      background: var(--s8-bg);
    }

    /* ── Chunk view ──────────────────────────────────────────────────────── */
    .s8-chunk-view { display: flex; flex-direction: column; gap: 18px; }

    .s8-chunk-header { display: flex; align-items: center; gap: 12px; }

    .s8-step-badge {
      display        : inline-flex;
      align-items    : center;
      justify-content: center;
      width          : 28px;
      height         : 28px;
      border-radius  : 50%;
      background     : var(--s8-accent-bg);
      border         : 1.5px solid rgba(37,99,235,.28);
      font-family    : var(--s8-mono);
      font-size      : .72rem;
      font-weight    : 700;
      color          : var(--s8-accent);
      flex-shrink    : 0;
    }

    .s8-chunk-name { font-size: 1.05rem; font-weight: 700; line-height: 1.3; }

    /* ── Mental model callout ────────────────────────────────────────────── */
    .s8-callout {
      padding      : 12px 16px;
      background   : var(--s8-surface);
      border       : 1.5px solid var(--s8-border);
      border-left  : 3px solid var(--s8-accent);
      border-radius: var(--s8-r);
    }

    .s8-callout-label {
      font-family   : var(--s8-mono);
      font-size     : .57rem;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color         : var(--s8-muted);
      margin-bottom : 5px;
    }

    .s8-callout-text { font-size: .82rem; font-style: italic; line-height: 1.6; }

    /* ── Code block ──────────────────────────────────────────────────────── */
    .s8-code-wrap   { border-radius: var(--s8-r); overflow: hidden; border: 1.5px solid rgba(0,0,0,.18); }

    .s8-code-toolbar {
      display        : flex;
      align-items    : center;
      justify-content: space-between;
      padding        : 6px 14px;
      background     : rgba(0,0,0,.4);
    }

    .s8-code-lang-tag { font-family: var(--s8-mono); font-size: .61rem; color: rgba(226,232,240,.55); letter-spacing: 1px; }

    .s8-copy-btn {
      padding      : 3px 10px;
      border       : 1px solid rgba(226,232,240,.18);
      border-radius: 4px;
      background   : transparent;
      color        : rgba(226,232,240,.65);
      font-family  : var(--s8-mono);
      font-size    : .6rem;
      cursor       : pointer;
      transition   : background .12s, color .12s;
    }

    .s8-copy-btn:hover { background: rgba(226,232,240,.1); color: #e2e8f0; }

    .s8-code-block { display: flex; background: var(--s8-code-bg); overflow-x: auto; }

    .s8-line-nums {
      display       : flex;
      flex-direction: column;
      padding       : 14px 10px 14px 14px;
      min-width     : 42px;
      text-align    : right;
      font-family   : var(--s8-mono);
      font-size     : .71rem;
      line-height   : 1.7;
      color         : var(--s8-code-ln);
      user-select   : none;
      border-right  : 1px solid rgba(255,255,255,.06);
      flex-shrink   : 0;
    }

    .s8-line-nums span { display: block; }

    .s8-code-pre {
      flex       : 1;
      margin     : 0;
      padding    : 14px 16px;
      font-family: var(--s8-mono);
      font-size  : .71rem;
      line-height: 1.7;
      color      : var(--s8-code-fg);
      white-space: pre;
      background : transparent;
      overflow-x : visible;
    }

    /* ── Action buttons ──────────────────────────────────────────────────── */
    .s8-actions { display: flex; gap: 10px; flex-wrap: wrap; }

    .s8-btn-understand {
      padding      : 9px 22px;
      border       : 1.5px solid var(--s8-green);
      border-radius: var(--s8-r);
      background   : var(--s8-green-bg);
      color        : #028a5b;
      font-family  : var(--s8-sans);
      font-size    : .82rem;
      font-weight  : 600;
      cursor       : pointer;
      transition   : background .14s;
    }

    .s8-btn-understand:hover:not(:disabled) { background: rgba(6,214,160,.16); }
    .s8-btn-understand--done { opacity: .65; cursor: default; }
    .s8-btn-understand:disabled { cursor: default; }

    .s8-btn-explain {
      padding      : 9px 16px;
      border       : 1.5px solid var(--s8-border);
      border-radius: var(--s8-r);
      background   : transparent;
      color        : var(--s8-muted);
      font-family  : var(--s8-sans);
      font-size    : .82rem;
      cursor       : pointer;
      transition   : border-color .14s, color .14s;
    }

    .s8-btn-explain:hover { border-color: var(--s8-accent); color: var(--s8-accent); }

    /* ── Completion state ────────────────────────────────────────────────── */
    .s8-completion {
      display        : flex;
      flex-direction : column;
      align-items    : center;
      justify-content: center;
      text-align     : center;
      gap            : 14px;
      padding        : 56px 24px;
    }

    .s8-completion-icon {
      width          : 64px;
      height         : 64px;
      border-radius  : 50%;
      background     : var(--s8-green-bg);
      border         : 2px solid rgba(6,214,160,.4);
      display        : flex;
      align-items    : center;
      justify-content: center;
      font-size      : 1.8rem;
      color          : var(--s8-green);
    }

    .s8-completion-heading { font-size: 1.18rem; font-weight: 700; }
    .s8-completion-sub     { font-size: .83rem; color: var(--s8-muted); }

    .s8-completion-actions {
      display        : flex;
      gap            : 10px;
      flex-wrap      : wrap;
      justify-content: center;
      margin-top     : 4px;
    }

    .s8-btn-home {
      padding      : 10px 22px;
      border       : 1.5px solid var(--s8-accent);
      border-radius: var(--s8-r);
      background   : var(--s8-accent);
      color        : #fff;
      font-family  : var(--s8-sans);
      font-size    : .84rem;
      font-weight  : 600;
      cursor       : pointer;
      transition   : opacity .14s;
    }

    .s8-btn-home:hover { opacity: .87; }

    .s8-btn-again {
      padding      : 10px 22px;
      border       : 1.5px solid var(--s8-border);
      border-radius: var(--s8-r);
      background   : transparent;
      color        : var(--s8-muted);
      font-family  : var(--s8-sans);
      font-size    : .84rem;
      cursor       : pointer;
      transition   : border-color .14s, color .14s;
    }

    .s8-btn-again:hover { border-color: var(--s8-ink); color: var(--s8-ink); }

    /* ── Prompt-copied toast ─────────────────────────────────────────────── */
    .s8-prompt-notice {
      position      : fixed;
      bottom        : 24px;
      left          : 50%;
      transform     : translateX(-50%);
      background    : #1a1a2e;
      color         : #e2e8f0;
      padding       : 10px 20px;
      border-radius : 8px;
      font-size     : .77rem;
      z-index       : 9999;
      pointer-events: none;
      white-space   : nowrap;
    }

    /* ── Responsive ──────────────────────────────────────────────────────── */
    @media (max-width: 640px) {
      .s8-shell { flex-direction: column; }
      .s8-nav   { width: 100%; border-right: none; border-bottom: 1.5px solid var(--s8-border); }
      .s8-nav-block--grow { max-height: 150px; }
      .s8-main  { padding: 18px 16px; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage8;
