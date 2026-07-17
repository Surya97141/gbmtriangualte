// core/gate-standard.js
// Single canonical completion-gate rule, used by every stage instead of
// each inventing its own threshold:
//
//   valid = (answered / total >= 60%) OR (an explicit alternate-path
//           condition is met, where one exists for that stage)
//
// Stages with a naturally binary/single-field gate (Stage 0's N, Stage 7's
// direction pick, ...) just pass total=1 — 60% of 1 rounds up to 1, so the
// rule degenerates to "that one field must be filled," which is correct
// for them without needing a special case here.
//
// Stage 6.5 (a computed score/band, not a field checklist) and Stage 8
// (every chunk must be understood by design — partial credit would defeat
// the point) are intentionally NOT routed through this — their existing
// gates are already a different, already-transparent shape.

const GateStandard = (() => {

  const THRESHOLD = 0.6;

  // answered/total: how many of the stage's required fields are filled.
  // alternateMet: true if this stage has an explicit alternate-path
  // condition (e.g. "at least one interaction selected") and it's satisfied.
  function evaluate(answered, total, alternateMet = false) {
    const thresholdCount = total > 0 ? Math.ceil(total * THRESHOLD) : 0;
    const meetsThreshold = total === 0 || answered >= thresholdCount;
    return {
      answered,
      total,
      thresholdCount,
      meetsThreshold,
      alternateMet: !!alternateMet,
      valid: meetsThreshold || !!alternateMet,
    };
  }

  // Dispatches the result so the topbar badge (and anything else listening)
  // can render it — the one shared "is this stage ready?" indicator instead
  // of every stage building its own bespoke gate message.
  function report(stageId, result, opts = {}) {
    document.dispatchEvent(new CustomEvent('dsa:gate-update', {
      detail: { stageId, ...result, alternateLabel: opts.alternateLabel ?? null },
    }));
    return result;
  }

  return { THRESHOLD, evaluate, report };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = GateStandard;
