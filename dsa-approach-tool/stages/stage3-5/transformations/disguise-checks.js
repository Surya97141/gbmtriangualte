// stages/stage3-5/transformations/disguise-checks.js
// Problems that look like X but are actually Y after transformation
// Used by: stage3-5.js

const DisguiseChecks = (() => {

  const CHECKS = [
    {
      id        : 'dc_looks_like_dp',
      looksLike : 'Dynamic Programming',
      actuallyIs: 'Binary Search on Answer',
      signal    : 'Output is minimize maximum or maximize minimum',
      test      : 'Can you write isFeasible(X) greedily in O(n)? If yes — Binary Search not DP.',
      example   : 'Split array into k parts minimizing maximum sum → Binary search on max sum, check greedily',
    },
    {
      id        : 'dc_looks_like_graph',
      looksLike : 'General graph problem',
      actuallyIs: 'DP on sequence',
      signal    : 'Graph is actually a DAG with sequential structure (nodes 1..n, edges only go forward)',
      test      : 'Are all edges going from smaller to larger index? → DP not BFS.',
      example   : 'LIS on array — looks like longest path but is 1D DP',
    },
    {
      id        : 'dc_looks_like_bfs',
      looksLike : 'BFS shortest path',
      actuallyIs: 'DP with topological order',
      signal    : 'State space has a topological structure — no need for visited tracking',
      test      : 'Can you define a topological order on states? If yes — DP in O(states), not BFS.',
      example   : 'Minimum path in grid moving only right/down — grid DP not BFS',
    },
    {
      id        : 'dc_looks_like_greedy',
      looksLike : 'Greedy',
      actuallyIs: 'Dynamic Programming',
      signal    : 'Local optimal choice fails for specific input configurations',
      test      : 'Find 3-5 element counter-example where greedy picks suboptimally.',
      example   : 'Coin change with coins [1,3,4] — greedy fails for amount 6 (picks 4+1+1 not 3+3)',
    },
    {
      id        : 'dc_looks_like_sort',
      looksLike : 'Sorting problem',
      actuallyIs: 'Topological sort',
      signal    : 'Cannot determine full order from pairwise comparisons — only partial order given',
      test      : 'Are constraints only pairwise (A before B)? → Topological sort not comparison sort.',
      example   : 'Alien dictionary — determine character ordering from word list',
    },
    {
      id        : 'dc_looks_like_math',
      looksLike : 'Mathematical formula',
      actuallyIs: 'Digit DP',
      signal    : 'N is very large (up to 10^18) and the property depends on individual digits',
      test      : 'Does the property depend on digits of N, not its magnitude? → Digit DP not formula.',
      example   : 'Count numbers ≤ N with digit sum = k — digit DP not combinatorics',
    },
    {
      id        : 'dc_looks_like_array',
      looksLike : 'Array problem',
      actuallyIs: 'Hidden tree or graph',
      signal    : 'Array where a[i] = parent of i, or a[i] = next node — implicit structure',
      test      : 'Does each element point to exactly one other? → Functional graph or tree, not plain array.',
      example   : 'a[i] = parent of node i → build tree, apply tree DP',
    },
    {
      id        : 'dc_looks_like_2d_dp',
      looksLike : '2D DP on full grid',
      actuallyIs: 'Interval DP or 1D DP with compression',
      signal    : 'The two dimensions are not two independent sequences — they are a range [i,j] on one',
      test      : 'Is dp[i][j] about a range within ONE sequence, not two sequences? → Interval DP.',
      example   : 'Longest palindromic subsequence — looks like 2D but is interval DP on one string',
    },
  ];

  function getAll()       { return [...CHECKS]; }
  function getById(id)    { return CHECKS.find(c => c.id === id) ?? null; }
  function getTotal()     { return CHECKS.length; }

  // Get checks relevant to current candidate directions
  function getRelevant(candidateDirections = []) {
    if (!candidateDirections.length) return getAll();

    const families = candidateDirections.map(d =>
      (d.family ?? d.id ?? '').toLowerCase()
    );

    return CHECKS.filter(c => {
      const looks = c.looksLike.toLowerCase();
      return families.some(f =>
        looks.includes(f) || f.includes('dp') || f.includes('greedy')
      );
    });
  }

  // Build warning if a specific disguise check matches current analysis
  function buildWarning(checkId) {
    const c = getById(checkId);
    if (!c) return null;
    return {
      title  : `This may look like ${c.looksLike} but could be ${c.actuallyIs}`,
      signal : c.signal,
      test   : c.test,
      example: c.example,
    };
  }

  return {
    getAll,
    getById,
    getTotal,
    getRelevant,
    buildWarning,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DisguiseChecks;
}