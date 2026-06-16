// engines/transition-engine.js
// Engine ID: E4
// Responsibility: Activate transition archetypes that are applicable given the current
// confirmed state archetypes and verified invariants. Transitions describe HOW the
// state evolves — not which algorithm to use, but which movement operation applies.
//
// Reads:  ir.candidate_states[], ir.active_invariants[]
// Writes: ir.active_transitions[]

const TransitionEngine = (() => {

  const ENGINE_ID            = 'E4';
  const CANDIDATE_MIN_WEIGHT = 0.50;
  const VERIFIED_BONUS       = 0.10;

  let _loader = null;

  // ─── INIT ─────────────────────────────────────────────────────────────────

  function init(ontologyLoader) {
    _loader = ontologyLoader;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function run(ir) {
    if (!ir || !_loader) return;

    const activeCandidates = (ir.candidate_states ?? []).filter(
      c => c.status === 'candidate' && c.aggregate_weight >= CANDIDATE_MIN_WEIGHT
    );

    const verifiedInvariantIds = new Set(
      (ir.active_invariants ?? []).filter(i => i.verified).map(i => i.invariant_id)
    );

    const seenTransitions = new Set();
    const activeTransitions = [];

    for (const candidate of activeCandidates) {
      const stateNode = _loader.getNode(candidate.archetype_id);
      if (!stateNode) continue;

      const transitionIds = stateNode.uses ?? [];

      for (const transitionId of transitionIds) {
        if (seenTransitions.has(transitionId)) continue;

        const transNode = _loader.getNode(transitionId);
        if (!transNode) continue;

        const requiredInvariants = transNode.requires_invariant ?? [];
        const allRequiredMet     = requiredInvariants.every(
          invId => (ir.active_invariants ?? []).some(i => i.invariant_id === invId)
        );
        if (!allRequiredMet) continue;

        const verifiedCount = requiredInvariants.filter(id => verifiedInvariantIds.has(id)).length;
        const confidence    = 0.70 + (verifiedCount * VERIFIED_BONUS);

        activeTransitions.push({
          transition_id:  transitionId,
          confidence:     Math.round(Math.min(confidence, 0.97) * 1000) / 1000,
          state_source:   candidate.archetype_id,
          basis:          `Applicable to ${candidate.archetype_id}; required invariants present`,
        });

        seenTransitions.add(transitionId);
      }
    }

    ir.active_transitions = activeTransitions;
  }

  function getEngineId() { return ENGINE_ID; }

  return { run, init, getEngineId };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = TransitionEngine;
