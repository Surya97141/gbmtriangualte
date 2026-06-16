// core/ir-manager.js
// Responsibility: Own and manage the single Intermediate Representation (IR) object.
// The IR is the shared working memory of the inference pipeline — all engines read
// from it and write to it through this manager. Handles lifecycle: init, update,
// persist to sessionStorage, restore. Manages dirty flags for engine scheduling.

const IRManager = (() => {

  // ─── DIRTY FLAG CONFIG ────────────────────────────────────────────────────
  // When a field changes, these downstream engines must re-run.
  const DIRTY_PROPAGATION = {
    signals:           ['E2', 'E3', 'E6', 'E7', 'E8', 'E9'],
    candidate_states:  ['E3', 'E6', 'E7', 'E8', 'E9'],
    active_invariants: ['E6', 'E7', 'E9'],
    hypotheses:        ['E7', 'E8', 'E9'],
    misconception_risk:['E9'],
    contradictions:    ['E6', 'E9'],
    complexity_gate:   ['E2'],
  };

  const SESSION_KEY_PREFIX = 'ir_session_';

  let _ir      = null;
  let _dirty   = {};

  // ─── EMPTY IR TEMPLATE ────────────────────────────────────────────────────

  function _emptyIR(sessionId, problemDigest) {
    return {
      session_id:      sessionId,
      problem_digest:  problemDigest,
      created_at:      Date.now(),
      updated_at:      Date.now(),

      signals:           [],
      candidate_states:  [],
      active_invariants: [],
      active_transitions:[],
      hypotheses:        [],
      misconception_risk:[],
      contradictions:    [],

      complexity_gate: {
        max_n:               null,
        time_limit_sec:      null,
        ops_budget:          null,
        feasible_classes:    [],
        eliminated_classes:  [],
        eliminated_archetypes:[],
      },

      confidence: {
        score:        0,
        band:         'low',
        gate_action:  'verify',
        earned:       [],
        deducted:     [],
        weakest_stage: null,
      },

      stage_log: {},
    };
  }

  function _resetDirty() {
    _dirty = { E1:false, E2:false, E3:false, E4:false,
               E5:false, E6:false, E7:false, E8:false, E9:false };
  }

  function _markAllDirty() {
    Object.keys(_dirty).forEach(k => { _dirty[k] = true; });
  }

  // ─── LIFECYCLE ────────────────────────────────────────────────────────────

  function init(sessionId, problemDigest) {
    _ir = _emptyIR(sessionId, problemDigest);
    _resetDirty();
    _markAllDirty();
    return _ir;
  }

  function restore(sessionId) {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + sessionId);
    if (!raw) return null;

    try {
      _ir = JSON.parse(raw);
      _resetDirty();
      _markAllDirty();  // Re-derive on restore to guarantee consistency
      return _ir;
    } catch {
      return null;
    }
  }

  function persist() {
    if (!_ir) return;
    _ir.updated_at = Date.now();
    sessionStorage.setItem(SESSION_KEY_PREFIX + _ir.session_id, JSON.stringify(_ir));
  }

  function destroy(sessionId) {
    sessionStorage.removeItem(SESSION_KEY_PREFIX + sessionId);
    _ir    = null;
    _dirty = {};
  }

  // ─── FIELD WRITES ─────────────────────────────────────────────────────────
  // Engines call these to update IR fields. Each write marks downstream engines dirty.

  function writeField(fieldName, value) {
    if (!_ir) throw new Error('IRManager: writeField called before init()');
    _ir[fieldName] = value;
    markDirty(fieldName);
  }

  function appendToField(fieldName, item) {
    if (!_ir) throw new Error('IRManager: appendToField called before init()');
    if (!Array.isArray(_ir[fieldName])) {
      throw new Error(`IRManager: appendToField — "${fieldName}" is not an array`);
    }
    _ir[fieldName].push(item);
    markDirty(fieldName);
  }

  function markDirty(fieldName) {
    const engines = DIRTY_PROPAGATION[fieldName] ?? [];
    engines.forEach(e => { _dirty[e] = true; });
  }

  function isDirty(engineId)    { return _dirty[engineId] === true; }
  function clearDirty(engineId) { _dirty[engineId] = false; }

  // ─── READ ─────────────────────────────────────────────────────────────────

  function get()             { return _ir; }
  function getField(name)    { return _ir?.[name] ?? null; }
  function isInitialized()   { return _ir !== null; }

  // ─── STAGE LOG ────────────────────────────────────────────────────────────

  function logStageComplete(stageId, answers, signalsEmitted) {
    if (!_ir) return;
    _ir.stage_log[stageId] = {
      complete:        true,
      completed_at:    Date.now(),
      answers:         answers,
      signals_emitted: signalsEmitted,
    };
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return {
    init,
    restore,
    persist,
    destroy,
    get,
    getField,
    isInitialized,
    writeField,
    appendToField,
    markDirty,
    isDirty,
    clearDirty,
    logStageComplete,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = IRManager;
