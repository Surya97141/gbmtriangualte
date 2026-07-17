// core/outcomes.js
// Cross-session outcome log — localStorage-backed, separate from State
// (which is wiped per problem). Records what actually happened after a
// problem was solved or abandoned, linked to the structural signals that
// led there, so patterns can be surfaced later: the Stage 5 aggregation
// view (#5), Recovery Mode hints (#5), and weak-property drills (#11).

const Outcomes = (() => {

  const KEY = 'dsa_outcomes_v1';
  const MAX_ENTRIES = 500; // cap growth of the localStorage blob

  // ─── STORAGE ───────────────────────────────────────────────────────────────

  function _loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[Outcomes] load failed:', e);
      return [];
    }
  }

  function _saveAll(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_ENTRIES)));
    } catch (e) {
      console.warn('[Outcomes] save failed:', e);
    }
  }

  // ─── RECORD ────────────────────────────────────────────────────────────────

  // outcome: 'passed' | 'wa' | 'tle' | 'unfinished'
  // state: the full session State object at the time of recording
  function record(outcome, state) {
    const list = _loadAll();
    const selectedId = state?.answers?.stage7?.selectedDirection ?? null;
    const selectedDir = (state?.output?.directions ?? []).find(d => d.id === selectedId) ?? null;

    const entry = {
      id         : `outcome-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      recordedAt : Date.now(),
      outcome,
      properties : { ...(state?.answers?.stage3?.properties ?? {}) },
      dpSubtype  : state?.answers?.stage3?.dpSubtype ?? null,
      graphGoal  : state?.answers?.stage3?.graphGoal ?? null,
      confidence : {
        score: state?.confidence?.score ?? state?.answers?.stage6_5?.score ?? null,
        level: state?.confidence?.level ?? state?.answers?.stage6_5?.level ?? null,
      },
      direction  : {
        id    : selectedId,
        family: selectedDir?.family ?? null,
        label : state?.answers?.stage7?.primaryDirection ?? selectedDir?.label ?? null,
      },
      n: state?.answers?.stage0?.n ?? null,
    };

    list.push(entry);
    _saveAll(list);
    return entry;
  }

  function getAll()  { return _loadAll(); }
  function clear()   { try { localStorage.removeItem(KEY); } catch (e) { /* noop */ } }

  // ─── AGGREGATION ───────────────────────────────────────────────────────────

  // Actual pass rate vs predicted confidence band.
  function passRateByBand() {
    const list  = _loadAll();
    const bands = { high: { pass: 0, total: 0 }, medium: { pass: 0, total: 0 }, low: { pass: 0, total: 0 } };

    list.forEach(e => {
      const band = e.confidence?.level;
      if (!band || !bands[band]) return;
      bands[band].total++;
      if (e.outcome === 'passed') bands[band].pass++;
    });

    return Object.fromEntries(
      Object.entries(bands).map(([band, { pass, total }]) => [
        band,
        { pass, total, rate: total ? Math.round((pass / total) * 100) : null },
      ])
    );
  }

  // Which structural property VALUES most often preceded a WA or TLE.
  function riskyPropertyValues(minSamples = 2) {
    const failed = _loadAll().filter(e => e.outcome === 'wa' || e.outcome === 'tle');
    const counts = {}; // "propertyId::value" -> { propertyId, value, wa, tle, total }

    failed.forEach(e => {
      Object.entries(e.properties ?? {}).forEach(([propId, val]) => {
        if (!val || val === 'unanswered') return;
        const key = `${propId}::${val}`;
        if (!counts[key]) counts[key] = { propertyId: propId, value: val, wa: 0, tle: 0, total: 0 };
        counts[key][e.outcome === 'wa' ? 'wa' : 'tle']++;
        counts[key].total++;
      });
    });

    return Object.values(counts)
      .filter(c => c.total >= minSamples)
      .sort((a, b) => b.total - a.total);
  }

  // Which Stage 3 property ids are the weakest overall — marked "unsure"
  // most often, or most often present when the outcome went bad.
  function weakestProperties(minSamples = 1) {
    const list   = _loadAll();
    const counts = {}; // propertyId -> { propertyId, unsure, badOutcome, total }

    list.forEach(e => {
      Object.entries(e.properties ?? {}).forEach(([propId, val]) => {
        if (!counts[propId]) counts[propId] = { propertyId: propId, unsure: 0, badOutcome: 0, total: 0 };
        counts[propId].total++;
        if (val === 'unsure') counts[propId].unsure++;
        if (e.outcome === 'wa' || e.outcome === 'tle') counts[propId].badOutcome++;
      });
    });

    return Object.values(counts)
      .filter(c => c.total >= minSamples)
      .map(c => ({ ...c, weaknessScore: c.unsure * 2 + c.badOutcome }))
      .sort((a, b) => b.weaknessScore - a.weaknessScore);
  }

  // For Recovery Mode: does the CURRENT problem's structural profile match
  // a pattern that historically ended in this same failure type?
  // Returns null if there's no meaningful match (fewer than 2 shared
  // property values), otherwise the closest historical match.
  function matchHint(currentProperties, failureType) {
    const wantOutcome = failureType === 'wa' ? 'wa' : failureType === 'tle' ? 'tle' : null;
    if (!wantOutcome) return null;

    const past = _loadAll().filter(e => e.outcome === wantOutcome);
    if (!past.length) return null;

    let best = null;
    past.forEach(e => {
      const keys    = Object.keys(currentProperties ?? {});
      const matches = keys.filter(k => currentProperties[k] && currentProperties[k] === e.properties?.[k]);
      if (matches.length < 2) return; // require ≥2 shared values to call it a real pattern
      if (!best || matches.length > best.matches.length) best = { entry: e, matches };
    });

    if (!best) return null;

    return {
      sharedProperties: best.matches,
      occurredAt      : best.entry.recordedAt,
      direction       : best.entry.direction,
      outcome         : best.entry.outcome,
    };
  }

  return {
    record, getAll, clear,
    passRateByBand, riskyPropertyValues, weakestProperties, matchHint,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Outcomes;
