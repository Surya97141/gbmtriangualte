// stages/stage3/truths-first.js
// Phase 1.1/1.2/1.3 — the "Truths First" box that precedes Stage 3's 7 guided
// structural-property questions. The user writes what they know for certain,
// unaided, before the guided checklist appears at all. This is deliberately
// the narrow, structural-properties-specific Truths First moment — distinct
// from the broader "what do you think this problem is about" moment planned
// for Intake (roadmap 1.0), which is a separate, earlier, broader checkpoint.
// Used by: stage3.js

const TruthsFirst = (() => {

  const MIN_CHARS = 15;
  const MIN_WORDS = 4;

  // ─── SUBSTANTIVE CHECK ─────────────────────────────────────────────────────
  // "Mandatory" is enforced by gating the guided checklist's visibility on
  // this, not by a submit button — there is nothing to click past.

  function isSubstantive(text) {
    const trimmed = (text ?? '').trim();
    if (trimmed.length < MIN_CHARS) return false;
    const words = trimmed.split(/\s+/).filter(Boolean);
    return words.length >= MIN_WORDS;
  }

  // ─── SELF-CHECK ANALYSIS ───────────────────────────────────────────────────
  // Deliberately crude keyword matching, not language understanding. For each
  // property: "touched" = the text mentions ANYTHING from ANY of that
  // property's answer signal lists (used for the "you noticed this yourself"
  // badge — a low bar, since even a tentative or wrong-direction mention is
  // still real engagement with the topic). "matchedAnswerId" is set only when
  // signals from exactly ONE answer matched — a conflicting or absent match
  // stays null rather than guessing, since a wrong guess here would be worse
  // than no guess (this only ever adds encouragement, never contradicts the
  // guided question).
  function analyze(text, propertyModules) {
    const lower = (text ?? '').toLowerCase();
    const result = {};

    Object.entries(propertyModules).forEach(([propId, mod]) => {
      if (!mod?.getSelfCheckSignals) { result[propId] = { touched: false, matchedAnswerId: null }; return; }
      const signals = mod.getSelfCheckSignals() ?? {};
      const matchedAnswers = Object.entries(signals)
        .filter(([, phrases]) => phrases.some(p => lower.includes(p)))
        .map(([answerId]) => answerId);

      result[propId] = {
        touched: matchedAnswers.length > 0,
        matchedAnswerId: matchedAnswers.length === 1 ? matchedAnswers[0] : null,
      };
    });

    return result;
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function renderBox(savedText, onChange) {
    const section = document.createElement('section');
    section.className = 's3tf-section';
    section.innerHTML = `
      <div class="s3-section-header">
        <span class="s3-section-num s3-section-num--truths">00</span>
        <div>
          <div class="s3-section-title">What do you know for certain?</div>
          <div class="s3-section-sub">Write 3–5 facts about this problem. No algorithm names — just what you actually know.</div>
        </div>
      </div>
      <textarea
        class="s3tf-box"
        id="s3tf-box"
        placeholder="e.g. &quot;The array can have duplicates.&quot; &quot;I need the answer for every prefix, not just the whole array.&quot; &quot;Shuffling the input would change the answer.&quot;"
        rows="4"
      >${_escape(savedText ?? '')}</textarea>
      <div class="s3tf-hint" id="s3tf-hint">${_hintText(savedText ?? '')}</div>
    `;

    const box  = section.querySelector('#s3tf-box');
    const hint = section.querySelector('#s3tf-hint');

    box.addEventListener('input', () => {
      const text = box.value;
      hint.textContent = _hintText(text);
      hint.classList.toggle('s3tf-hint--ready', isSubstantive(text));
      onChange(text);
    });

    if (isSubstantive(savedText)) hint.classList.add('s3tf-hint--ready');

    return section;
  }

  function _hintText(text) {
    if (isSubstantive(text)) return '✓ The guided checklist below is unlocked.';
    const words = (text ?? '').trim().split(/\s+/).filter(Boolean).length;
    return `Keep going — a few real sentences unlocks the guided checklist (${words}/${MIN_WORDS} words so far).`;
  }

  function _escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────
  // Injected by stage3.js's own _injectStyles alongside its other s3-* rules
  // (kept here, appended once, so this module stays self-contained like its
  // siblings — see stage3.js's existing convention).

  function injectStyles() {
    if (document.getElementById('s3tf-styles')) return;
    const style = document.createElement('style');
    style.id = 's3tf-styles';
    style.textContent = `
    .s3-section-num--truths { background: var(--s3-green); }
    .s3tf-section { display: flex; flex-direction: column; gap: 10px; }
    .s3tf-box {
      width: 100%; min-height: 96px; resize: vertical; box-sizing: border-box;
      background: var(--s3-surface2); border: 1.5px solid var(--s3-border2);
      border-radius: 10px; padding: 12px 14px; font-family: var(--s3-sans);
      font-size: .85rem; color: var(--s3-ink); line-height: 1.55;
    }
    .s3tf-box:focus { outline: none; border-color: var(--s3-green-b); box-shadow: 0 0 0 3px rgba(92,201,138,.08); }
    .s3tf-box::placeholder { color: var(--s3-muted); }
    .s3tf-hint { font-size: .72rem; color: var(--s3-muted); font-style: italic; }
    .s3tf-hint--ready { color: var(--s3-green); font-style: normal; font-weight: 600; }

    /* Guided checklist lock, toggled by stage3.js while Truths First is incomplete */
    .s3-guided-locked { position: relative; opacity: .35; pointer-events: none; user-select: none; filter: blur(1.5px); transition: opacity .2s, filter .2s; }
    .s3-guided-lock-banner {
      display: none; align-items: center; gap: 8px; font-size: .78rem; color: var(--s3-muted);
      padding: 10px 14px; background: var(--s3-surface2); border: 1px dashed var(--s3-border2); border-radius: 9px;
    }
    .s3-guided-locked ~ .s3-guided-lock-banner,
    .s3-prop-list-wrap.s3-guided-locked + .s3-guided-lock-banner { display: none; }

    /* Self-check badges on each property block */
    .s3-selfcheck-badge {
      display: inline-flex; align-items: center; gap: 5px; align-self: flex-start;
      padding: 3px 9px; border-radius: 9999px; font-family: var(--s3-mono); font-size: .62rem; font-weight: 600;
    }
    .s3-selfcheck-badge--touched { background: var(--s3-green-bg); border: 1px solid var(--s3-green-b); color: var(--s3-green); }
    .s3-selfcheck-badge--missed  { background: var(--s3-surface2); border: 1px solid var(--s3-border); color: var(--s3-muted); font-weight: 500; }

    /* Self-derived insight celebration — distinct from the numeric score
       celebration elsewhere in the tool; a brief, quiet visual moment, not
       another gamified number. */
    .s3-insight-flare {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-top: 2px;
      background: linear-gradient(90deg, rgba(92,201,138,.18), rgba(92,201,138,.06));
      border: 1px solid var(--s3-green-b); border-radius: 8px;
      font-size: .76rem; color: var(--s3-green); font-weight: 600;
      animation: s3-insight-pop .5s ease-out;
    }
    .s3-insight-flare-icon { font-size: .95rem; }
    @keyframes s3-insight-pop {
      0%   { opacity: 0; transform: translateY(-4px) scale(.97); }
      60%  { opacity: 1; transform: translateY(0) scale(1.01); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .s3-insight-flare { animation: none; }
    }
    `;
    document.head.appendChild(style);
  }

  return { isSubstantive, analyze, renderBox, injectStyles, MIN_CHARS, MIN_WORDS };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = TruthsFirst;
