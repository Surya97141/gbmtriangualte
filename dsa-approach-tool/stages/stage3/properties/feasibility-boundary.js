// stages/stage3/properties/feasibility-boundary.js
// 3C — Is there a monotonic feasibility boundary?
// Used by: stage3.js

const FeasibilityBoundary = (() => {

  const PROPERTY = {
    id       : 'feasibilityBoundary',
    label    : '3C — Feasibility boundary',
    question : 'Is there a value X such that: if X is achievable, then X+1 (or X-1) is also always achievable?',
    why      : 'This monotonic property means the answer space has a clean boundary — all feasible on one side, all infeasible on the other. Binary Search on Answer exploits exactly this structure to find the boundary in O(log n) checks instead of O(n) or more.',
    answers  : [
      {
        id      : 'yes',
        label   : 'Yes — monotonic feasibility exists',
        sublabel: 'If X works then X±1 also works — clean boundary',
        color   : 'green',
        opens   : [
          'Binary Search on Answer',
          'Write isFeasible(X) check function',
          'Binary search on [lo, hi] calling isFeasible each step',
        ],
        eliminates: [
          'Direct optimization (harder than feasibility check)',
        ],
        followUp  : 'Verify with two concrete examples: if answer X is valid, confirm X+1 is also valid.',
        keyInsight: 'The real problem is now writing isFeasible(X). Binary search is just the wrapper.',
      },
      {
        id      : 'no',
        label   : 'No — feasibility is not monotonic',
        sublabel: 'Valid / Invalid / Valid pattern exists — no clean boundary',
        color   : 'red',
        opens   : [],
        eliminates: [
          'Binary Search on Answer',
        ],
        followUp: 'Binary Search on Answer will not work here. Proceed with DP or Greedy analysis.',
      },
      {
        id      : 'unsure',
        label   : 'Unsure — need to check',
        sublabel: 'Not clear if boundary exists',
        color   : 'gray',
        opens   : [],
        eliminates: [],
        followUp: 'Run the monotonicity test: pick answer X, verify if X+1 is also valid and X-1 is also invalid.',
      },
    ],
  };

  const TEST_CASES = [
    {
      scenario  : 'Minimum days to make m bouquets',
      answer    : 'yes',
      reasoning : 'If d days works → d+1 days also works (more time = more bloomed flowers). MONOTONIC.',
    },
    {
      scenario  : 'Koko eating bananas — minimum speed',
      answer    : 'yes',
      reasoning : 'If speed k works → speed k+1 also works (faster = fewer hours). MONOTONIC.',
    },
    {
      scenario  : 'Capacity to ship packages in D days',
      answer    : 'yes',
      reasoning : 'If weight W works → weight W+1 also works (more capacity = fewer days). MONOTONIC.',
    },
    {
      scenario  : 'Maximum items with exactly weight W',
      answer    : 'no',
      reasoning : 'Feasibility at W does not imply feasibility at W+1 — depends on item weights. NOT MONOTONIC.',
    },
    {
      scenario  : 'Minimize maximum sum when splitting array into k subarrays',
      answer    : 'yes',
      reasoning : 'If max sum X is achievable → max sum X+1 also achievable. MONOTONIC.',
    },
  ];

  const VERIFICATION = {
    prompt: 'Monotonicity verification:',
    steps : [
      '1. State the answer space: what values can the answer take?',
      '2. Pick a specific answer value X',
      '3. If X is valid — is X+1 (or X-1 depending on direction) also valid?',
      '4. If X is invalid — is X-1 (or X+1) also invalid?',
      '5. If BOTH hold with concrete examples → MONOTONIC → Binary Search on Answer',
      '6. If EITHER fails → NOT monotonic → Binary Search on Answer will give wrong answer',
    ],
    warning: 'Verify with at least 2 concrete examples — not just intuition.',
  };

  function getProperty()     { return { ...PROPERTY }; }
  function getTestCases()    { return [...TEST_CASES]; }
  function getVerification() { return { ...VERIFICATION }; }
  function getAnswerById(id) { return PROPERTY.answers.find(a => a.id === id) ?? null; }

  function binarySearchApplicable(answerId) {
    return answerId === 'yes';
  }

  return {
    getProperty,
    getTestCases,
    getVerification,
    getAnswerById,
    binarySearchApplicable,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeasibilityBoundary;
}