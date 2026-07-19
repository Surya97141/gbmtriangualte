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

  // Phase 4.3 — second-opinion check. Rate-limited per problem (resets with
  // a new session, same as everything else stored on state.answers.stage3) —
  // a "handful of checks," not unlimited, per the original cost-control design.
  const MAX_SECOND_OPINIONS = 3;
  let _secondOpinionLoading = false;

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
      <div id="s3tf-second-opinion-region"></div>
    `;

    const box  = section.querySelector('#s3tf-box');
    const hint = section.querySelector('#s3tf-hint');

    box.addEventListener('input', () => {
      const text = box.value;
      hint.textContent = _hintText(text);
      hint.classList.toggle('s3tf-hint--ready', isSubstantive(text));
      onChange(text);
      _renderSecondOpinion(section, text);
    });

    if (isSubstantive(savedText)) hint.classList.add('s3tf-hint--ready');
    _renderSecondOpinion(section, savedText ?? '');

    return section;
  }

  // ─── SECOND OPINION (Phase 4.3) ─────────────────────────────────────────────
  // Reads the user's own Truths First facts and gives a short verdict —
  // confirms what's solid, or gently flags something that seems off. Never
  // states a pattern/algorithm name, never answers the 7 guided questions
  // for them — this responds to what they wrote, it doesn't hand them the
  // analysis. Same hard-rule guard and no-key-fallback standard as every
  // other live call in this app (Phase 4.6/4.7).

  function _secondOpinionState() {
    return (typeof State !== 'undefined' ? State.getAnswer('stage3')?.secondOpinion : null) ?? null;
  }

  function _secondOpinionUses() {
    return (typeof State !== 'undefined' ? State.getAnswer('stage3')?.secondOpinionUses : 0) ?? 0;
  }

  function _renderSecondOpinion(section, text) {
    const region = section.querySelector('#s3tf-second-opinion-region');
    if (!region) return;

    if (!isSubstantive(text)) { region.innerHTML = ''; return; }

    const llmReady = typeof LLMClient !== 'undefined' && LLMClient.isConfigured('cheap');
    const usesLeft = MAX_SECOND_OPINIONS - _secondOpinionUses();
    const saved    = _secondOpinionState();

    if (!llmReady) {
      region.innerHTML = '<div class="s3tf-so-off-note">A second opinion on these facts is available once an AI backend is set up in ⚙ Settings.</div>';
      return;
    }

    if (_secondOpinionLoading) {
      region.innerHTML = '<div class="s3tf-so-pending">Reading what you wrote…</div>';
      return;
    }

    let html = '';

    if (saved) {
      html += `
        <div class="s3tf-so-result${saved.fellBack ? ' s3tf-so-result--fallback' : ''}">${_escape(saved.text)}</div>
        ${saved.fellBack ? '<div class="s3tf-so-fallback-note">(live check unavailable — this doesn\'t affect your score)</div>' : ''}
      `;
    }

    if (usesLeft > 0) {
      html += `<button class="s3tf-so-btn" id="s3tf-so-btn">🔍 Get a second opinion${saved ? ' (recheck)' : ''} — ${usesLeft} left</button>`;
    } else {
      html += '<div class="s3tf-so-off-note">You\'ve used your second opinions for this problem — trust your own analysis from here.</div>';
    }

    region.innerHTML = html;
    region.querySelector('#s3tf-so-btn')?.addEventListener('click', () => _onGetSecondOpinion(section, text));
  }

  async function _onGetSecondOpinion(section, text) {
    if (_secondOpinionLoading || typeof State === 'undefined' || typeof LLMClient === 'undefined') return;
    if (_secondOpinionUses() >= MAX_SECOND_OPINIONS) return;

    _secondOpinionLoading = true;
    _renderSecondOpinion(section, text);

    // Count the attempt now, not on success — this is a cost control on
    // real API calls made, not on how many came back parseable.
    State.setAnswer('stage3', { secondOpinionUses: _secondOpinionUses() + 1 });

    const result = await LLMClient.complete({
      system: [
        'You are giving a second opinion on facts a user wrote about a DSA problem, BEFORE they answer 7 structural analysis questions themselves.',
        '',
        'HARD RULE: never state, name, or hint at any specific algorithm, data structure, or technique',
        '(e.g. never say "binary search", "DP", "dynamic programming", "graph", "greedy", "BFS", "DFS",',
        '"two pointer", "sliding window", "trie", "segment tree", etc.) — not even to confirm or deny one.',
        '',
        'Do not answer these 7 questions for them — that is their own analysis to complete, not something',
        'to hand them: order sensitivity, subproblem overlap, feasibility boundary, local optimality,',
        'state space, dependency structure, search space.',
        '',
        'Read what they wrote. Respond with EITHER a short, warm confirmation of what seems solid and',
        'well-observed, OR a gentle flag — phrased as a question or observation, never a correction telling',
        'them the right answer — if something seems inconsistent, incomplete, or worth double-checking.',
        '',
        '2-3 short sentences. Plain language.',
      ].join('\n'),
      prompt: `Here is what the user wrote:\n\n${text}`,
      tier: 'cheap',
      maxTokens: 150,
    });

    _secondOpinionLoading = false;

    let opinion;
    if (!result.ok) {
      opinion = { text: 'A live second opinion isn\'t available right now — the sections below still work the same either way.', fellBack: true };
    } else if (LLMClient.containsPatternNameLeak(result.text)) {
      opinion = { text: 'A live second opinion isn\'t available right now — the sections below still work the same either way.', fellBack: true };
    } else {
      opinion = { text: result.text.trim(), fellBack: false };
    }

    State.setAnswer('stage3', { secondOpinion: opinion });
    _renderSecondOpinion(section, text);
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
      font-size: 1rem; color: var(--s3-ink); line-height: 1.55;
    }
    .s3tf-box:focus { outline: none; border-color: var(--s3-green-b); box-shadow: 0 0 0 3px rgba(92,201,138,.08); }
    .s3tf-box::placeholder { color: var(--s3-muted); }
    .s3tf-hint { font-size: .92rem; color: var(--s3-muted); font-style: italic; line-height: 1.5; }
    .s3tf-hint--ready { color: var(--s3-green); font-style: normal; font-weight: 600; }

    /* Second opinion (Phase 4.3) */
    .s3tf-so-off-note { font-size: .92rem; color: var(--s3-muted); font-style: italic; line-height: 1.5; }
    .s3tf-so-pending   { font-size: .92rem; color: var(--s3-muted); font-style: italic; }
    .s3tf-so-btn {
      padding: 7px 14px; border-radius: 8px; border: 1.5px solid var(--s3-green-b);
      background: var(--s3-surface2); color: var(--s3-green); font-size: .74rem; font-weight: 600; cursor: pointer;
    }
    .s3tf-so-btn:hover { background: var(--s3-green-bg); }
    .s3tf-so-result {
      font-size: .9rem; color: var(--s3-ink); line-height: 1.6; padding: 9px 12px;
      background: var(--s3-green-bg); border: 1px solid var(--s3-green-b); border-radius: 8px;
      margin-bottom: 8px;
    }
    .s3tf-so-result--fallback {
      background: var(--s3-surface2); border-color: var(--s3-border2); color: var(--s3-muted); font-style: italic;
    }
    .s3tf-so-fallback-note { font-size: .82rem; color: var(--s3-muted); margin-bottom: 8px; line-height: 1.4; }

    /* Guided checklist lock, toggled by stage3.js while Truths First is incomplete */
    .s3-guided-locked { position: relative; opacity: .35; pointer-events: none; user-select: none; filter: blur(1.5px); transition: opacity .2s, filter .2s; }
    .s3-guided-lock-banner {
      display: none; align-items: center; gap: 8px; font-size: .9rem; color: var(--s3-muted);
      padding: 10px 14px; background: var(--s3-surface2); border: 1px dashed var(--s3-border2); border-radius: 9px;
      line-height: 1.5;
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
      font-size: .9rem; color: var(--s3-green); font-weight: 600;
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
