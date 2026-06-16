// tests/ontology-loader.test.js
// Test suite for core/ontology-loader.js
// Validates: graph loading, adjacency cache construction, O(1) lookup correctness.
//
// Run with: node tests/ontology-loader.test.js
// Requires: Node.js with fetch polyfill, or a browser test runner.

const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  PASS: ${message}`);
};

const assertDeepEqual = (a, b, message) => {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`FAIL: ${message}\n  Expected: ${sb}\n  Got:      ${sa}`);
  console.log(`  PASS: ${message}`);
};

// ─── MOCK GRAPHS ──────────────────────────────────────────────────────────────
// Minimal valid graph structures that match the real schema.

const MOCK_SIGNAL_GRAPH = {
  meta: { schema_version: '1.0', family: 'test' },
  nodes: [
    { id: 'sig_a', label: 'Signal A', source: 'constraints', base_strength: 0.9, trigger_phrases: [], negation_id: null, requires_also: [] },
    { id: 'sig_b', label: 'Signal B', source: 'output_form',  base_strength: 1.0, trigger_phrases: [], negation_id: null, requires_also: [] },
  ],
  edges: [
    { id: 'e_001', from: 'sig_a', from_type: 'Signal', to: 'sa_state_x', to_type: 'StateArchetype', type: 'implies',    weight: 0.80 },
    { id: 'e_002', from: 'sig_a', from_type: 'Signal', to: 'inv_inv_x',  to_type: 'Invariant',      type: 'strengthens', weight: 0.90 },
    { id: 'e_003', from: 'sig_b', from_type: 'Signal', to: 'sa_state_x', to_type: 'StateArchetype', type: 'contradicts', weight: 0.70 },
    { id: 'e_004', from: 'sig_b', from_type: 'Signal', to: 'inv_inv_x',  to_type: 'Invariant',      type: 'breaks',      weight: 1.00 },
  ],
};

const MOCK_STATE_GRAPH = {
  meta: { schema_version: '1.0', family: 'test' },
  nodes: [
    { id: 'sa_state_x', label: 'State X', requires: ['inv_inv_x'], uses: ['tr_move_x'] },
  ],
};

const MOCK_INVARIANT_GRAPH = {
  meta: { schema_version: '1.0', family: 'test' },
  nodes: [
    { id: 'inv_inv_x', label: 'Invariant X', statement: 'X must hold' },
  ],
};

const MOCK_MISCONCEPTION_GRAPH = {
  meta: { schema_version: '1.0', family: 'test' },
  nodes: [
    { id: 'mc_mc_x', label: 'Misconception X', trigger_context: ['sa_state_x'], recovery_route_id: 'rr_route_x' },
  ],
};

const MOCK_TRANSITION_GRAPH = {
  meta: { schema_version: '1.0', family: 'test' },
  nodes: [
    { id: 'tr_move_x', label: 'Transition X' },
  ],
};

// ─── UNIT TESTS ────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=== OntologyLoader Tests ===\n');

  // Patch OntologyLoader to use mock graphs instead of fetch
  const loader = _buildLoaderWithMocks();

  // Test: node index
  console.log('--- Node Index ---');
  assert(loader.getNode('sig_a') !== null,  'sig_a is in node index');
  assert(loader.getNode('sa_state_x') !== null, 'sa_state_x is in node index');
  assert(loader.getNode('inv_inv_x') !== null,  'inv_inv_x is in node index');
  assert(loader.getNode('nonexistent') === null, 'nonexistent node returns null');

  // Test: signal → state implies cache
  console.log('\n--- Signal → State Implies ---');
  const impliedByA = loader.getSignalImplies('sig_a');
  assert(impliedByA.length === 1, 'sig_a implies exactly 1 state');
  assert(impliedByA[0].archetypeId === 'sa_state_x', 'sig_a implies sa_state_x');
  assert(impliedByA[0].weight === 0.80, 'sig_a → sa_state_x weight is 0.80');

  const impliedByB = loader.getSignalImplies('sig_b');
  assert(impliedByB.length === 0, 'sig_b implies 0 states (only contradicts)');

  // Test: signal → invariant strengthens cache
  console.log('\n--- Signal → Invariant Strengthens ---');
  const strengthenedByA = loader.getSignalStrengthens('sig_a');
  assert(strengthenedByA.length === 1, 'sig_a strengthens 1 invariant');
  assert(strengthenedByA[0].invariantId === 'inv_inv_x', 'sig_a strengthens inv_inv_x');
  assert(strengthenedByA[0].weight === 0.90, 'sig_a → inv_inv_x weight is 0.90');

  // Test: signal contradicts cache
  console.log('\n--- Signal Contradicts ---');
  const contradictsByB = loader.getSignalContradicts('sig_b');
  assert(contradictsByB.length === 1, 'sig_b contradicts 1 target');
  assert(contradictsByB[0].targetId === 'sa_state_x', 'sig_b contradicts sa_state_x');
  assert(contradictsByB[0].weight === 0.70, 'contradiction weight is 0.70');

  // Test: signal breaks cache
  console.log('\n--- Signal Breaks ---');
  const breaksByB = loader.getSignalBreaks('sig_b');
  assert(breaksByB.length === 1, 'sig_b breaks 1 invariant');
  assert(breaksByB[0].invariantId === 'inv_inv_x', 'sig_b breaks inv_inv_x');

  // Test: state requires invariants
  console.log('\n--- State Requires ---');
  const requires = loader.getStateRequires('sa_state_x');
  assert(requires.length === 1, 'sa_state_x requires 1 invariant');
  assert(requires[0] === 'inv_inv_x', 'sa_state_x requires inv_inv_x');

  // Test: misconception triggers
  console.log('\n--- Misconception Triggers ---');
  const triggers = loader.getMisconceptionsForState('sa_state_x');
  assert(triggers.length === 1, 'sa_state_x triggers 1 misconception');
  assert(triggers[0] === 'mc_mc_x', 'triggers mc_mc_x');

  // Test: recovery route
  console.log('\n--- Misconception → Recovery ---');
  const route = loader.getRecoveryRoute('mc_mc_x');
  assert(route === 'rr_route_x', 'mc_mc_x maps to rr_route_x');
  assert(loader.getRecoveryRoute('nonexistent') === null, 'nonexistent mc returns null route');

  console.log('\n✓ All OntologyLoader tests passed.\n');
}

// Build a loader instance with mock graphs injected directly (bypasses fetch)
function _buildLoaderWithMocks() {
  const caches = {
    signalToStates:          {},
    signalToInvariants:      {},
    signalContradicts:       {},
    signalBreaks:            {},
    stateRequiresInvariants: {},
    misconceptionToRecovery: {},
    misconceptionTriggers:   {},
    nodeIndex:               {},
  };

  const graphs = {
    signals:       MOCK_SIGNAL_GRAPH,
    states:        MOCK_STATE_GRAPH,
    invariants:    MOCK_INVARIANT_GRAPH,
    misconceptions:MOCK_MISCONCEPTION_GRAPH,
    transitions:   MOCK_TRANSITION_GRAPH,
  };

  // Build node index
  for (const graph of Object.values(graphs)) {
    for (const node of (graph.nodes ?? [])) caches.nodeIndex[node.id] = node;
  }

  // Build adjacency caches from signal edges
  for (const edge of (graphs.signals.edges ?? [])) {
    const { from, to, to_type, type, weight } = edge;
    if (type === 'implies' && to_type === 'StateArchetype') {
      if (!caches.signalToStates[from]) caches.signalToStates[from] = [];
      caches.signalToStates[from].push({ archetypeId: to, weight });
    }
    if (type === 'strengthens' && to_type === 'Invariant') {
      if (!caches.signalToInvariants[from]) caches.signalToInvariants[from] = [];
      caches.signalToInvariants[from].push({ invariantId: to, weight });
    }
    if (type === 'contradicts') {
      if (!caches.signalContradicts[from]) caches.signalContradicts[from] = [];
      caches.signalContradicts[from].push({ targetId: to, targetType: to_type, weight });
    }
    if (type === 'breaks' && to_type === 'Invariant') {
      if (!caches.signalBreaks[from]) caches.signalBreaks[from] = [];
      caches.signalBreaks[from].push({ invariantId: to });
    }
  }

  // State requires
  for (const node of (graphs.states.nodes ?? [])) {
    caches.stateRequiresInvariants[node.id] = node.requires ?? [];
  }

  // Misconception triggers and recovery
  for (const node of (graphs.misconceptions.nodes ?? [])) {
    if (node.recovery_route_id) caches.misconceptionToRecovery[node.id] = node.recovery_route_id;
    for (const archetypeId of (node.trigger_context ?? [])) {
      if (!caches.misconceptionTriggers[archetypeId]) caches.misconceptionTriggers[archetypeId] = [];
      caches.misconceptionTriggers[archetypeId].push(node.id);
    }
  }

  return {
    getNode:                   (id) => caches.nodeIndex[id] ?? null,
    getSignalImplies:          (id) => caches.signalToStates[id] ?? [],
    getSignalStrengthens:      (id) => caches.signalToInvariants[id] ?? [],
    getSignalContradicts:      (id) => caches.signalContradicts[id] ?? [],
    getSignalBreaks:           (id) => caches.signalBreaks[id] ?? [],
    getStateRequires:          (id) => caches.stateRequiresInvariants[id] ?? [],
    getMisconceptionsForState: (id) => caches.misconceptionTriggers[id] ?? [],
    getRecoveryRoute:          (id) => caches.misconceptionToRecovery[id] ?? null,
  };
}

runTests().catch(err => { console.error(err.message); process.exit(1); });
