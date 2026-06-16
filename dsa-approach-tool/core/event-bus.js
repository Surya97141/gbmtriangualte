// core/event-bus.js
// Responsibility: Priority-ordered synchronous event bus for engine coordination.
// All handlers execute synchronously in registration-priority order.
// No async, no promises — the engine layer is fully deterministic.
//
// Event contract:
//   stage:complete        → { stageId, answers }
//   ir:signals_updated    → {}
//   ir:states_updated     → {}
//   ir:invariants_updated → {}
//   ir:hypotheses_updated → {}
//   ir:confidence_updated → { score, band, gate_action }
//   ir:contradiction      → { nodeA, nodeB, edgeType }
//   recovery:activate     → { misconceptionId, recoveryRouteId }
//   recovery:exit         → { misconceptionId, resolved }

const EventBus = (() => {

  // handlers[event] = [{ handler, priority }, ...] sorted by priority descending
  const _handlers = {};

  // ─── SUBSCRIBE ────────────────────────────────────────────────────────────

  function on(event, handler, priority = 0) {
    if (typeof handler !== 'function') {
      throw new Error(`EventBus.on: handler for "${event}" must be a function`);
    }
    if (!_handlers[event]) _handlers[event] = [];
    _handlers[event].push({ handler, priority });
    _handlers[event].sort((a, b) => b.priority - a.priority);
  }

  function off(event, handler) {
    if (!_handlers[event]) return;
    _handlers[event] = _handlers[event].filter(h => h.handler !== handler);
  }

  // ─── EMIT ─────────────────────────────────────────────────────────────────

  function emit(event, data = {}) {
    const subscribers = _handlers[event];
    if (!subscribers || subscribers.length === 0) return;
    for (const { handler } of subscribers) {
      handler(data);
    }
  }

  // ─── UTILITY ──────────────────────────────────────────────────────────────

  function listEvents() {
    return Object.keys(_handlers);
  }

  function listHandlers(event) {
    return (_handlers[event] ?? []).map(h => ({ priority: h.priority }));
  }

  function clear(event) {
    if (event) {
      delete _handlers[event];
    } else {
      Object.keys(_handlers).forEach(k => delete _handlers[k]);
    }
  }

  return {
    on,
    off,
    emit,
    listEvents,
    listHandlers,
    clear,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = EventBus;
