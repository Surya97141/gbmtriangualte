// core/scoped-chat.js
// Phase 4.8 — scoped query chat. A single shared component, invocable from
// any stage (not a feature bolted onto one panel) — see ScopedChat.open().
// Module contract: open(stageId, stageLabel, stageContext), hide()
//
// THE GUARDRAIL — stage-agnostic by design. It checks exactly one real fact
// in session state: has the user actually committed to a direction yet
// (Stage 4.5's variantSelected, OR Fast Path's own direction field — Fast
// Path never populates stage4_5.variantSelected at all, so checking only
// that one field would wrongly gate a Fast Path user who already has a
// direction). It does NOT check which stage the chat was opened from —
// opening it at Stage 3 after a selection exists must discuss freely, and
// opening it at Stage 7 with no selection (defensively — not normally
// reachable, but the check must not assume Stage 7 implies one) must still
// redirect. Enforced twice, same pattern as every other live call this
// session: once in the system prompt, once as a code-level backstop
// (containsPatternNameLeak) that doesn't trust the prompt alone.

const ScopedChat = (() => {

  const MAX_MESSAGES = 8;

  let _messages     = []; // [{role:'user'|'assistant', content}] — sent to the LLM as history
  let _stageId      = null;
  let _stageLabel    = '';
  let _stageContext = '';
  let _loading      = false;

  // ─── THE GUARDRAIL'S ONE REAL FACT ──────────────────────────────────────

  function _hasSelection() {
    const s45 = typeof State !== 'undefined' ? State.getAnswer('stage4_5') : null;
    const fp  = typeof State !== 'undefined' ? State.getAnswer('fastpath') : null;
    return !!s45?.variantSelected || !!fp?.direction;
  }

  function _selectionLabel() {
    const s45 = State.getAnswer('stage4_5');
    if (s45?.variantSelected) {
      const dir = (State.get().output?.directions ?? []).find(d =>
        s45.variantSelected.startsWith(d.family) || s45.variantSelected.includes(d.family)
      );
      return dir?.label ?? s45.variantSelected;
    }
    const fp = State.getAnswer('fastpath');
    return fp?.direction ?? 'the selected direction';
  }

  // ─── RATE LIMIT (per problem — lives in session state, no localStorage
  // persistence, resets with a new session same as everything else here) ──

  function _messageCount() {
    return (typeof State !== 'undefined' ? State.getAnswer('scopedChat')?.messageCount : 0) ?? 0;
  }

  // ─── PUBLIC: OPEN / HIDE ─────────────────────────────────────────────────

  function open(stageId, stageLabel, stageContext) {
    if (document.getElementById('sc-overlay')) return;
    _stageId      = stageId;
    _stageLabel   = stageLabel;
    _stageContext = stageContext;
    _messages     = (State.getAnswer('scopedChat')?.messages ?? []).slice();

    _injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'sc-overlay';
    overlay.id = 'sc-overlay';

    const panel = document.createElement('div');
    panel.className = 'sc-panel';
    panel.innerHTML = `
      <div class="sc-header">
        <div>
          <div class="sc-eyebrow">Ask about ${_escapeSC(stageLabel)}</div>
          <div class="sc-title">Scoped chat</div>
        </div>
        <button class="sc-close" id="sc-close-btn" aria-label="Close chat">✕</button>
      </div>
      <div class="sc-context">${_escapeSC(stageContext)}</div>
      <div class="sc-messages" id="sc-messages"></div>
      <div class="sc-input-row">
        <input type="text" class="sc-input" id="sc-input" placeholder="Ask a question about this..." autocomplete="off">
        <button class="sc-send-btn" id="sc-send-btn">Send</button>
      </div>
      <div class="sc-limit-note" id="sc-limit-note"></div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.querySelector('#sc-close-btn').addEventListener('click', hide);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
    document.addEventListener('keydown', _onKeydown);

    const input = overlay.querySelector('#sc-input');
    const sendBtn = overlay.querySelector('#sc-send-btn');
    sendBtn.addEventListener('click', () => _onSend(input));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') _onSend(input); });

    _renderMessages();
    _renderLimitNote();
    requestAnimationFrame(() => overlay.classList.add('sc-overlay--in'));
  }

  function _onKeydown(e) {
    if (e.key === 'Escape') hide();
  }

  function hide() {
    const overlay = document.getElementById('sc-overlay');
    if (!overlay) return;
    document.removeEventListener('keydown', _onKeydown);
    overlay.classList.remove('sc-overlay--in');
    setTimeout(() => overlay.remove(), 160);
  }

  // ─── MESSAGES ────────────────────────────────────────────────────────────

  function _renderMessages() {
    const el = document.getElementById('sc-messages');
    if (!el) return;

    if (!_messages.length) {
      el.innerHTML = `<div class="sc-empty">Ask anything about ${_escapeSC(_stageLabel)} — this chat only knows about your session so far, not what you haven't gotten to yet.</div>`;
    } else {
      el.innerHTML = _messages.map(m => `
        <div class="sc-msg sc-msg--${m.role}">
          <div class="sc-msg-role">${m.role === 'user' ? 'You' : 'Assistant'}</div>
          <div class="sc-msg-text">${_escapeSC(m.content)}</div>
        </div>
      `).join('');
    }

    if (_loading) {
      el.innerHTML += `<div class="sc-msg sc-msg--assistant sc-msg--pending"><div class="sc-msg-role">Assistant</div><div class="sc-msg-text">Thinking…</div></div>`;
    }

    el.scrollTop = el.scrollHeight;
  }

  function _renderLimitNote() {
    const note = document.getElementById('sc-limit-note');
    const input = document.getElementById('sc-input');
    const sendBtn = document.getElementById('sc-send-btn');
    if (!note) return;

    const llmReady = typeof LLMClient !== 'undefined' && LLMClient.isConfigured('cheap');
    if (!llmReady) {
      note.textContent = 'Available once an AI backend is set up in ⚙ Settings.';
      note.className = 'sc-limit-note sc-limit-note--off';
      if (input) input.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
      return;
    }

    const used = _messageCount();
    const left = MAX_MESSAGES - used;
    if (left <= 0) {
      note.textContent = `You've used all ${MAX_MESSAGES} messages for this problem — trust your own analysis from here.`;
      note.className = 'sc-limit-note sc-limit-note--exhausted';
      if (input) input.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
    } else {
      note.textContent = `${left} of ${MAX_MESSAGES} left`;
      note.className = 'sc-limit-note';
      if (input) input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  async function _onSend(input) {
    const text = input.value.trim();
    if (!text || _loading) return;
    if (_messageCount() >= MAX_MESSAGES) return;
    if (typeof LLMClient === 'undefined' || !LLMClient.isConfigured('cheap')) return;

    input.value = '';
    const historyForCall = _messages.map(m => ({ role: m.role, content: m.content }));
    _messages.push({ role: 'user', content: text });

    // Counted on attempt, not success — the API call costs money regardless
    // of outcome, same pattern as 4.3.
    State.setAnswer('scopedChat', { messageCount: _messageCount() + 1 });

    _loading = true;
    _renderMessages();
    _renderLimitNote();

    const hasSelection = _hasSelection();
    const system = hasSelection ? _afterSelectionPrompt() : _beforeSelectionPrompt();

    const result = await LLMClient.complete({
      system,
      prompt: text,
      tier: 'cheap',
      maxTokens: 220,
      history: historyForCall,
    });

    _loading = false;

    let responseText;
    if (!result.ok) {
      responseText = 'That didn\'t come through — try again in a moment.';
    } else if (!hasSelection && LLMClient.containsPatternNameLeak(result.text)) {
      // Code-level backstop — don't trust the system prompt alone. Same
      // redirect-to-own-reasoning framing as everywhere else this session.
      responseText = 'Let\'s stay with what you\'ve worked out so far instead — what have you noticed about this problem yourself? The Truths First box is a good place to write it down if you haven\'t yet.';
    } else {
      responseText = result.text.trim();
    }

    _messages.push({ role: 'assistant', content: responseText });
    State.setAnswer('scopedChat', { messages: _messages });

    _renderMessages();
    _renderLimitNote();
  }

  // ─── SYSTEM PROMPTS ──────────────────────────────────────────────────────

  function _beforeSelectionPrompt() {
    return [
      `You are a scoped chat assistant embedded in a DSA problem-solving tool, currently open at: ${_stageLabel}.`,
      `What's on screen right now: ${_stageContext}`,
      '',
      'The user has NOT yet selected or committed to an approach in this session.',
      '',
      'HARD RULE: never state, name, or hint at any specific algorithm, data structure, or',
      'technique (e.g. never say "binary search", "DP", "dynamic programming", "graph",',
      '"greedy", "BFS", "DFS", "two pointer", "sliding window", "trie", "segment tree", etc.)',
      '— not even to confirm or deny one the user guesses at.',
      '',
      'If the user asks you to just tell them the pattern/algorithm/answer, or otherwise tries',
      'to skip their own reasoning, do NOT comply — redirect them back to it instead: ask what',
      'they\'ve noticed so far, or point at the Truths First box for this stage.',
      '',
      'You may otherwise help: clarify what a term or checkbox means, explain the STRUCTURE of',
      'the problem in plain language, or ask a clarifying question. Keep responses to 2-4 short,',
      'conversational sentences.',
    ].join('\n');
  }

  function _afterSelectionPrompt() {
    const label = _selectionLabel();
    return [
      `You are a scoped chat assistant embedded in a DSA problem-solving tool, currently open at: ${_stageLabel}.`,
      `What's on screen right now: ${_stageContext}`,
      '',
      `The user has already selected "${label}" as their approach for this problem — full`,
      'discussion of that chosen direction is allowed, including naming it directly, its',
      'implementation details, edge cases, and complexity.',
      '',
      'Stay grounded in the direction they actually picked — don\'t suggest a different',
      'technique would have been better instead; that choice is theirs, made earlier in this',
      'session, not something to relitigate here.',
      '',
      'Keep responses to 2-4 short, conversational sentences.',
    ].join('\n');
  }

  function _escapeSC(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── STYLES ────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('sc-styles')) return;
    const style = document.createElement('style');
    style.id = 'sc-styles';
    style.textContent = `
    .sc-overlay {
      position: fixed; inset: 0; z-index: 9600;
      background: rgba(6,10,8,.55);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      opacity: 0; transition: opacity .16s ease;
    }
    .sc-overlay--in { opacity: 1; }

    .sc-panel {
      --sc-bg: var(--void); --sc-surface: var(--surface-0); --sc-surface-2: var(--surface-2);
      --sc-ink: var(--text-primary); --sc-ink2: var(--text-secondary); --sc-muted: var(--text-muted);
      --sc-border: rgba(232,223,200,.14); --sc-border2: rgba(232,223,200,.26);
      --sc-accent: #e8b93f; --sc-accent-bg: rgba(232,185,63,.14); --sc-accent-b: rgba(232,185,63,.35);
      --sc-blue: #4fa8d8; --sc-blue-bg: rgba(79,168,216,.14); --sc-blue-b: rgba(79,168,216,.35);

      width: 100%; max-width: 560px; height: 640px; max-height: 86vh;
      background: var(--sc-bg); color: var(--sc-ink);
      border-radius: 16px; border: 1px solid var(--sc-border);
      box-shadow: 0 24px 60px rgba(0,0,0,.28);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: 'DM Sans', system-ui, sans-serif;
      transform: translateY(6px) scale(.99); transition: transform .16s ease;
    }
    .sc-overlay--in .sc-panel { transform: translateY(0) scale(1); }

    .sc-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 16px 20px 12px; background: var(--sc-surface); border-bottom: 1px solid var(--sc-border);
      flex-shrink: 0;
    }
    .sc-eyebrow { font-family: 'Space Mono', monospace; font-size: .64rem; letter-spacing: .1em; text-transform: uppercase; color: var(--sc-muted); }
    .sc-title { font-family: 'Cinzel', 'DM Sans', serif; font-size: 1.05rem; font-weight: 700; margin-top: 3px; }
    .sc-close { background: none; border: none; color: var(--sc-muted); font-size: .95rem; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
    .sc-close:hover { background: var(--sc-surface-2); color: var(--sc-ink); }

    .sc-context {
      font-size: .7rem; color: var(--sc-muted); font-style: italic; line-height: 1.5;
      padding: 8px 20px; background: var(--sc-surface); border-bottom: 1px solid var(--sc-border);
      flex-shrink: 0;
    }

    .sc-messages { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
    .sc-empty { font-size: .8rem; color: var(--sc-muted); font-style: italic; line-height: 1.6; text-align: center; padding: 30px 10px; }
    .sc-msg { display: flex; flex-direction: column; gap: 3px; max-width: 88%; }
    .sc-msg--user { align-self: flex-end; align-items: flex-end; }
    .sc-msg--assistant { align-self: flex-start; align-items: flex-start; }
    .sc-msg-role { font-family: 'Space Mono', monospace; font-size: .58rem; letter-spacing: .06em; text-transform: uppercase; color: var(--sc-muted); }
    .sc-msg-text { font-size: .82rem; line-height: 1.55; padding: 9px 12px; border-radius: 10px; }
    .sc-msg--user .sc-msg-text { background: var(--sc-accent-bg); border: 1px solid var(--sc-accent-b); color: var(--sc-ink); }
    .sc-msg--assistant .sc-msg-text { background: var(--sc-surface-2); border: 1px solid var(--sc-border); color: var(--sc-ink); }
    .sc-msg--pending .sc-msg-text { font-style: italic; color: var(--sc-muted); }

    .sc-input-row { display: flex; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--sc-border); background: var(--sc-surface); flex-shrink: 0; }
    .sc-input {
      flex: 1; padding: 9px 12px; border-radius: 8px; border: 1.5px solid var(--sc-border2);
      background: var(--sc-bg); color: var(--sc-ink); font-family: inherit; font-size: .82rem;
    }
    .sc-input:focus { outline: none; border-color: var(--sc-accent-b); }
    .sc-input:disabled { opacity: .5; }
    .sc-send-btn {
      padding: 9px 16px; border-radius: 8px; border: 1.5px solid var(--sc-blue-b);
      background: var(--sc-blue-bg); color: var(--sc-blue); font-size: .8rem; font-weight: 600; cursor: pointer;
    }
    .sc-send-btn:hover:not(:disabled) { background: rgba(79,168,216,.22); }
    .sc-send-btn:disabled { opacity: .5; cursor: not-allowed; }

    .sc-limit-note { font-size: .68rem; color: var(--sc-muted); padding: 0 20px 12px; flex-shrink: 0; }
    .sc-limit-note--off  { font-style: italic; }
    .sc-limit-note--exhausted { color: var(--sc-muted); font-style: italic; }
    `;
    document.head.appendChild(style);
  }

  return { open, hide };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = ScopedChat;
