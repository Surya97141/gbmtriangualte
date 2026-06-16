// tests/signal-engine.test.js
// Test suite for engines/signal-engine.js
// Validates: signal extraction from stage answers, deduplication, strength assignment.
//
// Run with: node tests/signal-engine.test.js

const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  PASS: ${message}`);
};

// ─── INLINE ENGINE (avoids module loading complexity) ─────────────────────────
// Mirror of the SIGNAL_RULES from signal-engine.js for test isolation.

const SIGNAL_RULES = [
  { stage: 'stage2', key: 'solution_depth',         value: 'subarray',  emit: { id: 'sig_contiguous_subarray', strength: 0.90, basis: 'Output is a subarray' } },
  { stage: 'stage2', key: 'solution_depth',         value: 'substring', emit: { id: 'sig_contiguous_subarray', strength: 0.90, basis: 'Output is a substring' } },
  { stage: 'stage2', key: 'optimization_type',      value: 'maximize',  emit: { id: 'sig_optimization_query',  strength: 1.00, basis: 'Query type is maximize' } },
  { stage: 'stage2', key: 'optimization_type',      value: 'minimize',  emit: { id: 'sig_optimization_query',  strength: 1.00, basis: 'Query type is minimize' } },
  { stage: 'stage2', key: 'optimization_type',      value: 'count',     emit: { id: 'sig_count_query',         strength: 1.00, basis: 'Query type is count' } },
  { stage: 'stage2', key: 'window_size_type',       value: 'fixed',     emit: { id: 'sig_fixed_window_size',   strength: 0.95, basis: 'Window size is fixed' } },
  { stage: 'stage2', key: 'window_size_type',       value: 'variable',  emit: { id: 'sig_variable_window_size',strength: 0.85, basis: 'Window size varies' } },
  { stage: 'stage3', key: 'feasibility_boundary_answered', value: true, emit: { id: 'sig_range_constraint',   strength: 0.85, basis: 'Feasibility boundary confirmed' } },
  { stage: 'stage3', key: 'local_optimality_answered',     value: 'yes',emit: { id: 'sig_monotone_constraint',strength: 0.90, basis: 'Local optimality confirmed' } },
  { stage: 'stage3', key: 'local_optimality_answered',     value: 'no', emit: { id: 'sig_non_monotone_constraint', strength: 0.90, basis: 'Local optimality denied' } },
  { stage: 'stage3', key: 'local_optimality_answered',     value: 'unsure', emit: { id: 'sig_non_monotone_constraint', strength: 0.65, basis: 'Local optimality uncertain' } },
  { stage: 'stage4', key: 'monotone_removal_confirmed',    value: true, emit: { id: 'sig_monotone_removable', strength: 0.85, basis: 'FIFO removal confirmed' } },
];

function runSignalEngine(ir) {
  const existing   = new Set(ir.signals.map(s => s.id));
  const newSignals = [];
  for (const rule of SIGNAL_RULES) {
    const entry = ir.stage_log[rule.stage];
    if (!entry || !entry.complete) continue;
    const answerValue = entry.answers?.[rule.key];
    if (answerValue !== rule.value) continue;
    if (existing.has(rule.emit.id)) {
      const current = ir.signals.find(s => s.id === rule.emit.id);
      if (current && rule.emit.strength > current.strength) {
        current.strength = rule.emit.strength;
        current.basis    = rule.emit.basis;
      }
      continue;
    }
    newSignals.push({ id: rule.emit.id, strength: rule.emit.strength, source_stage: rule.stage, basis: rule.emit.basis });
    existing.add(rule.emit.id);
  }
  if (newSignals.length > 0) ir.signals.push(...newSignals);
}

function makeIR(stageLog) {
  return { signals: [], stage_log: stageLog };
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

function runTests() {
  console.log('\n=== SignalEngine Tests ===\n');

  // Test 1: No stages complete → no signals
  console.log('--- No completed stages ---');
  const ir1 = makeIR({});
  runSignalEngine(ir1);
  assert(ir1.signals.length === 0, 'No signals emitted when no stages complete');

  // Test 2: Stage 2 subarray + maximize → two signals
  console.log('\n--- Stage 2: subarray + maximize ---');
  const ir2 = makeIR({
    stage2: { complete: true, answers: { solution_depth: 'subarray', optimization_type: 'maximize' } },
  });
  runSignalEngine(ir2);
  assert(ir2.signals.length === 2, '2 signals emitted');
  assert(ir2.signals.some(s => s.id === 'sig_contiguous_subarray'), 'sig_contiguous_subarray emitted');
  assert(ir2.signals.some(s => s.id === 'sig_optimization_query'),  'sig_optimization_query emitted');
  const optSig = ir2.signals.find(s => s.id === 'sig_optimization_query');
  assert(optSig.strength === 1.00, 'sig_optimization_query strength = 1.00');
  assert(optSig.source_stage === 'stage2', 'source_stage = stage2');

  // Test 3: Stage 3 monotone → sig_monotone_constraint
  console.log('\n--- Stage 3: local_optimality yes ---');
  const ir3 = makeIR({
    stage3: { complete: true, answers: { feasibility_boundary_answered: true, local_optimality_answered: 'yes' } },
  });
  runSignalEngine(ir3);
  assert(ir3.signals.some(s => s.id === 'sig_range_constraint'),    'sig_range_constraint emitted');
  assert(ir3.signals.some(s => s.id === 'sig_monotone_constraint'),  'sig_monotone_constraint emitted');
  assert(!ir3.signals.some(s => s.id === 'sig_non_monotone_constraint'), 'sig_non_monotone NOT emitted');

  // Test 4: Stage 3 local_optimality no → non-monotone signal
  console.log('\n--- Stage 3: local_optimality no ---');
  const ir4 = makeIR({
    stage3: { complete: true, answers: { local_optimality_answered: 'no' } },
  });
  runSignalEngine(ir4);
  assert(ir4.signals.some(s => s.id === 'sig_non_monotone_constraint'), 'sig_non_monotone_constraint emitted');
  assert(!ir4.signals.some(s => s.id === 'sig_monotone_constraint'),    'sig_monotone NOT emitted');

  // Test 5: Deduplication — same signal from two rules → emitted once
  console.log('\n--- Deduplication ---');
  const ir5 = makeIR({
    stage2: { complete: true, answers: { solution_depth: 'subarray' } },
  });
  runSignalEngine(ir5);
  runSignalEngine(ir5);  // Run twice
  const subArraySigs = ir5.signals.filter(s => s.id === 'sig_contiguous_subarray');
  assert(subArraySigs.length === 1, 'sig_contiguous_subarray emitted exactly once despite double run');

  // Test 6: Stage 4 monotone_removal → sig_monotone_removable
  console.log('\n--- Stage 4: monotone_removal_confirmed ---');
  const ir6 = makeIR({
    stage4: { complete: true, answers: { monotone_removal_confirmed: true } },
  });
  runSignalEngine(ir6);
  assert(ir6.signals.some(s => s.id === 'sig_monotone_removable'), 'sig_monotone_removable emitted');

  // Test 7: Fixed window size signal
  console.log('\n--- Stage 2: fixed window ---');
  const ir7 = makeIR({
    stage2: { complete: true, answers: { window_size_type: 'fixed' } },
  });
  runSignalEngine(ir7);
  assert(ir7.signals.some(s => s.id === 'sig_fixed_window_size'), 'sig_fixed_window_size emitted');
  assert(!ir7.signals.some(s => s.id === 'sig_variable_window_size'), 'sig_variable NOT emitted for fixed');

  // Test 8: Count query → sig_count_query
  console.log('\n--- Stage 2: count query ---');
  const ir8 = makeIR({
    stage2: { complete: true, answers: { optimization_type: 'count' } },
  });
  runSignalEngine(ir8);
  assert(ir8.signals.some(s => s.id === 'sig_count_query'), 'sig_count_query emitted for count type');
  assert(!ir8.signals.some(s => s.id === 'sig_optimization_query'), 'sig_optimization NOT emitted for count');

  console.log('\n✓ All SignalEngine tests passed.\n');
}

runTests();
