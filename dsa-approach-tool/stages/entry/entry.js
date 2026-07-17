// stages/entry/entry.js
// Entry point — the very first thing a new session sees. Chooses between
// the full structural walkthrough and the fast path (skip straight to
// Verification + Edge Cases when the direction is already known).
// Module contract: render(state), onMount(state), cleanup()

const StageEntry = (() => {

  let _state    = null;
  let _selected = null; // 'full' | 'fast'

  function render(state) {
    _state    = state;
    _selected = state.answers?.entry?.path ?? null;

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
          <div class="se-card-desc">Confirm input type, output type, and the approach you're leaning toward, then jump straight to Verification and Edge Cases.</div>
          <div class="se-card-meta">3 stages</div>
        </div>
      </div>
    `;

    wrapper.querySelectorAll('.se-card').forEach(card => {
      card.addEventListener('click', () => _onSelect(card.dataset.path, wrapper));
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
      --se-bg: #f7f4ef; --se-surface: #ffffff; --se-border: rgba(0,0,0,.1); --se-border2: rgba(0,0,0,.18);
      --se-ink: #1a1a2e; --se-ink2: #4a4560; --se-muted: #8a8070; --se-accent: #2563eb;
      --se-accent-bg: rgba(37,99,235,.06); --se-accent-b: rgba(37,99,235,.28);
      display: flex; flex-direction: column; gap: 32px; max-width: 760px; margin: 0 auto;
      padding: 60px 28px; background: var(--se-bg); min-height: 100%;
      font-family: 'DM Sans', system-ui, sans-serif; color: var(--se-ink);
    }
    .se-eyebrow { font-family: 'Space Mono', monospace; font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; color: var(--se-muted); }
    .se-title { font-size: 1.5rem; font-weight: 700; margin-top: 6px; line-height: 1.3; }
    .se-sub { font-size: .84rem; color: var(--se-muted); margin-top: 8px; }
    .se-options { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .se-options { grid-template-columns: 1fr; } }
    .se-card {
      position: relative; background: var(--se-surface); border: 1.5px solid var(--se-border);
      border-radius: 14px; padding: 22px 22px 18px; cursor: pointer;
      transition: border-color .15s, box-shadow .15s, transform .1s;
    }
    .se-card:hover { border-color: var(--se-accent-b); transform: translateY(-1px); }
    .se-card--on   { border-color: var(--se-accent); background: var(--se-accent-bg); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
    .se-card-label { font-size: 1.02rem; font-weight: 700; margin-bottom: 8px; }
    .se-card-desc  { font-size: .82rem; color: var(--se-ink2); line-height: 1.55; }
    .se-card-meta  { margin-top: 14px; font-family: 'Space Mono', monospace; font-size: .64rem; color: var(--se-muted); letter-spacing: .04em; }
    .se-card-check {
      position: absolute; top: 14px; right: 14px; width: 20px; height: 20px; border-radius: 50%;
      background: var(--se-accent); color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: .65rem; font-weight: 700; opacity: 0; transform: scale(.6); transition: opacity .15s, transform .15s;
    }
    .se-card--on .se-card-check { opacity: 1; transform: scale(1); }
    `;
    document.head.appendChild(style);
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = StageEntry;
