// core/problem-library.js
// Thin async loader for data/problem-library.json — the seed set of
// problems tagged by structural property, used by Stage 11's drill
// suggestions. Follows the same fetch-with-fallback pattern already used
// by stages/home/pattern-map.js.

const ProblemLibrary = (() => {

  let _cache = null;

  async function _fetchJSON(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function _load() {
    if (_cache) return _cache;
    const data = await _fetchJSON('/data/problem-library.json');
    _cache = data?.problems ?? [];
    return _cache;
  }

  async function getAll() {
    const all = await _load();
    return [...all];
  }

  // Problems whose tags include propertyId === value, best matches first
  // (more tag overlap with the given hint values = better match).
  async function suggestFor(propertyId, value, opts = {}) {
    const { limit = 5, exclude = [] } = opts;
    const all = await _load();

    return all
      .filter(p => p.tags?.[propertyId] === value && !exclude.includes(p.id))
      .slice(0, limit);
  }

  // Problems that exercise a given property at all, regardless of which
  // value they're tagged with — used for drill suggestions where the user's
  // weakness is "unsure" answers rather than a specific wrong value, so
  // there's no single value to match against.
  async function suggestForProperty(propertyId, opts = {}) {
    const { limit = 3, exclude = [] } = opts;
    const all = await _load();

    return all
      .filter(p => p.tags?.[propertyId] !== undefined && !exclude.includes(p.id))
      .slice(0, limit);
  }

  return { getAll, suggestFor, suggestForProperty };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = ProblemLibrary;
