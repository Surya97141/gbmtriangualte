// core/confidence-engine.js
// Responsibility: Compute the confidence score from the current IR state.
// This is the single authoritative confidence computation — it replaces the
// duplicate scoring in stage6-5.js (_computeReport) and the legacy
// ConfidenceUtils.compute() call in engine.js.
//
// Reads: full IR (stage_log, active_invariants, hypotheses, misconception_risk, contradictions)
// Writes: ir.confidence (score, band, gate_action, earned, deducted, weakest_stage)
// Engine ID: E9

const ConfidenceEngine = (() => {

  const ENGINE_ID = 'E9';

  // Points awarded per completed and verified item
  const SCORE_MAP = {
    complexity_budget_computed:    5,
    infeasible_classes_eliminated: 3,
    memory_checked:                2,
    input_type_identified:         3,
    secondary_signals_noted:       2,
    query_type_identified:         2,
    output_form_identified:        4,
    optimization_type_identified:  4,
    solution_depth_identified:     2,
    decomposition_checked:         2,
    subproblems_identified:        2,
    order_sensitivity_answered:    3,
    feasibility_boundary_answered: 5,
    local_optimality_answered:     5,
    state_space_answered:          4,
    subproblem_overlap_answered:   2,
    dependency_structure_answered: 2,
    transformation_check_done:     3,
    reframe_questions_answered:    2,
    constraint_interaction_checked:3,
    hidden_structure_checked:      3,
    monotonicity_verified:         8,
    keyword_crosscheck_done:       3,
    universal_cases_reviewed:      5,
    type_specific_cases_reviewed:  5,
  };

  // Penalties applied when conditions are met
  const PENALTY_MAP = {
    property_answered_unsure:     -3,   // per unsure answer
    verification_skipped:         -8,   // verification stage skipped entirely
    no_counterexample_for_greedy: -5,
    state_not_verified_for_dp:    -5,
    transformation_skipped:       -4,
    edge_cases_skipped:           -6,
    unresolved_contradiction:     -15,  // per unresolved contradiction
  };

  // Bonus multiplier applied to hypothesis confidence when invariants are verified
  const VERIFICATION_BONUS_PER_INVARIANT = 0.10;
  const VERIFICATION_BONUS_CAP           = 0.30;

  // Score bands
  const BANDS = [
    { min: 85, max: 100, level: 'high',   label: 'High Confidence',   gate_action: 'proceed'   },
    { min: 65, max: 84,  level: 'medium', label: 'Medium Confidence', gate_action: 'verify'    },
    { min: 0,  max: 64,  level: 'low',    label: 'Low Confidence',    gate_action: 'backtrack' },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function run(ir) {
    if (!ir) return;

    const earned   = [];
    const deducted = [];

    _scoreStageCompletions(ir.stage_log, earned);
    _applyVerificationBonuses(ir.active_invariants, earned);
    _applyPenalties(ir, deducted);

    const rawScore    = _sum(earned) + _sum(deducted);
    const score       = Math.max(0, Math.min(100, Math.round(rawScore)));
    const band        = _getBand(score);
    const weakestStage = _findWeakestStage(ir.stage_log);

    ir.confidence = {
      score,
      band:         band.level,
      label:        band.label,
      gate_action:  _resolveGateAction(band, ir.contradictions),
      earned,
      deducted,
      weakest_stage: weakestStage,
    };
  }

  function getBand(score) {
    return _getBand(score);
  }

  function getEngineId() {
    return ENGINE_ID;
  }

  // ─── PRIVATE ───────────────────────────────────────────────────────────────

  function _scoreStageCompletions(stageLog, earned) {
    if (!stageLog) return;
    for (const [, entry] of Object.entries(stageLog)) {
      if (!entry.complete || !entry.answers) continue;
      for (const [key, answered] of Object.entries(entry.answers)) {
        if (answered && answered !== 'unsure' && answered !== false && SCORE_MAP[key] !== undefined) {
          earned.push({ key, points: SCORE_MAP[key] });
        }
      }
    }
  }

  function _applyVerificationBonuses(activeInvariants, earned) {
    if (!activeInvariants) return;
    const verifiedCount = activeInvariants.filter(i => i.verified).length;
    if (verifiedCount === 0) return;
    const bonus = Math.min(
      verifiedCount * VERIFICATION_BONUS_PER_INVARIANT * 10,
      VERIFICATION_BONUS_CAP * 10
    );
    earned.push({ key: 'invariant_verification_bonus', points: Math.round(bonus) });
  }

  function _applyPenalties(ir, deducted) {
    // Unresolved hard contradictions
    const unresolvedContradictions = (ir.contradictions ?? []).filter(c => !c.resolution);
    if (unresolvedContradictions.length > 0) {
      deducted.push({
        key:    'unresolved_contradiction',
        points: PENALTY_MAP.unresolved_contradiction * unresolvedContradictions.length,
      });
    }

    // Count unsure answers across all stage logs
    let unsureCount = 0;
    for (const entry of Object.values(ir.stage_log ?? {})) {
      for (const val of Object.values(entry.answers ?? {})) {
        if (val === 'unsure') unsureCount++;
      }
    }
    if (unsureCount > 0) {
      deducted.push({
        key:    'property_answered_unsure',
        points: PENALTY_MAP.property_answered_unsure * unsureCount,
      });
    }
  }

  function _getBand(score) {
    return BANDS.find(b => score >= b.min && score <= b.max) ?? BANDS[BANDS.length - 1];
  }

  function _resolveGateAction(band, contradictions) {
    const hasUnresolved = (contradictions ?? []).some(c => !c.resolution);
    if (hasUnresolved) return 'backtrack';
    return band.gate_action;
  }

  function _findWeakestStage(stageLog) {
    if (!stageLog) return null;
    let weakest = null;
    let lowestCompletion = Infinity;
    for (const [stageId, entry] of Object.entries(stageLog)) {
      const answered = Object.values(entry.answers ?? {}).filter(v => v !== false).length;
      if (answered < lowestCompletion) {
        lowestCompletion = answered;
        weakest = stageId;
      }
    }
    return weakest;
  }

  function _sum(items) {
    return items.reduce((acc, item) => acc + (item.points ?? 0), 0);
  }

  return {
    run,
    getBand,
    getEngineId,
    SCORE_MAP,
    PENALTY_MAP,
    BANDS,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = ConfidenceEngine;
