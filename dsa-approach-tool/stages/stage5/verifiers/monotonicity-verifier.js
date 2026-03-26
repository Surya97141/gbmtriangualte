// stages/stage5/verifiers/monotonicity-verifier.js
// 5B — Monotonicity verification for Binary Search on Answer
// Used by: stage5.js

const MonotonicityVerifier = (() => {

  const VERIFIER = {
    id      : 'monotonicity_verifier',
    label   : 'Monotonicity Verification',
    purpose : 'Confirm isFeasible(X) is truly monotone before writing Binary Search',
    when    : 'Use whenever leaning toward Binary Search on Answer',
  };

  const FRAMEWORK = {
    steps: [
      {
        step : 1,
        label: 'Define the answer space',
        desc : 'What are the minimum and maximum possible answer values?',
        example: 'Koko bananas: speed ∈ [1, max(piles)]. Ship packages: capacity ∈ [max(weights), sum(weights)].',
        prompt : 'lo = ___, hi = ___',
      },
      {
        step : 2,
        label: 'Write isFeasible(X) clearly',
        desc : 'Given answer X — can we achieve X or better? Write this as a function.',
        example: 'isFeasible(speed) = can eat all piles in H hours at this speed?',
        prompt : 'isFeasible(X) = ___',
      },
      {
        step : 3,
        label: 'Verify monotonicity — increasing direction',
        desc : 'Pick a value X where isFeasible(X) = true. Verify isFeasible(X+1) = true.',
        example: 'Speed=4 works → Speed=5 also works (faster = fewer hours). ✓',
        prompt : 'isFeasible(X) = true → isFeasible(X+1) = ?',
      },
      {
        step : 4,
        label: 'Verify monotonicity — decreasing direction',
        desc : 'Pick a value X where isFeasible(X) = false. Verify isFeasible(X-1) = false.',
        example: 'Speed=1 fails → Speed=0 also fails (never finishes). ✓',
        prompt : 'isFeasible(X) = false → isFeasible(X-1) = ?',
      },
      {
        step : 5,
        label: 'Confirm: feasibility is monotone',
        desc : 'Pattern must be: false...false...true...true (or reverse). No alternating.',
        example: 'Speed: [false, false, true, true, true] — clean boundary ✓',
        prompt : 'Is the pattern monotone?',
      },
    ],
  };

  const DIRECTION_TEMPLATES = [
    {
      id      : 'minimize',
      label   : 'Minimize X such that isFeasible(X) = true',
      pattern : 'false...false...TRUE...true — find first true',
      template: `int lo = MIN_VAL, hi = MAX_VAL;
while (lo < hi) {
  int mid = lo + (hi - lo) / 2;
  if (isFeasible(mid)) hi = mid;  // true → try smaller
  else                 lo = mid + 1;
}
return lo;`,
      examples: [
        'Minimum speed to eat all bananas in H hours',
        'Minimum capacity to ship all packages in D days',
        'Minimum days to make m bouquets',
      ],
    },
    {
      id      : 'maximize',
      label   : 'Maximize X such that isFeasible(X) = true',
      pattern : 'true...true...TRUE...false — find last true',
      template: `int lo = MIN_VAL, hi = MAX_VAL;
while (lo < hi) {
  int mid = lo + (hi - lo + 1) / 2;  // upper mid to avoid infinite loop
  if (isFeasible(mid)) lo = mid;      // true → try larger
  else                 hi = mid - 1;
}
return lo;`,
      examples: [
        'Maximum number of workers that can be assigned tasks',
        'Maximum distance between gas stations',
        'Maximize minimum distance between placed elements',
      ],
    },
  ];

  const FAILURE_PATTERNS = [
    {
      id      : 'not_monotone',
      label   : 'Feasibility is NOT monotone',
      pattern : 'false...true...false...true',
      meaning : 'Binary Search on Answer will give wrong result here',
      fix     : 'Reconsider approach — may need DP or different formulation',
    },
    {
      id      : 'wrong_feasibility',
      label   : 'isFeasible is correct but boundary logic is wrong',
      pattern : 'Off-by-one in lo/hi update',
      meaning : 'Returns lo+1 or lo-1 instead of correct answer',
      fix     : 'Check: minimize uses hi=mid, maximize uses lo=mid (with upper mid)',
    },
    {
      id      : 'overflow_mid',
      label   : 'Integer overflow in mid computation',
      pattern : '(lo + hi) overflows for large values',
      meaning : 'Negative mid value causes infinite loop or wrong answer',
      fix     : 'Always use: mid = lo + (hi - lo) / 2',
    },
  ];

  function getVerifier()          { return { ...VERIFIER }; }
  function getFramework()         { return { ...FRAMEWORK }; }
  function getDirectionTemplates(){ return [...DIRECTION_TEMPLATES]; }
  function getFailurePatterns()   { return [...FAILURE_PATTERNS]; }

  function buildResult(isMonotone, direction, feasibilityFunction) {
    return {
      isMonotone,
      direction,
      feasibilityFunction,
      verdict: isMonotone
        ? { label: 'Monotone ✓', color: 'green', message: 'Binary Search on Answer is valid' }
        : { label: 'NOT monotone ✗', color: 'red', message: 'Binary Search on Answer will give wrong answer' },
      template: isMonotone
        ? DIRECTION_TEMPLATES.find(t => t.id === direction)?.template ?? null
        : null,
    };
  }

  return {
    getVerifier,
    getFramework,
    getDirectionTemplates,
    getFailurePatterns,
    buildResult,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonotonicityVerifier;
}