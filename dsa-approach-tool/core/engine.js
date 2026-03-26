// core/engine.js
// Central decision engine — manages stage flow, orchestrates all modules,
// listens for events, drives the entire tool
// Used by: index.html (bootstraps here)
// Orchestrates: State, Router, Renderer, SessionUtils, ConfidenceUtils

const Engine = (() => {

  // ─── PRIVATE ───────────────────────────────────────────────────────────────

  let _initialized = false;
  let _autoSaveTimer = null;
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  // ─── INIT ──────────────────────────────────────────────────────────────────

  function init() {
    if (_initialized) return;
    _initialized = true;

    // 1. Try to restore saved session
    const saved = SessionUtils.load();

    // 2. Init State
    State.init(saved ?? null);

    // 3. Init Renderer
    Renderer.init();

    // 4. Bind all custom events
    _bindEvents();

    // 5. Subscribe to State changes
    _subscribeToState();

    // 6. Start auto-save
    _startAutoSave();

    // 7. Navigate to entry point
    const entryStage = saved
      ? Router.resumeEntry(State.get())
      : Router.normalEntry();

    _navigateTo(entryStage, 'forward');

    console.info(`[Engine] Initialized. Entry: ${entryStage}`);
  }

  // ─── NAVIGATION ────────────────────────────────────────────────────────────

  function _navigateTo(stageId, direction = 'forward') {
    if (!stageId) return;

    const state = State.get();

    // Validate accessibility
    if (!Router.isAccessible(stageId, state) && direction === 'forward') {
      console.warn(`[Engine] Stage "${stageId}" not accessible yet`);
      Renderer.showToast('Complete current stage first', 'warning');
      return;
    }

    // Update State navigation
    State.setCurrentStage(stageId);

    // Render
    Renderer.renderStage(stageId, State.get(), direction);
  }

  function _navigateNext() {
    const state   = State.get();
    const current = State.getCurrentStage();

    // Must complete current stage before proceeding
    if (!State.isStageComplete(current)) {
      Renderer.showToast('Answer all required questions before continuing', 'warning');
      _shakeNextButton();
      return;
    }

    // Build output for current stage before leaving
    _buildStageOutput(current);

    const next = Router.next(current, state);
    if (!next) {
      _onSessionComplete();
      return;
    }

    _navigateTo(next, 'forward');
  }

  function _navigateBack() {
    const result = Router.goBack(State.get());
    if (!result) return;

    // Clear answers from target stage onward
    State.clearAnswersFrom(result.clearFrom);
    State.clearDirections();

    // Pop stack
    State.navigateBack();

    _navigateTo(result.targetStage, 'back');
  }

  function _jumpTo(stageId) {
    const target = Router.jumpTo(stageId, State.get());
    if (!target) return;
    _navigateTo(target, 'back');
  }

  // ─── STAGE COMPLETION ──────────────────────────────────────────────────────

  // Called when a stage signals it is complete
  // stageId: which stage completed
  // answers: the answer object to save
  function onStageComplete(stageId, answers) {
    // Save answers
    State.setAnswer(stageId, answers);

    // Mark complete
    State.markStageComplete(stageId);

    // Enable next button
    Renderer.setNextEnabled(true);

    // Run stage-specific post-processing
    _postProcess(stageId);

    // Auto-save
    _autoSave();
  }

  // ─── POST-PROCESSING PER STAGE ─────────────────────────────────────────────
  // After each stage completes — compute derived outputs

  function _postProcess(stageId) {
    const state = State.get();

    switch (stageId) {

      case 'stage0': {
        // Compute feasibility report and eliminated classes
        const a = state.answers.stage0;
        if (a.n) {
          const report = MathUtils.buildFeasibilityReport(
            a.n, a.q ?? 1, a.timeLimit ?? 1, a.memLimit ?? 256
          );
          const eliminated = report
            .filter(r => r.status === 'red')
            .map(r => r.complexityId);

          State.setAnswer('stage0', {
            feasibility: report,
            eliminated,
            memReport: MathUtils.buildMemoryReport(a.n, a.memLimit ?? 256),
            memChecked: true,
          });
          State.setOutput('feasibilityReport', report);
          State.setOutput('eliminatedClasses', eliminated);
        }
        break;
      }

      case 'stage1': {
        const a = state.answers.stage1;
        State.setOutput('inputSummary', {
          inputTypes      : a.inputTypes ?? [],
          secondarySignals: a.secondarySignals ?? [],
          queryType       : a.queryType,
        });
        break;
      }

      case 'stage2': {
        const a = state.answers.stage2;
        State.setOutput('outputSummary', {
          outputForm       : a.outputForm,
          optimizationType : a.optimizationType,
          solutionDepth    : a.solutionDepth,
        });
        break;
      }

      case 'stage3': {
        // Derive initial candidate directions from structural properties
        const directions = _deriveDirections(state);
        State.clearDirections();
        directions.forEach(d => State.addDirection(d));
        State.setOutput('structuralFindings', state.answers.stage3?.properties ?? {});
        break;
      }

      case 'stage3_dp': {
        // Refine DP direction with sub-type
        _refineDirection(state, 'dp', {
          subtype: state.answers.stage3?.dpSubtype,
        });
        break;
      }

      case 'stage3_graph': {
        // Refine graph direction with goal
        _refineDirection(state, 'graph', {
          goal: state.answers.stage3?.graphGoal,
        });
        break;
      }

      case 'stage3_5': {
        // If transformation applied — update directions
        const applied = state.answers.stage3_5?.transformationApplied;
        if (applied) {
          _applyTransformation(applied, state);
        }
        break;
      }

      case 'stage4_5': {
        // Re-check complexity after variant selection
        const variant = state.answers.stage4_5?.variantComplexity;
        if (variant) {
          const a      = state.answers.stage0;
          const status = MathUtils.isFeasible(a.n, variant, a.timeLimit ?? 1);
          State.setAnswer('stage4_5', {
            variantFeasible: status !== 'red',
          });
          if (status === 'red') {
            Renderer.showWarning(
              `Selected variant (${variant}) is infeasible at n=${a.n}. Reconsider.`
            );
          }
        }
        break;
      }

      case 'stage6_5': {
        // Compute confidence score
        const report = ConfidenceUtils.compute(state);
        State.setConfidence(report);
        Renderer.renderConfidenceGate(report);

        // If low confidence — do not allow proceeding automatically
        if (report.level === 'low') {
          Renderer.setNextEnabled(false);
          Renderer.showToast(
            'Confidence too low to proceed. Return to the suggested stage.',
            'warning',
            5000
          );
        }
        break;
      }

      case 'stage7': {
        // Push to history when session completes
        SessionUtils.pushToHistory(State.get());
        break;
      }
    }
  }

  // ─── DIRECTION DERIVATION ──────────────────────────────────────────────────
  // Core logic — maps structural property answers to candidate directions
  // This is the heart of the tool — NOT a keyword matcher

  function _deriveDirections(state) {
    const props   = state.answers.stage3?.properties ?? {};
    const output  = state.answers.stage2 ?? {};
    const input   = state.answers.stage1 ?? {};
    const elim    = state.answers.stage0?.eliminated ?? [];
    const directions = [];

    const p = props;

    // ── GREEDY ────────────────────────────────────────────────────────────────
    // Conditions: can sort freely + local optimality holds + choices independent
    if (
      p.orderSensitivity    === 'no' &&
      p.localOptimality     === 'yes' &&
      p.subproblemOverlap   === 'no'
    ) {
      directions.push({
        id        : 'greedy',
        family    : 'greedy',
        label     : 'Greedy',
        why       : 'Can sort freely, local optimality holds, choices are independent',
        verifyBefore: 'Try to construct a counter-example where the greedy rule fails',
        wouldFailIf : 'A locally optimal choice leads to globally suboptimal result',
        confidence  : 'medium', // always needs counter-example test
      });
    }

    // ── BINARY SEARCH ON ANSWER ────────────────────────────────────────────────
    // Conditions: feasibility boundary is monotonic + output is single value
    if (
      p.feasibilityBoundary === 'yes' &&
      (
        output.optimizationType === 'maximize' ||
        output.optimizationType === 'minimize' ||
        output.optimizationType === 'max_min'  ||
        output.optimizationType === 'min_max'
      )
    ) {
      directions.push({
        id        : 'binary_search_answer',
        family    : 'binary_search',
        label     : 'Binary Search on Answer',
        why       : 'Monotonic feasibility boundary — if X works, X±1 also works',
        verifyBefore: 'Write isFeasible(X). Verify monotonicity: if X valid → X+1 valid with 2 examples',
        wouldFailIf : 'Feasibility is not monotonic — valid/invalid/valid pattern exists',
        confidence  : 'medium',
      });
    }

    // ── DYNAMIC PROGRAMMING ───────────────────────────────────────────────────
    // Conditions: overlapping subproblems + dependency is DAG
    if (
      (p.subproblemOverlap === 'yes_direct' || p.subproblemOverlap === 'yes_split') &&
      (p.dependencyStructure === 'dag' || p.dependencyStructure === 'unsure')
    ) {
      directions.push({
        id        : 'dp',
        family    : 'dp',
        label     : 'Dynamic Programming',
        why       : 'Overlapping subproblems with one-directional dependencies',
        verifyBefore: 'Define your state. Check completeness (can you reconstruct answer?) and non-redundancy',
        wouldFailIf : 'Circular dependencies exist — subproblems depend on each other',
        confidence  : 'medium',
      });
    }

    // ── BACKTRACKING ──────────────────────────────────────────────────────────
    // Conditions: state space needs path tracking + n is small
    if (
      p.stateSpace         === 'path_needed' &&
      p.searchSpace        === 'decision_tree'
    ) {
      const n = state.answers.stage0?.n ?? 0;
      if (n <= 20) {
        directions.push({
          id        : 'backtracking',
          family    : 'backtracking',
          label     : 'Backtracking',
          why       : 'Exhaustive search over decision tree, path tracking needed, n is small',
          verifyBefore: 'Confirm n is small enough. Estimate branching factor ^ depth.',
          wouldFailIf : 'n > 20 without effective pruning',
          confidence  : 'high',
        });
      }
    }

    // ── DIVIDE AND CONQUER ────────────────────────────────────────────────────
    // Conditions: can split + subproblems independent
    if (
      p.subproblemOverlap === 'yes_split' &&
      p.dependencyStructure === 'dag'
    ) {
      directions.push({
        id        : 'divide_conquer',
        family    : 'divide_conquer',
        label     : 'Divide and Conquer',
        why       : 'Problem splits into independent subproblems that combine cleanly',
        verifyBefore: 'Confirm subproblems are truly independent — no shared state',
        wouldFailIf : 'Subproblems overlap — use DP with memoization instead',
        confidence  : 'medium',
      });
    }

    // ── GRAPH TRAVERSAL ───────────────────────────────────────────────────────
    // Conditions: graph input type
    const graphInputs = ['graph_edge_list', 'graph_adjacency', 'implicit_graph', 'grid'];
    const hasGraph    = (input.inputTypes ?? []).some(t => graphInputs.includes(t));
    if (hasGraph) {
      directions.push({
        id        : 'graph',
        family    : 'graph',
        label     : 'Graph Traversal / Algorithm',
        why       : 'Input is explicitly a graph or grid — graph algorithms apply',
        verifyBefore: 'Identify: weighted or not? Directed or not? Negative weights? What is the goal?',
        wouldFailIf : 'Wrong algorithm for graph type — e.g. BFS on weighted graph',
        confidence  : 'medium',
      });
    }

    // ── TWO POINTER / SLIDING WINDOW ──────────────────────────────────────────
    // Conditions: single array + can sort + output is subarray/value
    if (
      p.orderSensitivity !== 'yes' &&
      (input.inputTypes ?? []).some(t => ['single_array', 'two_arrays', 'single_string'].includes(t)) &&
      p.searchSpace === 'intervals'
    ) {
      directions.push({
        id        : 'two_pointer',
        family    : 'two_pointer',
        label     : 'Two Pointer / Sliding Window',
        why       : 'Sequence input with interval-shaped search space and monotonic window validity',
        verifyBefore: 'Confirm window validity is monotonic — shrinking from left always helps',
        wouldFailIf : 'Window validity is non-monotonic — valid/invalid/valid pattern',
        confidence  : 'medium',
      });
    }

    // ── FILTER BY ELIMINATED COMPLEXITY ───────────────────────────────────────
    // Remove directions whose minimum complexity is eliminated
    const DIRECTION_MIN_COMPLEXITY = {
      greedy              : 'o(nlogn)',
      binary_search_answer: 'o(nlogn)',
      dp                  : 'o(n^2)',
      backtracking        : 'o(2^n)',
      divide_conquer      : 'o(nlogn)',
      graph               : 'o(nlogn)',
      two_pointer         : 'o(n)',
    };

    return directions.filter(d => {
      const minC = DIRECTION_MIN_COMPLEXITY[d.family];
      return !minC || !elim.includes(minC);
    });
  }

  // Refine an existing direction with additional detail
  function _refineDirection(state, family, detail) {
    const directions = State.getDirections();
    const existing   = directions.find(d => d.family === family);
    if (existing) {
      Object.assign(existing, detail);
    }
  }

  // Apply a transformation — updates directions based on reframing
  function _applyTransformation(transformationId, state) {
    const TRANSFORMATION_DIRECTION_MAP = {
      tr_optimization_to_bsearch : 'binary_search_answer',
      tr_sequence_to_dag         : 'dp',
      tr_element_to_node         : 'graph',
      tr_state_to_position       : 'graph',
    };

    const mappedFamily = TRANSFORMATION_DIRECTION_MAP[transformationId];
    if (!mappedFamily) return;

    const existing = State.getDirections().find(d => d.family === mappedFamily);
    if (!existing) {
      // Add new direction from transformation
      State.addDirection({
        id          : `${mappedFamily}_transformed`,
        family      : mappedFamily,
        label       : `${mappedFamily} (via transformation)`,
        why         : `Transformation "${transformationId}" reveals this structure`,
        verifyBefore: 'Verify transformation is valid — constraints preserved, solution mappable',
        wouldFailIf : 'Transformation changes the problem — constraints not preserved',
        confidence  : 'low',
      });
    }
  }

  // ─── SESSION COMPLETE ──────────────────────────────────────────────────────

  function _onSessionComplete() {
    SessionUtils.pushToHistory(State.get());
    Renderer.showToast('Analysis complete. Good luck!', 'info', 4000);
  }

  // ─── RECOVERY MODE ─────────────────────────────────────────────────────────

  function enterRecovery(failureType, failureDetail = '') {
    State.enterRecovery(failureType, failureDetail);
    const recoveryStage = Router.recoveryEntry(failureType);
    _navigateTo(recoveryStage, 'forward');
  }

  function exitRecovery() {
    State.exitRecovery();
    // Return to stage 5 — re-run verification with new info
    _navigateTo('stage5', 'forward');
  }

  // ─── EVENT BINDING ─────────────────────────────────────────────────────────

  function _bindEvents() {
    // Navigation events — dispatched by Renderer buttons
    document.addEventListener('dsa:navigate-next', () => _navigateNext());
    document.addEventListener('dsa:navigate-back', () => _navigateBack());

    // Jump event — dispatched by confidence gate
    document.addEventListener('dsa:jump-to', (e) => {
      const stageId = e.detail?.stageId;
      if (stageId) _jumpTo(stageId);
    });

    // Recovery entry
    document.addEventListener('dsa:enter-recovery', () => {
      _showRecoveryModal();
    });

    // Session reset
    document.addEventListener('dsa:reset', () => _resetSession());

    // Stage complete — dispatched by stage modules
    // detail: { stageId, answers }
    document.addEventListener('dsa:stage-complete', (e) => {
      const { stageId, answers } = e.detail ?? {};
      if (stageId) onStageComplete(stageId, answers ?? {});
    });

    // Answer partial update — stage module updated one answer field
    // detail: { stageId, key, value }
    document.addEventListener('dsa:answer-update', (e) => {
      const { stageId, key, value } = e.detail ?? {};
      if (stageId && key !== undefined) {
        State.setAnswer(stageId, { [key]: value });
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && e.altKey) _navigateNext();
      if (e.key === 'ArrowLeft'  && e.altKey) _navigateBack();
    });

    // Warn before closing with unsaved progress
    window.addEventListener('beforeunload', (e) => {
      if (State.hasStarted()) {
        _autoSave();
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ─── STATE SUBSCRIPTIONS ───────────────────────────────────────────────────

  function _subscribeToState() {
    // When confidence updates — check gate
    State.subscribe('confidence_updated', (level) => {
      if (level === 'low') {
        Renderer.setNextEnabled(false);
      }
    });

    // When direction added — flash directions region if visible
    State.subscribe('direction_added', () => {
      Renderer.flashUpdate('directions-region');
    });
  }

  // ─── RECOVERY MODAL ────────────────────────────────────────────────────────

  function _showRecoveryModal() {
    const options = [
      { id: 'wa',      label: 'Wrong Answer',   sublabel: 'Solution runs but gives incorrect output' },
      { id: 'tle',     label: 'Time Limit',      sublabel: 'Solution is too slow — TLE' },
      { id: 'logic',   label: 'Logic Unclear',   sublabel: 'Not sure how to write the transition / core logic' },
      { id: 'reframe', label: 'Full Reframe',    sublabel: 'This approach feels wrong — need to rethink' },
    ];

    const modal = DomUtils.div(
      { class: 'modal-overlay' },
      [
        DomUtils.div(
          { class: 'modal' },
          [
            DomUtils.div({ class: 'modal__title' }, 'What went wrong?'),
            DomUtils.div({ class: 'modal__sub'   }, 'Choose the type of failure to get targeted help'),
            ...options.map(opt =>
              DomUtils.div(
                {
                  class  : 'modal__option',
                  onClick: () => {
                    modal.remove();
                    enterRecovery(opt.id);
                  },
                },
                [
                  DomUtils.div({ class: 'modal__opt-label' }, opt.label),
                  DomUtils.div({ class: 'modal__opt-sub'   }, opt.sublabel),
                ]
              )
            ),
            DomUtils.btn(
              {
                class  : 'btn btn--ghost modal__cancel',
                onClick: () => modal.remove(),
              },
              'Cancel'
            ),
          ]
        ),
      ]
    );

    document.body.appendChild(modal);
    DomUtils.fadeIn(modal);
  }

  // ─── AUTO-SAVE ─────────────────────────────────────────────────────────────

  function _autoSave() {
    try {
      SessionUtils.save(State.serialize());
    } catch (e) {
      console.warn('[Engine] Auto-save failed:', e);
    }
  }

  function _startAutoSave() {
    _autoSaveTimer = setInterval(_autoSave, AUTO_SAVE_INTERVAL);
  }

  function _stopAutoSave() {
    if (_autoSaveTimer) {
      clearInterval(_autoSaveTimer);
      _autoSaveTimer = null;
    }
  }

  // ─── RESET ─────────────────────────────────────────────────────────────────

  function _resetSession() {
    _stopAutoSave();
    SessionUtils.clear();
    State.reset();
    _progressInstance = null;
    _stageModules     = {};
    _initialized      = false;
    init();
  }

  // ─── NAV BUTTON SHAKE ──────────────────────────────────────────────────────

  function _shakeNextButton() {
    const btn = document.getElementById('btn-next');
    if (!btn) return;
    btn.classList.add('shake');
    setTimeout(() => btn.classList.remove('shake'), 500);
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return {
    init,
    onStageComplete,
    enterRecovery,
    exitRecovery,
  };

})();

// Auto-boot when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Engine.init());
  } else {
    Engine.init();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Engine;
}
