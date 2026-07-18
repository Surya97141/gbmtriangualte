// core/outcome-prompt.js
// "Did this solve the problem?" — shown after Stage 8 completes, or when a
// session with a committed direction is exited (Reset). Records the result
// via Outcomes, tied to Stage 3's structural properties, Stage 6.5's
// confidence, and Stage 7's chosen direction — so it can feed the
// aggregation view and Recovery Mode hints later.

const OutcomePrompt = (() => {

  const OPTIONS = [
    { id: 'passed',     label: 'Passed',              sublabel: 'It worked — correct and fast enough',      color: 'green'  },
    { id: 'wa',         label: 'Wrong Answer',         sublabel: 'Ran, but the output was incorrect',        color: 'red'    },
    { id: 'tle',        label: 'Time Limit Exceeded',  sublabel: 'Correct logic, too slow',                  color: 'amber'  },
    { id: 'unfinished', label: "Didn't finish",        sublabel: 'Abandoned or ran out of time to try it',   color: 'muted'  },
  ];

  // Only worth asking if the session actually reached a committed
  // direction — resetting from Stage 0 or 1 has nothing meaningful to record.
  function _isEligible(state) {
    return !!state?.answers?.stage7?.selectedDirection;
  }

  // show(onDone) — onDone() is called exactly once, whether the user
  // answered or dismissed. Never blocks the underlying action longer than
  // a click.
  function show(onDone) {
    const state = typeof State !== 'undefined' ? State.get() : null;
    if (!state || !_isEligible(state)) { onDone(); return; }

    _injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'op-overlay';

    const modal = document.createElement('div');
    modal.className = 'op-modal';
    modal.innerHTML = `
      <div class="op-title">Did this solve the problem?</div>
      <div class="op-sub">Quick — this only feeds your own confidence-vs-outcome tracking.</div>
      <div class="op-options" id="op-options"></div>
      <button class="op-skip" id="op-skip">Skip</button>
    `;

    const optionsEl = modal.querySelector('#op-options');
    OPTIONS.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `op-option op-option--${opt.color}`;
      btn.innerHTML = `
        <span class="op-option-label">${opt.label}</span>
        <span class="op-option-sub">${opt.sublabel}</span>
      `;
      btn.addEventListener('click', () => {
        if (typeof Outcomes !== 'undefined') Outcomes.record(opt.id, state);
        overlay.remove();
        onDone();
      });
      optionsEl.appendChild(btn);
    });

    modal.querySelector('#op-skip').addEventListener('click', () => {
      overlay.remove();
      onDone();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.remove(); onDone(); }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function _injectStyles() {
    if (document.getElementById('op-styles')) return;
    const style = document.createElement('style');
    style.id = 'op-styles';
    style.textContent = `
    .op-overlay {
      position: fixed; inset: 0; z-index: 9600; background: rgba(6,10,8,.58);
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .op-modal {
      --op-bg: var(--surface-0); --op-ink: var(--text-primary); --op-muted: var(--text-muted); --op-border: rgba(232,223,200,.18);
      width: 100%; max-width: 420px; background: var(--op-bg); border-radius: 14px;
      padding: 22px 22px 18px; box-shadow: 0 20px 50px rgba(0,0,0,.25);
      font-family: 'DM Sans', system-ui, sans-serif; color: var(--op-ink);
      display: flex; flex-direction: column; gap: 14px;
    }
    .op-title { font-size: 1.05rem; font-weight: 700; }
    .op-sub { font-size: .76rem; color: var(--op-muted); margin-top: -8px; }
    .op-options { display: flex; flex-direction: column; gap: 8px; }
    .op-option {
      display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
      padding: 10px 14px; border-radius: 9px; border: 1.5px solid var(--op-border);
      background: var(--surface-1); cursor: pointer; text-align: left;
      transition: border-color .15s, background .15s;
    }
    .op-option:hover { border-color: rgba(232,185,63,.4); background: rgba(232,185,63,.10); }
    .op-option-label { font-size: .86rem; font-weight: 600; }
    .op-option-sub { font-size: .72rem; color: var(--op-muted); }
    .op-option--green .op-option-label  { color: #5cc98a; }
    .op-option--red .op-option-label    { color: #e05a5a; }
    .op-option--amber .op-option-label  { color: #e8944a; }
    .op-option--muted .op-option-label  { color: var(--text-muted); }
    .op-skip {
      align-self: center; margin-top: 2px; background: none; border: none; cursor: pointer;
      font-size: .74rem; color: var(--op-muted); text-decoration: underline;
    }
    `;
    document.head.appendChild(style);
  }

  return { show };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = OutcomePrompt;
