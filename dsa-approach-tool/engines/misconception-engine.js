// engines/misconception-engine.js
// Engine ID: E7
// Responsibility: Monitor for misconception risk across active states and signals.
// Updates risk levels (watch → likely → confirmed) based on trigger conditions.
// Surfaces recovery route IDs when risk reaches "likely" or higher.
//
// Reads:  ir.hypotheses[], ir.signals[], ir.candidate_states[]
// Writes: ir.misconception_risk[]

const MisconceptionEngine = (() => {

  const ENGINE_ID = 'E7';

  let _loader = null;

  // ─── INIT ─────────────────────────────────────────────────────────────────

  function init(ontologyLoader) {
    _loader = ontologyLoader;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function run(ir) {
    if (!ir || !_loader) return;

    const activeSignalIds    = new Set((ir.signals ?? []).map(s => s.id));
    const activeCandidateIds = new Set(
      (ir.candidate_states ?? [])
        .filter(c => c.status === 'candidate')
        .map(c => c.archetype_id)
    );

    const allMisconceptionIds = _collectRelevantMisconceptions(activeCandidateIds);
    const updatedRisks        = [];

    for (const mcId of allMisconceptionIds) {
      const node = _loader.getNode(mcId);
      if (!node) continue;

      const riskLevel = _computeRiskLevel(node, activeSignalIds);
      if (riskLevel === 'none') continue;

      const recoveryRouteId = _loader.getRecoveryRoute(mcId);
      const existing        = (ir.misconception_risk ?? []).find(r => r.misconception_id === mcId);

      // Risk can only escalate, never de-escalate within a session
      const prevLevel  = existing?.risk_level ?? 'none';
      const finalLevel = _escalate(prevLevel, riskLevel);

      if (finalLevel === 'none') continue;

      updatedRisks.push({
        misconception_id: mcId,
        risk_level:       finalLevel,
        trigger_basis:    _buildBasis(node, activeSignalIds),
        recovery_route:   recoveryRouteId ?? null,
        resolved:         existing?.resolved ?? false,
      });
    }

    // Preserve resolved entries not in current active set
    const existingResolved = (ir.misconception_risk ?? []).filter(
      r => r.resolved && !updatedRisks.find(u => u.misconception_id === r.misconception_id)
    );

    ir.misconception_risk = [...updatedRisks, ...existingResolved];
  }

  function markResolved(ir, misconceptionId) {
    const entry = (ir.misconception_risk ?? []).find(r => r.misconception_id === misconceptionId);
    if (entry) entry.resolved = true;
  }

  function getEngineId() { return ENGINE_ID; }

  // ─── PRIVATE ───────────────────────────────────────────────────────────────

  function _collectRelevantMisconceptions(activeCandidateIds) {
    const ids = new Set();
    for (const archetypeId of activeCandidateIds) {
      const misconceptions = _loader.getMisconceptionsForState(archetypeId);
      for (const mcId of misconceptions) ids.add(mcId);
    }
    return ids;
  }

  function _computeRiskLevel(node, activeSignalIds) {
    const triggerSignals = node.trigger_signals    ?? [];
    const antiSignals    = node.anti_trigger_signals ?? [];

    // Anti-signals suppress the misconception entirely
    if (antiSignals.some(s => activeSignalIds.has(s))) return 'none';

    const triggeredCount = triggerSignals.filter(s => activeSignalIds.has(s)).length;

    if (triggeredCount === 0)                        return 'watch';
    if (triggeredCount >= triggerSignals.length)     return 'likely';
    return 'watch';
  }

  function _escalate(prev, next) {
    const ORDER = ['none', 'watch', 'likely', 'confirmed'];
    const prevI = ORDER.indexOf(prev);
    const nextI = ORDER.indexOf(next);
    return ORDER[Math.max(prevI, nextI)];
  }

  function _buildBasis(node, activeSignalIds) {
    const triggered = (node.trigger_signals ?? []).filter(s => activeSignalIds.has(s));
    if (triggered.length === 0) return `State context matches trigger_context for ${node.id}`;
    return `Trigger signals active: ${triggered.join(', ')}`;
  }

  return { run, init, markResolved, getEngineId };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = MisconceptionEngine;
