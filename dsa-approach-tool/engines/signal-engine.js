// engines/signal-engine.js
// Engine ID: E1
// Responsibility: Extract signal nodes from completed stage answers and emit them
// into the IR. Signals are the atomic inputs to all downstream engines.
//
// Reads:  ir.stage_log (stage answers)
// Writes: ir.signals[]
//
// Signal extraction is driven by structured stage answers (yes/no/unsure choices),
// not by free-text parsing. The user is the parser; the engine maps choices to signals.

const SignalEngine = (() => {

  const ENGINE_ID = 'E1';

  // Maps (stageId, answerKey, answerValue) → signal emission descriptor.
  // Each entry: { signalId, strength, basis }
  // Only deterministic structured answers trigger signal emission.
  const SIGNAL_RULES = [
    // Stage 2 — Output form
    {
      stage:  'stage2',
      key:    'solution_depth',
      value:  'subarray',
      emit:   { id: 'sig_contiguous_subarray', strength: 0.90,
                basis: 'Output is a subarray — problem is defined over contiguous structure' },
    },
    {
      stage:  'stage2',
      key:    'solution_depth',
      value:  'substring',
      emit:   { id: 'sig_contiguous_subarray', strength: 0.90,
                basis: 'Output is a substring — problem is defined over contiguous structure' },
    },
    {
      stage:  'stage2',
      key:    'optimization_type',
      value:  'maximize',
      emit:   { id: 'sig_optimization_query', strength: 1.00,
                basis: 'Query type is maximize' },
    },
    {
      stage:  'stage2',
      key:    'optimization_type',
      value:  'minimize',
      emit:   { id: 'sig_optimization_query', strength: 1.00,
                basis: 'Query type is minimize' },
    },
    {
      stage:  'stage2',
      key:    'optimization_type',
      value:  'count',
      emit:   { id: 'sig_count_query', strength: 1.00,
                basis: 'Query type is count' },
    },

    // Stage 2 — Window size (from output depth + constraint)
    {
      stage:  'stage2',
      key:    'window_size_type',
      value:  'fixed',
      emit:   { id: 'sig_fixed_window_size', strength: 0.95,
                basis: 'Window size is fixed at exactly k' },
    },
    {
      stage:  'stage2',
      key:    'window_size_type',
      value:  'variable',
      emit:   { id: 'sig_variable_window_size', strength: 0.85,
                basis: 'Window size varies based on constraint' },
    },

    // Stage 3 — Structural properties
    {
      stage:  'stage3',
      key:    'feasibility_boundary_answered',
      value:  true,
      emit:   { id: 'sig_range_constraint', strength: 0.85,
                basis: 'Feasibility boundary confirmed — explicit constraint on window content exists' },
    },
    {
      stage:  'stage3',
      key:    'local_optimality_answered',
      value:  'yes',
      emit:   { id: 'sig_monotone_constraint', strength: 0.90,
                basis: 'Local optimality confirmed — greedy expansion is valid, constraint is monotone' },
    },
    {
      stage:  'stage3',
      key:    'local_optimality_answered',
      value:  'no',
      emit:   { id: 'sig_non_monotone_constraint', strength: 0.90,
                basis: 'Local optimality denied — constraint is not monotone in window expansion' },
    },
    {
      stage:  'stage3',
      key:    'local_optimality_answered',
      value:  'unsure',
      emit:   { id: 'sig_non_monotone_constraint', strength: 0.65,
                basis: 'Local optimality uncertain — possible non-monotone constraint, needs verification' },
    },

    // Stage 4 — Hidden structure
    {
      stage:  'stage4',
      key:    'monotone_removal_confirmed',
      value:  true,
      emit:   { id: 'sig_monotone_removable', strength: 0.85,
                basis: 'Elements exit window in FIFO order — monotone deque is applicable' },
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function run(ir) {
    if (!ir || !ir.stage_log) return;

    const existing  = new Set(ir.signals.map(s => s.id));
    const newSignals = [];

    for (const rule of SIGNAL_RULES) {
      const entry = ir.stage_log[rule.stage];
      if (!entry || !entry.complete) continue;

      const answerValue = entry.answers?.[rule.key];
      if (answerValue !== rule.value) continue;

      // Deduplicate — keep highest strength if signal already present
      if (existing.has(rule.emit.id)) {
        const current = ir.signals.find(s => s.id === rule.emit.id);
        if (current && rule.emit.strength > current.strength) {
          current.strength = rule.emit.strength;
          current.basis    = rule.emit.basis;
        }
        continue;
      }

      newSignals.push({
        id:           rule.emit.id,
        strength:     rule.emit.strength,
        source_stage: rule.stage,
        basis:        rule.emit.basis,
      });

      existing.add(rule.emit.id);
    }

    if (newSignals.length > 0) {
      ir.signals.push(...newSignals);
    }
  }

  function getEngineId() { return ENGINE_ID; }

  return { run, getEngineId, SIGNAL_RULES };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = SignalEngine;
