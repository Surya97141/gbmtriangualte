// core/llm-client.js
// Phase 4.0/4.10 — thin fetch-based client for the two live-call features
// (4.6 Intake calibration, 4.9 Exit synthesis). No SDK dependency — this is
// a static, no-build-step app, so a direct `fetch()` against the Anthropic
// Messages API (with the browser-access header) or an OpenAI-compatible
// local endpoint (Ollama/LM Studio/llama.cpp) is the whole client.
//
// Personal-use scope (Phase 4.0 decision): the API key lives in
// localStorage via Preferences and is sent directly from the browser to
// api.anthropic.com — there is no backend to proxy through. That tradeoff
// is the explicit, accepted scope for now; a server-side vault is future
// work if this ever goes public.
//
// Every call site MUST treat failure as a normal, expected outcome (never
// block the user) — see the `ok: false` shape below and Phase 1.0's
// "required fallback" rule.

const LLMClient = (() => {

  const HOSTED_URL     = 'https://api.anthropic.com/v1/messages';
  const ANTHROPIC_VERSION = '2023-06-01';

  const MODEL_CHEAP     = 'claude-haiku-4-5';  // 4.2/4.3/4.6/4.7 cheap tier
  const MODEL_SYNTHESIS = 'claude-sonnet-4-6'; // 4.9 — one-time, end-of-session, cloud-only

  const DEFAULT_TIMEOUT_MS_HOSTED = 15000;
  const DEFAULT_TIMEOUT_MS_LOCAL  = 45000; // local inference is slower — disclosed in Settings

  // ─── CONFIGURATION CHECK ─────────────────────────────────────────────────

  // tier: 'cheap' (respects the hosted/local toggle) | 'synthesis' (always
  // hosted, regardless of the toggle — see Phase 4.10's cloud-only rule)
  function isConfigured(tier = 'cheap') {
    if (typeof Preferences === 'undefined') return false;
    if (tier === 'synthesis') return !!Preferences.getLLMApiKey();

    const backend = Preferences.getLLMBackend();
    if (backend === 'hosted') return !!Preferences.getLLMApiKey();
    if (backend === 'local')  return !!Preferences.getLLMLocalEndpoint();
    return false; // 'off'
  }

  // ─── PUBLIC: COMPLETE ────────────────────────────────────────────────────

  // Returns { ok: true, text } or { ok: false, reason, message }. Never
  // throws — every failure path (not configured, timeout, network, bad
  // response, malformed local output) is a normal returned value so callers
  // can fall back without a try/catch.
  //
  // `history` (Phase 4.8) — optional prior turns as [{role:'user'|
  // 'assistant', content}], oldest first, NOT including the current
  // `prompt` (that's appended as the final user turn). Defaults to [], so
  // every existing single-shot call site (4.2/4.3/4.6/4.7/4.9) is
  // unaffected — this is a pure addition, not a behavior change for them.
  async function complete({ system, prompt, tier = 'cheap', maxTokens = 300, history = [] }) {
    if (!isConfigured(tier)) {
      return { ok: false, reason: 'not_configured', message: 'No LLM backend configured in Settings.' };
    }

    const useHosted = tier === 'synthesis' || Preferences.getLLMBackend() === 'hosted';

    try {
      return useHosted
        ? await _completeHosted({ system, prompt, tier, maxTokens, history })
        : await _completeLocal({ system, prompt, maxTokens, history });
    } catch (e) {
      if (e?.name === 'AbortError') {
        return { ok: false, reason: 'timeout', message: 'Request timed out.' };
      }
      return { ok: false, reason: 'network', message: e?.message ?? 'Network error.' };
    }
  }

  async function _completeHosted({ system, prompt, tier, maxTokens, history = [] }) {
    const apiKey = Preferences.getLLMApiKey();
    const model  = tier === 'synthesis' ? MODEL_SYNTHESIS : MODEL_CHEAP;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS_HOSTED);

    let res;
    try {
      res = await fetch(HOSTED_URL, {
        method : 'POST',
        headers: {
          'content-type'   : 'application/json',
          'x-api-key'      : apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          // Required for any direct browser->API call (no server proxy here).
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [...history, { role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, reason: 'http', message: `API returned ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json().catch(() => null);
    const text = data?.content?.find(b => b.type === 'text')?.text;
    if (typeof text !== 'string') {
      return { ok: false, reason: 'parse', message: 'Unexpected response shape from API.' };
    }
    return { ok: true, text: text.trim() };
  }

  async function _completeLocal({ system, prompt, maxTokens, history = [] }) {
    const endpoint = Preferences.getLLMLocalEndpoint().replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS_LOCAL);

    let res;
    try {
      res = await fetch(`${endpoint}/chat/completions`, {
        method : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model', // most local servers ignore this or pick their loaded model
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            ...history,
            { role: 'user', content: prompt },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, reason: 'http', message: `Local endpoint returned ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') {
      // Smaller local models are less reliable at strict formatting than
      // the hosted tier — a malformed response is a normal outcome here,
      // not a bug. Caller falls back the same way as any other failure.
      return { ok: false, reason: 'parse', message: 'Local model returned an unexpected response shape.' };
    }
    return { ok: true, text: text.trim() };
  }

  // ─── GUARDRAIL: PATTERN-NAME LEAK CHECK ─────────────────────────────────

  // Hard rule (Phase 1.0/4.4/4.6): these calls must never state a pattern
  // or algorithm name back to the user. Enforced in the system prompt for
  // each call site AND checked here on the response, identically regardless
  // of backend (Phase 4.10) — a local model being local doesn't make it
  // more trustworthy by default.
  const PATTERN_NAME_TERMS = [
    'binary search', 'dynamic programming', 'dp ', ' dp', 'greedy',
    'two pointer', 'sliding window', 'depth-first', 'breadth-first',
    'dfs', 'bfs', 'dijkstra', 'bellman-ford', 'floyd-warshall',
    'union find', 'disjoint set', 'segment tree', 'fenwick', 'trie',
    'backtracking', 'divide and conquer', 'divide-and-conquer',
    'topological sort', 'kruskal', 'prim\'s', 'minimum spanning tree',
    'convex hull', 'kmp', 'z-algorithm', 'rabin-karp', 'manacher',
    'sprague-grundy', 'minimax', 'bitmask dp', 'knuth', 'network flow',
    'bipartite matching', 'monotonic stack', 'monotonic deque',
  ];

  function containsPatternNameLeak(text) {
    const lower = (text ?? '').toLowerCase();
    return PATTERN_NAME_TERMS.some(term => lower.includes(term));
  }

  return {
    complete,
    isConfigured,
    containsPatternNameLeak,
    MODEL_CHEAP,
    MODEL_SYNTHESIS,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = LLMClient;
