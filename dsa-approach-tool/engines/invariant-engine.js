// engines/invariant-engine.js
// Engine ID: E3
// Responsibility: Activate invariants required by candidate state archetypes,
// apply signal strengthening to invariant confidence, and detect hard contradictions
// when a signal breaks an invariant that an active state requires.
//
// Reads:  ir.candidate_states[], ir.signals[]
// Writes: ir.active_invariants[], ir.contradictions[]

const InvariantEngine = (() => {

  const ENGINE_ID = 'E3';

  // Confidence boost per strengthening signal (additive, capped at 0.97)
  const STRENGTHEN_BOOST     = 0.10;
  const BASE_CONFIDENCE      = 0.70;
  const CONFIDENCE_CAP       = 0.97;
  const CANDIDATE_MIN_WEIGHT = 0.40;

  let _loader = null;

  // ─── INIT ─────────────────────────────────────────────────────────────────

  function init(ontologyLoader) {
    _loader = ontologyLoader;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function run(ir) {
    if (!ir || !_loader) return;

    const activeCandidates = (ir.candidate_states ?? [])
      .filter(c => c.status === 'candidate' && c.aggregate_weight >= CANDIDATE_MIN_WEIGHT);

    const requiredInvariantIds = new Set();
    for (const candidate of activeCandidates) {
      for (const invId of _loader.getStateRequires(candidate.archetype_id)) {
        requiredInvariantIds.add(invId);
      }
    }

    const activeSignalIds = new Set((ir.signals ?? []).map(s => s.id));
    const signalMap       = Object.fromEntries((ir.signals ?? []).map(s => [s.id, s]));

    const activeInvariants  = [];
    const newContradictions = [];

    for (const invId of requiredInvariantIds) {
      const node = _loader.getNode(invId);
      if (!node) continue;

      // Check whether any active signal breaks this invariant
      let broken       = false;
      let breakingSignal = null;
      for (const sig of (ir.signals ?? [])) {
        const breaks = _loader.getSignalBreaks(sig.id);
        if (breaks.some(b => b.invariantId === invId)) {
          broken       = true;
          breakingSignal = sig.id;
          break;
        }
      }

      if (broken) {
        newContradictions.push({
          node_a:     breakingSignal,
          node_b:     invId,
          edge_type:  'breaks',
          resolution: null,
        });
        continue;
      }

      // Compute confidence from strengthening signals
      let confidence = BASE_CONFIDENCE;
      let basis      = `Required by active state archetype(s)`;

      for (const sig of (ir.signals ?? [])) {
        const strengthens = _loader.getSignalStrengthens(sig.id);
        const match = strengthens.find(s => s.invariantId === invId);
        if (match) {
          confidence = Math.min(CONFIDENCE_CAP, confidence + sig.strength * STRENGTHEN_BOOST);
          basis      = `Strengthened by ${sig.id} (${sig.basis})`;
        }
      }

      const existing = (ir.active_invariants ?? []).find(i => i.invariant_id === invId);
      activeInvariants.push({
        invariant_id: invId,
        confidence:   Math.round(confidence * 1000) / 1000,
        verified:     existing?.verified ?? false,
        basis,
      });
    }

    // Merge with existing verified state — do not overwrite verified:true
    ir.active_invariants = activeInvariants;

    // Add new contradictions (avoid duplicates)
    const existingContradictionKeys = new Set(
      (ir.contradictions ?? []).map(c => `${c.node_a}|${c.node_b}`)
    );
    for (const c of newContradictions) {
      const key = `${c.node_a}|${c.node_b}`;
      if (!existingContradictionKeys.has(key)) {
        ir.contradictions.push(c);
        existingContradictionKeys.add(key);
      }
    }
  }

  function markVerified(ir, invariantId) {
    const inv = (ir.active_invariants ?? []).find(i => i.invariant_id === invariantId);
    if (inv) inv.verified = true;
  }

  function resolveContradiction(ir, nodeA, nodeB, resolution) {
    const c = (ir.contradictions ?? []).find(
      c => c.node_a === nodeA && c.node_b === nodeB
    );
    if (c) c.resolution = resolution;
  }

  function getEngineId() { return ENGINE_ID; }

  return { run, init, markVerified, resolveContradiction, getEngineId };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = InvariantEngine;
