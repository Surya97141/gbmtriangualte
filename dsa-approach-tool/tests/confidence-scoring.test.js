// tests/confidence-scoring.test.js
// Regression tests for stage6-5.js's _computeReport (the REAL scoring
// function that renders every user's actual confidence score) and
// stage7.js's _computeCommitTimeRecheck (the commit-time complexity
// recheck pipeline). Both are exposed on their module's public return
// purely for this file to reach them directly — zero behavior change.
//
// Deliberately loads the real source files via require(), not a
// reimplementation/mirror of the logic — a prior test suite in this repo
// did that (tests/state-engine.test.js, tests/signal-engine.test.js,
// tests/ontology-loader.test.js, all removed in this pass) and tested an
// abandoned parallel architecture nobody ran, giving false confidence.
//
// Run with: node --test tests/confidence-scoring.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ─── MINIMAL GLOBAL SHIMS ───────────────────────────────────────────────────
// _computeReport and _computeCommitTimeRecheck are pure functions of `state`
// plus these globals — no DOM, no State/Renderer calls inside either (both
// confirmed by direct reading before writing these tests, not assumed).
global.ComplexityRecheck = require(path.join(__dirname, '../stages/stage4-5/variants/complexity-recheck.js'));
global.MathUtils         = require(path.join(__dirname, '../utils/math-utils.js'));
// stage6-5.js reads ConfidenceScorer.CATEGORY_LABELS at module-load time
// (not just inside functions), so this must exist before requiring it below.
global.ConfidenceScorer  = require(path.join(__dirname, '../stages/stage6-5/confidence-scorer.js'));
// ReframeQuestions is read via a `typeof !== 'undefined'` guard inside
// _computeReport with a hardcoded fallback of 8 when absent — left
// undefined here deliberately, so fixtures below target that fallback.

const Stage6_5 = require(path.join(__dirname, '../stages/stage6-5/stage6-5.js'));
const Stage7   = require(path.join(__dirname, '../stages/stage7/stage7.js'));

// ─── FIXTURES ────────────────────────────────────────────────────────────────

function highConfidenceState() {
  return {
    answers: {
      stage0: { n: 1000, feasibility: [{ status: 'green' }], eliminated: ['o(n^3)'], memChecked: true },
      stage1: { inputTypes: ['single_array'], secondarySignals: ['sorted'], queryType: 'none' },
      stage2: { outputForm: 'single_value', optimizationType: 'maximize', solutionDepth: 'value_only' },
      stage2_5: {
        checked: true, subproblems: ['a', 'b'],
        reframeAnswers: { q1: 'no', q2: 'no', q3: 'no', q4: 'no' }, // 4/8 = Math.ceil(8/2), meets threshold
      },
      stage3: {
        properties: {
          orderSensitivity: 'yes', subproblemOverlap: 'yes_direct', feasibilityBoundary: 'no',
          localOptimality: 'no', stateSpace: 'small', dependencyStructure: 'dag', searchSpace: 'decision_tree',
        },
        dpSubtype: 'dp_1d',
      },
      stage3_5: { checked: true },
      stage4: { interactionChecked: true, hiddenStructureChecked: true },
      stage5: { dpStateVerified: true, keywordCrosscheckDone: true, verifierStates: { dp_state: { checkAnswers: true } } },
      stage6: { universalReviewed: true, typeSpecificReviewed: true },
    },
    output: { directions: [{ id: 'dp', family: 'dp' }] },
  };
}

// A minimal, mostly-incomplete walkthrough: Stage 0/1/2 answered, all 7
// Stage 3 properties left "unsure", and Stage 2.5/3.5/4/5/6 never touched.
// The expected score below was derived by hand-tracing _computeReport
// against this exact fixture (not recalled from an earlier live session —
// an earlier version of this test pinned a remembered "24" that turned out
// to not account for the transformation_skipped penalty Stage 3.5 being
// empty also triggers; that was a memory error, not a bug in the source):
//   earned:   complexity_budget_computed(5) + memory_checked(3)
//           + input_type_identified(5) + query_type_identified(1)
//           + output_form_identified(4) + optimization_type_identified(2)
//           + solution_depth_identified(1)                        = 21
//   deducted: property_answered_unsure(-3*7=-21) + transformation_skipped(-2) = -23
//   total = 21 - 23 = -2, clamped to 0.
function allUnsureState() {
  return {
    answers: {
      stage0: { n: 1000, feasibility: [{ status: 'green' }], eliminated: [], memChecked: true },
      stage1: { inputTypes: ['single_array'], queryType: 'updates' },
      stage2: { outputForm: 'single_value', optimizationType: 'maximize', solutionDepth: 'value_only' },
      stage2_5: {},
      stage3: {
        properties: {
          orderSensitivity: 'unsure', subproblemOverlap: 'unsure', feasibilityBoundary: 'unsure',
          localOptimality: 'unsure', stateSpace: 'unsure', dependencyStructure: 'unsure', searchSpace: 'unsure',
        },
      },
      stage3_5: {},
      stage4: {},
      stage5: {},
      stage6: {},
    },
    output: { directions: [] },
  };
}

function fastPathState() {
  return {
    answers: {
      entry: { path: 'fast' },
      fastpath: { direction: 'Dynamic Programming', directionFamily: 'dp', inputTypes: ['single_array'] },
      stage5: { dpStateVerified: true, keywordCrosscheckDone: true, verifierStates: { dp_state: { checkAnswers: true } } },
      stage6: { universalReviewed: true, typeSpecificReviewed: true },
    },
    output: { directions: [{ id: 'fastpath_direction', family: 'dp' }] },
  };
}

