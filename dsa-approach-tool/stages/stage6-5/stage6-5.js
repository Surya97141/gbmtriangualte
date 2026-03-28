// stages/stage6-5/stage6-5.js
// Confidence Scoring — cream/white theme, self-contained styles
// Same pattern as stage0/1/2/2-5/3/3-5/4/4-5/5/6

const Stage6_5 = (() => {

  let _state  = null;
  let _report = null;

  // ─── SCORE / PENALTY MAPS ──────────────────────────────────────────────────

  const SCORE_MAP = {
    complexity_budget_computed   : 5,
    infeasible_classes_eliminated: 4,
    memory_checked               : 3,
    input_type_identified        : 5,
    secondary_signals_noted      : 2,
    query_type_identified        : 1,
    output_form_identified       : 4,
    optimization_type_identified : 2,
    solution_depth_identified    : 1,
    decomposition_checked        : 3,
    subproblems_identified       : 2,
    order_sensitivity_answered   : 4,
    subproblem_overlap_answered  : 4,
    feasibility_boundary_answered: 4,
    local_optimality_answered    : 4,
    state_space_answered         : 4,
    dependency_structure_answered: 4,
    search_space_answered        : 4,
    dp_subtype_identified        : 2,
    graph_goal_identified        : 2,
    transformation_check_done    : 3,
    reframe_questions_answered   : 3,
    constraint_interaction_checked: 4,
    hidden_structure_checked     : 2,
    greedy_counterexample_tested : 4,
    monotonicity_verified        : 4,
    dp_state_verified            : 4,
    graph_properties_verified    : 4,
    keyword_crosscheck_done      : 3,
    universal_cases_reviewed     : 4,
    type_specific_cases_reviewed : 4,
  };

  const PENALTY_MAP = {
    property_answered_unsure    : -3,
    verification_skipped        : -5,
    no_counterexample_for_greedy: -4,
    state_not_verified_for_dp   : -4,
    transformation_skipped      : -2,
    edge_cases_skipped          : -5,
  };

  const CATEGORY_LABELS = {
    complexity_budget_computed   : 'Complexity budget computed',
    infeasible_classes_eliminated: 'Infeasible classes eliminated',
    memory_checked               : 'Memory check done',
    input_type_identified        : 'Input type identified',
    secondary_signals_noted      : 'Secondary signals noted',
    query_type_identified        : 'Query type identified',
    output_form_identified       : 'Output form identified',
    optimization_type_identified : 'Optimization type identified',
    solution_depth_identified    : 'Solution depth identified',
    decomposition_checked        : 'Decomposition checked',
    subproblems_identified       : 'Sub-problems identified',
    order_sensitivity_answered   : 'Order sensitivity answered',
    subproblem_overlap_answered  : 'Subproblem overlap answered',
    feasibility_boundary_answered: 'Feasibility boundary answered',
    local_optimality_answered    : 'Local optimality answered',
    state_space_answered         : 'State space answered',
    dependency_structure_answered: 'Dependency structure answered',
    search_space_answered        : 'Search space answered',
    dp_subtype_identified        : 'DP subtype identified',
    graph_goal_identified        : 'Graph goal identified',
    transformation_check_done    : 'Transformation checked',
    reframe_questions_answered   : 'Reframe questions answered',
    constraint_interaction_checked: 'Constraint interaction checked',
    hidden_structure_checked     : 'Hidden structure checked',
    greedy_counterexample_tested : 'Greedy counter-example tested',
    monotonicity_verified        : 'Monotonicity verified',
    dp_state_verified            : 'DP state verified',
    graph_properties_verified    : 'Graph properties verified',
    keyword_crosscheck_done      : 'Keyword cross-check done',
    universal_cases_reviewed     : 'Universal edge cases reviewed',
    type_specific_cases_reviewed : 'Type-specific cases reviewed',
    property_answered_unsure     : 'Unsure answers (penalty per)',
    no_counterexample_for_greedy : 'Greedy not tested (penalty)',
    state_not_verified_for_dp    : 'DP state not verified (penalty)',
    transformation_skipped       : 'Reframing skipped (penalty)',
    edge_cases_skipped           : 'Edge cases skipped (penalty)',
  };

  const STAGE_GROUPS = [
    { label: 'Stage 0 — Complexity',    keys: ['complexity_budget_computed','infeasible_classes_eliminated','memory_checked'] },
    { label: 'Stage 1 — Input Anatomy', keys: ['input_type_identified','secondary_signals_noted','query_type_identified'] },
    { label: 'Stage 2 — Output Anatomy',keys: ['output_form_identified','optimization_type_identified','solution_depth_identified'] },
    { label: 'Stage 2.5 — Decomposition',keys:['decomposition_checked','subproblems_identified'] },
    { label: 'Stage 3 — Structure',     keys: ['order_sensitivity_answered','subproblem_overlap_answered','feasibility_boundary_answered','local_optimality_answered','state_space_answered','dependency_structure_answered','search_space_answered','dp_subtype_identified','graph_goal_identified'] },
    { label: 'Stage 3.5 — Reframing',   keys: ['transformation_check_done','reframe_questions_answered'] },
    { label: 'Stage 4 — Constraints',   keys: ['constraint_interaction_checked','hidden_structure_checked'] },
    { label: 'Stage 5 — Verification',  keys: ['greedy_counterexample_tested','monotonicity_verified','dp_state_verified','graph_properties_verified','keyword_crosscheck_done'] },
    { label: 'Stage 6 — Edge Cases',    keys: ['universal_cases_reviewed','type_specific_cases_reviewed'] },
    { label: 'Penalties',               keys: ['property_answered_unsure','no_counterexample_for_greedy','state_not_verified_for_dp','transformation_skipped','edge_cases_skipped'] },
  ];

  const BANDS = [
    { level: 'high',   min: 85, max: 100, label: 'High Confidence',   color: 'green',  icon: '✓',  message: 'Thorough analysis — proceed to Stage 7',          detail: 'Your structural analysis is comprehensive. Proceed with confidence.' },
    { level: 'medium', min: 65, max: 84,  label: 'Moderate Confidence',color: 'yellow', icon: '~',  message: 'Reasonable analysis — consider a few improvements', detail: 'Most structures identified. A few gaps may cause issues at implementation.' },
    { level: 'low',    min: 0,  max: 64,  label: 'Low Confidence',     color: 'red',    icon: '✗',  message: 'Incomplete analysis — return and fill gaps',         detail: 'Significant gaps in structural analysis. Proceeding risks wrong architecture.' },
  ];

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state  = state;
    _report = _computeReport(state);

    const band = _getBand(_report.score);

    const CS = typeof ConfidenceScorer !== 'undefined' ? ConfidenceScorer : null;
    if (CS) {
      State.setAnswer('stage6_5', {
        score   : _report.score,
        band    : band.level,
        report  : _report,
        computed: true,
      });
    } else {
      State.setAnswer('stage6_5', {
        score: _report.score, band: band.level, computed: true,
      });
    }

    _injectStyles();

    const wrapper = document.createElement('div');
    wrapper.className = 's65-shell';

    wrapper.innerHTML = `
      <div class="s65-main">

        <div class="s65-rule">
          Confidence score — how complete is your structural analysis?
          Computed from all previous stages. High confidence (≥85) recommended to proceed.
        </div>

        <!-- Score hero -->
        <div class="s65-hero s65-hero--${band.color}" id="s65-hero">
          <div class="s65-ring">
            <div class="s65-ring-score">${_report.score}</div>
            <div class="s65-ring-max">/ 100</div>
          </div>
          <div class="s65-band-info">
            <div class="s65-band-icon">${band.icon}</div>
            <div class="s65-band-label">${band.label}</div>
            <div class="s65-band-message">${band.message}</div>
            <div class="s65-band-detail">${band.detail}</div>
          </div>
          <div class="s65-thresholds">
            ${BANDS.map(b => `
              <div class="s65-threshold s65-threshold--${b.color} ${b.level===band.level?'s65-threshold--active':''}">
                <span class="s65-threshold-range">${b.min}–${b.max}</span>
                <span class="s65-threshold-label">${b.label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Score breakdown -->
        <section class="s65-section">
          <div class="s65-section-header">
            <span class="s65-section-num">📊</span>
            <div>
              <div class="s65-section-title">Score breakdown by stage</div>
              <div class="s65-section-sub">What contributed to your score</div>
            </div>
          </div>
          <div class="s65-breakdown" id="s65-breakdown"></div>
          <div class="s65-total-row">
            <span class="s65-total-label">Total score</span>
            <span class="s65-total-value s65-total-value--${band.color}">${_report.score}</span>
          </div>
        </section>

        <!-- Gate section -->
        <div class="s65-gate s65-gate--${band.color}" id="s65-gate">
          <div class="s65-gate-verdict">${band.label}</div>
          <div class="s65-gate-detail" id="s65-gate-detail"></div>
          <div id="s65-gate-suggestions"></div>
          <div class="s65-gate-btns" id="s65-gate-btns"></div>
        </div>

      </div>

      <!-- Live side panel -->
      <aside class="s65-panel">
        <div class="s65-panel-header">
          <div class="s65-panel-title">Confidence analysis</div>
          <div class="s65-panel-sub">Your stage-by-stage score</div>
        </div>
        <div class="s65-panel-body" id="s65-panel-body"></div>
      </aside>
    `;

    _buildBreakdown(wrapper);
    _buildGate(wrapper, band);
    _buildPanel(wrapper, band);

    return wrapper;
  }

  // ─── BREAKDOWN ─────────────────────────────────────────────────────────────

  function _buildBreakdown(wrapper) {
    const container = wrapper.querySelector('#s65-breakdown');
    if (!container) return;

    const earnedKeys   = new Set(_report.earned.map(e => e.key));
    const deductedKeys = new Set(_report.deducted.map(d => d.key));
    const deductedMap  = {};
    _report.deducted.forEach(d => { deductedMap[d.key] = d.points; });

    STAGE_GROUPS.forEach(group => {
      // Check if this group has any relevant items
      const isPenalty   = group.label === 'Penalties';
      const relevantItems = isPenalty
        ? group.keys.filter(k => deductedKeys.has(k))
        : group.keys.filter(k => earnedKeys.has(k) || SCORE_MAP[k]);

      // Build subtotal
      let subtotal = 0;
      if (isPenalty) {
        group.keys.forEach(k => { if (deductedMap[k]) subtotal += deductedMap[k]; });
      } else {
        group.keys.forEach(k => { if (earnedKeys.has(k)) subtotal += (SCORE_MAP[k] ?? 0); });
      }

      if (!isPenalty && subtotal === 0 && relevantItems.length === 0) return;
      if (isPenalty && subtotal === 0) return;

      const grpEl = document.createElement('div');
      grpEl.className = 's65-stage-group';
      grpEl.innerHTML = `
        <div class="s65-stage-group-header">
          <span class="s65-stage-group-name">${group.label}</span>
          <span class="s65-stage-group-subtotal ${subtotal >= 0 ? 's65-pts-pos' : 's65-pts-neg'}">${subtotal >= 0 ? '+'+subtotal : subtotal}</span>
        </div>
      `;

      const rows = document.createElement('div');
      rows.className = 's65-stage-group-rows';

      if (isPenalty) {
        group.keys.forEach(k => {
          if (!deductedMap[k]) return;
          const pts = deductedMap[k];
          const row = document.createElement('div');
          row.className = 's65-row s65-row--deducted';
          row.innerHTML = `
            <span class="s65-row-label">${CATEGORY_LABELS[k] ?? k}</span>
            <span class="s65-pts-neg">${pts}</span>
          `;
          rows.appendChild(row);
        });
      } else {
        group.keys.forEach(k => {
          const isEarned = earnedKeys.has(k);
          const pts      = isEarned ? (SCORE_MAP[k] ?? 0) : 0;
          const row      = document.createElement('div');
          row.className  = `s65-row ${isEarned ? 's65-row--earned' : 's65-row--missed'}`;
          row.innerHTML  = `
            <span class="s65-row-label">${CATEGORY_LABELS[k] ?? k}</span>
            <span class="${isEarned ? 's65-pts-pos' : 's65-pts-zero'}">${isEarned ? '+'+pts : '—'}</span>
          `;
          rows.appendChild(row);
        });
      }

      grpEl.appendChild(rows);
      container.appendChild(grpEl);
    });
  }

  // ─── GATE ──────────────────────────────────────────────────────────────────

  function _buildGate(wrapper, band) {
    const detail     = wrapper.querySelector('#s65-gate-detail');
    const sugBox     = wrapper.querySelector('#s65-gate-suggestions');
    const btnsBox    = wrapper.querySelector('#s65-gate-btns');
    if (!detail || !sugBox || !btnsBox) return;

    detail.textContent = band.detail;

    // Suggestions (if not high confidence)
    if (band.level !== 'high' && _report.suggestions.length) {
      sugBox.innerHTML = `<div class="s65-sug-title">Complete these to boost your score:</div>`;
      _report.suggestions.forEach(s => {
        const el = document.createElement('div');
        el.className = 's65-sug-item';
        el.innerHTML = `
          <span class="s65-sug-arrow">→</span>
          <div class="s65-sug-content">
            <div class="s65-sug-text">${s.text}</div>
            <div class="s65-sug-meta">${s.stage} · <span class="s65-sug-pts">+${s.points} pts</span></div>
          </div>
        `;
        sugBox.appendChild(el);
      });
    }

    // Buttons
    if (band.level === 'high') {
      const btn = document.createElement('button');
      btn.className = 's65-gate-btn s65-gate-btn--green';
      btn.textContent = '→ Proceed to Stage 7 — Final Output';
      btn.addEventListener('click', () => _onProceed());
      btnsBox.appendChild(btn);
    } else if (band.level === 'medium') {
      const proceedBtn = document.createElement('button');
      proceedBtn.className = 's65-gate-btn s65-gate-btn--yellow';
      proceedBtn.textContent = '→ Proceed to Stage 7';
      proceedBtn.addEventListener('click', () => _onProceed());

      const overrideBtn = document.createElement('button');
      overrideBtn.className = 's65-gate-btn s65-gate-btn--ghost';
      overrideBtn.textContent = 'Proceed anyway (accept risk)';
      overrideBtn.addEventListener('click', () => _onOverride());

      btnsBox.appendChild(proceedBtn);
      btnsBox.appendChild(overrideBtn);
    } else {
      const backBtn = document.createElement('button');
      backBtn.className = 's65-gate-btn s65-gate-btn--red';
      backBtn.textContent = '← Return and improve analysis';
      backBtn.addEventListener('click', () => {
        if (typeof Router !== 'undefined') Router.goBack?.();
      });
      btnsBox.appendChild(backBtn);

      if (_report.weakestStage) {
        const warn = document.createElement('div');
        warn.className = 's65-gate-backtrack';
        warn.innerHTML = `⚠ Weakest area: <strong>${_report.weakestStage}</strong>. Return and complete it.`;
        btnsBox.appendChild(warn);
      }
    }
  }

  function _onProceed() {
    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
      detail: { stageId: 'stage6_5', answers: State.getAnswer('stage6_5') ?? {} },
    }));
  }

  function _onOverride() {
    State.setAnswer('stage6_5', { overrideProceeded: true });
    _onProceed();
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _buildPanel(wrapper, band) {
    const body = wrapper.querySelector('#s65-panel-body');
    if (!body) return;
    body.innerHTML = '';

    // Big score
    const scoreSec = document.createElement('div');
    scoreSec.className = 's65-panel-section';
    scoreSec.innerHTML = `
      <div class="s65-panel-section-title">Confidence score</div>
      <div class="s65-panel-big-score s65-panel-big-score--${band.color}">${_report.score}<span class="s65-panel-big-max">/100</span></div>
      <div class="s65-panel-band s65-panel-band--${band.color}">${band.icon} ${band.label}</div>
    `;
    body.appendChild(scoreSec);

    // Per-stage mini bars
    const stageSec = document.createElement('div');
    stageSec.className = 's65-panel-section';
    stageSec.innerHTML = `<div class="s65-panel-section-title">By stage</div>`;

    const earnedKeys = new Set(_report.earned.map(e => e.key));
    STAGE_GROUPS.filter(g => g.label !== 'Penalties').forEach(group => {
      const maxPts  = group.keys.reduce((s,k) => s + (SCORE_MAP[k]??0), 0);
      const gotPts  = group.keys.filter(k => earnedKeys.has(k)).reduce((s,k) => s+(SCORE_MAP[k]??0),0);
      if (maxPts === 0) return;
      const pct     = Math.round(gotPts/maxPts*100);
      const el      = document.createElement('div');
      el.className  = 's65-panel-stage-row';
      const shortName = group.label.replace(/Stage \d+\.?\d* — /, '');
      el.innerHTML  = `
        <div class="s65-panel-stage-name">${shortName}</div>
        <div class="s65-panel-stage-bar-wrap">
          <div class="s65-panel-stage-bar ${pct===100?'s65-panel-stage-bar--full':pct>=50?'s65-panel-stage-bar--mid':'s65-panel-stage-bar--low'}" style="width:${pct}%"></div>
        </div>
        <div class="s65-panel-stage-pts">${gotPts}/${maxPts}</div>
      `;
      stageSec.appendChild(el);
    });
    body.appendChild(stageSec);

    // Top suggestions
    if (_report.suggestions.length) {
      const sugSec = document.createElement('div');
      sugSec.className = 's65-panel-section s65-panel-section--sug';
      sugSec.innerHTML = `<div class="s65-panel-section-title">Quick wins</div>`;
      _report.suggestions.slice(0,3).forEach(s => {
        const el = document.createElement('div');
        el.className = 's65-panel-sug';
        el.innerHTML = `<span class="s65-panel-sug-pts">+${s.points}</span><span class="s65-panel-sug-text">${s.text}</span>`;
        sugSec.appendChild(el);
      });
      body.appendChild(sugSec);
    }

    // Gate status
    const gateSec = document.createElement('div');
    gateSec.className = `s65-panel-gate s65-panel-gate--${band.color}`;
    gateSec.innerHTML = band.level === 'high'
      ? `✓ Ready to proceed to Stage 7`
      : band.level === 'medium'
        ? `~ Borderline — consider improvements`
        : `✗ Score too low — return and complete gaps`;
    body.appendChild(gateSec);
  }

  // ─── SCORE COMPUTATION ─────────────────────────────────────────────────────

  function _computeReport(state) {
    const answers  = state.answers ?? {};
    const earned   = [];
    const deducted = [];
    let   total    = 0;

    function earn(key) {
      earned.push({ key, points: SCORE_MAP[key] ?? 0 });
      total += SCORE_MAP[key] ?? 0;
    }
    function deduct(key, pts) {
      deducted.push({ key, points: pts });
      total += pts;
    }

    // Stage 0
    const s0 = answers.stage0 ?? {};
    if (s0.n && s0.feasibility?.length)  earn('complexity_budget_computed');
    if (s0.eliminated?.length)            earn('infeasible_classes_eliminated');
    if (s0.memChecked || s0.memReport)    earn('memory_checked');

    // Stage 1
    const s1 = answers.stage1 ?? {};
    if (s1.inputTypes?.length)            earn('input_type_identified');
    if (s1.secondarySignals?.length)      earn('secondary_signals_noted');
    if (s1.queryType)                     earn('query_type_identified');

    // Stage 2
    const s2 = answers.stage2 ?? {};
    if (s2.outputForm)                    earn('output_form_identified');
    if (s2.optimizationType)              earn('optimization_type_identified');
    if (s2.solutionDepth)                 earn('solution_depth_identified');

    // Stage 2.5
    const s25 = answers.stage2_5 ?? {};
    if (s25.checked || s25.selectedPattern) earn('decomposition_checked');
    if (s25.subproblems?.length)            earn('subproblems_identified');

    // Stage 3
    const s3    = answers.stage3 ?? {};
    const props = s3.properties ?? {};
    const propKeys = ['orderSensitivity','subproblemOverlap','feasibilityBoundary','localOptimality','stateSpace','dependencyStructure','searchSpace'];
    const scoreKeyMap = {
      orderSensitivity   : 'order_sensitivity_answered',
      subproblemOverlap  : 'subproblem_overlap_answered',
      feasibilityBoundary: 'feasibility_boundary_answered',
      localOptimality    : 'local_optimality_answered',
      stateSpace         : 'state_space_answered',
      dependencyStructure: 'dependency_structure_answered',
      searchSpace        : 'search_space_answered',
    };

    let unsureCount = 0;
    propKeys.forEach(pk => {
      if (props[pk] && props[pk] !== 'unsure') {
        earn(scoreKeyMap[pk]);
      } else if (props[pk] === 'unsure') {
        unsureCount++;
      }
    });
    if (unsureCount > 0) {
      deduct('property_answered_unsure', PENALTY_MAP.property_answered_unsure * unsureCount);
    }
    if (s3.dpSubtype)  earn('dp_subtype_identified');
    if (s3.graphGoal)  earn('graph_goal_identified');

    // Stage 3.5
    const s35 = answers.stage3_5 ?? {};
    if (s35.checked || s35.transformationApplied) {
      earn('transformation_check_done');
    } else {
      deduct('transformation_skipped', PENALTY_MAP.transformation_skipped);
    }
    if (s35.reframeAnswered) earn('reframe_questions_answered');

    // Stage 4
    const s4 = answers.stage4 ?? {};
    if (s4.interactionChecked || s4.interactions?.length) earn('constraint_interaction_checked');
    if (s4.hiddenStructureChecked)                         earn('hidden_structure_checked');

    // Stage 5
    const s5       = answers.stage5 ?? {};
    const dirs     = state.output?.directions ?? [];
    const families = dirs.map(d => d.family ?? '');
    const isGreedy = families.some(f => f.includes('greedy'));
    const isDP     = families.some(f => f.includes('dp'));
    const isBS     = families.some(f => f.includes('binary_search'));
    const isGraph  = families.some(f => f.includes('graph'));

    if (isGreedy) {
      if (s5.greedyTested || s5.verifierStates?.greedy?.verdict) {
        earn('greedy_counterexample_tested');
      } else {
        deduct('no_counterexample_for_greedy', PENALTY_MAP.no_counterexample_for_greedy);
      }
    }
    if (isBS && (s5.monotonicityVerified || s5.verifierStates?.monotonicity?.verdict)) {
      earn('monotonicity_verified');
    }
    if (isDP) {
      if (s5.dpStateVerified || s5.verifierStates?.dp_state?.checkAnswers) {
        earn('dp_state_verified');
      } else {
        deduct('state_not_verified_for_dp', PENALTY_MAP.state_not_verified_for_dp);
      }
    }
    if (isGraph && (s5.graphPropertiesVerified || s5.verifierStates?.graph?.checkAnswers)) {
      earn('graph_properties_verified');
    }
    if (s5.keywordCrosscheckDone || s5.verifierStates?.keyword?.verdict) {
      earn('keyword_crosscheck_done');
    }

    // Stage 6
    const s6 = answers.stage6 ?? {};
    if (s6.universalReviewed)    earn('universal_cases_reviewed');
    if (s6.typeSpecificReviewed) earn('type_specific_cases_reviewed');
    if (!s6.universalReviewed && !s6.typeSpecificReviewed && Object.keys(s6).length > 0) {
      deduct('edge_cases_skipped', PENALTY_MAP.edge_cases_skipped);
    }

    const score       = Math.max(0, Math.min(100, Math.round(total)));
    const suggestions = _buildSuggestions(earned, families, s5, s6);

    // Find weakest non-penalty group
    const groupScores = STAGE_GROUPS.filter(g => g.label !== 'Penalties').map(g => {
      const earnedKeys = new Set(earned.map(e => e.key));
      const got = g.keys.filter(k => earnedKeys.has(k)).reduce((s,k) => s+(SCORE_MAP[k]??0),0);
      const max = g.keys.reduce((s,k) => s+(SCORE_MAP[k]??0),0);
      return { stage: g.label, pct: max > 0 ? got/max : 1 };
    });
    const weakest = groupScores.sort((a,b) => a.pct - b.pct)[0];

    return { score, earned, deducted, suggestions, weakestStage: weakest?.stage ?? null };
  }

  function _buildSuggestions(earned, families, s5, s6) {
    const earnedKeys = new Set(earned.map(e => e.key));
    const sug = [];

    if (!earnedKeys.has('universal_cases_reviewed'))
      sug.push({ text: 'Review universal edge cases (n=1, n=max, all-negative)', stage: 'Stage 6', points: SCORE_MAP.universal_cases_reviewed });
    if (!earnedKeys.has('keyword_crosscheck_done'))
      sug.push({ text: 'Complete keyword cross-check', stage: 'Stage 5', points: SCORE_MAP.keyword_crosscheck_done });
    if (families.some(f=>f.includes('dp')) && !earnedKeys.has('dp_state_verified'))
      sug.push({ text: 'Verify DP state completeness and non-redundancy', stage: 'Stage 5', points: SCORE_MAP.dp_state_verified });
    if (families.some(f=>f.includes('greedy')) && !earnedKeys.has('greedy_counterexample_tested'))
      sug.push({ text: 'Test greedy counter-example on adversarial input', stage: 'Stage 5', points: SCORE_MAP.greedy_counterexample_tested });
    if (!earnedKeys.has('transformation_check_done'))
      sug.push({ text: 'Complete the reframing check in Stage 3.5', stage: 'Stage 3.5', points: SCORE_MAP.transformation_check_done });

    return sug.slice(0, 3);
  }

  function _getBand(score) {
    return BANDS.find(b => score >= b.min && score <= b.max) ?? BANDS[2];
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s65-styles')) return;
    const style = document.createElement('style');
    style.id = 's65-styles';
    style.textContent = `
    .s65-shell {
      --s65-bg      : #f7f4ef;
      --s65-surface : #ffffff;
      --s65-surface2: #faf8f5;
      --s65-border  : rgba(0,0,0,.09);
      --s65-border2 : rgba(0,0,0,.16);
      --s65-ink     : #1a1814;
      --s65-ink2    : #4a4540;
      --s65-muted   : #8a8070;
      --s65-blue    : #2563eb;
      --s65-blue-bg : rgba(37,99,235,.07);
      --s65-blue-b  : rgba(37,99,235,.24);
      --s65-green   : #059669;
      --s65-green-bg: rgba(5,150,105,.07);
      --s65-green-b : rgba(5,150,105,.28);
      --s65-warn    : #d97706;
      --s65-warn-bg : rgba(217,119,6,.07);
      --s65-warn-b  : rgba(217,119,6,.28);
      --s65-red     : #dc2626;
      --s65-red-bg  : rgba(220,38,38,.06);
      --s65-red-b   : rgba(220,38,38,.22);
      --s65-mono    : 'Space Mono', monospace;
      --s65-sans    : 'DM Sans', system-ui, sans-serif;
      display       : flex;
      gap           : 24px;
      align-items   : flex-start;
      background    : var(--s65-bg);
      min-height    : 100%;
      font-family   : var(--s65-sans);
      color         : var(--s65-ink);
      padding       : 28px;
    }
    .s65-main  { flex: 1; display: flex; flex-direction: column; gap: 28px; min-width: 0; }
    .s65-rule  { font-family: var(--s65-mono); font-size: .71rem; color: var(--s65-muted); padding: 10px 16px; background: var(--s65-surface); border: 1px solid var(--s65-border); border-left: 3px solid var(--s65-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }

    /* Score hero */
    .s65-hero { border-radius: 16px; border: 1.5px solid; padding: 28px 24px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .s65-hero--green  { background: var(--s65-green-bg); border-color: var(--s65-green-b); }
    .s65-hero--yellow { background: var(--s65-warn-bg);  border-color: var(--s65-warn-b); }
    .s65-hero--red    { background: var(--s65-red-bg);   border-color: var(--s65-red-b); }
    .s65-ring         { display: flex; align-items: baseline; gap: 6px; }
    .s65-ring-score   { font-family: var(--s65-mono); font-size: 5rem; font-weight: 700; line-height: 1; color: var(--s65-ink); }
    .s65-ring-max     { font-family: var(--s65-mono); font-size: 1.2rem; color: var(--s65-muted); }
    .s65-band-info    { display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; }
    .s65-band-icon    { font-size: 1.8rem; }
    .s65-hero--green  .s65-band-icon { color: var(--s65-green); }
    .s65-hero--yellow .s65-band-icon { color: var(--s65-warn); }
    .s65-hero--red    .s65-band-icon { color: var(--s65-red); }
    .s65-band-label   { font-size: 1.1rem; font-weight: 700; color: var(--s65-ink); }
    .s65-band-message { font-size: .86rem; font-weight: 500; color: var(--s65-ink2); }
    .s65-band-detail  { font-size: .76rem; color: var(--s65-muted); line-height: 1.5; max-width: 420px; }
    .s65-thresholds   { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
    .s65-threshold { padding: 4px 12px; border-radius: 9999px; border: 1.5px solid; display: flex; flex-direction: column; align-items: center; opacity: .5; font-size: .68rem; }
    .s65-threshold--active { opacity: 1; }
    .s65-threshold--green  { border-color: var(--s65-green-b); background: var(--s65-green-bg); color: var(--s65-green); }
    .s65-threshold--yellow { border-color: var(--s65-warn-b);  background: var(--s65-warn-bg);  color: var(--s65-warn); }
    .s65-threshold--red    { border-color: var(--s65-red-b);   background: var(--s65-red-bg);   color: var(--s65-red); }
    .s65-threshold-range { font-family: var(--s65-mono); font-size: .66rem; font-weight: 700; }
    .s65-threshold-label { font-size: .62rem; }

    /* Section */
    .s65-section { display: flex; flex-direction: column; gap: 14px; }
    .s65-section-header { display: flex; align-items: flex-start; gap: 12px; }
    .s65-section-num  { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
    .s65-section-title{ font-size: .92rem; font-weight: 600; color: var(--s65-ink); }
    .s65-section-sub  { font-size: .73rem; color: var(--s65-muted); margin-top: 2px; }

    /* Breakdown */
    .s65-breakdown { display: flex; flex-direction: column; gap: 8px; }
    .s65-stage-group { background: var(--s65-surface); border: 1.5px solid var(--s65-border); border-radius: 10px; overflow: hidden; }
    .s65-stage-group-header { display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; background: var(--s65-surface2); border-bottom: 1px solid var(--s65-border); }
    .s65-stage-group-name   { font-family: var(--s65-mono); font-size: .62rem; letter-spacing: 1.2px; text-transform: uppercase; color: var(--s65-muted); }
    .s65-stage-group-subtotal { font-family: var(--s65-mono); font-size: .72rem; font-weight: 700; }
    .s65-stage-group-rows   { display: flex; flex-direction: column; }
    .s65-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; border-bottom: 1px solid rgba(0,0,0,.04); font-size: .74rem; }
    .s65-row:last-of-type { border-bottom: none; }
    .s65-row--earned  { }
    .s65-row--missed  { opacity: .5; }
    .s65-row--deducted{ background: rgba(220,38,38,.03); }
    .s65-row-label { color: var(--s65-ink2); flex: 1; }
    .s65-pts-pos  { font-family: var(--s65-mono); font-size: .68rem; font-weight: 700; color: var(--s65-green); }
    .s65-pts-neg  { font-family: var(--s65-mono); font-size: .68rem; font-weight: 700; color: var(--s65-red); }
    .s65-pts-zero { font-family: var(--s65-mono); font-size: .68rem; color: var(--s65-muted); }
    .s65-total-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--s65-surface); border: 1.5px solid var(--s65-border); border-radius: 9px; }
    .s65-total-label { font-size: .86rem; font-weight: 600; color: var(--s65-ink); }
    .s65-total-value { font-family: var(--s65-mono); font-size: 1.4rem; font-weight: 700; }
    .s65-total-value--green  { color: var(--s65-green); }
    .s65-total-value--yellow { color: var(--s65-warn); }
    .s65-total-value--red    { color: var(--s65-red); }

    /* Gate */
    .s65-gate { border-radius: 14px; border: 1.5px solid; padding: 22px 20px; display: flex; flex-direction: column; gap: 14px; }
    .s65-gate--green  { background: var(--s65-green-bg); border-color: var(--s65-green-b); }
    .s65-gate--yellow { background: var(--s65-warn-bg);  border-color: var(--s65-warn-b); }
    .s65-gate--red    { background: var(--s65-red-bg);   border-color: var(--s65-red-b); }
    .s65-gate-verdict { font-size: 1rem; font-weight: 700; color: var(--s65-ink); }
    .s65-gate-detail  { font-size: .78rem; color: var(--s65-ink2); line-height: 1.6; }
    .s65-sug-title    { font-size: .76rem; font-weight: 600; color: var(--s65-ink2); margin-bottom: 8px; }
    .s65-sug-item     { display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,.5); border-radius: 7px; margin-bottom: 5px; }
    .s65-sug-arrow    { color: var(--s65-blue); flex-shrink: 0; font-weight: 700; }
    .s65-sug-text     { font-size: .76rem; color: var(--s65-ink); font-weight: 500; }
    .s65-sug-meta     { font-size: .68rem; color: var(--s65-muted); margin-top: 2px; }
    .s65-sug-pts      { font-family: var(--s65-mono); font-weight: 700; color: var(--s65-green); }
    .s65-gate-btns    { display: flex; flex-direction: column; gap: 7px; }
    .s65-gate-btn     { padding: 11px 20px; border-radius: 9px; font-size: .86rem; font-weight: 600; cursor: pointer; transition: all .14s; border: 1.5px solid; text-align: center; }
    .s65-gate-btn--green  { background: var(--s65-green); color: #fff; border-color: var(--s65-green); }
    .s65-gate-btn--green:hover  { background: #047857; }
    .s65-gate-btn--yellow { background: var(--s65-warn); color: #fff; border-color: var(--s65-warn); }
    .s65-gate-btn--yellow:hover { background: #b45309; }
    .s65-gate-btn--red    { background: transparent; color: var(--s65-red); border-color: var(--s65-red-b); }
    .s65-gate-btn--red:hover { background: var(--s65-red-bg); }
    .s65-gate-btn--ghost  { background: transparent; color: var(--s65-ink2); border-color: var(--s65-border2); }
    .s65-gate-btn--ghost:hover { background: var(--s65-surface2); }
    .s65-gate-backtrack { font-size: .76rem; color: var(--s65-red); padding: 8px 12px; background: var(--s65-red-bg); border: 1px solid var(--s65-red-b); border-radius: 7px; }

    /* Side panel */
    .s65-panel { width: 268px; flex-shrink: 0; background: var(--s65-surface); border: 1.5px solid var(--s65-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s65-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s65-border); background: #f6f4f0; }
    .s65-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s65-ink); }
    .s65-panel-sub    { font-size: .66rem; color: var(--s65-muted); margin-top: 2px; }
    .s65-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s65-panel-section { display: flex; flex-direction: column; gap: 8px; }
    .s65-panel-section--sug { background: var(--s65-blue-bg); border: 1px solid var(--s65-blue-b); border-radius: 8px; padding: 10px 12px; }
    .s65-panel-section-title { font-family: var(--s65-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s65-muted); margin-bottom: 2px; }
    .s65-panel-big-score { font-family: var(--s65-mono); font-size: 3.2rem; font-weight: 700; line-height: 1; display: flex; align-items: baseline; gap: 4px; }
    .s65-panel-big-max   { font-family: var(--s65-mono); font-size: .9rem; color: var(--s65-muted); }
    .s65-panel-big-score--green  { color: var(--s65-green); }
    .s65-panel-big-score--yellow { color: var(--s65-warn); }
    .s65-panel-big-score--red    { color: var(--s65-red); }
    .s65-panel-band { font-size: .76rem; font-weight: 600; padding: 3px 9px; border-radius: 9999px; display: inline-block; }
    .s65-panel-band--green  { background: var(--s65-green-bg); color: var(--s65-green); border: 1px solid var(--s65-green-b); }
    .s65-panel-band--yellow { background: var(--s65-warn-bg);  color: var(--s65-warn);  border: 1px solid var(--s65-warn-b); }
    .s65-panel-band--red    { background: var(--s65-red-bg);   color: var(--s65-red);   border: 1px solid var(--s65-red-b); }
    .s65-panel-stage-row    { display: grid; grid-template-columns: 90px 1fr 36px; align-items: center; gap: 7px; font-size: .68rem; }
    .s65-panel-stage-name   { color: var(--s65-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .s65-panel-stage-bar-wrap { height: 5px; background: var(--s65-surface2); border-radius: 9999px; overflow: hidden; border: 1px solid var(--s65-border); }
    .s65-panel-stage-bar    { height: 100%; border-radius: 9999px; transition: width .3s ease; }
    .s65-panel-stage-bar--full { background: var(--s65-green); }
    .s65-panel-stage-bar--mid  { background: var(--s65-warn); }
    .s65-panel-stage-bar--low  { background: var(--s65-red); }
    .s65-panel-stage-pts    { font-family: var(--s65-mono); font-size: .62rem; color: var(--s65-muted); text-align: right; }
    .s65-panel-sug { display: flex; align-items: flex-start; gap: 7px; font-size: .7rem; color: var(--s65-ink2); padding: 3px 0; }
    .s65-panel-sug-pts { font-family: var(--s65-mono); font-size: .64rem; font-weight: 700; color: var(--s65-green); flex-shrink: 0; min-width: 24px; }
    .s65-panel-sug-text { line-height: 1.4; }
    .s65-panel-gate { padding: 10px 12px; border-radius: 8px; font-size: .76rem; font-weight: 500; text-align: center; }
    .s65-panel-gate--green  { background: var(--s65-green-bg); color: var(--s65-green); border: 1.5px solid var(--s65-green-b); }
    .s65-panel-gate--yellow { background: var(--s65-warn-bg);  color: var(--s65-warn);  border: 1.5px solid var(--s65-warn-b); }
    .s65-panel-gate--red    { background: var(--s65-red-bg);   color: var(--s65-red);   border: 1.5px solid var(--s65-red-b); }
    .s65-panel-body::-webkit-scrollbar { width: 3px; }
    .s65-panel-body::-webkit-scrollbar-thumb { background: var(--s65-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s65-shell { flex-direction: column; padding: 16px; }
      .s65-panel { width: 100%; position: static; max-height: none; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage6_5;
    if (!saved?.score) return;
    const band = _getBand(saved.score);
    if (band.level === 'high' || saved.overrideProceeded) {
      if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state  = null;
    _report = null;
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage6_5;