// stages/home/pattern-map.js
// Pattern unlock map — rendered on the home screen above "Start analysis".
// Builds a master pattern list from keyword-signals.json, graph-patterns.json,
// and dp-patterns.json, then shows which patterns the user has completed.
//
// Public API:
//   PatternMap.render(containerEl)  — async, injects grid into containerEl
//   PatternMap.unlock(patternName)  — records a completion in localStorage
//   PatternMap.hasUnlocks()         — returns true if any pattern is unlocked

const PatternMap = (() => {

  // ─── CONSTANTS ─────────────────────────────────────────────────────────────

  // Use SessionUtils key if loaded; fall back to literal so the map works
  // standalone before SessionUtils is on the page.
  const STORAGE_KEY = (typeof SessionUtils !== 'undefined' && SessionUtils.PATTERN_UNLOCKS_KEY)
    ? SessionUtils.PATTERN_UNLOCKS_KEY
    : 'dsa_pattern_unlocks';

  // Paths are relative to the document root (where index.html lives).
  const DATA_PATHS = {
    keywordSignals: 'data/keyword-signals.json',
    graphPatterns : 'data/graph-patterns.json',
    dpPatterns    : 'data/dp-patterns.json',
  };

  // ─── PUBLIC: render ────────────────────────────────────────────────────────

  async function render(containerEl) {
    if (!containerEl) return;

    const [kwData, gpData, dpData] = await Promise.all([
      _fetchJSON(DATA_PATHS.keywordSignals),
      _fetchJSON(DATA_PATHS.graphPatterns),
      _fetchJSON(DATA_PATHS.dpPatterns),
    ]);

    const patterns = _buildMasterList(kwData, gpData, dpData);
    const unlocks  = _loadUnlocks();

    _injectStyles();
    _renderGrid(containerEl, patterns, unlocks);
  }

  // ─── PUBLIC: unlock ────────────────────────────────────────────────────────

  // Records a pattern completion. Called by Stage 8 on completion.
  // patternName — the direction label string (e.g. "Kruskal's MST + Union Find")
  function unlock(patternName) {
    if (!patternName) return;
    const key     = PatternKey.normalisePatternKey(patternName);
    const unlocks = _loadUnlocks();
    const now     = new Date().toISOString();

    if (!unlocks[key]) {
      unlocks[key] = { firstUnlocked: now, completionCount: 0, lastCompleted: now };
    }
    unlocks[key].completionCount++;
    unlocks[key].lastCompleted = now;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocks));
    } catch (e) {
      console.warn('PatternMap.unlock: localStorage write failed:', e.message);
    }
  }

  // ─── PUBLIC: hasUnlocks ────────────────────────────────────────────────────

  // Returns true if at least one pattern has been unlocked.
  // Used by index.html to decide whether to start the collapsible expanded.
  function hasUnlocks() {
    return Object.keys(_loadUnlocks()).length > 0;
  }

  // ─── MASTER PATTERN LIST ───────────────────────────────────────────────────

  function _buildMasterList(kwData, gpData, dpData) {
    const seen    = new Set();
    const results = [];

    const add = rawName => {
      if (!rawName) return;
      const key = PatternKey.normalisePatternKey(rawName);
      if (!key || seen.has(key)) return;
      seen.add(key);
      // Display name: strip annotations but keep the human-readable label.
      const name = String(rawName)
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*[—–]\s*.+$/, '')
        .replace(/\s+O\s*\([^)]*\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      results.push({ name: name || rawName, key });
    };

    // 1. keyword-signals.json — signals strings from exactPhrases
    (kwData?.exactPhrases ?? []).forEach(entry => {
      (entry.signals ?? []).forEach(s => add(s));
    });

    // 2. graph-patterns.json — graphGoals names
    (gpData?.graphGoals ?? []).forEach(goal => {
      if (goal.name) add(goal.name);
    });

    // 3. dp-patterns.json — stateIndexTypes names
    (dpData?.stateIndexTypes ?? []).forEach(type => {
      if (type.name) add(type.name);
    });

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ─── UNLOCK STORAGE ────────────────────────────────────────────────────────

  function _loadUnlocks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return (raw ? JSON.parse(raw) : null) ?? {};
    } catch {
      return {};
    }
  }

  // ─── GRID RENDERING ────────────────────────────────────────────────────────

  function _renderGrid(container, patterns, unlocks) {
    container.innerHTML = '';

    if (!patterns.length) {
      container.innerHTML = '<div class="pm-empty">Pattern data unavailable.</div>';
      return;
    }

    patterns.forEach(({ name, key }) => {
      const data       = unlocks[key];
      const isUnlocked = !!data;
      const count      = data?.completionCount ?? 0;
      const lastDate   = data?.lastCompleted
        ? new Date(data.lastCompleted).toLocaleDateString()
        : null;

      const card = document.createElement('div');
      card.className = `pm-card ${isUnlocked ? 'pm-card--unlocked' : 'pm-card--locked'}`;
      card.dataset.key = key;

      const tooltipText = isUnlocked
        ? `Last completed: ${lastDate}`
        : 'Complete a problem using this pattern to unlock';

      card.innerHTML = `
        <div class="pm-card-top">
          <span class="pm-card-icon">${isUnlocked ? '✓' : '🔒'}</span>
          ${count > 0 ? `<span class="pm-card-count">×${count}</span>` : ''}
        </div>
        <div class="pm-card-name">${_esc(name)}</div>
        <div class="pm-tooltip" role="tooltip">${_esc(tooltipText)}</div>
      `;

      container.appendChild(card);
    });
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('pm-styles')) return;
    const style = document.createElement('style');
    style.id = 'pm-styles';
    style.textContent = `
    .pm-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    @media (max-width: 700px) {
      .pm-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .pm-card {
      position: relative;
      border-radius: 9px;
      padding: 10px 12px;
      border: 1.5px solid;
      display: flex;
      flex-direction: column;
      gap: 5px;
      transition: box-shadow .13s;
    }
    .pm-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .pm-card:hover .pm-tooltip {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(-50%) translateY(0);
    }

    .pm-card--locked {
      background : #16251e;
      border-color: rgba(232,223,200,.12);
    }
    .pm-card--unlocked {
      background  : #1e3229;
      border-color: rgba(232,185,63,.28);
      border-left : 3px solid #e8b93f;
    }

    .pm-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .pm-card-icon {
      font-size : .78rem;
      line-height: 1;
    }
    .pm-card--locked   .pm-card-icon { opacity: .45; }
    .pm-card--unlocked .pm-card-icon { color: #5cc98a; font-weight: 700; }

    .pm-card-count {
      font-size  : .58rem;
      font-weight: 700;
      color      : #e8b93f;
      background : rgba(232,185,63,.08);
      border     : 1px solid rgba(232,185,63,.2);
      border-radius: 9999px;
      padding    : 1px 6px;
      white-space: nowrap;
    }

    .pm-card-name {
      font-size  : .73rem;
      font-weight: 500;
      line-height: 1.35;
    }
    .pm-card--locked   .pm-card-name { color: #7d8f80; }
    .pm-card--unlocked .pm-card-name { color: #ede4cf; }

    .pm-tooltip {
      position  : absolute;
      bottom    : calc(100% + 7px);
      left      : 50%;
      transform : translateX(-50%) translateY(3px);
      background: #0a130f;
      color     : #ede4cf;
      font-size : .66rem;
      line-height: 1.4;
      padding   : 5px 9px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      opacity   : 0;
      transition: opacity .14s, transform .14s;
      z-index   : 200;
    }
    .pm-tooltip::after {
      content   : '';
      position  : absolute;
      top       : 100%;
      left      : 50%;
      transform : translateX(-50%);
      border    : 4px solid transparent;
      border-top-color: #0a130f;
    }

    .pm-empty {
      font-size: .76rem;
      color    : #7d8f80;
      padding  : 16px;
      grid-column: 1 / -1;
    }
    `;
    document.head.appendChild(style);
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  async function _fetchJSON(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return { render, unlock, hasUnlocks };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = PatternMap;