// ─── _computeReport ──────────────────────────────────────────────────────────

test('_computeReport: confident full walkthrough reaches High Confidence band (>=85)', () => {
  const report = Stage6_5._computeReport(highConfidenceState());
  assert.ok(report.score >= 85, `expected score >= 85, got ${report.score}`);
  assert.equal(report.deducted.length, 0, `expected zero penalties, got ${JSON.stringify(report.deducted)}`);
});

test('_computeReport: all-unsure Stage 3 clamps to 0 once the unsure and transformation-skipped penalties outweigh the little that was earned', () => {
  const report = Stage6_5._computeReport(allUnsureState());
  assert.equal(report.score, 0, `expected score=0 (see hand-traced comment above the fixture), got ${report.score}`);
  assert.deepEqual(
    report.deducted,
    [
      { key: 'property_answered_unsure', points: -21 },
      { key: 'transformation_skipped', points: -2 },
    ],
    `expected the unsure penalty (-21) plus transformation_skipped (-2), got ${JSON.stringify(report.deducted)}`
  );
});

test('_computeReport: Fast Path rescales to its own achievable ceiling, not the full-walkthrough one', () => {
  const report = Stage6_5._computeReport(fastPathState());
  // Before the fix earlier this session, a fully-verified Fast Path session
  // scored the same raw points against the ~100-point full-walkthrough
  // total and permanently capped around 30 — this pins that it no longer does.
  assert.ok(report.score >= 85, `expected a fully-verified Fast Path run to reach High Confidence, got ${report.score}`);
});

test('_computeReport: Fast Path with nothing verified stays low, not artificially inflated', () => {
  const state = fastPathState();
  state.answers.stage5 = {};
  state.answers.stage6 = {};
  const report = Stage6_5._computeReport(state);
  assert.ok(report.score < 65, `expected an unverified Fast Path run to stay below Medium Confidence, got ${report.score}`);
});

// Phase 2.2 — a session that went through Stage 4.5's honest "no confident
// family match" fallback (stage4-5.js sets answers.stage4_5.usedFallback)
// must never reach High Confidence, even when everything else about the
// walkthrough is otherwise fully verified.
test('_computeReport: usedFallback caps an otherwise-High-Confidence walkthrough below the High band', () => {
  const state = highConfidenceState();
  state.answers.stage4_5 = { usedFallback: true };
  const report = Stage6_5._computeReport(state);
  assert.ok(report.score <= 84, `expected fallback path to cap score at or below 84 (Medium ceiling), got ${report.score}`);
  assert.ok(
    report.deducted.some(d => d.key === 'fallback_path_used'),
    `expected a fallback_path_used penalty in the breakdown, got ${JSON.stringify(report.deducted)}`
  );
});

test('_computeReport: usedFallback=false (or absent) does not cap a High Confidence walkthrough', () => {
  const report = Stage6_5._computeReport(highConfidenceState());
  assert.ok(report.score >= 85, `expected the unmodified high-confidence fixture to stay >=85, got ${report.score}`);
  assert.ok(
    !report.deducted.some(d => d.key === 'fallback_path_used'),
    'did not expect a fallback_path_used penalty when usedFallback was never set'
  );
});

// ─── _computeCommitTimeRecheck (Stage 7) ────────────────────────────────────

function stage7BaseState(variantSelected, n = 3000, queryType = 'updates') {
  return {
    answers: {
      stage0: { n, timeLimit: 1 },
      stage1: { queryType },
      stage2: {},
      stage4_5: { variantSelected, recheckResult: { grade: 'safe' } },
    },
  };
}

test('_computeCommitTimeRecheck: a covered class steps up and flags the downgrade', () => {
  // dp_standard = o(n^2); COMPLEXITY_STEP_UP steps o(n^2) -> o(n^2logn) when
  // queryType is 'updates' (the Fenwick/segment-tree bolt-on scenario).
  const result = Stage7._computeCommitTimeRecheck(stage7BaseState('dp_standard'));
  assert.ok(result, 'expected a recheck result for a covered step-up class');
  assert.equal(result.effectiveClass, 'o(n^2logn)');
  assert.equal(result.downgraded, true);
});

test('_computeCommitTimeRecheck: an intentionally-excluded class (o(n^3)) does not step up', () => {
  // gv_network_flow = o(n^3) (an approximation, see complexity-recheck.js) —
  // this class is deliberately excluded from COMPLEXITY_STEP_UP (see the
  // comment above the map in stage7.js, added alongside the 0.4 fix this
  // pass) since a structure already this expensive doesn't realistically
  // gain "one more log factor" from an update bolt-on. Pinning that the
  // effective class stays unchanged, not silently miscalculated.
  const result = Stage7._computeCommitTimeRecheck(stage7BaseState('gv_network_flow', 15));
  // At n=15 this is cheap enough that nothing downgrades either way — the
  // point here is solely that effectiveClass never becomes something
  // COMPLEXITY_STEP_UP doesn't define, not the resulting grade.
  if (result) assert.equal(result.effectiveClass, 'o(n^3)');
});

test('_computeCommitTimeRecheck: returns null when Stage 4.5 was skipped (no variant selected)', () => {
  const state = stage7BaseState(undefined);
  state.answers.stage4_5 = {};
  const result = Stage7._computeCommitTimeRecheck(state);
  assert.equal(result, null);
});
