// stages/stage3/properties/subproblem-overlap.js
// 3B — Do smaller versions of this problem help solve the full problem?
// Used by: stage3.js

const SubproblemOverlap = (() => {

  const PROPERTY = {
    id       : 'subproblemOverlap',
    label    : '3B — Subproblem overlap',
    question : 'If you knew the optimal answer for a smaller version of this problem, does it directly help you solve the full problem?',
    why      : 'This is the core test for DP vs Greedy vs Divide and Conquer. Overlapping subproblems → DP. Independent subproblems → D&C. No subproblem structure → Greedy or direct.',
    answers  : [
      {
        id      : 'yes_direct',
        label   : 'Yes — directly helps',
        sublabel: 'Optimal solution for prefix/suffix/range feeds into larger solution',
        color   : 'blue',
        opens   : [
          'Dynamic Programming (memoization or tabulation)',
          '1D DP if subproblems are prefixes',
          '2D DP if two sequences interact',
          'Interval DP if subproblems are ranges',
        ],
        eliminates: [
          'Pure Greedy (local choice may not lead to global optimum)',
          'Divide and Conquer without memoization',
        ],
        followUp: 'Go to DP sub-classifier (Stage 3H) to identify which DP type applies.',
      },
      {
        id      : 'yes_split',
        label   : 'Yes — but only if problem splits',
        sublabel: 'Problem can be divided into independent halves that combine cleanly',
        color   : 'pur',
        opens   : [
          'Divide and Conquer',
          'Merge Sort pattern',
          'Segment Tree (range split)',
        ],
        eliminates: [
          'Standard DP (subproblems are independent, not overlapping)',
        ],
        followUp: 'Confirm subproblems are truly independent — no shared state between halves.',
      },
      {
        id      : 'no',
        label   : 'No — each step is independent',
        sublabel: 'Knowing previous answers does not help — each decision is fresh',
        color   : 'green',
        opens   : [
          'Greedy (locally optimal choices add up to global optimum)',
          'Direct computation',
          'Two Pointer',
          'Sliding Window',
        ],
        eliminates: [
          'DP (no overlapping structure to exploit)',
        ],
        followUp: 'Verify with greedy counter-example test in Stage 5A.',
      },
      {
        id      : 'unsure',
        label   : 'Unsure',
        sublabel: 'Cannot determine the relationship between subproblems',
        color   : 'gray',
        opens   : [],
        eliminates: [],
        followUp: 'Try: solve the problem for n=2 then n=3. Did the solution for n=2 help you solve n=3? That answers this question.',
      },
    ],
  };

  const TEST_CASES = [
    {
      scenario  : 'Longest Common Subsequence of two strings',
      answer    : 'yes_direct',
      reasoning : 'LCS(s1[0..i], s2[0..j]) depends on LCS(s1[0..i-1], s2[0..j-1]) — classic 2D DP.',
    },
    {
      scenario  : 'Count inversions in array',
      answer    : 'yes_split',
      reasoning : 'Split array in half, count inversions in each half, count cross-inversions — Merge Sort pattern.',
    },
    {
      scenario  : 'Minimum number of meeting rooms needed',
      answer    : 'no',
      reasoning : 'Sort by start time, greedily assign rooms. No need to know answer for previous meetings.',
    },
    {
      scenario  : 'Coin change — minimum coins',
      answer    : 'yes_direct',
      reasoning : 'dp[amount] = 1 + min(dp[amount - coin]) for each coin. Classic 1D DP.',
    },
    {
      scenario  : 'Maximum profit from stock (one transaction)',
      answer    : 'no',
      reasoning : 'Track running minimum, compute profit at each step greedily. O(n) direct.',
    },
  ];

  const VERIFICATION = {
    prompt: 'Subproblem test:',
    steps : [
      'Solve the problem for n=2 manually',
      'Now solve for n=3',
      'Did your solution for n=2 appear as a building block for n=3?',
      'If YES → overlapping subproblems → DP direction',
      'If NO  → each step fresh → Greedy or direct',
    ],
  };

  function getProperty()     { return { ...PROPERTY }; }
  function getTestCases()    { return [...TEST_CASES]; }
  function getVerification() { return { ...VERIFICATION }; }
  function getAnswerById(id) { return PROPERTY.answers.find(a => a.id === id) ?? null; }

  function isDPLikely(answerId)            { return answerId === 'yes_direct'; }
  function isDivideConquerLikely(answerId) { return answerId === 'yes_split';  }
  function isGreedyLikely(answerId)        { return answerId === 'no';         }

  return {
    getProperty,
    getTestCases,
    getVerification,
    getAnswerById,
    isDPLikely,
    isDivideConquerLikely,
    isGreedyLikely,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubproblemOverlap;
}