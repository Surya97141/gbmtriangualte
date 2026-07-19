// stages/intake/intake.js
// Phase 1.0 — the FIRST "Truths First" moment, before Stage 3's narrower
// structural-property one. Asks the user what THEY think the problem is
// about, in their own words — not a paste box for the raw statement. This
// used to ask the user to paste the problem statement verbatim and only
// ran keyword-matching over it; that framing is gone. The same keyword
// matcher (KeywordCrosscheck) still runs as a secondary, clearly optional
// aid over whatever the user typed, to suggest Stage 1/2 answers — genuine,
// deterministic signal extraction, not a stated pattern/algorithm name, so
// it doesn't conflict with the hard rule below.
//
// Hard rule (Phase 1.0): nothing on this screen ever states a pattern or
// algorithm name back to the user — only input/output/query-type signals,
// which is what the existing suggestion tables were already scoped to.
//
// Phase 4.6 — an optional live call (LLMClient, cheap tier) reads
// `interpretation` to calibrate a confidence signal. Purely informational:
// it is never used to gate or skip a stage, and it never inflates anything
// computed elsewhere (Stage 6.5's score is untouched by this). Required
// fallback: not configured, timed out, network-failed, or malformed →
// defaults to Medium confidence silently, never blocks. Hard rule enforced
// both in the system prompt AND by checking the response for a pattern-name
// leak before ever displaying it (LLMClient.containsPatternNameLeak).
//
// `interpretation` is stored verbatim for Stage 7/8's exit synthesis
// (Phase 1.8) — the user's own words, referenced later, never corrected here.
// Nothing here is required; Next is always enabled.
// Module contract: render(state), onMount(state), cleanup()

