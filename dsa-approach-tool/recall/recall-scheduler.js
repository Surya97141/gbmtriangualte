// recall/recall-scheduler.js
// SM-2 spaced repetition scheduler for DSA patterns.
// Only calendar arithmetic — no millisecond date offsets.
//
// Public API:
//   RecallScheduler.addPattern(key)                      — add to schedule
//   RecallScheduler.getDuePatterns()                     — keys due today/overdue
//   RecallScheduler.recordReview(key, rating, seconds)   — update SM-2 state
//   RecallScheduler.getScheduleSummary()                 — counts for home screen
//   RecallScheduler.getAllPatterns()                      — full list for dashboard

const RecallScheduler = (() => {

  const STORAGE_KEY = 'dsa_recall_schedule';
  const HISTORY_CAP = 20;
  const MIN_EF      = 1.3;

  // ─── CALENDAR HELPERS ──────────────────────────────────────────────────────

  function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function todayKey() {
    return toDateKey(new Date());
  }

  function addDays(dateKey, n) {
    // Uses setDate() — correct across DST transitions and month boundaries.
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    return toDateKey(date);
  }

  // ─── STORAGE ───────────────────────────────────────────────────────────────

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return (raw ? JSON.parse(raw) : null) ?? {};
    } catch {
      return {};
    }
  }

  function _save(schedule) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
    } catch (e) {
      console.warn('RecallScheduler: localStorage write failed:', e.message);
    }
  }

  // ─── SM-2 CORE ─────────────────────────────────────────────────────────────
  // Ratings map to SM-2 quality scores:
  //   'blank'   → 1  (complete failure — reset interval)
  //   'partial' → 3  (recalled with gaps — pass, EF drops slightly)
  //   'cold'    → 5  (perfect cold recall — pass, EF grows)

  const QUALITY = { blank: 1, partial: 3, cold: 5 };

  function _applyReview(entry, rating, seconds) {
    const q   = QUALITY[rating] ?? 3;
    const now = todayKey();

    entry.history = entry.history ?? [];
    entry.history.push({ date: now, rating, seconds: seconds ?? 0 });
    if (entry.history.length > HISTORY_CAP) {
      entry.history = entry.history.slice(-HISTORY_CAP);
    }

    if (q >= 3) {
      // Successful recall — advance interval per SM-2 schedule
      if      (entry.repetitions === 0) { entry.interval = 1; }
      else if (entry.repetitions === 1) { entry.interval = 6; }
      else { entry.interval = Math.round(entry.interval * entry.easeFactor); }

      entry.easeFactor = Math.max(
        MIN_EF,
        entry.easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
      );
      entry.repetitions += 1;
    } else {
      // Failed recall — reset to day 1
      entry.repetitions = 0;
      entry.interval    = 1;
      entry.easeFactor  = Math.max(MIN_EF, entry.easeFactor - 0.2);
    }

    entry.nextReview = addDays(now, entry.interval);
    return entry;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function addPattern(key) {
    if (!key) return;
    const schedule = _load();
    if (schedule[key]) return;   // already tracked — never reset existing progress
    schedule[key] = {
      firstAdded  : todayKey(),
      interval    : 1,
      easeFactor  : 2.5,
      repetitions : 0,
      nextReview  : todayKey(), // due immediately so first review happens today
      history     : [],
    };
    _save(schedule);
  }

  function getDuePatterns() {
    const schedule = _load();
    const today    = todayKey();
    return Object.entries(schedule)
      .filter(([, e]) => e.nextReview <= today)
      .sort(([, a], [, b]) => a.nextReview.localeCompare(b.nextReview))
      .map(([key]) => key);
  }

  function recordReview(key, rating, seconds) {
    if (!key || !QUALITY[rating]) return;
    const schedule = _load();
    if (!schedule[key]) { addPattern(key); return recordReview(key, rating, seconds); }
    schedule[key] = _applyReview(schedule[key], rating, seconds);
    _save(schedule);
  }

  // Returns counts for the home screen recall queue section.
  function getScheduleSummary() {
    const schedule = _load();
    const entries  = Object.values(schedule);
    const today    = todayKey();
    const week     = addDays(today, 7);

    const dueNow      = entries.filter(e => e.nextReview <= today).length;
    const dueThisWeek = entries.filter(e => e.nextReview <= week).length;
    const nextDate    = entries
      .map(e => e.nextReview)
      .filter(d => d > today)
      .sort()[0] ?? null;

    return { total: entries.length, dueNow, dueThisWeek, nextDate };
  }

  // Returns all patterns with maturity label — used by retention dashboard.
  function getAllPatterns() {
    return Object.entries(_load())
      .map(([key, e]) => ({
        key,
        firstAdded  : e.firstAdded,
        interval    : e.interval,
        easeFactor  : e.easeFactor,
        repetitions : e.repetitions,
        nextReview  : e.nextReview,
        history     : e.history ?? [],
        maturity    : e.interval >= 30 ? 'mature'
                    : e.interval >= 7  ? 'maturing'
                    :                    'learning',
      }))
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  }

  return { addPattern, getDuePatterns, recordReview, getScheduleSummary, getAllPatterns };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = RecallScheduler;
