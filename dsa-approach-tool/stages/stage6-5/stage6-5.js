// stages/stage6-5/stage6-5.js
// Confidence Scoring stage — computes score from all previous stage answers,
// shows breakdown by stage, gates progression based on score band
// Module contract: render(state), onMount(state), cleanup()

const Stage6_5 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state  = null;
  let _report = null;

  // ─── SCORING WEIGHTS ──────────────────────────────────────────────────────
  // Points awarded per completed item — total possible ≈ 100

  const SCORE_MAP = {
    // Stage 0 — Complexity Budget (max 12)
    complexity_budget_computed    : 5,
    infeasible_classes_eliminated : 4,
    memory_checked                : 3,

    // Stage 1 — Input Anatomy (max 8)
    input_type_identified         : 5,
    secondary_signals_noted       : 2,
    query_type_identified         : 1,

    // Stage 2 — Output Anatomy (max 7)
    output_form_identified        : 4,
    optimization_type_identified  : 2,
    solution_depth_identified     : 1,

    // Stage 2.5 — Decomposition (max 5)
    decomposition_checked         : 3,
    subproblems_identified        : 2,

    // Stage 3 — Structural Properties (max 28)
    order_sensitivity_answered    : 4,
    subproblem_overlap_answered   : 4,
    feasibility_boundary_answered : 4,
    local_optimality_answered     : 4,
    state_space_answered          : 4,
    dependency_structure_answered : 4,
    search_space_answered         : 4,
    dp_subtype_identified         : 2,
    graph_goal_identified         : 2,

    // Stage 3.5 — Reframing (max 6)
    transformation_check_done     : 3,
    reframe_questions_answered    : 3,

    // Stage 4 — Constraints (max 6)
    constraint_interaction_checked: 4,
    hidden_structure_checked      : 2,

    // Stage 5 — Verification (max 15)
    greedy_counterexample_tested  : 4,
    monotonicity_verified         : 4,
    dp_state_verified             : 4,
    graph_properties_verified     : 4,
    keyword_crosscheck_done       : 3,

    // Stage 6 — Edge Cases (max 8)
    universal_cases_reviewed      : 4,
    type_specific_cases_reviewed  : 4,
  };

  // ─── PENALTY MAP ──────────────────────────────────────────────────────────

  const PENALTY_MAP = {
    property_answered_unsure      : -3,  // per unsure answer in stage 3
    verification_skipped          : -5,  // skipped relevant verifier
    no_counterexample_for_greedy  : -4,  // greedy direction but no test
    state_not_verified_for_dp     : -4,  // dp direction but state not checked
    transformation_skipped        : -2,  // reframe skipped
    edge_cases_skipped            : -5,  // left edge cases without reviewing
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state  = state;
    _report = _computeReport(state);

    const band = ConfidenceScorer.getBand(_report.score);

    State.setAnswer('stage6_5', {
      score      : _report.score,
      band       : band.level,
      report     : _report,
      computed   : true,
    });

    const wrapper = DomUtils.div({ class: 'stage stage6-5' }, [
      _buildIntro(),
      _buildScoreHero(band),
      _buildBreakdownSection(),
      _buildGateSection(band),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Confidence score — how complete is your structural analysis?'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'Computed from all previous stages. Must reach 75 to proceed.'
      ),
    ]);
  }

  // ─── SCORE HERO ───────────────────────────────────────────────────────────

  function _buildScoreHero(band) {
    const hero = DomUtils.div({
      class: `s65-hero s65-hero--${band.color}`,
      id   : 's65-hero',
    });

    // Score ring
    const ring = DomUtils.div({ class: 's65-ring' }, [
      DomUtils.div({ class: 's65-ring__score' }, String(_report.score)),
      DomUtils.div({ class: 's65-ring__max'   }, '/ 100'),
    ]);

    // Band info
    const bandInfo = DomUtils.div({ class: 's65-band-info' }, [
      DomUtils.div({ class: 's65-band-info__icon'    }, band.icon),
      DomUtils.div({ class: 's65-band-info__label'   }, band.label),
      DomUtils.div({ class: 's65-band-info__message' }, band.message),
      DomUtils.div({ class: 's65-band-info__detail'  }, band.detail),
    ]);

    // Band thresholds strip
    const thresholds = DomUtils.div({ class: 's65-thresholds' },
      ConfidenceScorer.getAllBands().map(b =>
        DomUtils.div({
          class: `s65-threshold s65-threshold--${b.color} ${b.level === band.level ? 's65-threshold--active' : ''}`,
        }, [
          DomUtils.span({ class: 's65-threshold__range' }, `${b.min}–${b.max}`),
          DomUtils.span({ class: 's65-threshold__label' }, b.label),
        ])
      )
    );

    DomUtils.append(hero, [ring, bandInfo, thresholds]);
    return hero;
  }

  // ─── BREAKDOWN SECTION ────────────────────────────────────────────────────

  function _buildBreakdownSection() {
    const section = DomUtils.div({ class: 's65-breakdown-section' });

    section.appendChild(
      DomUtils.div({ class: 's65-section-title' }, [
        DomUtils.span({}, 'Score breakdown by stage'),
        DomUtils.span({ class: 's65-section-sub' },
          'What contributed to your score'
        ),
      ])
    );

    const stageBreakdown = ConfidenceScorer.buildStageBreakdown(_report);

    stageBreakdown.forEach(group => {
      section.appendChild(_buildStageGroup(group));
    });

    // Total row
    section.appendChild(
      DomUtils.div({ class: 's65-breakdown-total' }, [
        DomUtils.span({ class: 's65-total-label' }, 'Total score'),
        DomUtils.span({
          class: `s65-total-value s65-total-value--${ConfidenceScorer.getBand(_report.score).color}`,
        }, String(_report.score)),
      ])
    );

    return section;
  }

  function _buildStageGroup(group) {
    const block = DomUtils.div({ class: 's65-stage-group' });

    // Stage header with subtotal
    const header = DomUtils.div({ class: 's65-stage-group__header' }, [
      DomUtils.span({ class: 's65-stage-group__name'     }, group.stage),
      DomUtils.span({
        class: `s65-stage-group__subtotal ${group.subtotal >= 0 ? 'subtotal--pos' : 'subtotal--neg'}`,
      }, group.subtotal >= 0 ? `+${group.subtotal}` : String(group.subtotal)),
    ]);

    block.appendChild(header);

    const rows = DomUtils.div({ class: 's65-stage-group__rows' });

    group.items.forEach(item => {
      const pts   = item.points ?? 0;
      const label = ConfidenceScorer.CATEGORY_LABELS[item.key] ?? item.key;

      rows.appendChild(
        DomUtils.div({ class: `s65-breakdown-row s65-breakdown-row--${pts >= 0 ? 'earned' : 'deducted'}` }, [
          DomUtils.span({ class: 's65-breakdown-row__label'  }, label),
          DomUtils.span({
            class: `s65-breakdown-row__points ${pts >= 0 ? 'points-pos' : 'points-neg'}`,
          }, pts >= 0 ? `+${pts}` : String(pts)),
        ])
      );
    });

    block.appendChild(rows);
    return block;
  }

  // ─── GATE SECTION ─────────────────────────────────────────────────────────

  function _buildGateSection(band) {
    const section = DomUtils.div({
      class: `s65-gate-section s65-gate-section--${band.color}`,
      id   : 's65-gate',
    });

    const gateAction = ConfidenceScorer.buildGateAction(
      band,
      _report.topUnverifiedItem ?? null,
      _report.weakestStage      ?? null
    );

    // Gate header
    section.appendChild(
      DomUtils.div({ class: 's65-gate__header' }, [
        DomUtils.div({ class: 's65-gate__verdict' }, band.label),
        DomUtils.div({ class: 's65-gate__detail'  }, gateAction.detail),
      ])
    );

    // Suggested action
    if (gateAction.action === 'verify' && _report.suggestions?.length) {
      const suggestEl = DomUtils.div({ class: 's65-gate__suggestions' });

      suggestEl.appendChild(
        DomUtils.div({ class: 's65-suggestions-label' },
          'Complete these to boost your score:'
        )
      );

      _report.suggestions.forEach(s => {
        suggestEl.appendChild(
          DomUtils.div({ class: 's65-suggestion-item' }, [
            DomUtils.span({ class: 's65-suggestion-item__icon' }, '→'),
            DomUtils.div({ class: 's65-suggestion-item__content' }, [
              DomUtils.div({ class: 's65-suggestion-item__text'  }, s.text),
              DomUtils.div({ class: 's65-suggestion-item__stage' }, `Go to: ${s.stage}`),
              DomUtils.span({ class: 's65-suggestion-item__pts'  }, `+${s.points} pts`),
            ]),
          ])
        );
      });

      section.appendChild(suggestEl);
    }

    if (gateAction.action === 'backtrack' && _report.weakestStage) {
      section.appendChild(
        DomUtils.div({ class: 's65-gate__backtrack' }, [
          DomUtils.span({ class: 'watchout-icon' }, '⚠'),
          DomUtils.span({},
            `Weakest area: ${_report.weakestStageName ?? _report.weakestStage}. ` +
            'Return and complete it before proceeding.'
          ),
        ])
      );
    }

    // Gate button
    const gateBtn = DomUtils.btn({
      class: `s65-gate-btn s65-gate-btn--${gateAction.style} ${band.level === 'low' ? 's65-gate-btn--disabled' : ''}`,
      id   : 's65-gate-btn',
    }, gateAction.label);

    if (band.level !== 'low') {
      gateBtn.addEventListener('click', () => _onGateAction(gateAction));
    }

    section.appendChild(gateBtn);

    // Override for medium — allow proceed anyway with warning
    if (band.level === 'medium') {
      const overrideBtn = DomUtils.btn({
        class: 's65-override-btn',
        id   : 's65-override-btn',
      }, 'Proceed anyway (accept risk)');

      overrideBtn.addEventListener('click', () => _onOverride());
      section.appendChild(overrideBtn);
    }

    return section;
  }

  // ─── SCORE COMPUTATION ────────────────────────────────────────────────────

  function _computeReport(state) {
    const answers  = state.answers ?? {};
    const earned   = [];
    const deducted = [];
    let   total    = 0;

    // ── Stage 0 ──────────────────────────────────────────────────────────────
    const s0 = answers.stage0 ?? {};
    if (s0.n && s0.budgetComputed) {
      _earn(earned, 'complexity_budget_computed', total);
      total += SCORE_MAP.complexity_budget_computed;
    }
    if (s0.infeasibleEliminated) {
      _earn(earned, 'infeasible_classes_eliminated', total);
      total += SCORE_MAP.infeasible_classes_eliminated;
    }
    if (s0.memoryChecked) {
      _earn(earned, 'memory_checked', total);
      total += SCORE_MAP.memory_checked;
    }

    // ── Stage 1 ──────────────────────────────────────────────────────────────
    const s1 = answers.stage1 ?? {};
    if (s1.inputTypes?.length) {
      _earn(earned, 'input_type_identified', total);
      total += SCORE_MAP.input_type_identified;
    }
    if (s1.secondarySignals?.length) {
      _earn(earned, 'secondary_signals_noted', total);
      total += SCORE_MAP.secondary_signals_noted;
    }
    if (s1.queryType) {
      _earn(earned, 'query_type_identified', total);
      total += SCORE_MAP.query_type_identified;
    }

    // ── Stage 2 ──────────────────────────────────────────────────────────────
    const s2 = answers.stage2 ?? {};
    if (s2.outputForm) {
      _earn(earned, 'output_form_identified', total);
      total += SCORE_MAP.output_form_identified;
    }
    if (s2.optimizationType) {
      _earn(earned, 'optimization_type_identified', total);
      total += SCORE_MAP.optimization_type_identified;
    }
    if (s2.solutionDepth) {
      _earn(earned, 'solution_depth_identified', total);
      total += SCORE_MAP.solution_depth_identified;
    }

    // ── Stage 2.5 ────────────────────────────────────────────────────────────
    const s25 = answers.stage2_5 ?? {};
    if (s25.decompositionChecked) {
      _earn(earned, 'decomposition_checked', total);
      total += SCORE_MAP.decomposition_checked;
    }
    if (s25.subproblems?.length) {
      _earn(earned, 'subproblems_identified', total);
      total += SCORE_MAP.subproblems_identified;
    }

    // ── Stage 3 ──────────────────────────────────────────────────────────────
    const s3       = answers.stage3   ?? {};
    const props    = s3.properties    ?? {};
    const propKeys = [
      'order_sensitivity', 'subproblem_overlap', 'feasibility_boundary',
      'local_optimality',  'state_space',        'dependency_structure',
      'search_space',
    ];

    let unsureCount = 0;

    propKeys.forEach(prop => {
      const scoreKey = `${prop}_answered`;
      if (props[prop] && props[prop] !== 'unsure') {
        _earn(earned, scoreKey, total);
        total += SCORE_MAP[scoreKey] ?? 4;
      } else if (props[prop] === 'unsure') {
        unsureCount++;
      }
    });

    if (unsureCount > 0) {
      const penalty = PENALTY_MAP.property_answered_unsure * unsureCount;
      _deduct(deducted, 'property_answered_unsure', penalty);
      total += penalty;
    }

    if (s3.dpSubtype) {
      _earn(earned, 'dp_subtype_identified', total);
      total += SCORE_MAP.dp_subtype_identified;
    }
    if (s3.graphGoal) {
      _earn(earned, 'graph_goal_identified', total);
      total += SCORE_MAP.graph_goal_identified;
    }

    // ── Stage 3.5 ────────────────────────────────────────────────────────────
    const s35 = answers.stage3_5 ?? {};
    if (s35.checked) {
      _earn(earned, 'transformation_check_done', total);
      total += SCORE_MAP.transformation_check_done;
    } else {
      _deduct(deducted, 'transformation_skipped', PENALTY_MAP.transformation_skipped);
      total += PENALTY_MAP.transformation_skipped;
    }

    if (s35.reframeAnswered) {
      _earn(earned, 'reframe_questions_answered', total);
      total += SCORE_MAP.reframe_questions_answered;
    }

    // ── Stage 4 ──────────────────────────────────────────────────────────────
    const s4 = answers.stage4 ?? {};
    if (s4.interactionChecked) {
      _earn(earned, 'constraint_interaction_checked', total);
      total += SCORE_MAP.constraint_interaction_checked;
    }
    if (s4.hiddenStructureChecked) {
      _earn(earned, 'hidden_structure_checked', total);
      total += SCORE_MAP.hidden_structure_checked;
    }

    // ── Stage 5 ──────────────────────────────────────────────────────────────
    const s5         = answers.stage5        ?? {};
    const directions = state.output?.directions ?? [];
    const families   = directions.map(d => d.family ?? '');

    const isGreedy = families.some(f => f.includes('greedy'));
    const isDP     = families.some(f => f.includes('dp'));
    const isBS     = families.some(f => f.includes('binary_search'));
    const isGraph  = families.some(f => f.includes('graph'));

    if (isGreedy) {
      if (s5.greedyTested) {
        _earn(earned, 'greedy_counterexample_tested', total);
        total += SCORE_MAP.greedy_counterexample_tested;
      } else {
        _deduct(deducted, 'no_counterexample_for_greedy', PENALTY_MAP.no_counterexample_for_greedy);
        total += PENALTY_MAP.no_counterexample_for_greedy;
      }
    }

    if (isBS && s5.monotonicityVerified) {
      _earn(earned, 'monotonicity_verified', total);
      total += SCORE_MAP.monotonicity_verified;
    }

    if (isDP) {
      if (s5.dpStateVerified) {
        _earn(earned, 'dp_state_verified', total);
        total += SCORE_MAP.dp_state_verified;
      } else {
        _deduct(deducted, 'state_not_verified_for_dp', PENALTY_MAP.state_not_verified_for_dp);
        total += PENALTY_MAP.state_not_verified_for_dp;
      }
    }

    if (isGraph && s5.graphPropertiesVerified) {
      _earn(earned, 'graph_properties_verified', total);
      total += SCORE_MAP.graph_properties_verified;
    }

    if (s5.keywordCrosscheckDone) {
      _earn(earned, 'keyword_crosscheck_done', total);
      total += SCORE_MAP.keyword_crosscheck_done;
    }

    // ── Stage 6 ──────────────────────────────────────────────────────────────
    const s6 = answers.stage6 ?? {};
    if (s6.universalReviewed) {
      _earn(earned, 'universal_cases_reviewed', total);
      total += SCORE_MAP.universal_cases_reviewed;
    }

    if (s6.typeSpecificReviewed) {
      _earn(earned, 'type_specific_cases_reviewed', total);
      total += SCORE_MAP.type_specific_cases_reviewed;
    }

    if (!s6.universalReviewed && !s6.typeSpecificReviewed) {
      _deduct(deducted, 'edge_cases_skipped', PENALTY_MAP.edge_cases_skipped);
      total += PENALTY_MAP.edge_cases_skipped;
    }

    // ── Clamp to [0, 100] ────────────────────────────────────────────────────
    const score = Math.max(0, Math.min(100, Math.round(total)));

    // ── Suggestions ──────────────────────────────────────────────────────────
    const suggestions = _buildSuggestions(earned, directions, s5, s6);

    // ── Weakest stage ────────────────────────────────────────────────────────
    const stageBreakdown = ConfidenceScorer.buildStageBreakdown({ earned, deducted });
    const weakest        = stageBreakdown
      .filter(g => !g.stage.startsWith('Penalty'))
      .sort((a, b) => a.subtotal - b.subtotal)[0];

    return {
      score,
      earned,
      deducted,
      suggestions,
      weakestStage    : weakest?.stage     ?? null,
      weakestStageName: weakest?.stage     ?? null,
      topUnverifiedItem: suggestions[0]?.text ?? null,
    };
  }

  function _earn(earned, key, _currentTotal) {
    earned.push({ key, points: SCORE_MAP[key] ?? 0 });
  }

  function _deduct(deducted, key, points) {
    deducted.push({ key, points });
  }

  function _buildSuggestions(earned, directions, s5, s6) {
    const earnedKeys = new Set(earned.map(e => e.key));
    const suggestions = [];
    const families = directions.map(d => d.family ?? '');

    if (!earnedKeys.has('universal_cases_reviewed')) {
      suggestions.push({
        text  : 'Review universal edge cases (n=1, n=max, all-negative)',
        stage : 'Stage 6',
        points: SCORE_MAP.universal_cases_reviewed,
      });
    }

    if (!earnedKeys.has('keyword_crosscheck_done')) {
      suggestions.push({
        text  : 'Complete keyword cross-check',
        stage : 'Stage 5',
        points: SCORE_MAP.keyword_crosscheck_done,
      });
    }

    if (families.some(f => f.includes('dp')) && !earnedKeys.has('dp_state_verified')) {
      suggestions.push({
        text  : 'Verify DP state completeness and non-redundancy',
        stage : 'Stage 5',
        points: SCORE_MAP.dp_state_verified,
      });
    }

    if (families.some(f => f.includes('greedy')) && !earnedKeys.has('greedy_counterexample_tested')) {
      suggestions.push({
        text  : 'Test greedy counter-example on adversarial input',
        stage : 'Stage 5',
        points: SCORE_MAP.greedy_counterexample_tested,
      });
    }

    if (!earnedKeys.has('transformation_check_done')) {
      suggestions.push({
        text  : 'Complete the reframing check',
        stage : 'Stage 3.5',
        points: SCORE_MAP.transformation_check_done,
      });
    }

    return suggestions.slice(0, 3); // top 3 only
  }

  // ─── GATE HANDLERS ────────────────────────────────────────────────────────

  function _onGateAction(gateAction) {
    if (gateAction.action === 'proceed') {
      Renderer.setNextEnabled(true);
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage6_5',
          answers: State.getAnswer('stage6_5') ?? {},
        },
      }));
    } else if (gateAction.backTo) {
      Router.navigate(gateAction.backTo);
    }
  }

  function _onOverride() {
    State.setAnswer('stage6_5', { overrideProceeded: true });
    Renderer.setNextEnabled(true);
    document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
      detail: {
        stageId : 'stage6_5',
        override: true,
        answers : State.getAnswer('stage6_5') ?? {},
      },
    }));
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage6_5;
    if (!saved?.score) return;

    const band = ConfidenceScorer.getBand(saved.score);
    if (band.level === 'high' || saved.overrideProceeded) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state  = null;
    _report = null;
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage6_5;
}