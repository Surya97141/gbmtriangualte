// core/settings-panel.js
// Phase 4.0 — real settings screen for the optional LLM-assisted layer.
// Personal-use scope: a hosted-API-key field or a local-endpoint field,
// stored via Preferences (localStorage). Same modal pattern as
// guide-panel.js / insights-panel.js.
// Module contract: show(), hide()

const SettingsPanel = (() => {

  function show() {
    if (document.getElementById('sp-overlay')) return;

    _injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'sp-overlay';
    overlay.id = 'sp-overlay';

    const panel = document.createElement('div');
    panel.className = 'sp-panel';

    const header = document.createElement('div');
    header.className = 'sp-header';
    header.innerHTML = `
      <div>
        <div class="sp-eyebrow">Settings</div>
        <div class="sp-title">Optional LLM-assisted features</div>
      </div>
      <button class="sp-close" aria-label="Close settings">✕</button>
    `;

    const body = document.createElement('div');
    body.className = 'sp-body';
    body.appendChild(_buildBody());

    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const close = () => hide();
    header.querySelector('.sp-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', _onKeydown);

    requestAnimationFrame(() => overlay.classList.add('sp-overlay--in'));
  }

  function _onKeydown(e) {
    if (e.key === 'Escape') hide();
  }

  function hide() {
    const overlay = document.getElementById('sp-overlay');
    if (!overlay) return;
    document.removeEventListener('keydown', _onKeydown);
    overlay.classList.remove('sp-overlay--in');
    setTimeout(() => overlay.remove(), 160);
  }

  // ─── BODY ──────────────────────────────────────────────────────────────

  function _buildBody() {
    const wrap = document.createElement('div');
    wrap.className = 'sp-main';

    wrap.innerHTML = `
      <div class="sp-intro">
        Everything in this tool works without any of this — Truths First, structural analysis,
        verification, and confidence scoring are all local and free. Turning this on adds two
        small live checks: a gut-check on your Intake interpretation, and a generated end-of-session
        reflection. Nothing here ever states a pattern or algorithm name back to you — it only
        confirms or gently questions what you've already worked out yourself.
      </div>

      <div class="sp-section">
        <div class="sp-section-title">Backend</div>
        <div class="sp-backend-options" id="sp-backend-options">
          <label class="sp-backend-opt">
            <input type="radio" name="sp-backend" value="off">
            <div class="sp-backend-opt-label">Off</div>
            <div class="sp-backend-opt-desc">No live calls. Everything stays local.</div>
          </label>
          <label class="sp-backend-opt">
            <input type="radio" name="sp-backend" value="hosted">
            <div class="sp-backend-opt-label">Hosted API</div>
            <div class="sp-backend-opt-desc">Anthropic API — your key, called directly from this browser.</div>
          </label>
          <label class="sp-backend-opt">
            <input type="radio" name="sp-backend" value="local">
            <div class="sp-backend-opt-label">Local model</div>
            <div class="sp-backend-opt-desc">Any OpenAI-compatible endpoint (Ollama, LM Studio, llama.cpp).</div>
          </label>
        </div>
      </div>

      <div class="sp-section" id="sp-hosted-section" style="display:none">
        <div class="sp-section-title">Anthropic API key</div>
        <input type="password" class="sp-input" id="sp-api-key" placeholder="sk-ant-..." autocomplete="off" spellcheck="false">
        <div class="sp-note">
          Stored only in this browser's local storage. This is a static app with no server —
          requests go directly from your browser to api.anthropic.com. Anyone with access to this
          browser profile can read it from localStorage; don't use this on a shared machine with a
          key you care about.
        </div>
      </div>

      <div class="sp-section" id="sp-local-section" style="display:none">
        <div class="sp-section-title">Local endpoint</div>
        <input type="text" class="sp-input" id="sp-local-endpoint" placeholder="http://localhost:11434/v1" autocomplete="off" spellcheck="false">
        <div class="sp-note">
          Any server exposing an OpenAI-compatible <code class="sp-code">/chat/completions</code>
          endpoint — Ollama, LM Studio, and llama.cpp's server mode all work out of the box.
          Local inference on modest hardware will be slower, and smaller models are less reliable
          at strict output formatting than the hosted tier — a malformed reply just falls back
          silently, the same as if this were off. The end-of-session reflection (Phase 4.9) always
          uses the hosted API regardless of this setting, since it benefits from a stronger model —
          enter a hosted key too under "Hosted API" if you want that feature; it'll use the key even
          while Local is selected for everything else.
        </div>
      </div>

      <div class="sp-section">
        <div class="sp-section-title">What runs where</div>
        <div class="sp-tiers">
          <div class="sp-tier-row"><span class="sp-tier-label">Cheap tier</span><span class="sp-tier-value">Claude Haiku 4.5 (hosted) — or your local model</span></div>
          <div class="sp-tier-row"><span class="sp-tier-label">End-of-session reflection</span><span class="sp-tier-value">Claude Sonnet 4.6 — hosted only, always</span></div>
        </div>
      </div>

      <div class="sp-section">
        <button class="sp-test-btn" id="sp-test-btn">Test connection</button>
        <div class="sp-test-result" id="sp-test-result"></div>
      </div>
    `;

    _wireInputs(wrap);
    return wrap;
  }

  function _wireInputs(wrap) {
    const backend    = typeof Preferences !== 'undefined' ? Preferences.getLLMBackend() : 'off';
    const apiKey     = typeof Preferences !== 'undefined' ? Preferences.getLLMApiKey() : '';
    const localEp    = typeof Preferences !== 'undefined' ? Preferences.getLLMLocalEndpoint() : '';

    const radios     = wrap.querySelectorAll('input[name="sp-backend"]');
    const hostedSec  = wrap.querySelector('#sp-hosted-section');
    const localSec   = wrap.querySelector('#sp-local-section');
    const apiKeyEl   = wrap.querySelector('#sp-api-key');
    const localEpEl  = wrap.querySelector('#sp-local-endpoint');
    const testBtn    = wrap.querySelector('#sp-test-btn');
    const testResult = wrap.querySelector('#sp-test-result');

    apiKeyEl.value  = apiKey;
    localEpEl.value = localEp;

    function applyVisibility(val) {
      hostedSec.style.display = val === 'hosted' ? '' : 'none';
      localSec.style.display  = val === 'local'  ? '' : 'none';
    }

    radios.forEach(r => {
      r.checked = r.value === backend;
      r.addEventListener('change', () => {
        if (!r.checked) return;
        applyVisibility(r.value);
        if (typeof Preferences !== 'undefined') Preferences.setLLMBackend(r.value);
        testResult.textContent = '';
      });
    });
    applyVisibility(backend);

    apiKeyEl.addEventListener('input', () => {
      if (typeof Preferences !== 'undefined') Preferences.setLLMApiKey(apiKeyEl.value.trim());
      testResult.textContent = '';
    });
    localEpEl.addEventListener('input', () => {
      if (typeof Preferences !== 'undefined') Preferences.setLLMLocalEndpoint(localEpEl.value.trim());
      testResult.textContent = '';
    });

    testBtn.addEventListener('click', async () => {
      if (typeof LLMClient === 'undefined') return;
      testResult.className = 'sp-test-result';
      testResult.textContent = 'Testing…';
      const result = await LLMClient.complete({
        system: 'Reply with exactly one word and nothing else.',
        prompt: 'Reply with the word: ok',
        tier: 'cheap',
        maxTokens: 10,
      });
      if (result.ok) {
        testResult.className = 'sp-test-result sp-test-result--ok';
        testResult.textContent = '✓ Connected';
      } else {
        testResult.className = 'sp-test-result sp-test-result--fail';
        testResult.textContent = `✗ ${result.message ?? result.reason}`;
      }
    });
  }

  // ─── STYLES ────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('sp-styles')) return;
    const style = document.createElement('style');
    style.id = 'sp-styles';
    style.textContent = `

    .sp-overlay {
      position: fixed; inset: 0; z-index: 9500;
      background: rgba(6,10,8,.55);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      opacity: 0; transition: opacity .16s ease;
    }
    .sp-overlay--in { opacity: 1; }

    .sp-panel {
      --sp-bg: var(--void); --sp-surface: var(--surface-0); --sp-surface-2: var(--surface-2);
      --sp-ink: var(--text-primary); --sp-ink2: var(--text-secondary); --sp-muted: var(--text-muted);
      --sp-border: rgba(232,223,200,.14); --sp-border2: rgba(232,223,200,.26);
      --sp-accent: #e8b93f; --sp-accent-ink: #c99a2e; --sp-accent-bg: rgba(232,185,63,.14); --sp-accent-b: rgba(232,185,63,.35);
      --sp-green: #5cc98a; --sp-green-bg: rgba(92,201,138,.14); --sp-green-b: rgba(92,201,138,.35);
      --sp-red: #e0645a; --sp-red-bg: rgba(224,100,90,.14); --sp-red-b: rgba(224,100,90,.35);

      width: 100%; max-width: 620px; max-height: 86vh;
      background: var(--sp-bg); color: var(--sp-ink);
      border-radius: 16px; border: 1px solid var(--sp-border);
      box-shadow: 0 24px 60px rgba(0,0,0,.28);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: 'DM Sans', system-ui, sans-serif;
      transform: translateY(6px) scale(.99); transition: transform .16s ease;
    }
    .sp-overlay--in .sp-panel { transform: translateY(0) scale(1); }

    .sp-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 24px 16px; background: var(--sp-surface); border-bottom: 1px solid var(--sp-border);
      flex-shrink: 0;
    }
    .sp-eyebrow { font-family: 'Space Mono', monospace; font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; color: var(--sp-muted); }
    .sp-title { font-family: 'Cinzel', 'DM Sans', serif; font-size: 1.15rem; font-weight: 700; margin-top: 4px; }
    .sp-close { background: none; border: none; color: var(--sp-muted); font-size: 1rem; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
    .sp-close:hover { background: var(--sp-surface-2); color: var(--sp-ink); }

    .sp-body { overflow-y: auto; padding: 20px 24px 28px; }
    .sp-main { display: flex; flex-direction: column; gap: 22px; }
    .sp-intro { font-size: .82rem; color: var(--sp-ink2); line-height: 1.6; padding: 12px 14px; background: var(--sp-surface); border: 1px solid var(--sp-border); border-radius: 10px; }

    .sp-section { display: flex; flex-direction: column; gap: 8px; }
    .sp-section-title { font-size: .8rem; font-weight: 700; color: var(--sp-ink); }

    .sp-backend-options { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    @media (max-width: 560px) { .sp-backend-options { grid-template-columns: 1fr; } }
    .sp-backend-opt {
      position: relative; display: flex; flex-direction: column; gap: 4px;
      padding: 12px 12px 10px; background: var(--sp-surface); border: 1.5px solid var(--sp-border);
      border-radius: 10px; cursor: pointer;
    }
    .sp-backend-opt input[type="radio"] { position: absolute; top: 10px; right: 10px; accent-color: var(--sp-accent); }
    .sp-backend-opt:has(input:checked) { border-color: var(--sp-accent-b); background: var(--sp-accent-bg); }
    .sp-backend-opt-label { font-size: .82rem; font-weight: 700; }
    .sp-backend-opt-desc { font-size: .68rem; color: var(--sp-muted); line-height: 1.4; }

    .sp-input {
      width: 100%; padding: 9px 12px; border-radius: 8px; border: 1.5px solid var(--sp-border2);
      background: var(--sp-surface); font-family: 'Space Mono', monospace; font-size: .78rem; color: var(--sp-ink);
    }
    .sp-input:focus { outline: none; border-color: var(--sp-accent-b); }
    .sp-note { font-size: .72rem; color: var(--sp-muted); line-height: 1.55; }
    .sp-code { font-family: 'Space Mono', monospace; background: var(--sp-surface-2); padding: 1px 5px; border-radius: 4px; }

    .sp-tiers { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: var(--sp-surface); border: 1px solid var(--sp-border); border-radius: 10px; }
    .sp-tier-row { display: flex; justify-content: space-between; gap: 10px; font-size: .74rem; }
    .sp-tier-label { color: var(--sp-muted); }
    .sp-tier-value { color: var(--sp-ink2); text-align: right; }

    .sp-test-btn {
      padding: 8px 16px; border-radius: 8px; border: 1.5px solid var(--sp-border2);
      background: var(--sp-surface); color: var(--sp-ink); font-size: .78rem; font-weight: 600; cursor: pointer;
    }
    .sp-test-btn:hover { border-color: var(--sp-accent-b); }
    .sp-test-result { margin-top: 8px; font-size: .76rem; }
    .sp-test-result--ok   { color: var(--sp-green); }
    .sp-test-result--fail { color: var(--sp-red); }
    `;
    document.head.appendChild(style);
  }

  return { show, hide };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = SettingsPanel;
