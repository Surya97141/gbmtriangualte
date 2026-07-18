// stages/entry/entry.js
// Entry point — the very first thing a new session sees. Chooses between
// the full structural walkthrough and the fast path (skip straight to
// Verification + Edge Cases when the direction is already known).
// Module contract: render(state), onMount(state), cleanup()

const StageEntry = (() => {

  let _state    = null;
  let _selected = null; // 'full' | 'fast'

  // Phase 1.6 — a distinctly softer first screen for someone who has never
  // finished a session here before and has marked themselves a beginner in
  // settings. Reuses Preferences.getSkillLevel() (the same beginner check
  // already gating Stage 3 and Stage 6.5's soft framing) rather than a new
  // separate flag, and Outcomes' recorded-session count as the "first ever"
  // signal — both already exist for other purposes, so this doesn't add a
  // new mechanism, just a new place that reads them.
  function _isFirstTimeBeginner(state) {
    const isBeginner = typeof Preferences !== 'undefined' && Preferences.getSkillLevel() === 'beginner';
    const neverFinishedBefore = typeof Outcomes === 'undefined' || Outcomes.getAll().length === 0;
    const alreadyPastEntry = !!state.answers?.entry?.path;
    const dismissed = !!state.answers?.entry?.dismissedGentleOnboarding;
    return isBeginner && neverFinishedBefore && !alreadyPastEntry && !dismissed;
  }

  function render(state) {
    _state    = state;
    _selected = state.answers?.entry?.path ?? null;

    if (_isFirstTimeBeginner(state)) {
      return _renderGentleOnboarding(state);
    }

    // Contest Mode defaults to the fast path — still overridable by picking
    // "Full walkthrough" below before advancing.
    const contestDefault = !_selected &&
      typeof Preferences !== 'undefined' && Preferences.getMode() === 'contest';

    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 'se-shell';
    wrapper.innerHTML = `
      <div class="se-intro">
        <div class="se-eyebrow">Before you start</div>
        <div class="se-title">How do you want to work through this problem?</div>
        <div class="se-sub">You can't switch this mid-problem — pick based on how much you already know.</div>
      </div>

      <div class="se-options">
        <div class="se-card" data-path="full" id="se-card-full">
          <div class="se-card-check">✓</div>
          <div class="se-card-label">Full walkthrough</div>
          <div class="se-card-desc">All 13 stages — complexity budget through structural properties, verification, and edge cases. Use this when the problem doesn't obviously fit a pattern yet.</div>
          <div class="se-card-meta">~13 stages</div>
        </div>

        <div class="se-card" data-path="fast" id="se-card-fast">
          <div class="se-card-check">✓</div>
          <div class="se-card-label">I already know the direction</div>
          <div class="se-card-desc">Confirm input type and the approach you're leaning toward, then jump straight to Verification and Edge Cases.</div>
          <div class="se-card-meta">6 stages</div>
        </div>
      </div>
    `;

    wrapper.querySelectorAll('.se-card').forEach(card => {
      card.addEventListener('click', () => _onSelect(card.dataset.path, wrapper));
    });

    if (contestDefault) {
      _onSelect('fast', wrapper);
    } else if (_selected) {
      wrapper.querySelectorAll('.se-card').forEach(c =>
        c.classList.toggle('se-card--on', c.dataset.path === _selected)
      );
    }

    return wrapper;
  }

  // ─── GENTLE ONBOARDING (Phase 1.6) ──────────────────────────────────────────

  function _renderGentleOnboarding(state) {
    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 'se-shell se-shell--gentle';
    wrapper.innerHTML = `
      <div class="se-intro">
        <div class="se-eyebrow">Your first problem here</div>
        <div class="se-title">You don't need to get this right. You need to try.</div>
        <div class="se-sub">
          This walkthrough asks a lot of questions on purpose — that's not a test, it's how the
          reasoning gets built up one honest piece at a time. Guessing "unsure" is completely fine;
          it's more useful than a confident guess. We'll go through the first few stages together,
          slower than usual.
        </div>
      </div>

      <div class="se-gentle-problem" id="se-gentle-problem">
        <div class="se-gentle-problem-loading">Picking a first problem to work through…</div>
      </div>

      <div class="se-gentle-actions">
        <button class="se-gentle-start-btn" id="se-gentle-start-btn">Start here, one step at a time →</button>
        <button class="se-gentle-skip-btn" id="se-gentle-skip-btn">I'd rather pick my own problem</button>
      </div>
    `;

    let onboardingProblem = state.answers?.entry?.onboardingProblem ?? null;

    const fillProblem = (problem) => {
      onboardingProblem = problem;
      const region = wrapper.querySelector('#se-gentle-problem');
      if (!region) return;
      if (!problem) {
        region.innerHTML = `<div class="se-gentle-problem-loading">No seed problem found — that's fine, just work through whatever you brought with you.</div>`;
        return;
      }
      region.innerHTML = `
        <div class="se-gentle-problem-label">A good first one to try</div>
        <div class="se-gentle-problem-title">${problem.title}</div>
        <div class="se-gentle-problem-statement">${problem.statement}</div>
      `;
    };

    if (onboardingProblem) {
      fillProblem(onboardingProblem);
    } else if (typeof ProblemLibrary !== 'undefined') {
      ProblemLibrary.getAll()
        .then(all => fillProblem((all ?? []).find(p => p.difficulty === 'easy') ?? null))
        .catch(() => fillProblem(null));
    } else {
      fillProblem(null);
    }

    wrapper.querySelector('#se-gentle-start-btn')?.addEventListener('click', () => {
      State.setAnswer('entry', { path: 'full', onboardingProblem });
      if (typeof GateStandard !== 'undefined') {
        GateStandard.report('entry', GateStandard.evaluate(1, 1));
      }
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: { stageId: 'entry', answers: { path: 'full', onboardingProblem } },
      }));
    });

    wrapper.querySelector('#se-gentle-skip-btn')?.addEventListener('click', () => {
      State.setAnswer('entry', { dismissedGentleOnboarding: true });
      // dsa:jump-to re-renders 'entry' from scratch; _isFirstTimeBeginner
      // now reads dismissedGentleOnboarding=true and falls through to the
      // normal two-card chooser below.
      document.dispatchEvent(new CustomEvent('dsa:jump-to', { detail: { stageId: 'entry' } }));
    });

    return wrapper;
  }

  function _onSelect(path, wrapper) {
    _selected = path;

    wrapper.querySelectorAll('.se-card').forEach(c =>
      c.classList.toggle('se-card--on', c.dataset.path === path)
    );

    State.setAnswer('entry', { path });

    if (typeof GateStandard !== 'undefined') {
      GateStandard.report('entry', GateStandard.evaluate(1, 1));
    }
    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);

    document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
      detail: { stageId: 'entry', answers: { path } },
    }));
  }

  function onMount(state) {
    const hasPath = !!state.answers?.entry?.path;
    if (typeof GateStandard !== 'undefined') {
      GateStandard.report('entry', GateStandard.evaluate(hasPath ? 1 : 0, 1));
    }
    if (hasPath && typeof Renderer !== 'undefined') {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state    = null;
    _selected = null;
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('se-styles')) return;
    const style = document.createElement('style');
    style.id = 'se-styles';
    style.textContent = `
    .se-shell {
      --se-bg: #111d17; --se-surface: #1e3229; --se-border: rgba(232,223,200,.10); --se-border2: rgba(232,223,200,.16);
      --se-ink: #ede4cf; --se-ink2: #c4b89c; --se-muted: #7d8f80; --se-accent: #e8b93f;
      --se-accent-bg: rgba(232,185,63,.14); --se-accent-b: rgba(232,185,63,.35);
      display: flex; flex-direction: column; gap: 32px; max-width: 760px; margin: 0 auto;
      padding: 60px 28px; background: var(--se-bg); min-height: 100%;
      font-family: 'DM Sans', system-ui, sans-serif; color: var(--se-ink);
    }
    .se-eyebrow { font-family: 'Space Mono', monospace; font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; color: var(--se-muted); }
    .se-title { font-family: 'Cinzel', 'DM Sans', serif; font-size: 1.5rem; font-weight: 700; margin-top: 6px; line-height: 1.3; }
    .se-sub { font-size: .84rem; color: var(--se-muted); margin-top: 8px; }
    .se-options { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .se-options { grid-template-columns: 1fr; } }
    .se-card {
      position: relative; background: var(--se-surface); border: 1.5px solid var(--se-border);
      border-radius: 14px; padding: 22px 22px 18px; cursor: pointer;
      transition: border-color .15s, box-shadow .15s, transform .1s;
    }
    .se-card:hover { border-color: var(--se-accent-b); transform: translateY(-1px); }
    .se-card--on   { border-color: var(--se-accent); background: var(--se-accent-bg); box-shadow: 0 0 0 3px rgba(232,185,63,.08); }
    .se-card-label { font-size: 1.02rem; font-weight: 700; margin-bottom: 8px; }
    .se-card-desc  { font-size: .82rem; color: var(--se-ink2); line-height: 1.55; }
    .se-card-meta  { margin-top: 14px; font-family: 'Space Mono', monospace; font-size: .64rem; color: var(--se-muted); letter-spacing: .04em; }
    .se-card-check {
      position: absolute; top: 14px; right: 14px; width: 20px; height: 20px; border-radius: 50%;
      background: var(--se-accent); color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: .65rem; font-weight: 700; opacity: 0; transform: scale(.6); transition: opacity .15s, transform .15s;
    }
    .se-card--on .se-card-check { opacity: 1; transform: scale(1); }

    .se-gentle-problem {
      background: var(--se-surface); border: 1.5px dashed var(--se-border2); border-radius: 12px;
      padding: 20px 22px;
    }
    .se-gentle-problem-loading  { font-size: .82rem; color: var(--se-muted); font-style: italic; }
    .se-gentle-problem-label   { font-family: 'Space Mono', monospace; font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; color: var(--se-muted); margin-bottom: 6px; }
    .se-gentle-problem-title    { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
    .se-gentle-problem-statement{ font-size: .84rem; color: var(--se-ink2); line-height: 1.6; }
    .se-gentle-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
    .se-gentle-start-btn {
      padding: 12px 22px; border-radius: 10px; border: none; background: var(--se-accent);
      color: #fff; font-size: .88rem; font-weight: 700; cursor: pointer;
    }
    .se-gentle-start-btn:hover { background: #c99a2e; }
    .se-gentle-skip-btn {
      padding: 4px 0; border: none; background: none; color: var(--se-muted);
      font-size: .76rem; text-decoration: underline; cursor: pointer;
    }
    .se-gentle-skip-btn:hover { color: var(--se-ink2); }
    `;
    document.head.appendChild(style);
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = StageEntry;
