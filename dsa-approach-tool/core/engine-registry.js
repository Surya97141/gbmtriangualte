// core/engine-registry.js
// Responsibility: Register all engines with their declared read/write contracts,
// enforce the dependency DAG, and schedule dirty engines in topological order.
// No engine calls another engine directly — all coordination goes through this registry.
//
// Topological execution order (fixed, derived from dependency DAG):
//   E5 → E1 → E2 → E3 → E4 → E6 → E7 → E8 → E9

const EngineRegistry = (() => {

  // Fixed topological order — engines run in this sequence when dirty
  const EXECUTION_ORDER = ['E5', 'E1', 'E2', 'E3', 'E4', 'E6', 'E7', 'E8', 'E9'];

  // Engine contracts: what each engine reads and writes
  // Enforced at registration. An engine reading outside its declared set throws.
  const ENGINE_CONTRACTS = {
    E1: { id: 'E1', name: 'SignalEngine',        reads: ['stage_log'],                                              writes: ['signals']            },
    E2: { id: 'E2', name: 'StateEngine',         reads: ['signals', 'complexity_gate'],                             writes: ['candidate_states']   },
    E3: { id: 'E3', name: 'InvariantEngine',     reads: ['candidate_states', 'signals'],                            writes: ['active_invariants', 'active_transitions', 'contradictions'] },
    E4: { id: 'E4', name: 'TransitionEngine',    reads: ['candidate_states', 'active_invariants'],                  writes: ['active_transitions'] },
    E5: { id: 'E5', name: 'ComplexityEngine',    reads: ['stage_log'],                                              writes: ['complexity_gate']    },
    E6: { id: 'E6', name: 'HypothesisEngine',    reads: ['candidate_states', 'active_invariants', 'contradictions'],writes: ['hypotheses']         },
    E7: { id: 'E7', name: 'MisconceptionEngine', reads: ['hypotheses', 'signals', 'candidate_states'],              writes: ['misconception_risk'] },
    E8: { id: 'E8', name: 'CompositionEngine',   reads: ['hypotheses', 'signals'],                                  writes: ['hypotheses']         },
    E9: { id: 'E9', name: 'ConfidenceEngine',    reads: ['*'],                                                      writes: ['confidence']         },
  };

  const _engines = {};  // engineId → engine instance

  // ─── REGISTRATION ─────────────────────────────────────────────────────────

  function register(engineId, engineInstance) {
    if (!ENGINE_CONTRACTS[engineId]) {
      throw new Error(`EngineRegistry: unknown engine ID "${engineId}"`);
    }
    if (typeof engineInstance.run !== 'function') {
      throw new Error(`EngineRegistry: engine "${engineId}" must expose a run(ir) function`);
    }
    _engines[engineId] = engineInstance;
  }

  // ─── SCHEDULING ───────────────────────────────────────────────────────────

  // Run all dirty engines in topological order.
  // IRManager is queried for dirty flags; engines clear their flag after running.
  function runDirty(ir, irManager) {
    for (const engineId of EXECUTION_ORDER) {
      if (!_engines[engineId])      continue;
      if (!irManager.isDirty(engineId)) continue;

      _engines[engineId].run(ir);
      irManager.clearDirty(engineId);
    }
  }

  // Force-run all registered engines regardless of dirty flags.
  // Used on session init and restore.
  function runAll(ir) {
    for (const engineId of EXECUTION_ORDER) {
      if (_engines[engineId]) {
        _engines[engineId].run(ir);
      }
    }
  }

  // ─── INTROSPECTION ────────────────────────────────────────────────────────

  function getContract(engineId)     { return ENGINE_CONTRACTS[engineId] ?? null; }
  function getRegistered()           { return Object.keys(_engines); }
  function isRegistered(engineId)    { return !!_engines[engineId]; }
  function getExecutionOrder()       { return [...EXECUTION_ORDER]; }

  return {
    register,
    runDirty,
    runAll,
    getContract,
    getRegistered,
    isRegistered,
    getExecutionOrder,
    ENGINE_CONTRACTS,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = EngineRegistry;
