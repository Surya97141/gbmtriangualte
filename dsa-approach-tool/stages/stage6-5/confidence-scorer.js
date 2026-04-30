// stages/stage6-5/confidence-scorer.js
// Confidence score computation and display helpers
// Used by: stage6-5.js

const ConfidenceScorer = (() => {

  // ─── SCORE BREAKDOWN DISPLAY ──────────────────────────────────────────────

  const SCORE_BANDS = [
    {
      min    : 75,
      max    : 100,
      level  : 'high',
      label  : 'High Confidence',
      icon   : '✓',
      color  : 'green',
      action : 'proceed',
      message: 'Structural analysis is solid. Approach is verified. Proceed to coding.',
      detail : 'You have verified key properties, tested edge cases, and the complexity fits. Start with the simplest correct implementation.',
    },
    {
      min    : 45,
      max    : 74,
      level  : 'medium',
      label  : 'Medium Confidence',
      icon   : '~',
      color  : 'yellow',
      action : 'verify',
      message: 'One or more properties need verification before coding.',
      detail : 'You are close but there is at least one unverified assumption. Complete the suggested verification before writing code.',
    },
    {
      min    : 0,
      max    : 44,
      level  : 'low',
      label  : 'Low Confidence',
      icon   : '!',
      color  : 'red',
      action : 'backtrack',
      message: 'Too many assumptions remain unverified. Risk of WA or TLE is high.',
      detail : 'The structural analysis is incomplete. Return to the suggested stage and re-analyze before coding.',
    },
  ];

  // ─── SCORE CATEGORY LABELS ────────────────────────────────────────────────

  const CATEGORY_LABELS = {
    // Stage 0
    complexity_budget_computed    : 'Complexity budget computed',
    infeasible_classes_eliminated : 'Infeasible classes eliminated',
    memory_checked                : 'Memory feasibility checked',

    // Stage 1
    input_type_identified         : 'Input type identified',
    secondary_signals_noted       : 'Secondary signals noted',
    query_type_identified         : 'Query type identified',

    // Stage 2
    output_form_identified        : 'Output form identified',
    optimization_type_identified  : 'Optimization type identified',
    solution_depth_identified     : 'Solution depth identified',

    // Stage 2.5
    decomposition_checked         : 'Decomposition checked',
    subproblems_identified        : 'Subproblems identified',

    // Stage 3
    order_sensitivity_answered    : 'Order sensitivity answered',
    subproblem_overlap_answered   : 'Subproblem overlap answered',
    feasibility_boundary_answered : 'Feasibility boundary answered',
    local_optimality_answered     : 'Local optimality answered',
    state_space_answered          : 'State space answered',
    dependency_structure_answered : 'Dependency structure answered',
    search_space_answered         : 'Search space answered',
    dp_subtype_identified         : 'DP sub-type identified',
    graph_goal_identified         : 'Graph goal identified',

    // Stage 3.5
    transformation_check_done     : 'Transformation check done',
    reframe_questions_answered    : 'Reframe questions answered',

    // Stage 4
    constraint_interaction_checked: 'Constraint interaction checked',
    hidden_structure_checked      : 'Hidden structure checked',

    // Stage 5
    greedy_counterexample_tested  : 'Greedy counter-example tested',
    monotonicity_verified         : 'Monotonicity verified',
    dp_state_verified             : 'DP state verified',
    graph_properties_verified     : 'Graph properties verified',
    keyword_crosscheck_done       : 'Keyword cross-check done',

    // Stage 6
    universal_cases_reviewed      : 'Universal edge cases reviewed',
    type_specific_cases_reviewed  : 'Type-specific cases reviewed',

    // Penalties
    property_answered_unsure      : 'Property answered as unsure',
    verification_skipped          : 'Relevant verifier skipped',
    no_counterexample_for_greedy  : 'No counter-example test for greedy',
    state_not_verified_for_dp     : 'DP state not verified',
    transformation_skipped        : 'Transformation check skipped',
    edge_cases_skipped            : 'Edge cases skipped',
  };

  // ─── SCORE BAND LOOKUP ────────────────────────────────────────────────────

  function getBand(score) {
    return SCORE_BANDS.find(b => score >= b.min && score <= b.max)
      ?? SCORE_BANDS[SCORE_BANDS.length - 1];
  }

  function getAllBands() {
    return [...SCORE_BANDS];
  }

  // ─── BREAKDOWN RENDERING ──────────────────────────────────────────────────

  // Build a human-readable breakdown of earned and deducted items
  function buildBreakdownRows(report) {
    const rows = [];

    if (report.earned?.length) {
      report.earned.forEach(e => {
        rows.push({
          type  : 'earned',
          key   : e.key,
          label : CATEGORY_LABELS[e.key] ?? e.key,
          points: `+${e.points}`,
          color : 'green',
        });
      });
    }

    if (report.deducted?.length) {
      report.deducted.forEach(d => {
        rows.push({
          type  : 'deducted',
          key   : d.key,
          label : CATEGORY_LABELS[d.key] ?? d.key,
          points: String(d.points), // already negative
          color : 'red',
        });
      });
    }

    return rows;
  }

  // Build a per-stage summary showing contribution from each stage
  function buildStageBreakdown(report) {
    const stageGroups = {
      'Stage 0 — Complexity': [],
      'Stage 1 — Input':      [],
      'Stage 2 — Output':     [],
      'Stage 2.5 — Decomp':  [],
      'Stage 3 — Structure': [],
      'Stage 3.5 — Reframe': [],
      'Stage 4 — Constraints':[],
      'Stage 5 — Verify':    [],
      'Stage 6 — Edge Cases':[],
      'Penalties':            [],
    };

    const KEY_STAGE_MAP = {
      complexity_budget_computed    : 'Stage 0 — Complexity',
      infeasible_classes_eliminated : 'Stage 0 — Complexity',
      memory_checked                : 'Stage 0 — Complexity',
      input_type_identified         : 'Stage 1 — Input',
      secondary_signals_noted       : 'Stage 1 — Input',
      query_type_identified         : 'Stage 1 — Input',
      output_form_identified        : 'Stage 2 — Output',
      optimization_type_identified  : 'Stage 2 — Output',
      solution_depth_identified     : 'Stage 2 — Output',
      decomposition_checked         : 'Stage 2.5 — Decomp',
      subproblems_identified        : 'Stage 2.5 — Decomp',
      order_sensitivity_answered    : 'Stage 3 — Structure',
      subproblem_overlap_answered   : 'Stage 3 — Structure',
      feasibility_boundary_answered : 'Stage 3 — Structure',
      local_optimality_answered     : 'Stage 3 — Structure',
      state_space_answered          : 'Stage 3 — Structure',
      dependency_structure_answered : 'Stage 3 — Structure',
      search_space_answered         : 'Stage 3 — Structure',
      dp_subtype_identified         : 'Stage 3 — Structure',
      graph_goal_identified         : 'Stage 3 — Structure',
      transformation_check_done     : 'Stage 3.5 — Reframe',
      reframe_questions_answered    : 'Stage 3.5 — Reframe',
      constraint_interaction_checked: 'Stage 4 — Constraints',
      hidden_structure_checked      : 'Stage 4 — Constraints',
      greedy_counterexample_tested  : 'Stage 5 — Verify',
      monotonicity_verified         : 'Stage 5 — Verify',
      dp_state_verified             : 'Stage 5 — Verify',
      graph_properties_verified     : 'Stage 5 — Verify',
      keyword_crosscheck_done       : 'Stage 5 — Verify',
      universal_cases_reviewed      : 'Stage 6 — Edge Cases',
      type_specific_cases_reviewed  : 'Stage 6 — Edge Cases',
    };

    const PENALTY_KEYS = new Set([
      'property_answered_unsure',
      'verification_skipped',
      'no_counterexample_for_greedy',
      'state_not_verified_for_dp',
      'transformation_skipped',
      'edge_cases_skipped',
    ]);

    const allItems = [
      ...(report.earned   ?? []).map(e => ({ ...e, sign: 1  })),
      ...(report.deducted ?? []).map(d => ({ ...d, sign: -1 })),
    ];

    allItems.forEach(item => {
      const key = item.key;
      if (PENALTY_KEYS.has(key)) {
        stageGroups['Penalties'].push(item);
      } else {
        const group = KEY_STAGE_MAP[key] ?? 'Stage 3 — Structure';
        if (stageGroups[group]) stageGroups[group].push(item);
      }
    });

    return Object.entries(stageGroups)
      .filter(([, items]) => items.length > 0)
      .map(([stage, items]) => ({
        stage,
        items,
        subtotal: items.reduce((sum, i) => sum + (i.points ?? 0), 0),
      }));
  }

  // ─── GATE ACTION BUILDER ──────────────────────────────────────────────────

  function buildGateAction(band, unverifiedItem, weakestStage) {
    if (band.level === 'high') {
      return {
        action : 'proceed',
        label  : 'Proceed to Output →',
        style  : 'primary',
        detail : band.detail,
        backTo : null,
      };
    }

    if (band.level === 'medium') {
      return {
        action : 'verify',
        label  : unverifiedItem
          ? `Verify first: ${unverifiedItem}`
          : 'Complete one more verification',
        style  : 'secondary',
        detail : band.detail,
        backTo : 'stage5',
      };
    }

    return {
      action : 'backtrack',
      label  : `Go back to ${weakestStage ?? 'Stage 3'}`,
      style  : 'warning',
      detail : band.detail,
      backTo : weakestStage ?? 'stage3',
    };
  }

  // ─── TREND ANALYSIS ───────────────────────────────────────────────────────

  function analyzeTrend(sessions) {
    if (!sessions || sessions.length < 2) return null;

    const recent = sessions.slice(0, 5).map(s => s.score ?? 0);
    const older  = sessions.slice(5, 10).map(s => s.score ?? 0);

    if (older.length === 0) return null;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg  = older.reduce((a, b)  => a + b, 0) / older.length;

    if (recentAvg > olderAvg + 5)  return 'improving';
    if (recentAvg < olderAvg - 5)  return 'declining';
    return 'stable';
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return {
    getBand,
    getAllBands,
    buildBreakdownRows,
    buildStageBreakdown,
    buildGateAction,
    analyzeTrend,
    CATEGORY_LABELS,
    SCORE_BANDS,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfidenceScorer;
}