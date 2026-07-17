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

  function get()           { return { ..._load() }; }
  function getMode()       { return _load().mode; }
  function getSkillLevel() { return _load().skillLevel; }

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

  return { get, getMode, getSkillLevel, setMode, setSkillLevel };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Preferences;
