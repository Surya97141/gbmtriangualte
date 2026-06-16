// core/ontology-loader.js
// Responsibility: Load all ontology JSON graphs from /ontology/ and construct
// immutable O(1) adjacency caches used by every engine at runtime.
// Called once at system initialization. Safe to call multiple times — subsequent
// calls return the already-built cache without re-fetching.

const OntologyLoader = (() => {

  let _loaded  = false;
  let _graphs  = null;

  // All caches are populated once in _buildAdjacencyCaches() and never mutated again.
  const _caches = {
    // Signal → StateArchetype implications
    signalToStates:          {},  // signalId → [{ archetypeId, weight }]

    // Signal → Invariant strengthening
    signalToInvariants:      {},  // signalId → [{ invariantId, weight }]

    // Signal contradictions (target may be Signal or StateArchetype)
    signalContradicts:       {},  // signalId → [{ targetId, targetType, weight }]

    // Signal → Invariant hard breaks
    signalBreaks:            {},  // signalId → [{ invariantId }]

    // StateArchetype → required Invariant IDs
    stateRequiresInvariants: {},  // archetypeId → [invariantId]

    // StateArchetype → applicable Transition IDs
    stateUsesTransitions:    {},  // archetypeId → [transitionId]

    // Misconception → Recovery route
    misconceptionToRecovery: {},  // misconceptionId → recoveryRouteId

    // StateArchetype → Misconception IDs that commonly fire
    misconceptionTriggers:   {},  // archetypeId → [misconceptionId]

    // Universal node index across all graph types
    nodeIndex:               {},  // nodeId → node object
  };

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  async function load(basePath = '/ontology') {
    if (_loaded) return _caches;

    const [signals, states, invariants, misconceptions, transitions] = await Promise.all([
      _fetchGraph(`${basePath}/signal-graph.json`),
      _fetchGraph(`${basePath}/state-graph.json`),
      _fetchGraph(`${basePath}/invariant-graph.json`),
      _fetchGraph(`${basePath}/misconception-graph.json`),
      _fetchGraph(`${basePath}/transition-graph.json`),
    ]);

    _graphs = { signals, states, invariants, misconceptions, transitions };

    _buildNodeIndex();
    _buildAdjacencyCaches();

    _loaded = true;

    return _caches;
  }

  // Synchronous alternative to load() for environments where fetch() is unavailable
  // (e.g. file:// URLs in the demo harness). Accepts pre-loaded graph objects directly.
  function loadFromData(graphs) {
    if (_loaded) return _caches;
    _graphs = graphs;
    _buildNodeIndex();
    _buildAdjacencyCaches();
    _loaded = true;
    return _caches;
  }

  function isLoaded()      { return _loaded; }
  function getCache()      { return _caches; }
  function getGraphs()     { return _graphs; }
  function getNode(id)     { return _caches.nodeIndex[id] ?? null; }

  function getSignalImplies(signalId) {
    return _caches.signalToStates[signalId] ?? [];
  }

  function getSignalStrengthens(signalId) {
    return _caches.signalToInvariants[signalId] ?? [];
  }

  function getSignalContradicts(signalId) {
    return _caches.signalContradicts[signalId] ?? [];
  }

  function getSignalBreaks(signalId) {
    return _caches.signalBreaks[signalId] ?? [];
  }

  function getStateRequires(archetypeId) {
    return _caches.stateRequiresInvariants[archetypeId] ?? [];
  }

  function getMisconceptionsForState(archetypeId) {
    return _caches.misconceptionTriggers[archetypeId] ?? [];
  }

  function getRecoveryRoute(misconceptionId) {
    return _caches.misconceptionToRecovery[misconceptionId] ?? null;
  }

  // ─── PRIVATE ───────────────────────────────────────────────────────────────

  async function _fetchGraph(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OntologyLoader: failed to fetch ${url} (HTTP ${res.status})`);
    }
    return res.json();
  }

  function _buildNodeIndex() {
    for (const graph of Object.values(_graphs)) {
      for (const node of (graph.nodes ?? [])) {
        _caches.nodeIndex[node.id] = node;
      }
    }
  }

  function _buildAdjacencyCaches() {
    // Signal edges
    for (const edge of (_graphs.signals.edges ?? [])) {
      const { from, to, to_type, type, weight } = edge;

      if (type === 'implies' && to_type === 'StateArchetype') {
        if (!_caches.signalToStates[from]) _caches.signalToStates[from] = [];
        _caches.signalToStates[from].push({ archetypeId: to, weight });
      }

      if (type === 'strengthens' && to_type === 'Invariant') {
        if (!_caches.signalToInvariants[from]) _caches.signalToInvariants[from] = [];
        _caches.signalToInvariants[from].push({ invariantId: to, weight });
      }

      if (type === 'contradicts') {
        if (!_caches.signalContradicts[from]) _caches.signalContradicts[from] = [];
        _caches.signalContradicts[from].push({ targetId: to, targetType: to_type, weight });
      }

      if (type === 'breaks' && to_type === 'Invariant') {
        if (!_caches.signalBreaks[from]) _caches.signalBreaks[from] = [];
        _caches.signalBreaks[from].push({ invariantId: to });
      }
    }

    // State archetype node fields
    for (const node of (_graphs.states.nodes ?? [])) {
      _caches.stateRequiresInvariants[node.id] = node.requires  ?? [];
      _caches.stateUsesTransitions[node.id]    = node.uses      ?? [];
    }

    // Misconception node fields
    for (const node of (_graphs.misconceptions.nodes ?? [])) {
      if (node.recovery_route_id) {
        _caches.misconceptionToRecovery[node.id] = node.recovery_route_id;
      }
      for (const archetypeId of (node.trigger_context ?? [])) {
        if (!_caches.misconceptionTriggers[archetypeId]) {
          _caches.misconceptionTriggers[archetypeId] = [];
        }
        _caches.misconceptionTriggers[archetypeId].push(node.id);
      }
    }
  }

  return {
    load,
    loadFromData,
    isLoaded,
    getCache,
    getGraphs,
    getNode,
    getSignalImplies,
    getSignalStrengthens,
    getSignalContradicts,
    getSignalBreaks,
    getStateRequires,
    getMisconceptionsForState,
    getRecoveryRoute,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = OntologyLoader;