const StageIntake = (() => {

  // Labels for display only — ids match Stage 1 / Stage 2's own canonical ids.
  const INPUT_TYPE_LABELS = {
    single_array: 'Single array', two_arrays: 'Two arrays',
    single_string: 'Single string', two_strings: 'Two strings',
    multiple_strings: 'Multiple strings', matrix_grid: 'Matrix / Grid',
    graph_edge_list: 'Graph — edge list', graph_adjacency: 'Graph — adjacency',
    implicit_graph: 'Implicit graph', tree_explicit: 'Tree — explicit',
    intervals: 'Intervals / ranges', single_number: 'Single number',
    multiple_numbers: 'Multiple numbers',
  };
  const OUTPUT_FORM_LABELS = {
    single_value: 'Single value', index_position: 'Index / Position',
    subarray_substring: 'Subarray / Substring', subsequence: 'Subsequence',
    full_array: 'Full array / permutation', count: 'Count',
    tree_graph: 'Tree / Graph structure', boolean: 'Boolean / Existence',
  };
  const QUERY_TYPE_LABELS = {
    none: 'No queries', one: 'One query', offline: 'Multiple — offline',
    online: 'Multiple — online', updates: 'Updates + queries',
  };

  let _state          = null;
  let _interpretation = '';
  let _suggestion     = null; // { inputTypes: [...], outputForm: {...}|null, queryType: {...} }
  let _calibration    = null; // { level: 'low'|'medium'|'high', note: string } | null
  let _calibrating    = false;

  function render(state) {
    _state = state;
    const saved = state.answers?.intake ?? {};
    _interpretation = saved.interpretation ?? '';
    _suggestion     = saved.lastSuggestion ?? null;
    _calibration    = saved.calibration ?? null;

    _injectStyles();

    const llmReady = typeof LLMClient !== 'undefined' && LLMClient.isConfigured('cheap');

    const wrapper = document.createElement('div');
    wrapper.className = 'sin-shell';
    wrapper.innerHTML = `
      <div class="sin-rule">
        Before anything else — what do you actually think, before any stage tells you?
        Nothing here is required or graded; skip straight ahead if you'd rather answer directly.
      </div>

      <section class="sin-section">
        <div class="sin-section-title">What do you think this problem is about? Type it in your own words.</div>
        <div class="sin-section-hint">No need to name an algorithm or pattern — just what you notice about it.</div>
        <textarea id="sin-text" class="sin-textarea" rows="8"
                  placeholder="e.g. I think we need to find the smallest way to connect everything without going in a circle...">${_escape(_interpretation)}</textarea>
        <div class="sin-btn-row">
          <button class="sin-scan-btn" id="sin-scan-btn">Also check for structural signals (optional)</button>
          ${llmReady
            ? `<button class="sin-scan-btn" id="sin-calibrate-btn">Quick gut-check (optional, uses your configured AI)</button>`
            : `<span class="sin-llm-off-note">Gut-check available once an AI backend is set up in ⚙ Settings</span>`}
        </div>
        <div id="sin-calibration-region"></div>
      </section>

      <section class="sin-section" id="sin-results" style="${_suggestion ? '' : 'display:none'}"></section>
    `;

    wrapper.querySelector('#sin-scan-btn').addEventListener('click', () => _onScan(wrapper));
    wrapper.querySelector('#sin-calibrate-btn')?.addEventListener('click', () => _onCalibrate(wrapper));
    wrapper.querySelector('#sin-text').addEventListener('input', (e) => {
      _interpretation = e.target.value;
      State.setAnswer('intake', { interpretation: _interpretation });
    });

    if (_suggestion) _renderResults(wrapper);
    _renderCalibration(wrapper);

    return wrapper;
  }

  // ─── PHASE 4.6 — CONFIDENCE CALIBRATION (optional live call) ───────────────

  async function _onCalibrate(wrapper) {
    if (!_interpretation.trim() || _calibrating) return;
    _calibrating = true;
    _renderCalibration(wrapper);

    const result = await LLMClient.complete({
      system: [
        'You are calibrating a confidence signal for a DSA problem-solving tool.',
        'The user typed their own first interpretation of a problem, in their own words.',
        'Judge only how clearly-scoped and structurally grounded their interpretation is.',
        '',
        'HARD RULE: never state, name, or hint at any specific algorithm, data structure, or',
        'technique (e.g. never say "binary search", "DP", "dynamic programming", "graph",',
        '"greedy", "BFS", "DFS", "two pointer", etc.) — not even to confirm or deny one.',
        'Comment only on clarity and scope.',
        '',
        'Respond in EXACTLY this format and nothing else:',
        'CONFIDENCE: <low|medium|high>',
        'NOTE: <at most one short sentence — a clarifying question or a brief observation',
        'about their clarity, no algorithm names, or leave blank>',
      ].join('\n'),
      prompt: `Here is the user's interpretation:\n\n${_interpretation}`,
      tier: 'cheap',
      maxTokens: 100,
    });

    _calibrating = false;

    if (!result.ok) {
      // Required fallback — never block, never surface the raw error as if
      // it were a verdict. Medium is the safe, non-committal default.
      _calibration = { level: 'medium', note: '', fellBack: true };
    } else if (LLMClient.containsPatternNameLeak(result.text)) {
      // Enforcement of the hard rule, not just a prompt request — discard
      // and fall back exactly as if the call had failed.
      _calibration = { level: 'medium', note: '', fellBack: true };
    } else {
      const parsed = _parseCalibration(result.text);
      _calibration = parsed ?? { level: 'medium', note: '', fellBack: true };
    }

    State.setAnswer('intake', { calibration: _calibration });
    _renderCalibration(wrapper);
  }

  function _parseCalibration(text) {
    const confMatch = /CONFIDENCE:\s*(low|medium|high)/i.exec(text ?? '');
    if (!confMatch) return null;
    const noteMatch = /NOTE:\s*(.+)/i.exec(text ?? '');
    return { level: confMatch[1].toLowerCase(), note: (noteMatch?.[1] ?? '').trim() };
  }

  function _renderCalibration(wrapper) {
    const region = wrapper.querySelector('#sin-calibration-region');
    if (!region) return;

    if (_calibrating) {
      region.innerHTML = `<div class="sin-calibration sin-calibration--pending">Reading what you wrote…</div>`;
      return;
    }
    if (!_calibration) {
      region.innerHTML = '';
      return;
    }

    const label = { low: 'Low', medium: 'Medium', high: 'High' }[_calibration.level] ?? 'Medium';
    region.innerHTML = `
      <div class="sin-calibration sin-calibration--${_calibration.level}">
        <span class="sin-calibration-badge">Gut-check: ${label}</span>
        ${_calibration.note ? `<span class="sin-calibration-note">${_escape(_calibration.note)}</span>` : ''}
        ${_calibration.fellBack ? `<span class="sin-calibration-fallback">(live check unavailable — defaulted, this doesn't affect your score)</span>` : ''}
      </div>
    `;
  }

  function _onScan(wrapper) {
    if (!_interpretation.trim()) return;
    const KC = typeof KeywordCrosscheck !== 'undefined' ? KeywordCrosscheck : null;
    _suggestion = KC?.suggestAll?.(_interpretation) ?? { inputTypes: [], outputForm: null, queryType: { queryType: 'none', matchedKeywords: [] } };

    State.setAnswer('intake', { interpretation: _interpretation, lastSuggestion: _suggestion });

    const results = wrapper.querySelector('#sin-results');
    if (results) results.style.display = '';
    _renderResults(wrapper);
  }

  function _renderResults(wrapper) {
    const results = wrapper.querySelector('#sin-results');
    if (!results || !_suggestion) return;

    const hasAny = _suggestion.inputTypes.length || _suggestion.outputForm || (_suggestion.queryType?.matchedKeywords?.length ?? 0) > 0;

    if (!hasAny) {
      results.innerHTML = `<div class="sin-empty">No clear signals found — no problem, just answer Stage 1 and 2 directly.</div>`;
      return;
    }

    results.innerHTML = `
      <div class="sin-section-title">Suggested — auto-suggested, confirm or change on the next stages</div>
      <div class="sin-sug-group">
        <div class="sin-sug-label">Input type${_suggestion.inputTypes.length > 1 ? 's' : ''}</div>
        <div class="sin-sug-chips">
          ${_suggestion.inputTypes.length
            ? _suggestion.inputTypes.map(s => `<span class="sin-chip">${INPUT_TYPE_LABELS[s.inputType] ?? s.inputType}<span class="sin-chip-why">"${s.matchedKeywords[0]}"</span></span>`).join('')
            : '<span class="sin-chip sin-chip--none">No match</span>'}
        </div>
      </div>
      <div class="sin-sug-group">
        <div class="sin-sug-label">Output form</div>
        <div class="sin-sug-chips">
          ${_suggestion.outputForm
            ? `<span class="sin-chip">${OUTPUT_FORM_LABELS[_suggestion.outputForm.outputForm] ?? _suggestion.outputForm.outputForm}<span class="sin-chip-why">"${_suggestion.outputForm.matchedKeywords[0]}"</span></span>`
            : '<span class="sin-chip sin-chip--none">No match</span>'}
        </div>
      </div>
      <div class="sin-sug-group">
        <div class="sin-sug-label">Query type</div>
        <div class="sin-sug-chips">
          <span class="sin-chip">${QUERY_TYPE_LABELS[_suggestion.queryType.queryType] ?? _suggestion.queryType.queryType}${_suggestion.queryType.matchedKeywords.length ? `<span class="sin-chip-why">"${_suggestion.queryType.matchedKeywords[0]}"</span>` : ''}</span>
        </div>
      </div>
      <button class="sin-apply-btn" id="sin-apply-btn">Apply to Stage 1 &amp; 2 →</button>
      <div class="sin-applied-note ${_suggestion.applied ? '' : 'sin-hidden'}" id="sin-applied-note">✓ Applied — marked as auto-suggested on Stage 1 and Stage 2</div>
    `;

    results.querySelector('#sin-apply-btn')?.addEventListener('click', () => _onApply(wrapper));
  }

  function _onApply(wrapper) {
    if (!_suggestion) return;

    const inputTypes = _suggestion.inputTypes.map(s => s.inputType);
    const outputForm = _suggestion.outputForm?.outputForm ?? null;
    const queryType  = _suggestion.queryType?.queryType ?? 'none';

    // Dispatching stage-complete for stage1/stage2 here (when their own
    // gate is actually satisfied) matters — State.isStageComplete gates
    // Engine's navigate-next independent of whether the Next button looks
    // enabled, and writing these answers directly (bypassing stage1/2's
    // own _onChange) would otherwise never mark them complete, silently
    // blocking Next once the user lands there.
    if (inputTypes.length) {
      State.setAnswer('stage1', {
        inputTypes,
        queryType,
        autoSuggested: true,
      });
      const s1Answered = (inputTypes.length > 0 ? 1 : 0) + (queryType !== null ? 1 : 0);
      const s1Gate = typeof GateStandard !== 'undefined'
        ? GateStandard.evaluate(s1Answered, 2)
        : { valid: s1Answered === 2 };
      if (s1Gate.valid) {
        document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
          detail: { stageId: 'stage1', answers: State.getAnswer('stage1') },
        }));
      }
    }
    if (outputForm) {
      State.setAnswer('stage2', {
        outputForm,
        autoSuggested: true,
      });
      const s2 = State.getAnswer('stage2') ?? {};
      const s2Answered = [s2.outputForm, s2.optimizationType, s2.solutionDepth].filter(Boolean).length;
      const s2Gate = typeof GateStandard !== 'undefined'
        ? GateStandard.evaluate(s2Answered, 3)
        : { valid: s2Answered === 3 };
      if (s2Gate.valid) {
        document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
          detail: { stageId: 'stage2', answers: s2 },
        }));
      }
    }

    _suggestion = { ..._suggestion, applied: true };
    State.setAnswer('intake', { lastSuggestion: _suggestion });

    const note = wrapper.querySelector('#sin-applied-note');
    if (note) note.classList.remove('sin-hidden');
  }

  function _escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function onMount(state) {
    // Always optional — never blocks progress. Still needs to dispatch
    // stage-complete so State.markStageComplete runs — Engine's own
    // navigate-next guard checks State.isStageComplete regardless of
    // whether the Next button looks enabled.
    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    if (typeof GateStandard !== 'undefined') {
      GateStandard.report('intake', GateStandard.evaluate(1, 1));
    }
    if (!state.stagesCompleted?.includes('intake')) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: { stageId: 'intake', answers: state.answers?.intake ?? {} },
      }));
    }
  }

  function cleanup() {
    _state          = null;
    _interpretation = '';
    _suggestion     = null;
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('sin-styles')) return;
    const style = document.createElement('style');
    style.id = 'sin-styles';
    style.textContent = `
    .sin-shell {
      --sin-bg: var(--void); --sin-surface: var(--surface-0); --sin-border: rgba(232,223,200,.10); --sin-border2: rgba(232,223,200,.16);
      --sin-ink: var(--text-primary); --sin-ink2: var(--text-secondary); --sin-muted: var(--text-muted); --sin-accent: #e8b93f;
      --sin-accent-bg: rgba(232,185,63,.14); --sin-accent-b: rgba(232,185,63,.35);
      display: flex; flex-direction: column; gap: 26px; max-width: 720px; margin: 0 auto;
      padding: 32px 28px 60px; background: var(--sin-bg); min-height: 100%;
      font-family: 'DM Sans', system-ui, sans-serif; color: var(--sin-ink);
    }
    .sin-rule {
      font-family: 'Space Mono', monospace; font-size: .95rem; color: var(--sin-muted); line-height: 1.6;
      padding: 10px 16px; background: var(--sin-surface); border: 1px solid var(--sin-border);
      border-left: 3px solid var(--sin-accent); border-radius: 0 8px 8px 0;
    }
    .sin-section { display: flex; flex-direction: column; gap: 10px; }
    .sin-section-title { font-size: .98rem; font-weight: 700; color: var(--sin-ink); line-height: 1.5; }
    .sin-section-hint  { font-size: .9rem; color: var(--sin-muted); margin-top: -6px; line-height: 1.5; }
    .sin-textarea {
      width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--sin-border2);
      background: var(--sin-surface); font-family: 'DM Sans', sans-serif; font-size: 1rem; color: var(--sin-ink);
      resize: vertical; line-height: 1.5;
    }
    .sin-textarea:focus { outline: none; border-color: var(--sin-accent-b); }
    .sin-scan-btn {
      align-self: flex-start; padding: 9px 18px; border-radius: 8px; border: none;
      background: var(--sin-accent); color: #fff; font-size: .82rem; font-weight: 600; cursor: pointer;
    }
    .sin-scan-btn:hover { background: #c99a2e; }
    .sin-btn-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .sin-llm-off-note { font-size: .9rem; color: var(--sin-muted); font-style: italic; line-height: 1.5; }
    .sin-calibration {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      padding: 9px 12px; border-radius: 8px; font-size: .9rem; border: 1px solid var(--sin-border2);
    }
    .sin-calibration--pending { color: var(--sin-muted); font-style: italic; background: var(--sin-surface); }
    .sin-calibration--low    { background: rgba(224,100,90,.10);  border-color: rgba(224,100,90,.3); }
    .sin-calibration--medium { background: var(--sin-accent-bg); border-color: var(--sin-accent-b); }
    .sin-calibration--high   { background: rgba(92,201,138,.10); border-color: rgba(92,201,138,.3); }
    .sin-calibration-badge   { font-weight: 700; }
    .sin-calibration-note    { color: var(--sin-ink2); }
    .sin-calibration-fallback{ color: var(--sin-muted); font-size: .88rem; }
    .sin-empty { font-size: .9rem; color: var(--sin-muted); font-style: italic; padding: 10px 0; }
    .sin-sug-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
    .sin-sug-label { font-family: 'Space Mono', monospace; font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; color: var(--sin-muted); }
    .sin-sug-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .sin-chip {
      display: flex; align-items: baseline; gap: 6px; padding: 6px 12px; border-radius: 20px;
      background: var(--sin-accent-bg); border: 1.5px solid var(--sin-accent-b); font-size: .8rem; color: var(--sin-accent);
      font-weight: 600;
    }
    .sin-chip--none { background: var(--sin-surface); border-color: var(--sin-border2); color: var(--sin-muted); font-weight: 400; }
    .sin-chip-why { font-family: 'Space Mono', monospace; font-size: .64rem; color: var(--sin-muted); font-weight: 400; }
    .sin-apply-btn {
      align-self: flex-start; margin-top: 6px; padding: 9px 18px; border-radius: 8px;
      border: 1.5px solid var(--sin-accent-b); background: var(--sin-surface); color: var(--sin-accent);
      font-size: .82rem; font-weight: 600; cursor: pointer;
    }
    .sin-apply-btn:hover { background: var(--sin-accent-bg); }
    .sin-applied-note { font-size: .9rem; color: #5cc98a; margin-top: 4px; }
    .sin-hidden { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = StageIntake;
