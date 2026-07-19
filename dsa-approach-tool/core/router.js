// core/router.js
// Stage navigation logic — which stage comes next, conditional skipping,
// entry points (normal vs recovery), back-navigation
// Used by: engine.js
// Reads from: State

const Router = (() => {

  // ─── STAGE REGISTRY ────────────────────────────────────────────────────────
  // All stages in canonical order with metadata
  // skipIf: function(state) → boolean — if true, stage is skipped silently

  // True once the user has chosen the fast path at the entry screen —
  // Stages 0–4.5 all check this to skip themselves as a block.
  function _isFastPath(state) {
    return state.answers?.entry?.path === 'fast';
  }

  const STAGES = [
    {
      id      : 'intake',
      label   : 'Problem Statement',
      required: false,
      // Phase 1.0 — this is now the FIRST Truths First moment, deliberately
      // ahead of the Fast/Full choice at 'entry': the user types what they
      // think the problem is about before anything else, and (Phase 4.6)
      // an optional live calibration of that answer feeds a recommendation
      // on the entry screen right after. Never gates, never skipped — it
      // has to run for both paths, since it's what informs the choice
      // between them, not something derived from it.
      skipIf  : null,
    },
    {
      id      : 'entry',
      label   : 'Get Started',
      required: true,
      skipIf  : null,
    },
    {
      id      : 'stage0',
      label   : 'Complexity Budget',
      required: true,
      skipIf  : _isFastPath,
    },
    {
      id      : 'stage1',
      label   : 'Input Anatomy',
      required: true,
      skipIf  : _isFastPath,
    },
    {
      id      : 'stage2',
      label   : 'Output Anatomy',
      required: true,
      skipIf  : _isFastPath,
    },
    {
      id      : 'fastpath',
      label   : 'Fast Path',
      required: false,
      // Only shown when the fast path was chosen at entry
      skipIf  : (state) => !_isFastPath(state),
    },
    {
      id      : 'stage2_5',
      label   : 'Problem Decomposition',
      required: false,
      // Skip on the fast path, or if input is a simple single array/string
      // with no query layer
      skipIf  : (state) => {
        if (_isFastPath(state)) return true;
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
      skipIf  : _isFastPath,
    },
    {
      id      : 'stage3_5',
      label   : 'Reframing Check',
      required: false,
      // Skip on the fast path, or if confidence from Stage 3 is very high
      // i.e. all 7 properties answered with certainty and no unsure
      skipIf  : (state) => {
        if (_isFastPath(state)) return true;
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
      skipIf  : _isFastPath,
    },
    {
      id      : 'stage4_5',
      label   : 'Approach Variant',
      required: false,
      // Skip on the fast path ONLY. Used to also skip whenever zero
      // directions were derived — that silently routed straight to Stage 5,
      // bypassing this stage's honest-fallback screen ("no confident match"
      // + "back to Truths First" + Phase 4.2's live classification) for
      // every real user who genuinely stumps the static classifier, not
      // just a contrived edge case (confirmed live: a plain tree-shaped
      // input with a few honestly-"unsure" Stage 3 answers reaches zero
      // directions and clicking the real Next button skipped straight past
      // all three). stage4-5.js's own render logic already branches
      // correctly on directions.length === 0 (that's what the fallback
      // screen IS) — the router was the only thing preventing it from ever
      // running. The fallback state itself still blocks forward progress
      // (Next stays disabled) until the user goes back or gets an AI
      // classification, so this doesn't create a new dead end.
      skipIf: _isFastPath,
    },
    {
      id      : 'stage5',
      label   : 'Verification Challenges',
      required: true,
      skipIf  : null,
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
    {
      id      : 'stage8',
      label   : 'Code Translation',
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

  // Normal entry — start from Intake (Phase 1.0 — the first Truths First
  // moment, ahead of the Fast/Full choice at 'entry').
  function normalEntry() {
    return 'intake';
  }

  // Recovery entry — given failure type, return recovery path stage id
  function recoveryEntry(failureType) {
    return RECOVERY_PATHS[failureType] ?? 'recovery_wa';
  }

  // Resume entry — given saved state, return stage to resume from
  function resumeEntry(state) {
    const current = state.currentStage;
    if (!current) return 'entry';

    const stage = _getStage(current);
    if (!stage) return 'entry';

    // If current stage should now be skipped — find next valid
    if (_shouldSkip(stage, state)) {
      return next(current, state) ?? 'entry';
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

    const isFast = _isFastPath(state);

    const SKIP_REASONS = {
      stage0    : isFast ? 'Fast path — complexity budget skipped' : undefined,
      stage1    : isFast ? 'Fast path — input anatomy collected on the Fast Path stage instead' : undefined,
      stage2    : isFast ? 'Fast path — output anatomy collected on the Fast Path stage instead' : undefined,
      fastpath  : 'Full walkthrough chosen — fast path not used',
      stage2_5  : isFast ? 'Fast path — decomposition skipped' : 'Simple single-input problem — decomposition not needed',
      stage3    : isFast ? 'Fast path — structural properties skipped' : undefined,
      stage3_5  : isFast ? 'Fast path — reframing skipped' : 'All Stage 3 properties answered with certainty',
      stage4    : isFast ? 'Fast path — constraint interaction skipped' : undefined,
      stage4_5  : isFast ? 'Fast path — approach variant skipped' : undefined,
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
    // Recovery stages aren't part of the gated forward sequence — they're
    // always reachable, entered on demand via Engine.enterRecovery().
    if (targetStageId?.startsWith('recovery_')) return true;

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