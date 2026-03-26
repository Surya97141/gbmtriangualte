// recovery/recovery-paths/tle-path.js
// Time Limit Exceeded recovery path
// Used by: recovery.js

const TLEPath = (() => {

  const META = {
    id     : 'tle_path',
    label  : 'Time Limit Exceeded',
    trigger: 'My solution is correct but too slow',
    icon   : '⏱',
    color  : 'warn',
  };

  const STEPS = [
    {
      id     : 'tle_s1',
      order  : 1,
      title  : 'What is your current complexity?',
      desc   : 'State the Big-O of your current solution. Be honest — count every nested loop.',
      actions: [
        { id: 'tle_s1_n2',   label: 'O(n²) — two nested loops',           next: 'tle_s2_n2'   },
        { id: 'tle_s1_n3',   label: 'O(n³) or worse',                     next: 'tle_s2_n3'   },
        { id: 'tle_s1_exp',  label: 'O(2^n) or O(n!) — exponential',      next: 'tle_s2_exp'  },
        { id: 'tle_s1_nlogn',label: 'O(n log n) — should be fast enough', next: 'tle_s2_const' },
      ],
    },

    // O(n²) path
    {
      id      : 'tle_s2_n2',
      order   : 2,
      title   : 'O(n²) → Target: O(n log n) or O(n)',
      desc    : 'n² becomes 10^10 at n=10^5. You need to eliminate one loop dimension.',
      optimizations: [
        {
          pattern    : 'Nested loops finding a pair satisfying condition',
          solution   : 'Sort + Two Pointer → O(n log n)',
          condition  : 'Condition is monotone after sorting (sum too small = move left, too large = move right)',
          goTo       : 'stage4_5',
        },
        {
          pattern    : 'Nested loops with repeated range sum queries',
          solution   : 'Prefix Sum → O(1) per query after O(n) build',
          condition  : 'Array is static (no updates between queries)',
          goTo       : null,
        },
        {
          pattern    : 'DP with O(n) transitions at each state',
          solution   : 'Convex Hull Trick or D&C DP optimization → O(n log n)',
          condition  : 'Transition cost decomposes as f(j) × g(i)',
          goTo       : 'stage4_5',
        },
        {
          pattern    : 'Finding next greater / previous smaller for each element',
          solution   : 'Monotonic Stack → O(n)',
          condition  : 'Just realized you needed next-greater structure',
          goTo       : null,
        },
        {
          pattern    : 'Repeated search or insert in unsorted structure',
          solution   : 'Sorted structure + Binary Search → O(n log n)',
          condition  : 'Can pre-sort or maintain sorted order',
          goTo       : null,
        },
        {
          pattern    : 'Comparing all pairs of strings',
          solution   : 'Hashing or Trie → O(n × L) not O(n² × L)',
          condition  : 'Strings share prefixes or you need equality checks',
          goTo       : null,
        },
      ],
      actions: [
        { id: 'tle_s2_n2_found', label: 'Found applicable optimization',    next: 'tle_s3_apply'  },
        { id: 'tle_s2_n2_none',  label: 'No optimization applies',          next: 'tle_s3_rethink'},
      ],
    },

    // O(n³) path
    {
      id      : 'tle_s2_n3',
      order   : 2,
      title   : 'O(n³) → Target: O(n²) or O(n² log n)',
      desc    : 'n³ is only acceptable for n ≤ 300. For larger n you must eliminate one loop.',
      optimizations: [
        {
          pattern  : 'Interval DP: O(n³) transitions over all (i, j, k)',
          solution : 'Knuth Optimization → O(n²) if quadrangle inequality holds',
          condition: 'Verify: C(a,c)+C(b,d) ≤ C(a,d)+C(b,c)',
          goTo     : 'stage4_5',
        },
        {
          pattern  : 'Fixing two indices, scanning third for optimum',
          solution : 'Precompute prefix/suffix arrays to avoid third loop',
          condition: 'The scan is for a simple aggregate (min, max, sum)',
          goTo     : null,
        },
        {
          pattern  : '3D matrix problem',
          solution : '2D → 1D reduction: fix one dimension, solve 1D subproblem',
          condition: 'Problem decomposes when one dimension is fixed',
          goTo     : 'stage3_5',
        },
      ],
      actions: [
        { id: 'tle_s2_n3_found', label: 'Found applicable optimization',    next: 'tle_s3_apply'  },
        { id: 'tle_s2_n3_none',  label: 'Nothing applies here',             next: 'tle_s3_rethink'},
      ],
    },

    // Exponential path
    {
      id      : 'tle_s2_exp',
      order   : 2,
      title   : 'Exponential → Does this problem have overlapping subproblems?',
      desc    : 'Exponential is only acceptable for n ≤ 15-20 with good pruning. For larger n, overlapping subproblems → DP.',
      checklist: [
        { id: 'exp_c1', text: 'Are the same subproblems computed multiple times across recursion branches?' },
        { id: 'exp_c2', text: 'Can you define dp[state] = optimal answer for this state?' },
        { id: 'exp_c3', text: 'If n ≤ 20: can bitmask DP work? 2^20 = 1M states is fine' },
        { id: 'exp_c4', text: 'If n ≤ 40: can meet-in-middle split the problem into 2^20 halves?' },
      ],
      actions: [
        { id: 'tle_s2_exp_dp',     label: 'Yes — overlapping subproblems exist → switch to DP',       goTo: 'stage3'   },
        { id: 'tle_s2_exp_bitmask',label: 'n ≤ 20 — use Bitmask DP',                                 goTo: 'stage4_5' },
        { id: 'tle_s2_exp_meet',   label: 'n ≤ 40 — use Meet in Middle',                             goTo: 'stage4_5' },
        { id: 'tle_s2_exp_prune',  label: 'Must stay exponential — need better pruning',              next: 'tle_s3_prune' },
      ],
    },

    // Constant factor TLE (already O(n log n))
    {
      id      : 'tle_s2_const',
      order   : 2,
      title   : 'O(n log n) TLE — constant factor problem',
      desc    : 'Your Big-O is fine but the constant factor is too high. These are the most common causes.',
      culprits: [
        { issue: 'endl flushes buffer — use "\\n" instead',               severity: 'high' },
        { issue: 'cin/cout without ios::sync_with_stdio(false)',           severity: 'high' },
        { issue: 'Copying vector by value in function signature',          severity: 'medium' },
        { issue: 'map/set instead of unordered_map/unordered_set',        severity: 'medium' },
        { issue: 'String concatenation with += in loop (O(n²) total)',    severity: 'high' },
        { issue: 'Sorting inside a loop (sort is O(n log n) per call)',   severity: 'critical' },
        { issue: 'Recursion overhead — convert to iterative',             severity: 'medium' },
        { issue: 'pow() function for integer exponentiation',             severity: 'low' },
      ],
      actions: [
        { id: 'tle_s2_const_fixed', label: 'Found constant factor issue — fixing', next: 'tle_done' },
        { id: 'tle_s2_const_none',  label: 'None of these apply',                  next: 'tle_s3_rethink' },
      ],
    },

    // Apply optimization
    {
      id      : 'tle_s3_apply',
      order   : 3,
      title   : 'Apply the optimization — verify complexity first',
      desc    : 'Before rewriting: confirm the optimization gives the target complexity at your n. Use the complexity calculator from Stage 0.',
      steps   : [
        'Write new algorithm on paper first — do not start coding',
        'Verify the new Big-O is within budget (Stage 0 table)',
        'Implement the optimization separately, not by modifying working code',
        'Test correctness first — then submit for speed',
      ],
      actions: [
        { id: 'tle_s3_apply_done', label: 'Optimization applied — re-submitting', next: 'tle_done' },
        { id: 'tle_s3_apply_fail', label: 'Optimization broke correctness',       next: 'tle_s4_correct_first' },
      ],
    },

    // Rethink
    {
      id      : 'tle_s3_rethink',
      order   : 3,
      title   : 'Fundamental approach is wrong for the constraints',
      desc    : 'No optimization can save the current approach. Need to return to structural analysis with the constraint interaction specifically in mind.',
      actions : [
        { id: 'tle_s3_back4',  label: 'Return to Stage 4 — constraint interaction',   goTo: 'stage4'   },
        { id: 'tle_s3_back45', label: 'Return to Stage 4.5 — check variant complexity', goTo: 'stage4_5' },
        { id: 'tle_s3_back3',  label: 'Return to Stage 3 — re-analyze structure',     goTo: 'stage3'   },
      ],
    },

    // Pruning
    {
      id      : 'tle_s3_prune',
      order   : 3,
      title   : 'Improve backtracking pruning',
      desc    : 'The only way to make exponential fast enough is aggressive pruning.',
      techniques: [
        'Early termination: if partial solution already exceeds best known, stop',
        'Constraint propagation: eliminate impossible choices before recursing',
        'Symmetry breaking: avoid exploring equivalent branches',
        'Ordering: try most constrained variable / most promising choice first',
        'Bounds: compute lower bound on remaining cost — prune if already too large',
      ],
      actions: [
        { id: 'tle_s3_prune_done', label: 'Pruning improved — re-submitting', next: 'tle_done' },
        { id: 'tle_s3_prune_fail', label: 'Still TLE after pruning',          next: 'tle_s3_rethink' },
      ],
    },

    // Correctness broke
    {
      id    : 'tle_s4_correct_first',
      order : 4,
      title : 'Correctness broke — debug optimization separately',
      desc  : 'Never optimize broken code. Revert to working solution, understand why optimization failed, re-apply carefully.',
      actions: [
        { id: 'tle_s4_fixed', label: 'Correctness restored', next: 'tle_s3_apply' },
      ],
    },

    // Done
    {
      id    : 'tle_done',
      order : 99,
      title : 'Ready to resubmit',
      desc  : 'Before submitting: verify correctness still holds on all provided test cases. Then submit.',
      actions: [
        { id: 'tle_done_submit', label: 'Resubmit', isTerminal: true },
      ],
    },
  ];

  function getMeta()       { return { ...META };  }
  function getSteps()      { return [...STEPS];   }
  function getStepById(id) { return STEPS.find(s => s.id === id) ?? STEPS[0]; }
  function getFirstStep()  { return STEPS[0]; }

  return { getMeta, getSteps, getStepById, getFirstStep };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TLEPath;
}