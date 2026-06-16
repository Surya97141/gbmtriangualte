// engines/state-engine.js
// Engine ID: E2
// Responsibility: Score all state archetypes based on active signals and the complexity
// gate. Produces the ordered candidate_states list in the IR.
//
// Reads:  ir.signals[], ir.complexity_gate
// Writes: ir.candidate_states[]
//
// Scoring model:
//   aggregate_weight = Σ (signal.strength × edge.weight) for all (signal → archetype) implies edges
//   Contradiction penalty applied: weight × (1 - contradicting_signal.strength × edge.weight)
//   Archetypes eliminated by complexity_gate are set to weight 0, status "eliminated"
//   Archetypes below threshold 0.25 are excluded from candidate list

const StateEngine = (() => {

  const ENGINE_ID       = 'E2';
  const WEIGHT_THRESHOLD = 0.25;

  let _loader = null;

  // ─── INIT ─────────────────────────────────────────────────────────────────

  function init(ontologyLoader) {
    _loader = ontologyLoader;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function run(ir) {
    if (!ir || !_loader) return;

    const signals        = ir.signals ?? [];
    const eliminated     = new Set(ir.complexity_gate?.eliminated_archetypes ?? []);
    const archetypeScores = {};

    // Accumulate implication weights
    for (const signal of signals) {
      const impliedStates = _loader.getSignalImplies(signal.id);
      for (const { archetypeId, weight } of impliedStates) {
        if (!archetypeScores[archetypeId]) archetypeScores[archetypeId] = 0;
        archetypeScores[archetypeId] += signal.strength * weight;
      }
    }

    // Apply contradiction penalties
    for (const signal of signals) {
      const contradictions = _loader.getSignalContradicts(signal.id);
      for (const { targetId, targetType, weight } of contradictions) {
        if (targetType !== 'StateArchetype') continue;
        if (archetypeScores[targetId] === undefined) continue;
        archetypeScores[targetId] *= (1 - signal.strength * weight);
      }
    }

    // Build candidate list
    const candidates = [];
    for (const [archetypeId, rawWeight] of Object.entries(archetypeScores)) {
      const isEliminated = eliminated.has(archetypeId);
      const weight       = isEliminated ? 0 : rawWeight;
      const status       = isEliminated ? 'eliminated'
                         : weight >= WEIGHT_THRESHOLD ? 'candidate'
                         : 'below_threshold';

      if (status === 'below_threshold') continue;

      const contributing = signals
        .filter(s => (_loader.getSignalImplies(s.id) ?? []).some(e => e.archetypeId === archetypeId))
        .map(s => s.id);

      const eliminating = signals
        .filter(s => (_loader.getSignalContradicts(s.id) ?? []).some(e => e.targetId === archetypeId))
        .map(s => s.id);

      candidates.push({
        archetype_id:         archetypeId,
        aggregate_weight:     Math.round(weight * 1000) / 1000,
        contributing_signals: contributing,
        eliminating_signals:  eliminating,
        status,
      });
    }

    // Sort by weight descending; eliminated archetypes go last
    candidates.sort((a, b) => {
      if (a.status === 'eliminated' && b.status !== 'eliminated') return 1;
      if (b.status === 'eliminated' && a.status !== 'eliminated') return -1;
      return b.aggregate_weight - a.aggregate_weight;
    });

    ir.candidate_states = candidates;
  }

  function getEngineId() { return ENGINE_ID; }

  return { run, init, getEngineId, WEIGHT_THRESHOLD };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = StateEngine;
