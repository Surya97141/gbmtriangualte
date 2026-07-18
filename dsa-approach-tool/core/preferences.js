// core/preferences.js
// Cross-session user preferences — deliberately separate from core/state.js.
// State is per-problem and wiped on Reset/new problem; these settings are
// meant to survive that (mode, skill level), so they get their own
// localStorage key instead of living in the session-scoped State object.

const Preferences = (() => {

  const KEY = 'dsa_preferences_v1';

  const DEFAULTS = {
    mode       : 'practice',      // 'practice' | 'contest'
    skillLevel : 'intermediate',  // 'beginner' | 'intermediate' | 'advanced'
    theme      : 'dark',          // 'dark' | 'light' — Phase 5.1

    // Phase 4.0/4.10 — LLM settings. Personal-use scope: the key is entered
    // once and stored client-side (this is a static, no-backend app — there
    // is nowhere else to put it). 'off' is the default so nothing calls out
    // to any API until the user explicitly opts in via Settings.
    llmBackend       : 'off',     // 'off' | 'hosted' | 'local'
    llmApiKey        : '',        // hosted only — sent directly to api.anthropic.com
    llmLocalEndpoint : 'http://localhost:11434/v1', // any OpenAI-compatible endpoint
  };

  let _prefs = null;

  function _load() {
    if (_prefs) return _prefs;
    try {
      const raw = localStorage.getItem(KEY);
      _prefs = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch (e) {
      console.warn('[Preferences] load failed, using defaults:', e);
      _prefs = { ...DEFAULTS };
    }
    return _prefs;
  }

  function _save() {
    try { localStorage.setItem(KEY, JSON.stringify(_prefs)); }
    catch (e) { console.warn('[Preferences] save failed:', e); }
  }

  function get()               { return { ..._load() }; }
  function getMode()           { return _load().mode; }
  function getSkillLevel()     { return _load().skillLevel; }
  function getTheme()          { return _load().theme; }
  function getLLMBackend()     { return _load().llmBackend; }
  function getLLMApiKey()      { return _load().llmApiKey; }
  function getLLMLocalEndpoint() { return _load().llmLocalEndpoint; }

  function setMode(mode) {
    _load();
    _prefs.mode = mode;
    _save();
    document.dispatchEvent(new CustomEvent('dsa:preferences-changed', { detail: { key: 'mode', value: mode } }));
  }

  function setSkillLevel(level) {
    _load();
    _prefs.skillLevel = level;
    _save();
    document.dispatchEvent(new CustomEvent('dsa:preferences-changed', { detail: { key: 'skillLevel', value: level } }));
  }

  function setTheme(theme) {
    _load();
    _prefs.theme = theme;
    _save();
    document.documentElement.setAttribute('data-theme', theme);
    document.dispatchEvent(new CustomEvent('dsa:preferences-changed', { detail: { key: 'theme', value: theme } }));
  }

  function setLLMBackend(backend) {
    _load();
    _prefs.llmBackend = backend;
    _save();
    document.dispatchEvent(new CustomEvent('dsa:preferences-changed', { detail: { key: 'llmBackend', value: backend } }));
  }

  function setLLMApiKey(key) {
    _load();
    _prefs.llmApiKey = key;
    _save();
    document.dispatchEvent(new CustomEvent('dsa:preferences-changed', { detail: { key: 'llmApiKey', value: key } }));
  }

  function setLLMLocalEndpoint(url) {
    _load();
    _prefs.llmLocalEndpoint = url;
    _save();
    document.dispatchEvent(new CustomEvent('dsa:preferences-changed', { detail: { key: 'llmLocalEndpoint', value: url } }));
  }

  return {
    get, getMode, getSkillLevel, setMode, setSkillLevel,
    getTheme, setTheme,
    getLLMBackend, getLLMApiKey, getLLMLocalEndpoint,
    setLLMBackend, setLLMApiKey, setLLMLocalEndpoint,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Preferences;
