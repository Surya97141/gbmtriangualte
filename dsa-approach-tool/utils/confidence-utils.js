// utils/confidence-utils.js
// Confidence score calculator — tracks verified vs assumed, gates Stage 7 output
// Used by: stage6-5/confidence-scorer.js, core/engine.js, stage7/output/summary-builder.js

const ConfidenceUtils = {

  // ─── CONSTANTS ─────────────────────────────────────────────────────────────

  LEVELS: {
    HIGH   : 'high',
    MEDIUM : 'medium',
    LOW    : 'low',
  },

  THRESHOLDS: {
    HIGH   : 75,   // score >= 75 → high confidence → proceed to coding
    MEDIUM : 45,   // score >= 45 → medium → verify one more thing
    LOW    : 0,    // score < 45  → low    → go back and re-analyze
  },

  // Maximum possible score — sum of all weights below
  MAX_SCORE: 100,

  // ─── SCORING WEIGHTS ───────────────────────────────────────────────────────
  // Each answered/verified item contributes points toward total confidence
  // Weights reflect how much each item narrows the approach

  WEIGHTS: {

    // Stage 0 — Complexity Budget
    complexity_budget_computed       : 8,   // op count calculated
    infeasible_classes_eliminated    : 6,   // at least one class crossed out
    memory_checked                   : 4,   // memory feasibility confirmed

    // Stage 1 — Input Anatomy
    input_type_identified            : 6,   // primary input shape selected
    secondary_signals_noted          : 3,   // at least one secondary signal
    query_type_identified            : 3,   // online/offline/none selected

    // Stage 2 — Output Anatomy
    output_form_identified           : 6,   // output shape selected
    optimization_type_identified     : 4,   // maximize/minimize/count etc
    solution_depth_identified        : 3,   // value only vs reconstruct path

    // Stage 2.5 — Decomposition
    decomposition_checked            : 4,   // explicitly checked if multi-part
    subproblems_identified           : 3,   // if decomposed — parts named

    // Stage 3 — Structural Properties
    order_sensitivity_answered       : 5,   // can sort freely — yes/no
    subproblem_overlap_answered      : 5,   // overlapping subproblems — yes/no
    feasibility_boundary_answered    : 5,   // monotonic boundary — yes/no
    local_optimality_answered        : 5,   // greedy safe — yes/no/unsure
    state_space_answered             : 4,   // state characterization done
    dependency_structure_answered    : 4,   // DAG or circular
    search_space_answered            : 3,   // shape of search space

    // Stage 3 sub-classifiers
    dp_subtype_identified            : 5,   // which DP variant
    graph_goal_identified            : 5,   // which graph algorithm goal

    // Stage 3.5 — Transformation
    transformation_check_done        : 4,   // explicitly checked for reframes
    reframe_questions_answered       : 3,   // all 8 reframe questions visited

    // Stage 4 — Constraint Interaction
    constraint_interaction_checked   : 4,   // multi-constraint combos checked
    hidden_structure_checked         : 3,   // implicit structure search done

    // Stage 5 — Verification
    greedy_counterexample_tested     : 8,   // tried to break greedy rule
    monotonicity_verified            : 8,   // X→X+1 check done with examples
    dp_state_verified                : 7,   // completeness + redundancy check
    graph_properties_verified        : 6,   // graph type confirmed
    keyword_crosscheck_done          : 3,   // language vs structure alignment

    // Stage 6 — Edge Cases
    universal_cases_reviewed         : 5,   // n=1, n=2, n=MAX etc reviewed
    type_specific_cases_reviewed     : 4,   // input-specific cases reviewed
  },

  // ─── PENALTIES ─────────────────────────────────────────────────────────────
  // Deductions for uncertainty or skipped verification

  PENALTIES: {
    property_answered_unsure         : -4,  // per property answered as "unsure"
    verification_skipped             : -6,  // per relevant verifier skipped
    no_counterexample_for_greedy     : -8,  // leaning greedy but never tested it
    state_not_verified_for_dp        : -7,  // leaning DP but state not verified
    transformation_skipped           : -4,  // Stage 3.5 entirely skipped
    edge_cases_skipped               : -5,  // Stage 6 entirely skipped
  },

  // ─── COMPUTE SCORE ─────────────────────────────────────────────────────────

  // Main function — takes sessionState, returns full confidence report
  compute(sessionState) {
    const answers = sessionState.answers ?? {};
    const earned  = [];
    const deducted = [];
    let   score   = 0;

    // ── Stage 0 ──────────────────────────────────────────────────────────────
    if (answers.stage0?.n) {
      score += this._award(earned, 'complexity_budget_computed');
    }
    if ((answers.stage0?.eliminated ?? []).length > 0) {
      score += this._award(earned, 'infeasible_classes_eliminated');
    }
    if (answers.stage0?.memChecked) {
      score += this._award(earned, 'memory_checked');
    }

    // ── Stage 1 ──────────────────────────────────────────────────────────────
    if ((answers.stage1?.inputTypes ?? []).length > 0) {
      score += this._award(earned, 'input_type_identified');
    }
    if ((answers.stage1?.secondarySignals ?? []).length > 0) {
      score += this._award(earned, 'secondary_signals_noted');
    }
    if (answers.stage1?.queryType) {
      score += this._award(earned, 'query_type_identified');
    }

    // ── Stage 2 ──────────────────────────────────────────────────────────────
    if (answers.stage2?.outputForm) {
      score += this._award(earned, 'output_form_identified');
    }
    if (answers.stage2?.optimizationType) {
      score += this._award(earned, 'optimization_type_identified');
    }
    if (answers.stage2?.solutionDepth) {
      score += this._award(earned, 'solution_depth_identified');
    }

    // ── Stage 2.5 ─────────────────────────────────────────────────────────────
    if (answers.stage2_5?.checked) {
      score += this._award(earned, 'decomposition_checked');
    }
    if ((answers.stage2_5?.subproblems ?? []).length > 0) {
      score += this._award(earned, 'subproblems_identified');
    }

    // ── Stage 3 — Properties ─────────────────────────────────────────────────
    const props = answers.stage3?.properties ?? {};
    const propKeys = [
      ['orderSensitivity',    'order_sensitivity_answered'],
      ['subproblemOverlap',   'subproblem_overlap_answered'],
      ['feasibilityBoundary', 'feasibility_boundary_answered'],
      ['localOptimality',     'local_optimality_answered'],
      ['stateSpace',          'state_space_answered'],
      ['dependencyStructure', 'dependency_structure_answered'],
      ['searchSpace',         'search_space_answered'],
    ];

    propKeys.forEach(([propId, weightKey]) => {
      const val = props[propId];
      if (val && val !== 'unanswered') {
        score += this._award(earned, weightKey);
        if (val === 'unsure') {
          score += this._penalize(deducted, 'property_answered_unsure');
        }
      }
    });

    // ── Stage 3 sub-classifiers ───────────────────────────────────────────────
    if (answers.stage3?.dpSubtype) {
      score += this._award(earned, 'dp_subtype_identified');
    }
    if (answers.stage3?.graphGoal) {
      score += this._award(earned, 'graph_goal_identified');
    }

    // ── Stage 3.5 ─────────────────────────────────────────────────────────────
    if (answers.stage3_5?.checked) {
      score += this._award(earned, 'transformation_check_done');
    } else {
      score += this._penalize(deducted, 'transformation_skipped');
    }
    if (answers.stage3_5?.reframeAnswered) {
      score += this._award(earned, 'reframe_questions_answered');
    }

    // ── Stage 4 ───────────────────────────────────────────────────────────────
    if (answers.stage4?.interactionChecked) {
      score += this._award(earned, 'constraint_interaction_checked');
    }
    if (answers.stage4?.hiddenStructureChecked) {
      score += this._award(earned, 'hidden_structure_checked');
    }

    // ── Stage 5 — Verification ────────────────────────────────────────────────
    const directions   = sessionState.output?.directions ?? [];
    const leaningGreedy = this._isLeaningToward(directions, 'greedy');
    const leaningDP     = this._isLeaningToward(directions, 'dp');
    const leaningBS     = this._isLeaningToward(directions, 'binary_search');
    const leaningGraph  = this._isLeaningToward(directions, 'graph');

    if (answers.stage5?.greedyTested) {
      score += this._award(earned, 'greedy_counterexample_tested');
    } else if (leaningGreedy) {
      score += this._penalize(deducted, 'no_counterexample_for_greedy');
    }

    if (answers.stage5?.monotonicityVerified) {
      score += this._award(earned, 'monotonicity_verified');
    }

    if (answers.stage5?.dpStateVerified) {
      score += this._award(earned, 'dp_state_verified');
    } else if (leaningDP) {
      score += this._penalize(deducted, 'state_not_verified_for_dp');
    }

    if (answers.stage5?.graphPropertiesVerified) {
      score += this._award(earned, 'graph_properties_verified');
    }

    if (answers.stage5?.keywordCrosscheckDone) {
      score += this._award(earned, 'keyword_crosscheck_done');
    }

    // Count skipped verifiers
    const relevantVerifiers = [
      leaningGreedy && !answers.stage5?.greedyTested,
      leaningBS     && !answers.stage5?.monotonicityVerified,
      leaningDP     && !answers.stage5?.dpStateVerified,
      leaningGraph  && !answers.stage5?.graphPropertiesVerified,
    ].filter(Boolean).length;

    for (let i = 0; i < relevantVerifiers; i++) {
      score += this._penalize(deducted, 'verification_skipped');
    }

    // ── Stage 6 — Edge Cases ─────────────────────────────────────────────────
    if (answers.stage6?.universalReviewed) {
      score += this._award(earned, 'universal_cases_reviewed');
    }
    if (answers.stage6?.typeSpecificReviewed) {
      score += this._award(earned, 'type_specific_cases_reviewed');
    }
    if (!answers.stage6?.universalReviewed && !answers.stage6?.typeSpecificReviewed) {
      score += this._penalize(deducted, 'edge_cases_skipped');
    }

    // ── Clamp and classify ────────────────────────────────────────────────────
    const clampedScore = Math.max(0, Math.min(this.MAX_SCORE, Math.round(score)));
    const level        = this._scoreToLevel(clampedScore);
    const gateAction   = this._gateAction(level, sessionState);

    return {
      score          : clampedScore,
      maxScore       : this.MAX_SCORE,
      percentage     : Math.round((clampedScore / this.MAX_SCORE) * 100),
      level          : level,
      earned         : earned,
      deducted       : deducted,
      gateAction     : gateAction,
      readyToCode    : level === this.LEVELS.HIGH,
      verifyFirst    : level === this.LEVELS.MEDIUM,
      goBack         : level === this.LEVELS.LOW,
    };
  },

  // ─── GATE ACTION ───────────────────────────────────────────────────────────
  // What to do based on confidence level

  _gateAction(level, sessionState) {
    if (level === this.LEVELS.HIGH) {
      return {
        action  : 'proceed',
        message : 'Confidence is high. Structural analysis is solid. Proceed to coding.',
        detail  : 'You have verified the key properties, tested edge cases, and the complexity fits. Start with the simplest correct implementation.',
        backTo  : null,
      };
    }

    if (level === this.LEVELS.MEDIUM) {
      const unverified = this._findFirstUnverified(sessionState);
      return {
        action  : 'verify',
        message : 'Confidence is medium. One key property is unverified.',
        detail  : unverified
          ? `Before coding — verify: ${unverified}`
          : 'Review your approach one more time before coding.',
        backTo  : unverified ? this._unverifiedToStage(unverified) : 'stage5',
      };
    }

    // Low
    const weakestStage = this._findWeakestStage(sessionState);
    return {
      action  : 'backtrack',
      message : 'Confidence is low. Structural analysis is incomplete.',
      detail  : `Too many properties assumed without verification. Return to ${weakestStage} and re-analyze.`,
      backTo  : weakestStage,
    };
  },

  // ─── DISPLAY HELPERS ───────────────────────────────────────────────────────

  // Format confidence for display
  formatLevel(level) {
    const map = {
      high   : { label: 'High',   color: 'green',  icon: '✓' },
      medium : { label: 'Medium', color: 'yellow', icon: '~' },
      low    : { label: 'Low',    color: 'red',    icon: '!' },
    };
    return map[level] ?? map.low;
  },

  // Build breakdown string for display
  buildBreakdown(report) {
    const lines = [];

    if (report.earned.length > 0) {
      lines.push('Earned:');
      report.earned.forEach(e => {
        lines.push(`  +${e.points}  ${e.label}`);
      });
    }

    if (report.deducted.length > 0) {
      lines.push('Deducted:');
      report.deducted.forEach(d => {
        lines.push(`  ${d.points}  ${d.label}`);
      });
    }

    lines.push(`Total: ${report.score} / ${report.maxScore}`);
    return lines.join('\n');
  },

  // ─── HISTORY TRACKING ──────────────────────────────────────────────────────

  // Compare confidence across multiple sessions
  // Sessions = array of { confidence, score }
  trend(sessions) {
    if (!sessions || sessions.length < 2) return 'insufficient_data';
    const recent = sessions.slice(0, 5);
    const avg    = recent.reduce((s, e) => s + (e.score ?? 0), 0) / recent.length;
    const prev   = sessions.slice(5, 10);
    if (prev.length === 0) return 'insufficient_data';
    const prevAvg = prev.reduce((s, e) => s + (e.score ?? 0), 0) / prev.length;
    if (avg > prevAvg + 5) return 'improving';
    if (avg < prevAvg - 5) return 'declining';
    return 'stable';
  },

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────

  _award(earned, key) {
    const points = this.WEIGHTS[key] ?? 0;
    earned.push({
      key,
      points,
      label: this._keyToLabel(key),
    });
    return points;
  },

  _penalize(deducted, key) {
    const points = this.PENALTIES[key] ?? 0;
    deducted.push({
      key,
      points,
      label: this._keyToLabel(key),
    });
    return points; // already negative
  },

  _scoreToLevel(score) {
    if (score >= this.THRESHOLDS.HIGH)   return this.LEVELS.HIGH;
    if (score >= this.THRESHOLDS.MEDIUM) return this.LEVELS.MEDIUM;
    return this.LEVELS.LOW;
  },

  _isLeaningToward(directions, type) {
    return directions.some(d =>
      (d.id ?? '').toLowerCase().includes(type) ||
      (d.family ?? '').toLowerCase().includes(type)
    );
  },

  _findFirstUnverified(sessionState) {
    const a = sessionState.answers ?? {};
    const directions = sessionState.output?.directions ?? [];

    if (this._isLeaningToward(directions, 'greedy') && !a.stage5?.greedyTested) {
      return 'greedy counter-example test';
    }
    if (this._isLeaningToward(directions, 'binary_search') && !a.stage5?.monotonicityVerified) {
      return 'monotonicity verification (X → X+1 check)';
    }
    if (this._isLeaningToward(directions, 'dp') && !a.stage5?.dpStateVerified) {
      return 'DP state completeness and redundancy check';
    }
    if (this._isLeaningToward(directions, 'graph') && !a.stage5?.graphPropertiesVerified) {
      return 'graph property confirmation (weighted? directed? cycles?)';
    }
    if (!a.stage6?.universalReviewed) {
      return 'universal edge cases (n=1, n=2, n=MAX, all-same)';
    }
    return null;
  },

  _unverifiedToStage(unverifiedLabel) {
    if (unverifiedLabel?.includes('greedy'))       return 'stage5';
    if (unverifiedLabel?.includes('monotonicity')) return 'stage5';
    if (unverifiedLabel?.includes('DP state'))     return 'stage5';
    if (unverifiedLabel?.includes('graph'))        return 'stage5';
    if (unverifiedLabel?.includes('edge cases'))   return 'stage6';
    return 'stage5';
  },

  _findWeakestStage(sessionState) {
    const a = sessionState.answers ?? {};
    if (!a.stage3 || Object.keys(a.stage3?.properties ?? {}).length < 3) {
      return 'stage3';
    }
    if (!a.stage2?.outputForm) return 'stage2';
    if (!a.stage1?.inputTypes?.length) return 'stage1';
    if (!a.stage0?.n) return 'stage0';
    return 'stage3';
  },

  _keyToLabel(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfidenceUtils;
}
