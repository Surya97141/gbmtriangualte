// vertical-slices/sliding-window/sliding-window-flow.js
// Responsibility: Orchestrate the complete sliding window reasoning flow.
// Initializes all engines for this slice, wires EventBus subscriptions,
// and coordinates stage-by-stage IR evolution for the sliding window family.
//
// This is the entry point for the sliding window vertical slice.
// It depends on: OntologyLoader, IRManager, EventBus, EngineRegistry,
// SignalEngine, StateEngine, InvariantEngine, TransitionEngine,
// MisconceptionEngine, ConfidenceEngine, RecoveryRouter, MisconceptionRecovery.

const SlidingWindowFlow = (() => {

  const SLICE_ID   = 'sliding_window';
  const BASE_PATH  = '/ontology';

  let _initialized = false;

  // ─── INITIALIZATION ────────────────────────────────────────────────────────

  async function init() {
    if (_initialized) return;

    // 1. Load ontology graphs and build adjacency caches
    await OntologyLoader.load(BASE_PATH);

    // 2. Initialize engines with the loader
    StateEngine.init(OntologyLoader);
    InvariantEngine.init(OntologyLoader);
    TransitionEngine.init(OntologyLoader);
    MisconceptionEngine.init(OntologyLoader);

    // 3. Register engines with the registry
    EngineRegistry.register('E1', SignalEngine);
    EngineRegistry.register('E2', StateEngine);
    EngineRegistry.register('E3', InvariantEngine);
    EngineRegistry.register('E4', TransitionEngine);
    EngineRegistry.register('E9', ConfidenceEngine);
    EngineRegistry.register('E7', MisconceptionEngine);

    // 4. Register recovery handlers
    for (const route of MisconceptionRecovery.all()) {
      RecoveryRouter.registerHandler(route.id, route);
    }

    // 5. Wire EventBus subscriptions in priority order
    _wireEvents();

    _initialized = true;
  }

  // ─── SESSION MANAGEMENT ───────────────────────────────────────────────────

  function startSession(sessionId, problemDigest) {
    const ir = IRManager.init(sessionId, problemDigest);
    EngineRegistry.runAll(ir);
    IRManager.persist();
    return ir;
  }

  function resumeSession(sessionId) {
    const ir = IRManager.restore(sessionId);
    if (!ir) return null;
    EngineRegistry.runAll(ir);
    return ir;
  }

  function endSession(sessionId) {
    IRManager.destroy(sessionId);
  }

  // ─── STAGE COMPLETION ─────────────────────────────────────────────────────

  // Called when a user completes a stage and submits answers.
  // answers: { [answerKey]: answerValue }
  function onStageComplete(stageId, answers) {
    const ir = IRManager.get();
    if (!ir) return;

    IRManager.logStageComplete(stageId, answers, []);
    EventBus.emit('stage:complete', { stageId, answers });
  }

  // ─── EVENT WIRING ─────────────────────────────────────────────────────────

  function _wireEvents() {

    // Stage completion → signal extraction → downstream engines
    EventBus.on('stage:complete', ({ stageId, answers }) => {
      const ir = IRManager.get();
      if (!ir) return;

      // Run dirty engines in topo order after signals are extracted
      EngineRegistry.runDirty(ir, IRManager);
      IRManager.persist();

      // Check for misconception risks that need surfacing
      _checkMisconceptionRisks(ir);

      EventBus.emit('ir:updated', { stageId });
    }, 90);

    // Invariant verified → update IR, re-run confidence
    EventBus.on('invariant:verified', ({ invariantId }) => {
      const ir = IRManager.get();
      if (!ir) return;
      InvariantEngine.markVerified(ir, invariantId);
      IRManager.markDirty('active_invariants');
      EngineRegistry.runDirty(ir, IRManager);
      IRManager.persist();
    }, 80);

    // Contradiction resolved → update IR, re-run hypothesis + confidence
    EventBus.on('contradiction:resolved', ({ nodeA, nodeB, resolution }) => {
      const ir = IRManager.get();
      if (!ir) return;
      InvariantEngine.resolveContradiction(ir, nodeA, nodeB, resolution);
      IRManager.markDirty('contradictions');
      EngineRegistry.runDirty(ir, IRManager);
      IRManager.persist();
    }, 80);

    // Recovery exit → mark misconception resolved, re-run engines
    EventBus.on('recovery:exit', ({ misconceptionId, resolved }) => {
      const ir = IRManager.get();
      if (!ir) return;
      MisconceptionEngine.markResolved(ir, misconceptionId);
      IRManager.markDirty('misconception_risk');
      EngineRegistry.runDirty(ir, IRManager);
      IRManager.persist();
    }, 70);
  }

  // ─── MISCONCEPTION SURFACING ───────────────────────────────────────────────

  function _checkMisconceptionRisks(ir) {
    const risks = ir.misconception_risk ?? [];
    for (const risk of risks) {
      if (risk.resolved) continue;
      if (risk.risk_level === 'likely' || risk.risk_level === 'confirmed') {
        const activated = RecoveryRouter.route(
          risk.misconception_id,
          ir,
          (result) => EventBus.emit('recovery:exit', result)
        );
        if (activated) break;  // One recovery at a time
      }
    }
  }

  // ─── QUERY HELPERS ────────────────────────────────────────────────────────

  function getIR()           { return IRManager.get(); }
  function getConfidence()   { return IRManager.get()?.confidence ?? null; }
  function getHypotheses()   { return IRManager.get()?.hypotheses ?? []; }
  function getMisconceptions() { return IRManager.get()?.misconception_risk ?? []; }
  function isInitialized()   { return _initialized; }

  return {
    init,
    startSession,
    resumeSession,
    endSession,
    onStageComplete,
    getIR,
    getConfidence,
    getHypotheses,
    getMisconceptions,
    isInitialized,
    SLICE_ID,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = SlidingWindowFlow;
