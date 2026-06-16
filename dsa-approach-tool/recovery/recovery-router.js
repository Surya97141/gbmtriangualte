// recovery/recovery-router.js
// Responsibility: Route to the correct recovery flow when a misconception reaches
// "likely" or "confirmed" risk level. Acts as the dispatch layer between the
// MisconceptionEngine output and the specific recovery flow implementation.
//
// The router does NOT implement recovery flows. It looks up which flow handles
// a given misconception and hands control to it.

const RecoveryRouter = (() => {

  // Map from misconception ID → recovery route handler ID
  // Route handler IDs correspond to exports in misconception-recovery.js
  const ROUTE_MAP = {
    mc_monotonicity_failure:   'rr_constraint_monotonicity_check',
    mc_segment_tree_overkill:  'rr_complexity_downgrade',
    mc_fixed_window_confusion: 'rr_constraint_reread',
    mc_deque_invariant_break:  'rr_deque_dual_invariant',
  };

  let _handlers     = {};  // routeId → { activate(ir, onExit) }
  let _activeRoute  = null;

  // ─── REGISTRATION ─────────────────────────────────────────────────────────

  function registerHandler(routeId, handler) {
    if (typeof handler.activate !== 'function') {
      throw new Error(`RecoveryRouter: handler for "${routeId}" must expose activate(ir, onExit)`);
    }
    _handlers[routeId] = handler;
  }

  // ─── ROUTING ──────────────────────────────────────────────────────────────

  // Called by the system when a misconception risk entry reaches "likely" or higher.
  // Returns the recovery session { questions, evaluate } on success, null otherwise.
  function route(misconceptionId, ir, onExit) {
    const routeId = ROUTE_MAP[misconceptionId];
    if (!routeId) return null;

    const handler = _handlers[routeId];
    if (!handler) return null;

    if (_activeRoute) {
      // A recovery is already in progress — do not interrupt
      return null;
    }

    _activeRoute = { misconceptionId, routeId };
    const session = handler.activate(ir, (resolved) => {
      _activeRoute = null;
      if (typeof onExit === 'function') onExit({ misconceptionId, routeId, resolved });
    });

    return session;
  }

  function getActiveRoute()        { return _activeRoute; }
  function isRecoveryActive()      { return _activeRoute !== null; }
  function getRouteId(mcId)        { return ROUTE_MAP[mcId] ?? null; }
  function getRegisteredHandlers() { return Object.keys(_handlers); }

  return {
    registerHandler,
    route,
    getActiveRoute,
    isRecoveryActive,
    getRouteId,
    getRegisteredHandlers,
    ROUTE_MAP,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = RecoveryRouter;
