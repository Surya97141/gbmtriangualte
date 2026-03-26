// core/state.js
// Single source of truth for all session state
// Nothing reads or writes session data directly — everything goes through State
// Used by: engine.js, router.js, renderer.js, all stage files

const State = (() => {

  // ─── INITIAL STATE SHAPE ───────────────────────────────────────────────────
  // This is the canonical shape of a fresh session
  // Every key that any stage might read must exist here with a default

  const INITIAL_STATE = {

    // ── Meta ──────────────────────────────────────────────────────────────────
    version        : '1.0.0',
    sessionId      : null,
    startedAt      : null,
    lastUpdatedAt  : null,
    mode           : 'normal',        // 'normal' | 'recovery'

    // ── Navigation ────────────────────────────────────────────────────────────
    currentStage   : 'stage0',
    stageStack     : [],              // visited stage history for back-nav
    stagesVisited  : [],              // all stages ever visited this session
    stagesCompleted: [],              // stages marked as done

    // ── Recovery mode ─────────────────────────────────────────────────────────
    recoveryMode   : false,
    recoveryEntry  : null,            // { failureType, failureDetail, enteredAt }

    // ── Answers — one key per stage ───────────────────────────────────────────
    answers: {

      stage0: {
        n          : null,            // primary input size
        q          : null,            // query count (if applicable)
        timeLimit  : 1,               // seconds
        memLimit   : 256,             // MB
        eliminated : [],              // complexity classes ruled out
        feasibility: [],              // full feasibility report from MathUtils
        memReport  : [],              // memory report from MathUtils
        memChecked : false,
        answeredAt : null,
      },

      stage1: {
        inputTypes      : [],         // selected input shape ids
        secondarySignals: [],         // secondary signal ids
        queryType       : null,       // 'none'|'single'|'offline'|'online'|'updates_and_queries'
        answeredAt      : null,
      },

      stage2: {
        outputForm        : null,     // output shape id
        optimizationType  : null,     // 'none'|'maximize'|'minimize'|'max_min'|'min_max'|'count'
        solutionDepth     : null,     // 'value_only'|'reconstruct_path'|'count_ways'
        answeredAt        : null,
      },

      stage2_5: {
        checked          : false,     // was decomposition stage visited
        isDecomposed     : false,     // is this a multi-part problem
        subproblems      : [],        // described subproblems if decomposed
        preprocessingStep: null,      // null | description string
        answeredAt       : null,
      },

      stage3: {
        properties: {
          orderSensitivity    : null, // 'yes'|'no'|'partial'|'unsure'
          subproblemOverlap   : null, // 'yes_direct'|'yes_split'|'no'|'unsure'
          feasibilityBoundary : null, // 'yes'|'no'|'unsure'
          localOptimality     : null, // 'yes'|'no'|'unsure'
          stateSpace          : null, // 'small'|'exponential'|'path_needed'|'unsure'
          dependencyStructure : null, // 'dag'|'circular'|'unsure'
          searchSpace         : null, // 'value_range'|'decision_tree'|'graph_states'|'intervals'|'unsure'
        },
        dpSubtype  : null,            // dp sub-classifier result id
        graphGoal  : null,            // graph goal id
        answeredAt : null,
      },

      stage3_5: {
        checked          : false,
        reframeAnswered  : false,
        transformationApplied: null,  // transformation id or null
        disguiseChecked  : false,
        answeredAt       : null,
      },

      stage4: {
        interactionChecked    : false,
        interactions          : [],   // identified constraint interaction ids
        hiddenStructureChecked: false,
        hiddenStructure       : null, // implicit structure id or null
        answeredAt            : null,
      },

      stage4_5: {
        variantSelected  : null,      // specific variant id
        variantComplexity: null,      // re-checked complexity after variant
        variantFeasible  : null,      // boolean
        answeredAt       : null,
      },

      stage5: {
        greedyTested            : false,
        greedyRule              : null, // stated rule string
        greedyCounterexample    : null, // 'found'|'not_found'
        monotonicityVerified    : false,
        monotonicityResult      : null, // 'monotonic'|'not_monotonic'
        dpStateVerified         : false,
        dpStateComplete         : null, // boolean
        dpStateRedundant        : null, // boolean
        graphPropertiesVerified : false,
        keywordCrosscheckDone   : false,
        keywordMismatch         : false, // true if language vs structure warning
        passed                  : [],   // verifier ids that passed
        failed                  : [],   // verifier ids that failed
        answeredAt              : null,
      },

      stage6: {
        universalReviewed    : false,
        typeSpecificReviewed : false,
        cases                : [],    // edge case ids acknowledged
        customCases          : [],    // user-added custom edge cases
        answeredAt           : null,
      },

      stage6_5: {
        score     : null,             // 0-100 numeric score
        level     : null,             // 'high'|'medium'|'low'
        breakdown : null,             // full ConfidenceUtils report object
        gateAction: null,             // { action, message, detail, backTo }
        answeredAt: null,
      },

      stage7: {
        directions      : [],         // [{ id, label, why, verifyBefore, wouldFailIf }]
        selectedDirection: null,       // id of direction user chose to pursue
        tradeoffContext : null,        // 'contest'|'interview'|'practice'
        answeredAt      : null,
      },
    },

    // ── Output — built progressively ──────────────────────────────────────────
    output: {
      feasibilityReport : null,       // from Stage 0
      eliminatedClasses : [],         // crossed out complexity classes
      inputSummary      : null,       // from Stage 1
      outputSummary     : null,       // from Stage 2
      structuralFindings: {},         // from Stage 3
      directions        : [],         // candidate directions (2-3 max)
      edgeCaseList      : [],         // final edge case list
      confidence        : null,       // final confidence report
      finalSummary      : null,       // Stage 7 complete output
    },

    // ── Confidence ────────────────────────────────────────────────────────────
    confidence: {
      score      : null,
      level      : null,
      earned     : [],
      deducted   : [],
      gateAction : null,
    },

    // ── UI state — not persisted between sessions ─────────────────────────────
    ui: {
      activeTab      : null,
      sidebarOpen    : false,
      lastFlashedEl  : null,
    },
  };

  // ─── PRIVATE STORE ─────────────────────────────────────────────────────────

  let _state = null;

  // ─── INIT ──────────────────────────────────────────────────────────────────

  function init(savedState = null) {
    if (savedState) {
      // Merge saved state with initial — ensures all keys exist
      _state = _deepMerge(_freshState(), savedState);
    } else {
      _state = _freshState();
    }
    return _state;
  }

  function _freshState() {
    const fresh = JSON.parse(JSON.stringify(INITIAL_STATE));
    fresh.sessionId   = _generateId();
    fresh.startedAt   = Date.now();
    fresh.lastUpdatedAt = Date.now();
    return fresh;
  }

  // ─── READ ──────────────────────────────────────────────────────────────────

  function get() {
    if (!_state) init();
    return _state;
  }

  function getAnswer(stageId) {
    return get().answers[stageId] ?? null;
  }

  function getCurrentStage() {
    return get().currentStage;
  }

  function getOutput() {
    return get().output;
  }

  function getConfidence() {
    return get().confidence;
  }

  function isRecoveryMode() {
    return get().recoveryMode === true;
  }

  // ─── WRITE — STAGE ANSWERS ─────────────────────────────────────────────────

  function setAnswer(stageId, partialAnswer) {
    const state = get();
    if (!state.answers[stageId]) state.answers[stageId] = {};
    Object.assign(state.answers[stageId], partialAnswer);
    state.answers[stageId].answeredAt = Date.now();
    state.lastUpdatedAt = Date.now();
    _notifyListeners('answer', stageId);
  }

  function clearAnswer(stageId) {
    const state = get();
    if (!state.answers[stageId]) return;
    // Reset to initial shape for that stage
    const initial = JSON.parse(JSON.stringify(INITIAL_STATE));
    state.answers[stageId] = initial.answers[stageId] ?? {};
    state.lastUpdatedAt = Date.now();
    _notifyListeners('answer_cleared', stageId);
  }

  // Clear all answers from a stage onward — used when backtracking
  function clearAnswersFrom(stageId) {
    const ORDER = [
      'stage0','stage1','stage2','stage2_5',
      'stage3','stage3_5','stage4','stage4_5',
      'stage5','stage6','stage6_5','stage7',
    ];
    const fromIdx = ORDER.indexOf(stageId);
    if (fromIdx === -1) return;
    ORDER.slice(fromIdx).forEach(id => clearAnswer(id));
    _notifyListeners('answers_cleared_from', stageId);
  }

  // ─── WRITE — NAVIGATION ────────────────────────────────────────────────────

  function setCurrentStage(stageId) {
    const state = get();
    state.currentStage  = stageId;
    state.lastUpdatedAt = Date.now();

    // Track visit
    if (!state.stagesVisited.includes(stageId)) {
      state.stagesVisited.push(stageId);
    }

    // Push to navigation stack
    const stack = state.stageStack;
    if (stack.length === 0 || stack[stack.length - 1] !== stageId) {
      stack.push(stageId);
    }

    _notifyListeners('stage_changed', stageId);
  }

  function markStageComplete(stageId) {
    const state = get();
    if (!state.stagesCompleted.includes(stageId)) {
      state.stagesCompleted.push(stageId);
    }
    state.lastUpdatedAt = Date.now();
    _notifyListeners('stage_completed', stageId);
  }

  function navigateBack() {
    const state = get();
    const stack = state.stageStack;
    if (stack.length <= 1) return null;
    stack.pop();
    const prev = stack[stack.length - 1];
    state.currentStage  = prev;
    state.lastUpdatedAt = Date.now();
    _notifyListeners('navigated_back', prev);
    return prev;
  }

  function getPreviousStage() {
    const stack = get().stageStack;
    if (stack.length < 2) return null;
    return stack[stack.length - 2];
  }

  // ─── WRITE — OUTPUT ────────────────────────────────────────────────────────

  function setOutput(key, value) {
    const state = get();
    state.output[key]   = value;
    state.lastUpdatedAt = Date.now();
    _notifyListeners('output_updated', key);
  }

  function addDirection(direction) {
    const state = get();
    // Avoid duplicates
    const exists = state.output.directions.some(d => d.id === direction.id);
    if (!exists) state.output.directions.push(direction);
    state.lastUpdatedAt = Date.now();
    _notifyListeners('direction_added', direction.id);
  }

  function clearDirections() {
    const state = get();
    state.output.directions = [];
    state.lastUpdatedAt = Date.now();
  }

  // ─── WRITE — CONFIDENCE ────────────────────────────────────────────────────

  function setConfidence(report) {
    const state = get();
    state.confidence    = report;
    state.lastUpdatedAt = Date.now();

    // Also mirror into stage6_5 answer
    state.answers.stage6_5.score      = report.score;
    state.answers.stage6_5.level      = report.level;
    state.answers.stage6_5.breakdown  = report;
    state.answers.stage6_5.gateAction = report.gateAction;

    _notifyListeners('confidence_updated', report.level);
  }

  // ─── WRITE — MODE ──────────────────────────────────────────────────────────

  function enterRecovery(failureType, failureDetail) {
    const state        = get();
    state.mode         = 'recovery';
    state.recoveryMode = true;
    state.recoveryEntry = {
      failureType,
      failureDetail,
      enteredAt: Date.now(),
    };
    state.lastUpdatedAt = Date.now();
    _notifyListeners('recovery_entered', failureType);
  }

  function exitRecovery() {
    const state        = get();
    state.mode         = 'normal';
    state.recoveryMode = false;
    state.recoveryEntry = null;
    state.lastUpdatedAt = Date.now();
    _notifyListeners('recovery_exited', null);
  }

  // ─── WRITE — UI ────────────────────────────────────────────────────────────

  function setUI(key, value) {
    const state    = get();
    state.ui[key]  = value;
    // Note: ui state intentionally not triggering lastUpdatedAt
    // to avoid spurious auto-saves
  }

  // ─── RESET ─────────────────────────────────────────────────────────────────

  function reset() {
    _state = _freshState();
    _listeners = [];
    _notifyListeners('reset', null);
  }

  // ─── SERIALIZATION ─────────────────────────────────────────────────────────

  // Returns a clean copy safe for JSON serialization
  // Strips ui state which is session-only
  function serialize() {
    const state = get();
    const copy  = JSON.parse(JSON.stringify(state));
    copy.ui     = {};   // do not persist ui state
    return copy;
  }

  // Restore from serialized object
  function deserialize(serialized) {
    _state = _deepMerge(_freshState(), serialized);
    _notifyListeners('deserialized', null);
    return _state;
  }

  // ─── COMPUTED GETTERS ──────────────────────────────────────────────────────

  // Has user completed at least one stage
  function hasStarted() {
    return (get().stagesCompleted.length > 0);
  }

  // Is a specific stage complete
  function isStageComplete(stageId) {
    return get().stagesCompleted.includes(stageId);
  }

  // Is a specific stage visited (but not necessarily complete)
  function isStageVisited(stageId) {
    return get().stagesVisited.includes(stageId);
  }

  // Get all property answers from Stage 3
  function getProperties() {
    return get().answers.stage3?.properties ?? {};
  }

  // Get the current directions being considered
  function getDirections() {
    return get().output?.directions ?? [];
  }

  // Get full session summary for Stage 7
  function getSummary() {
    const state = get();
    return {
      n            : state.answers.stage0?.n,
      q            : state.answers.stage0?.q,
      timeLimit    : state.answers.stage0?.timeLimit,
      memLimit     : state.answers.stage0?.memLimit,
      eliminated   : state.answers.stage0?.eliminated ?? [],
      inputTypes   : state.answers.stage1?.inputTypes ?? [],
      outputForm   : state.answers.stage2?.outputForm,
      properties   : state.answers.stage3?.properties ?? {},
      directions   : state.output?.directions ?? [],
      confidence   : state.confidence,
      edgeCases    : state.answers.stage6?.cases ?? [],
    };
  }

  // ─── OBSERVER PATTERN ──────────────────────────────────────────────────────
  // Other modules can subscribe to state changes
  // e.g. State.subscribe('stage_changed', (stageId) => renderer.renderStage(stageId))

  let _listeners = [];

  function subscribe(event, callback) {
    _listeners.push({ event, callback });
    // Return unsubscribe function
    return () => {
      _listeners = _listeners.filter(l => !(l.event === event && l.callback === callback));
    };
  }

  function _notifyListeners(event, data) {
    _listeners
      .filter(l => l.event === event || l.event === '*')
      .forEach(l => {
        try { l.callback(data); }
        catch (e) { console.warn(`State listener error [${event}]:`, e); }
      });
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────

  function _generateId() {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // Deep merge — target keys take priority, but all source keys are included
  function _deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    const result = { ...target };
    Object.keys(source).forEach(key => {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = _deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    });
    return result;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return {
    // Init
    init,
    reset,

    // Read
    get,
    getAnswer,
    getCurrentStage,
    getOutput,
    getConfidence,
    isRecoveryMode,
    hasStarted,
    isStageComplete,
    isStageVisited,
    getProperties,
    getDirections,
    getSummary,
    getPreviousStage,

    // Write — answers
    setAnswer,
    clearAnswer,
    clearAnswersFrom,

    // Write — navigation
    setCurrentStage,
    markStageComplete,
    navigateBack,

    // Write — output
    setOutput,
    addDirection,
    clearDirections,

    // Write — confidence
    setConfidence,

    // Write — mode
    enterRecovery,
    exitRecovery,

    // Write — ui
    setUI,

    // Serialization
    serialize,
    deserialize,

    // Observer
    subscribe,
  };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = State;
}