// stages/stage3/dp-subclassifier/transition-types.js
// DP transition shape classifier — how dp[i] reads from previous states
// Used by: dp-classifier.js, stage3.js

const TransitionTypes = (() => {

  // ─── TRANSITION TYPE REGISTRY ──────────────────────────────────────────────

  const TYPES = [
    {
      id          : 'tt_adjacent',
      label       : 'Adjacent only',
      shortLabel  : 'dp[i] ← dp[i-1]',
      description : 'Current state depends only on the immediately previous state (or last 2)',
      recognize   : [
        'dp[i] = f(dp[i-1]) or f(dp[i-1], dp[i-2])',
        'No need to look back further than 1 or 2 steps',
        'Simple additive or branching structure',
        'Problem has "at each step choose one of k options" feel',
      ],
      spaceOpt    : {
        from    : 'O(n)',
        to      : 'O(1)',
        how     : 'Replace array with two variables: prev2 and prev1. Update each step.',
        code    : `int prev2 = base0, prev1 = base1;
for (int i = 2; i <= n; i++) {
  int curr = f(prev1, prev2);
  prev2 = prev1;
  prev1 = curr;
}`,
        caveat  : 'Cannot reconstruct actual solution — only the optimal value',
      },
      examples    : [
        {
          problem   : 'Fibonacci / Climbing stairs',
          transition: 'dp[i] = dp[i-1] + dp[i-2]',
          note      : 'Classic O(1) space reduction',
        },
        {
          problem   : 'House robber',
          transition: 'dp[i] = max(dp[i-1], dp[i-2] + nums[i])',
          note      : 'Two options: skip house i or rob it',
        },
        {
          problem   : 'Min cost climbing stairs',
          transition: 'dp[i] = cost[i] + min(dp[i-1], dp[i-2])',
          note      : 'Can jump 1 or 2 steps',
        },
        {
          problem   : 'Paint fence (no more than 2 same color adjacent)',
          transition: 'same[i] = diff[i-1], diff[i] = (same[i-1] + diff[i-1]) * (k-1)',
          note      : 'Two state variables, updated each step',
        },
      ],
      complexity  : 'O(n) time → O(1) space',
      pushVsPull  : 'Usually pull — dp[i] reads from dp[i-1]',
    },

    {
      id          : 'tt_all_previous',
      label       : 'All previous',
      shortLabel  : 'dp[i] ← max(dp[j]) for j < i',
      description : 'Current state may depend on ANY previously computed state, not just adjacent',
      recognize   : [
        'dp[i] = max or min over ALL j < i of some function of dp[j]',
        'Transition reads from arbitrary earlier positions',
        'Problem has "extend any previous valid sequence" feel',
        'LIS-type, maximum sum increasing subsequence',
      ],
      spaceOpt    : {
        from    : 'O(n²) time',
        to      : 'O(n log n) with Binary Search or Segment Tree',
        how     : 'Maintain auxiliary structure (sorted array, BIT, segment tree) to query best dp[j] in O(log n)',
        code    : `// LIS in O(n log n) using patience sorting
vector<int> tails;
for (int x : nums) {
  auto it = lower_bound(tails.begin(), tails.end(), x);
  if (it == tails.end()) tails.push_back(x);
  else *it = x;
}
return tails.size(); // LIS length`,
        caveat  : 'Optimization requires specific structure in transition — not always applicable',
      },
      examples    : [
        {
          problem   : 'Longest Increasing Subsequence (O(n²))',
          transition: 'dp[i] = 1 + max(dp[j]) for all j < i where a[j] < a[i]',
          note      : 'O(n log n) via patience sorting',
        },
        {
          problem   : 'Maximum sum increasing subsequence',
          transition: 'dp[i] = a[i] + max(dp[j]) for all j < i where a[j] < a[i]',
          note      : 'Same shape as LIS but weighted — O(n log n) with BIT',
        },
        {
          problem   : 'Number of Longest Increasing Subsequences',
          transition: 'dp[i] = length of LIS ending at i; cnt[i] = number of such sequences',
          note      : 'Two parallel DP arrays — length and count',
        },
        {
          problem   : 'Weighted job scheduling',
          transition: 'dp[i] = max(dp[i-1], profit[i] + dp[latestNonConflict(i)])',
          note      : 'Binary search for latest non-conflicting job — O(n log n)',
        },
      ],
      complexity  : 'O(n²) naive → O(n log n) with optimization',
      pushVsPull  : 'Pull — dp[i] pulls best result from all previous states',
      optimization: {
        name    : 'Segment Tree / BIT on previous states',
        when    : 'Query: max dp[j] where j satisfies some condition (e.g. a[j] < a[i])',
        how     : 'Coordinate compress values, query range max in BIT/Segment Tree',
      },
    },

    {
      id          : 'tt_range_split',
      label       : 'Range split',
      shortLabel  : 'dp[i][j] ← dp[i][k] + dp[k+1][j]',
      description : 'Interval DP — split range [i,j] at some point k, combine two sub-ranges',
      recognize   : [
        'dp[i][j] = optimal over all ways to split [i,j] at some k',
        'Combining two independent sub-range answers',
        'Problem says "optimal way to parenthesize / split / merge"',
        'Matrix chain, burst balloons, optimal BST pattern',
      ],
      spaceOpt    : {
        from    : 'O(n³) time, O(n²) space',
        to      : 'O(n²) time with Knuth optimization (if applicable)',
        how     : 'Knuth optimization: if opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j], limit k search range',
        code    : `// Knuth optimization
int opt[MAXN][MAXN] = {};
for (int len = 2; len <= n; len++) {
  for (int i = 0; i + len - 1 < n; i++) {
    int j = i + len - 1;
    dp[i][j] = INF;
    for (int k = opt[i][j-1]; k <= opt[i+1][j]; k++) {
      int val = dp[i][k] + dp[k+1][j] + cost(i,j);
      if (val < dp[i][j]) {
        dp[i][j] = val;
        opt[i][j] = k;
      }
    }
  }
}`,
        caveat  : 'Knuth requires: cost satisfies quadrangle inequality AND opt is monotone',
      },
      fillOrder   : {
        rule    : 'MUST fill by increasing interval length',
        wrong   : 'for i ... for j ... → dp[i+1][j-1] not computed yet when len > 1',
        correct : 'for len=1..n: for i=0..n-len: j=i+len-1 → compute dp[i][j]',
        code    : `for (int len = 2; len <= n; len++) {
  for (int i = 0; i + len - 1 < n; i++) {
    int j = i + len - 1;
    dp[i][j] = INF;
    for (int k = i; k < j; k++) {
      dp[i][j] = min(dp[i][j], dp[i][k] + dp[k+1][j] + cost(i,j,k));
    }
  }
}`,
      },
      examples    : [
        {
          problem   : 'Matrix chain multiplication',
          transition: 'dp[i][j] = min over k of dp[i][k] + dp[k+1][j] + d[i]*d[k+1]*d[j+1]',
          note      : 'Classic O(n³). Knuth applicable here.',
        },
        {
          problem   : 'Burst balloons',
          transition: 'dp[i][j] = max over k in (i,j) of dp[i][k] + dp[k][j] + nums[i]*nums[k]*nums[j]',
          note      : 'Open interval formulation — k is the LAST balloon burst between i and j',
        },
        {
          problem   : 'Strange printer / minimum turns',
          transition: 'dp[i][j] = min turns to print s[i..j]',
          note      : 'Reduce by 1 if s[k] == s[j] for some k in [i,j-1]',
        },
        {
          problem   : 'Minimum cost to cut a stick',
          transition: 'dp[i][j] = min cost to make all cuts between positions i and j',
          note      : 'Cost of a cut = length of current segment',
        },
      ],
      complexity  : 'O(n³) standard → O(n²) with Knuth',
      pushVsPull  : 'Pull — dp[i][j] pulls from dp[i][k] and dp[k+1][j]',
    },

    {
      id          : 'tt_sliding_window',
      label       : 'Sliding window',
      shortLabel  : 'dp[i] ← max(dp[j]) for j ∈ [i-k, i-1]',
      description : 'Current state depends on best state within a sliding window of fixed or bounded size',
      recognize   : [
        'dp[i] depends on dp[j] for j in [i-k, i-1] (bounded window)',
        'Problem has maximum jumps or range constraint',
        'At most k steps back allowed',
        '"Jump at most k positions" or "use at most k previous" feel',
      ],
      spaceOpt    : {
        from    : 'O(nk) time',
        to      : 'O(n) time with monotonic deque',
        how     : 'Maintain deque of indices in decreasing dp value order. Front is always the best valid previous state.',
        code    : `deque<int> dq;
for (int i = 0; i < n; i++) {
  // Remove indices outside window [i-k, i-1]
  while (!dq.empty() && dq.front() < i - k) dq.pop_front();

  // dp[i] uses best in window
  dp[i] = (dq.empty() ? base : dp[dq.front()]) + cost[i];

  // Maintain decreasing dp values in deque
  while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();
  dq.push_back(i);
}`,
        caveat  : 'Only applicable when window size is fixed or bounded — not for arbitrary range queries',
      },
      examples    : [
        {
          problem   : 'Jump game with at most k steps',
          transition: 'dp[i] = min(dp[j]) for j in [i-k, i-1] + cost[i]',
          note      : 'Monotonic deque maintains minimum in O(1) per query',
        },
        {
          problem   : 'Constrained subsequence sum',
          transition: 'dp[i] = max(dp[j]) for j in [i-k, i] + nums[i] (only positive contribution)',
          note      : 'LeetCode 1425 — monotonic deque on DP values',
        },
        {
          problem   : 'Sliding window maximum DP',
          transition: 'dp[i] = score[i] + max(dp[j]) for j in [i-w, i-1]',
          note      : 'Used in several interval scheduling variants',
        },
        {
          problem   : 'Maximum points from cards (at most k cards from either end)',
          transition: 'Sliding window on complement — minimum sum of n-k contiguous cards',
          note      : 'Reframe as sliding window not DP — O(n)',
        },
      ],
      complexity  : 'O(nk) → O(n) with monotonic deque',
      pushVsPull  : 'Pull — dp[i] queries best from window',
    },

    {
      id          : 'tt_push',
      label       : 'Push (forward)',
      shortLabel  : 'dp[j] ← dp[i] (push from i to j)',
      description : 'From current state dp[i], update future states dp[j] — inverse of pull',
      recognize   : [
        'BFS-layer DP — process states level by level',
        'Natural to think "from state i, I can reach states j1, j2, j3"',
        'Coin change bottom-up (from amount i, contribute to amount i+coin)',
        'Shortest path relaxation style',
      ],
      spaceOpt    : {
        from    : 'Same as equivalent pull formulation',
        to      : 'Same',
        how     : 'Push and pull are mathematically equivalent — use whichever is more natural',
        code    : `// Push style (coin change)
dp[0] = 0;
for (int i = 0; i < W; i++) {
  if (dp[i] == INF) continue;
  for (int coin : coins) {
    if (i + coin <= W)
      dp[i + coin] = min(dp[i + coin], dp[i] + 1);
  }
}`,
        caveat  : 'Must ensure base states are initialized before pushing from them',
      },
      examples    : [
        {
          problem   : 'Coin change (push style)',
          transition: 'From dp[i], push to dp[i+coin] for each coin',
          note      : 'Equivalent to pull: dp[i] = min(dp[i-coin]+1)',
        },
        {
          problem   : 'BFS on states (0-1 BFS)',
          transition: 'From state s, push to adjacent states with edge cost 0 or 1',
          note      : 'Deque-based BFS — 0-cost edges to front, 1-cost to back',
        },
        {
          problem   : 'Bellman-Ford relaxation',
          transition: 'For each edge (u,v,w): push dp[u]+w to dp[v]',
          note      : 'Classic push-style shortest path',
        },
      ],
      complexity  : 'Same as pull equivalent',
      pushVsPull  : 'Push — dp[i] updates future dp[j]',
    },

    {
      id          : 'tt_two_dimensional',
      label       : 'Two-dimensional with row dependency',
      shortLabel  : 'dp[i][j] ← dp[i-1][j], dp[i][j-1]',
      description : 'Current cell depends on adjacent cells from previous row and previous column',
      recognize   : [
        '2D grid or two-sequence DP',
        'dp[i][j] reads from dp[i-1][j] and/or dp[i][j-1]',
        'Diagonal dependency dp[i-1][j-1] also common',
        'Fill row by row, left to right',
      ],
      spaceOpt    : {
        from    : 'O(nm)',
        to      : 'O(m) with rolling row',
        how     : 'Keep only previous row. For each new row, update in-place (careful with direction).',
        code    : `// Rolling row for LCS
vector<int> prev(m+1, 0), curr(m+1, 0);
for (int i = 1; i <= n; i++) {
  for (int j = 1; j <= m; j++) {
    if (s1[i-1] == s2[j-1])
      curr[j] = prev[j-1] + 1;
    else
      curr[j] = max(prev[j], curr[j-1]);
  }
  swap(prev, curr);
  fill(curr.begin(), curr.end(), 0);
}`,
        caveat  : 'Rolling row prevents path reconstruction — need full table for backtracking',
      },
      examples    : [
        {
          problem   : 'Edit distance',
          transition: 'dp[i][j] = dp[i-1][j-1] (match) or 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) (mismatch)',
          note      : 'Rolling row reduces to O(m) space',
        },
        {
          problem   : 'Unique paths with obstacles',
          transition: 'dp[i][j] = dp[i-1][j] + dp[i][j-1] if no obstacle',
          note      : 'Handle obstacles by setting dp[i][j] = 0',
        },
        {
          problem   : 'Minimum falling path sum',
          transition: 'dp[i][j] = grid[i][j] + min(dp[i-1][j-1], dp[i-1][j], dp[i-1][j+1])',
          note      : 'Three-way dependency from previous row',
        },
      ],
      complexity  : 'O(nm) time → O(m) space with rolling',
      pushVsPull  : 'Pull — dp[i][j] reads from previous row/col',
    },
  ];

  // ─── TRANSITION RECOGNITION HELPERS ───────────────────────────────────────

  // Keywords that suggest each transition type
  const TRANSITION_KEYWORDS = {
    tt_adjacent       : ['previous step', 'last house', 'adjacent', 'i-1', 'i-2', 'one step back'],
    tt_all_previous   : ['any previous', 'extending any', 'from any j < i', 'LIS', 'increasing subsequence'],
    tt_range_split    : ['split at k', 'merge', 'parenthesize', 'burst', 'matrix chain', 'optimal BST'],
    tt_sliding_window : ['at most k steps', 'jump up to', 'window of size', 'bounded lookback'],
    tt_push           : ['from i reach j', 'update future', 'coin change', 'BFS layer'],
    tt_two_dimensional: ['previous row', 'two sequences', 'match characters', 'grid path'],
  };

  // ─── OPTIMIZATION APPLICABILITY ───────────────────────────────────────────

  const OPTIMIZATION_MAP = {
    tt_adjacent       : ['rolling_variables'],
    tt_all_previous   : ['bit_segment_tree', 'cht', 'dc_dp'],
    tt_range_split    : ['knuth_optimization', 'dc_dp'],
    tt_sliding_window : ['monotonic_deque'],
    tt_push           : [],
    tt_two_dimensional: ['rolling_row'],
  };

  // ─── COMMON BUG PATTERNS ──────────────────────────────────────────────────

  const COMMON_BUGS = [
    {
      transitionId: 'tt_range_split',
      bug         : 'Wrong fill order — filling by row instead of by length',
      symptom     : 'dp[i+1][j-1] is 0 when you expect a computed value',
      fix         : 'Always fill interval DP by increasing length: for len=1..n',
    },
    {
      transitionId: 'tt_all_previous',
      bug         : 'O(n²) when O(n log n) is required at n=10^5',
      symptom     : 'TLE on large inputs',
      fix         : 'Use patience sorting (LIS) or BIT/Segment Tree for range max queries',
    },
    {
      transitionId: 'tt_sliding_window',
      bug         : 'Not removing stale front of deque',
      symptom     : 'Using dp[j] where j is outside the valid window',
      fix         : 'Pop front before using: while (!dq.empty() && dq.front() < i-k) dq.pop_front()',
    },
    {
      transitionId: 'tt_adjacent',
      bug         : 'Trying to reconstruct path after rolling array optimization',
      symptom     : 'Lost parent information — cannot trace back optimal choices',
      fix         : 'Keep full dp array if reconstruction needed — only optimize if value only',
    },
    {
      transitionId: 'tt_two_dimensional',
      bug         : 'Rolling row corrupts diagonal value dp[i-1][j-1]',
      symptom     : 'Wrong LCS or edit distance when rolling',
      fix         : 'Save dp[i-1][j-1] in a variable before overwriting current row',
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAll()                { return [...TYPES]; }
  function getById(id)             { return TYPES.find(t => t.id === id) ?? null; }
  function getKeywords()           { return { ...TRANSITION_KEYWORDS }; }
  function getOptimizationMap()    { return { ...OPTIMIZATION_MAP }; }
  function getCommonBugs()         { return [...COMMON_BUGS]; }

  // Get bugs for a specific transition type
  function getBugsForType(transitionId) {
    return COMMON_BUGS.filter(b => b.transitionId === transitionId);
  }

  // Get optimizations applicable for a transition type
  function getOptimizationsForType(transitionId) {
    return OPTIMIZATION_MAP[transitionId] ?? [];
  }

  // Match transition type from description text
  function matchFromText(text) {
    const lower = text.toLowerCase();
    let bestId    = null;
    let bestCount = 0;

    Object.entries(TRANSITION_KEYWORDS).forEach(([id, keywords]) => {
      const count = keywords.filter(kw => lower.includes(kw)).length;
      if (count > bestCount) {
        bestCount = count;
        bestId    = id;
      }
    });

    return bestId ? getById(bestId) : null;
  }

  // Build a quick reference card for a transition type
  function buildQuickRef(typeId) {
    const t = getById(typeId);
    if (!t) return null;

    return {
      label      : t.label,
      shortLabel : t.shortLabel,
      spaceFrom  : t.spaceOpt.from,
      spaceTo    : t.spaceOpt.to,
      spaceHow   : t.spaceOpt.how,
      spaceCaveat: t.spaceOpt.caveat,
      bugs       : getBugsForType(typeId),
      optimizations: getOptimizationsForType(typeId),
    };
  }

  return {
    getAll,
    getById,
    getKeywords,
    getOptimizationMap,
    getCommonBugs,
    getBugsForType,
    getOptimizationsForType,
    matchFromText,
    buildQuickRef,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TransitionTypes;
}