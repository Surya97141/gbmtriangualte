// stages/stage6/edge-cases/array-cases.js
// Edge cases specific to array and sequence inputs
// Used by: stage6.js

const ArrayCases = (() => {

  const CASES = [
    {
      id           : 'ac_all_negative',
      label        : 'All elements negative',
      priority     : 'critical',
      whyItMatters : 'Initializing result with 0 instead of INT_MIN silently gives wrong answer for all-negative arrays. Maximum subarray should be the least-negative element.',
      checkQuestion: 'Does your solution work when every element is negative?',
      commonFailure: 'int maxSum = 0 → returns 0 instead of -1 (the max of [-5,-3,-1]). Must initialize with a[0] or INT_MIN.',
      fix          : 'Initialize result with a[0] (first element) or INT_MIN, never 0 when all values may be negative.',
      testInput    : '[-5, -3, -1, -4]',
      expected     : 'Max subarray = -1 (not 0)',
    },
    {
      id           : 'ac_mixed_signs',
      label        : 'Mix of positive, negative, and zero',
      priority     : 'high',
      whyItMatters : 'Sign changes are where most array algorithms break. Two pointer, prefix sum, and sliding window all behave differently with mixed signs.',
      checkQuestion: 'Does your solution handle sign changes correctly?',
      commonFailure: 'Sliding window sum no longer monotone with negatives → window shrink may not help. Prefix sum + hashmap approach needed.',
      fix          : 'For subarray sum with negatives: prefix sum + HashMap. Sliding window only works for non-negative.',
      testInput    : '[-2, 3, -1, 4, -3, 2]',
      expected     : 'Max subarray = [3,-1,4] = 6',
    },
    {
      id           : 'ac_all_zeros',
      label        : 'All elements are zero',
      priority     : 'high',
      whyItMatters : 'Division by zero, log(0), modulo(0), and comparisons with 0 as sentinel all fail on all-zero arrays.',
      checkQuestion: 'Does your solution handle zero-only input without division or log errors?',
      commonFailure: 'Division by zero. Product of subarray = 0 incorrectly treated as "no product found". GCD(0,0) undefined.',
      fix          : 'Explicitly handle zero case before any division or logarithm. Product problems: track zero count separately.',
      testInput    : '[0, 0, 0, 0]',
      expected     : 'Problem-dependent but no crash',
    },
    {
      id           : 'ac_overflow_product',
      label        : 'Values that overflow on multiplication',
      priority     : 'critical',
      whyItMatters : 'Two values each up to 10^5 multiplied together = 10^10 which exceeds int max (2.1×10^9). Silent overflow gives wrong answer.',
      checkQuestion: 'Can any two elements multiplied together exceed INT_MAX (2.1×10^9)?',
      commonFailure: 'int result = a[i] * a[j] when both are ~10^5 → overflow to negative number silently.',
      fix          : 'Use long long for any accumulation: long long res = (long long)a[i] * a[j].',
      testInput    : '[50000, 50000] → product = 2.5×10^9 > INT_MAX',
      expected     : 'Use long long to store product',
    },
    {
      id           : 'ac_duplicate_heavy',
      label        : 'Many duplicates (most elements identical)',
      priority     : 'high',
      whyItMatters : 'Algorithms assuming distinct elements behave incorrectly. Two pointer gets stuck on equal elements without careful advancement.',
      checkQuestion: 'Does your solution handle arrays where most elements are the same value?',
      commonFailure: 'Two pointer: [2,2,2,2,2] with target=4 — without skipping duplicates, counts same pair multiple times.',
      fix          : 'In two pointer: after finding valid pair, skip all equal elements on both sides before continuing.',
      testInput    : '[2, 2, 2, 2, 2], target=4',
      expected     : 'One unique pair (2,2), not 25 pairs',
    },
    {
      id           : 'ac_int_extremes',
      label        : 'Elements at INT_MIN or INT_MAX',
      priority     : 'high',
      whyItMatters : 'INT_MAX + 1 = INT_MIN (overflow). INT_MIN * -1 = INT_MIN (also overflow). Comparisons with INT_MIN as sentinel fail if input contains INT_MIN.',
      checkQuestion: 'Does your solution handle elements equal to INT_MIN (-2^31) or INT_MAX (2^31-1)?',
      commonFailure: 'Using INT_MIN as "negative infinity" sentinel, but input contains INT_MIN → sentinel equals valid value.',
      fix          : 'Use LLONG_MIN/LLONG_MAX as sentinels, or use a separate "initialized" boolean flag.',
      testInput    : '[2147483647] or [-2147483648]',
      expected     : 'No overflow or sentinel collision',
    },
    {
      id           : 'ac_alternating',
      label        : 'Alternating high-low pattern',
      priority     : 'medium',
      whyItMatters : 'Greedy algorithms that rely on monotone structure fail on alternating patterns. Window validity may oscillate.',
      checkQuestion: 'Does your solution correctly process alternating value patterns like [1,100,1,100,1]?',
      commonFailure: 'Greedy by sorting misses the alternating structure if order matters.',
      fix          : 'Verify: does your greedy rule apply correctly when values alternate between extremes?',
      testInput    : '[1, 100, 1, 100, 1]',
      expected     : 'Problem-dependent — verify manually',
    },
    {
      id           : 'ac_single_valid',
      label        : 'Exactly one valid element/pair satisfying condition',
      priority     : 'medium',
      whyItMatters : 'When only one answer exists, solutions may return it or may return 0/empty if they require at least two.',
      checkQuestion: 'Does your solution correctly return when exactly one valid result exists?',
      commonFailure: 'Count-based solutions return 0 when count should be 1. Index-based solutions return -1 on the valid case.',
      fix          : 'Trace through manually with exactly one valid case.',
      testInput    : '[1, 2, 3], target=3 for two-sum → only pair is (1,2)',
      expected     : 'Returns [0,1] correctly',
    },
    {
      id           : 'ac_prefix_full_range',
      label        : 'Subarray spanning entire array',
      priority     : 'medium',
      whyItMatters : 'When the optimal subarray is the entire input, boundary conditions at l=0 and r=n-1 must work correctly.',
      checkQuestion: 'Does your solution correctly handle when the answer is the full array?',
      commonFailure: 'Sliding window: window never shrinks → answer is full array but code exits early.',
      fix          : 'Ensure your loop runs for the full array and checks the final state.',
      testInput    : '[1, 2, 3, 4, 5] for max subarray sum',
      expected     : '15 (entire array)',
    },
  ];

  function getAll()           { return [...CASES]; }
  function getById(id)        { return CASES.find(c => c.id === id) ?? null; }
  function getCritical()      { return CASES.filter(c => c.priority === 'critical'); }
  function getByPriority(p)   { return CASES.filter(c => c.priority === p); }

  return { getAll, getById, getCritical, getByPriority };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArrayCases;
}