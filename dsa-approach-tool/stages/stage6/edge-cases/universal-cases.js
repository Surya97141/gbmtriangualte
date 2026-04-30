// stages/stage6/edge-cases/universal-cases.js
// Edge cases that apply to EVERY problem regardless of type
// Used by: stage6.js

const UniversalCases = (() => {

  const CASES = [
    {
      id           : 'uc_n1',
      label        : 'n = 1 (single element)',
      category     : 'size',
      priority     : 'critical',
      whyItMatters : 'Most algorithms assume at least 2 elements. Single element breaks loop logic, comparisons, pair-finding, and most base cases.',
      checkQuestion: 'Does your solution return the correct answer when the input has exactly one element?',
      commonFailure: 'Loop runs 0 times → returns uninitialized variable. Off-by-one in loop bounds.',
      testTemplate : 'Input: [x] → Expected: [compute manually]',
      examples     : [
        { input: '[5]',         problem: 'Max subarray sum', expected: '5 (not 0)' },
        { input: '[5]',         problem: 'Two sum',          expected: 'No pair exists' },
        { input: 'root = Node(1)', problem: 'Tree diameter', expected: '0' },
      ],
    },
    {
      id           : 'uc_n2',
      label        : 'n = 2 (minimal non-trivial)',
      category     : 'size',
      priority     : 'critical',
      whyItMatters : 'Smallest case where pairwise relationships exist. Catches swap logic bugs, mid-index errors, and pair comparison issues.',
      checkQuestion: 'Does your solution handle exactly two elements correctly in all orderings?',
      commonFailure: 'mid = (0+1)/2 = 0 in binary search — misses second element.',
      testTemplate : 'Input: [a, b] where a < b, then [b, a] — verify both orderings',
      examples     : [
        { input: '[1, 2]',     problem: 'Binary search', expected: 'Finds both 1 and 2' },
        { input: '[3, 1]',     problem: 'Sort + two pointer', expected: 'Still works after sort' },
      ],
    },
    {
      id           : 'uc_nmax',
      label        : 'n = MAX (maximum constraint)',
      category     : 'size',
      priority     : 'critical',
      whyItMatters : 'Stress tests time complexity and memory. A solution passing n=100 but TLEing at n=10^5 has an O(n²) hidden inside.',
      checkQuestion: 'Does your solution finish within time limit at maximum n? Does memory stay within limit?',
      commonFailure: 'Hidden O(n²) loop. Recursion depth overflow. String concatenation in loop is O(n²).',
      testTemplate : 'Construct max-N input. Measure wall clock time. Check memory with profiler.',
      examples     : [
        { input: 'n = 10^5',   problem: 'Any O(n²) algorithm', expected: 'TLE at ~30s' },
        { input: 'n = 10^6',   problem: 'Recursive DFS',       expected: 'Stack overflow' },
      ],
    },
    {
      id           : 'uc_all_same',
      label        : 'All elements identical',
      category     : 'values',
      priority     : 'high',
      whyItMatters : 'Breaks solutions that assume distinct values. Causes issues with strict vs non-strict comparisons and two-pointer convergence.',
      checkQuestion: 'What does your solution return when all elements are the same value?',
      commonFailure: 'Two pointer: lo and hi never converge. Binary search: infinite loop. LIS: returns n instead of 1.',
      testTemplate : 'Input: [k, k, k, k, k] for some constant k',
      examples     : [
        { input: '[5,5,5,5]',  problem: 'LIS length',   expected: '1 (not 4)' },
        { input: '[3,3,3]',    problem: 'Two pointer sum', expected: 'Handles equal elements without infinite loop' },
      ],
    },
    {
      id           : 'uc_sorted_asc',
      label        : 'Already sorted ascending',
      category     : 'ordering',
      priority     : 'high',
      whyItMatters : 'Pre-sorted input can cause worst-case behavior (naive quicksort becomes O(n²)). Greedy may also behave unexpectedly on already-optimal input.',
      checkQuestion: 'Does your solution handle already-sorted input correctly and efficiently?',
      commonFailure: 'Naive quicksort: always picks first element as pivot → O(n²) on sorted input.',
      testTemplate : 'Input: [1, 2, 3, 4, 5, ..., n]',
      examples     : [
        { input: '[1,2,3,4,5]', problem: 'Quicksort',          expected: 'O(n log n) not O(n²)' },
        { input: '[1,2,3,4,5]', problem: 'Remove duplicates',  expected: 'Returns same array' },
      ],
    },
    {
      id           : 'uc_sorted_desc',
      label        : 'Already sorted descending',
      category     : 'ordering',
      priority     : 'high',
      whyItMatters : 'Reverse-sorted is the other common worst case. Catches reverse iteration bugs and incorrect comparison direction.',
      checkQuestion: 'Does your solution handle reverse-sorted input correctly?',
      commonFailure: 'Binary search on wrong half. Greedy processes in wrong order.',
      testTemplate : 'Input: [n, n-1, ..., 2, 1]',
      examples     : [
        { input: '[5,4,3,2,1]', problem: 'Insertion sort',   expected: 'O(n²) — expected but verify' },
        { input: '[5,4,3,2,1]', problem: 'Binary search',    expected: 'Still O(log n) with correct lo/hi' },
      ],
    },
    {
      id           : 'uc_answer_zero',
      label        : 'Answer is 0 or empty',
      category     : 'answer',
      priority     : 'high',
      whyItMatters : 'Many solutions return a wrong default (uninitialized, -1, INT_MAX) when no valid answer exists. Empty result must be explicitly handled.',
      checkQuestion: 'What does your solution return when the answer is 0, empty, or impossible?',
      commonFailure: 'Returns INT_MAX (from uninitialized min). Returns -1 when 0 is the valid answer. Returns empty vector when should return [[]].',
      testTemplate : 'Construct input where valid answer is 0 or where no valid answer exists',
      examples     : [
        { input: '[3,2,1]',     problem: 'LIS (strictly decreasing)', expected: 'LIS length = 1, not 0' },
        { input: 'target=0',    problem: 'Count subarrays sum=0',     expected: 'May be non-zero' },
      ],
    },
    {
      id           : 'uc_answer_max',
      label        : 'Answer equals maximum possible value',
      category     : 'answer',
      priority     : 'medium',
      whyItMatters : 'Boundary of answer range. Catches integer overflow when answer accumulates to INT_MAX territory.',
      checkQuestion: 'Does your solution correctly compute and store the maximum possible answer without overflow?',
      commonFailure: 'int overflow when answer approaches 2^31-1 = 2.1×10^9. Use long long.',
      testTemplate : 'Input designed to produce the largest possible answer',
      examples     : [
        { input: '[10^9, 10^9, ...]', problem: 'Array sum', expected: 'Use long long — int overflows' },
      ],
    },
    {
      id           : 'uc_single_operation',
      label        : 'Q = 1 (single query)',
      category     : 'queries',
      priority     : 'medium',
      whyItMatters : 'When Q=1, heavy preprocessing structures (Segment Tree, BIT) are wasteful. But more importantly, Q=1 may have special edge cases in answer range.',
      checkQuestion: 'Does your solution correctly answer a single query without preprocessing overhead?',
      commonFailure: 'Preprocessing for Q queries but forgetting to output the answer for Q=1.',
      testTemplate : 'Input: N elements, Q=1 query covering full range or single element',
      examples     : [
        { input: 'n=10^5, q=1', problem: 'Range sum query', expected: 'No segment tree needed — just prefix sum' },
      ],
    },
  ];

  function getAll()              { return [...CASES]; }
  function getById(id)           { return CASES.find(c => c.id === id) ?? null; }
  function getCritical()         { return CASES.filter(c => c.priority === 'critical'); }
  function getByCategory(cat)    { return CASES.filter(c => c.category === cat); }
  function getByPriority(p)      { return CASES.filter(c => c.priority === p); }

  return { getAll, getById, getCritical, getByCategory, getByPriority };

})();


if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalCases;
}