// visualization/visualization-registry.js
// Responsibility: Registry of all available visualization archetypes.
// Tracks which visualizations are registered, which invariant each reveals,
// and when each should appear in the stage flow.
//
// Visualizations do not implement rendering here — they register their metadata
// and a factory function. The stage renderer calls activate() to mount them.

const VisualizationRegistry = (() => {

  // visId → { id, label, revealsInvariant, appearsAfterStage, factory }
  const _registry = {};

  // ─── REGISTRATION ─────────────────────────────────────────────────────────

  function register(spec) {
    const required = ['id', 'label', 'revealsInvariant', 'appearsAfterStage', 'factory'];
    for (const field of required) {
      if (!spec[field] && spec[field] !== 0) {
        throw new Error(`VisualizationRegistry: missing field "${field}" in spec for ${spec.id ?? 'unknown'}`);
      }
    }
    _registry[spec.id] = spec;
  }

  // ─── LOOKUP ───────────────────────────────────────────────────────────────

  // Returns all visualizations that should appear after the given stage completes
  function getForStage(stageId) {
    return Object.values(_registry).filter(v => v.appearsAfterStage === stageId);
  }

  // Returns all visualizations that reveal a specific invariant
  function getForInvariant(invariantId) {
    return Object.values(_registry).filter(v => v.revealsInvariant === invariantId);
  }

  function get(visId)     { return _registry[visId] ?? null; }
  function getAll()       { return Object.values(_registry); }
  function isRegistered(visId) { return !!_registry[visId]; }

  // ─── ACTIVATION ───────────────────────────────────────────────────────────

  // Activate a visualization by mounting it into the given DOM container.
  // Returns the visualization instance (with step/reset controls) or null.
  function activate(visId, containerEl, ir) {
    const spec = _registry[visId];
    if (!spec) return null;
    if (!containerEl) return null;
    return spec.factory(containerEl, ir);
  }

  return {
    register,
    getForStage,
    getForInvariant,
    get,
    getAll,
    isRegistered,
    activate,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = VisualizationRegistry;
