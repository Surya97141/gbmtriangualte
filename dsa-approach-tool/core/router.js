// core/router.js
// Stage navigation logic — which stage comes next, conditional skipping,
// entry points (normal vs recovery), back-navigation
// Used by: engine.js
// Reads from: State

const Router = (() => {

  // ─── STAGE REGISTRY ────────────────────────────────────────────────────────
  // All stages in canonical order with metadata
  // skipIf: function(state) → boolean — if true, stage is skipped silently

  const STAGES = [
    {
      id      : 'stage0',
      label   : 'Complexity Budget',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage1',
      label   : 'Input Anatomy',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage2',
      label   : 'Output Anatomy',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage2_5',
      label   : 'Problem Decomposition',
      required: false,
      // Skip if input is simple single array/string with no query layer
      skipIf  : (state) => {
        const inputTypes = state.answers.stage1?.inputTypes ?? [];
        const queryType  = state.answers.stage1?.queryType;
        const isSimple   = (
          inputTypes.length === 1 &&
          ['single_array', 'single_string', 'single_number'].includes(inputTypes[0]) &&
          queryType === 'none'
        );
        return isSimple;
      },
    },
    {
      id      : 'stage3',
      label   : 'Structural Properties',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage3_dp',
      label   : 'DP Sub-Classifier',
      required: false,
      // Only show if Stage 3 finds overlapping subproblems
      skipIf  : (state) => {
        const overlap = state.answers.stage3?.properties?.subproblemOverlap;
        return overlap !== 'yes_direct' && overlap !== 'yes_split';
      },
    },
    {
      id      : 'stage3_graph',
      label   : 'Graph Deep-Dive',
      required: false,
      // Only show if input type includes graph
      skipIf  : (state) => {
        const inputTypes = state.answers.stage1?.inputTypes ?? [];
        return !inputTypes.some(t =>
          ['graph_edge_list', 'graph_adjacency', 'implicit_graph', 'grid'].includes(t)
        );
      },
    },
    {
      id      : 'stage3_5',
      label   : 'Reframing Check',
      required: false,
      // Skip if confidence from Stage 3 is very high
      // i.e. all 7 properties answered with certainty and no unsure
      skipIf  : (state) => {
        const props    = state.answers.stage3?.properties ?? {};
        const answered = Object.values(props).filter(v => v && v !== 'unanswered').length;
        const hasUnsure = Object.values(props).some(v => v === 'unsure');
        // Skip reframing only if all 7 answered and none are unsure
        return answered >= 7 && !hasUnsure;
      },
    },
    {
      id      : 'stage4',
      label   : 'Constraint Interaction',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage4_5',
      label   : 'Approach Variant',
      required: false,
      // Skip if no direction has been identified yet
      skipIf  : (state) => {
        return (state.output?.directions ?? []).length === 0;
      },
    },
    {
      id      : 'stage5',
      label   : 'Verification Challenges',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage5_greedy',
      label   : 'Greedy Verifier',
      required: false,
      skipIf  : (state) => {
        return !_isLeaningToward(state, 'greedy');
      },
    },
    {
      id      : 'stage5_bsearch',
      label   : 'Monotonicity Verifier',
      required: false,
      skipIf  : (state) => {
        return !_isLeaningToward(state, 'binary_search');
      },
    },
    {
      id      : 'stage5_dp',
      label   : 'DP State Verifier',
      required: false,
      skipIf  : (state) => {
        return !_isLeaningToward(state, 'dp');
      },
    },
    {
      id      : 'stage5_graph',
      label   : 'Graph Property Verifier',
      required: false,
      skipIf  : (state) => {
        return !_isLeaningToward(state, 'graph');
      },
    },
    {
      id      : 'stage5_keyword',
      label   : 'Keyword Cross-Check',
      required: false,
      // Skip if no directions identified
      skipIf  : (state) => {
        return (state.output?.directions ?? []).length === 0;
      },
    },
    {
      id      : 'stage6',
      label   : 'Edge Case Generator',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage6_5',
      label   : 'Confidence Score',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage7',
      label   : 'Output',
      required: true,
      skipIf  : null,
    },
  ];

  // ─── RECOVERY PATHS ────────────────────────────────────────────────────────

  const RECOVERY_PATHS = {
    wa     : 'recovery_wa',
    tle    : 'recovery_tle',
    logic  : 'recovery_logic',
    reframe: 'recovery_reframe',
  };

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────

  function _getStageIndex(stageId) {
    return STAGES.findIndex(s => s.id === stageId);
  }

  function _getStage(stageId) {
    return STAGES.find(s => s.id === stageId) ?? null;
  }

  // Check if stage should be skipped given current state
  function _shouldSkip(stage, state) {
    if (!stage.skipIf) return false;
    try {
      return stage.skipIf(state);
    } catch (e) {
      console.warn(`Router.shouldSkip error for ${stage.id}:`, e);
      return false;
    }
  }

  // Check if directions include a particular family
  function _isLeaningToward(state, family) {
    return (state.output?.directions ?? []).some(d =>
      (d.id     ?? '').toLowerCase().includes(family) ||
      (d.family ?? '').toLowerCase().includes(family)
    );
  }

  // ─── NEXT STAGE ────────────────────────────────────────────────────────────

  // Given current stage id and full state — return next stage id to render
  // Skips stages whose skipIf returns true
  // Returns null if we have reached the end
  function next(currentStageId, state) {
    const currentIdx = _getStageIndex(currentStageId);
    if (currentIdx === -1) {
      console.warn(`Router.next: unknown stage "${currentStageId}"`);
      return null;
    }

    // Walk forward, skipping stages that should be skipped
    for (let i = currentIdx + 1; i < STAGES.length; i++) {
      const stage = STAGES[i];
      if (!_shouldSkip(stage, state)) {
        return stage.id;
      }
    }

    return null; // reached end
  }

  // ─── PREVIOUS STAGE ────────────────────────────────────────────────────────

  // Returns the previous stage from the navigation stack
  // Does NOT recalculate — uses what was actually visited
  function prev(state) {
    const stack = state.stageStack ?? [];
    if (stack.length <= 1) return null;
    return stack[stack.length - 2];
  }

  // ─── ENTRY POINT ───────────────────────────────────────────────────────────

  // Normal entry — start from Stage 0
  function normalEntry() {
    return 'stage0';
  }

  // Recovery entry — given failure type, return recovery path stage id
  function recoveryEntry(failureType) {
    return RECOVERY_PATHS[failureType] ?? 'recovery_wa';
  }

  // Resume entry — given saved state, return stage to resume from
  function resumeEntry(state) {
    const current = state.currentStage;
    if (!current) return 'stage0';

    const stage = _getStage(current);
    if (!stage) return 'stage0';

    // If current stage should now be skipped — find next valid
    if (_shouldSkip(stage, state)) {
      return next(current, state) ?? 'stage0';
    }

    return current;
  }

  // ─── STAGE SEQUENCE FOR PROGRESS BAR ───────────────────────────────────────

  // Returns ordered list of stages that WILL be shown given current state
  // Used by progress bar and session summary
  function getActiveSequence(state) {
    return STAGES
      .filter(stage => !_shouldSkip(stage, state))
      .map(stage => ({
        id       : stage.id,
        label    : stage.label,
        required : stage.required,
        status   : _stageStatus(stage.id, state),
      }));
  }

  function _stageStatus(stageId, state) {
    const completed = state.stagesCompleted ?? [];
    const current   = state.currentStage;
    if (completed.includes(stageId)) return 'done';
    if (current === stageId)         return 'active';
    return 'pending';
  }

  // ─── BACK-NAVIGATION WITH ANSWER CLEARING ──────────────────────────────────

  // Go back to previous stage and clear all answers from that stage onward
  // Returns { targetStage, clearedFrom } or null if at start
  function goBack(state) {
    const stack = state.stageStack ?? [];
    if (stack.length <= 1) return null;

    // The stage we're going back TO
    const targetStage = stack[stack.length - 2];

    // Clear answers from target stage onward
    // (so user re-answers from that point fresh)
    const clearFrom = targetStage;

    return {
      targetStage,
      clearFrom,
    };
  }

  // ─── JUMP — for confidence gate back-routing ────────────────────────────────

  // Jump directly to a specific stage (used by confidence gate)
  // Validates the target stage exists
  function jumpTo(targetStageId, state) {
    const stage = _getStage(targetStageId);
    if (!stage) {
      console.warn(`Router.jumpTo: unknown stage "${targetStageId}"`);
      return null;
    }
    // If target should be skipped — find next valid from it
    if (_shouldSkip(stage, state)) {
      return next(targetStageId, state);
    }
    return targetStageId;
  }

  // ─── SKIP REASON (for debugging / display) ─────────────────────────────────

  function getSkipReason(stageId, state) {
    const stage = _getStage(stageId);
    if (!stage || !stage.skipIf) return null;

    const SKIP_REASONS = {
      stage2_5  : 'Simple single-input problem — decomposition not needed',
      stage3_dp : 'No overlapping subproblems identified in Stage 3',
      stage3_graph: 'No graph input type selected in Stage 1',
      stage3_5  : 'All Stage 3 properties answered with certainty',
      stage4_5  : 'No candidate directions identified yet',
      stage5_greedy : 'Not leaning toward greedy direction',
      stage5_bsearch: 'Not leaning toward binary search direction',
      stage5_dp     : 'Not leaning toward DP direction',
      stage5_graph  : 'Not leaning toward graph direction',
      stage5_keyword: 'No directions identified yet',
    };

    return _shouldSkip(stage, state)
      ? (SKIP_REASONS[stageId] ?? 'Skipped based on previous answers')
      : null;
  }

  // ─── VALIDATION ────────────────────────────────────────────────────────────

  // Check if all required stages have been completed
  function allRequiredComplete(state) {
    const required = STAGES.filter(s => s.required && !_shouldSkip(s, state));
    return required.every(s => (state.stagesCompleted ?? []).includes(s.id));
  }

  // Check if a specific stage is accessible given current progress
  // Prevents jumping ahead illegally
  function isAccessible(targetStageId, state) {
    const targetIdx  = _getStageIndex(targetStageId);
    if (targetIdx === -1) return false;

    // All required stages before target must be complete
    const before = STAGES.slice(0, targetIdx).filter(s => s.required);
    return before.every(s =>
      _shouldSkip(s, state) || (state.stagesCompleted ?? []).includes(s.id)
    );
  }

  // ─── STAGE METADATA ────────────────────────────────────────────────────────

  function getStageInfo(stageId) {
    return _getStage(stageId);
  }

  function getAllStages() {
    return [...STAGES];
  }

  function getTotalStages() {
    return STAGES.length;
  }

  function getStageNumber(stageId, state) {
    const active = getActiveSequence(state);
    const idx    = active.findIndex(s => s.id === stageId);
    return idx === -1 ? null : idx + 1;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return {
    // Navigation
    next,
    prev,
    goBack,
    jumpTo,

    // Entry points
    normalEntry,
    recoveryEntry,
    resumeEntry,

    // Sequence
    getActiveSequence,
    allRequiredComplete,
    isAccessible,

    // Metadata
    getStageInfo,
    getAllStages,
    getTotalStages,
    getStageNumber,
    getSkipReason,
  };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Router;
}