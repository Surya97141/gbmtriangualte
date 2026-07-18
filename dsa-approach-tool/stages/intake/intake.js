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
// Phase 4.6 (not built yet — no LLM integration exists anywhere in this
// codebase, and wiring one is a provider/cost/security decision beyond this
// pass) would read `interpretation` here to calibrate a confidence signal.
// Until that exists, no confidence signal is fabricated — the roadmap's own
// "required fallback" for that call failing/timing out is to default to
// Medium confidence (Full Walkthrough) anyway, which is simply what happens
// today by not skipping any stage on the strength of unverified text.
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

  function render(state) {
    _state = state;
    const saved = state.answers?.intake ?? {};
    _interpretation = saved.interpretation ?? '';
    _suggestion     = saved.lastSuggestion ?? null;

    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 'sin-shell';
    wrapper.innerHTML = `
      <div class="sin-rule">
        Before anything else — what do you actually think, before any stage tells you?
        Nothing here is required or graded; skip straight to Stage 1 if you'd rather answer directly.
      </div>

      <section class="sin-section">
        <div class="sin-section-title">What do you think this problem is about? Type it in your own words.</div>
        <div class="sin-section-hint">No need to name an algorithm or pattern — just what you notice about it.</div>
        <textarea id="sin-text" class="sin-textarea" rows="8"
                  placeholder="e.g. I think we need to find the smallest way to connect everything without going in a circle...">${_escape(_interpretation)}</textarea>
        <button class="sin-scan-btn" id="sin-scan-btn">Also check for structural signals (optional)</button>
      </section>

      <section class="sin-section" id="sin-results" style="${_suggestion ? '' : 'display:none'}"></section>
    `;

    wrapper.querySelector('#sin-scan-btn').addEventListener('click', () => _onScan(wrapper));
    wrapper.querySelector('#sin-text').addEventListener('input', (e) => {
      _interpretation = e.target.value;
      State.setAnswer('intake', { interpretation: _interpretation });
    });

    if (_suggestion) _renderResults(wrapper);

    return wrapper;
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
      --sin-bg: #111d17; --sin-surface: #1e3229; --sin-border: rgba(232,223,200,.10); --sin-border2: rgba(232,223,200,.16);
      --sin-ink: #ede4cf; --sin-ink2: #c4b89c; --sin-muted: #7d8f80; --sin-accent: #e8b93f;
      --sin-accent-bg: rgba(232,185,63,.14); --sin-accent-b: rgba(232,185,63,.35);
      display: flex; flex-direction: column; gap: 26px; max-width: 720px; margin: 0 auto;
      padding: 32px 28px 60px; background: var(--sin-bg); min-height: 100%;
      font-family: 'DM Sans', system-ui, sans-serif; color: var(--sin-ink);
    }
    .sin-rule {
      font-family: 'Space Mono', monospace; font-size: .72rem; color: var(--sin-muted); line-height: 1.6;
      padding: 10px 16px; background: var(--sin-surface); border: 1px solid var(--sin-border);
      border-left: 3px solid var(--sin-accent); border-radius: 0 8px 8px 0;
    }
    .sin-section { display: flex; flex-direction: column; gap: 10px; }
    .sin-section-title { font-size: .82rem; font-weight: 700; color: var(--sin-ink); }
    .sin-section-hint  { font-size: .74rem; color: var(--sin-muted); margin-top: -6px; }
    .sin-textarea {
      width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--sin-border2);
      background: var(--sin-surface); font-family: 'DM Sans', sans-serif; font-size: .84rem; color: var(--sin-ink);
      resize: vertical; line-height: 1.5;
    }
    .sin-textarea:focus { outline: none; border-color: var(--sin-accent-b); }
    .sin-scan-btn {
      align-self: flex-start; padding: 9px 18px; border-radius: 8px; border: none;
      background: var(--sin-accent); color: #fff; font-size: .82rem; font-weight: 600; cursor: pointer;
    }
    .sin-scan-btn:hover { background: #c99a2e; }
    .sin-empty { font-size: .82rem; color: var(--sin-muted); font-style: italic; padding: 10px 0; }
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
    .sin-applied-note { font-size: .76rem; color: #5cc98a; margin-top: 4px; }
    .sin-hidden { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = StageIntake;
