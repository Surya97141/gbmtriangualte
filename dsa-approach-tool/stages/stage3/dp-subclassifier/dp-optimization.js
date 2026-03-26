// stages/stage3/dp-subclassifier/dp-optimization.js
// DP optimization techniques — when each applies, how to verify, complexity reduction
// Used by: dp-classifier.js, stage3.js

const DPOptimization = (() => {

  // ─── OPTIMIZATION REGISTRY ─────────────────────────────────────────────────

  const OPTIMIZATIONS = [
    {
      id          : 'opt_rolling_array',
      label       : 'Rolling Array',
      category    : 'space',
      tagline     : 'O(n) or O(nm) space → O(1) or O(m)',
      description : 'When dp[i] only reads from the last 1-2 rows or states, keep only those instead of the full table.',
      appliesWhen : [
        'dp[i] depends only on dp[i-1] (or dp[i-1] and dp[i-2])',
        '2D DP where dp[i][j] only reads from dp[i-1][j] and dp[i][j-1]',
        'You only need the final value — not reconstruction of the path',
        'Knapsack DP — outer loop over items, inner over capacity',
      ],
      doesNotApply: [
        'When you need to reconstruct the actual solution (need parent tracking)',
        'When dp[i] reads from dp[i-3] or further back (need more rows)',
        'Interval DP — needs full O(n²) table',
      ],
      verifyBefore: [
        'Does dp[i][j] read from any row other than i-1? If yes — need more than one previous row',
        'Do you need to trace back the actual choices made? If yes — keep full table',
      ],
      variants    : [
        {
          name: 'Two-variable rolling (1D DP)',
          when: 'dp[i] = f(dp[i-1], dp[i-2])',
          code: `int a = dp[0], b = dp[1];
for (int i = 2; i <= n; i++) {
  int c = f(b, a);
  a = b; b = c;
}`,
        },
        {
          name: 'Two-row rolling (2D DP)',
          when: 'dp[i][j] reads only from row i-1',
          code: `vector<int> prev(m+1), curr(m+1);
for (int i = 1; i <= n; i++) {
  for (int j = 1; j <= m; j++) {
    curr[j] = f(prev[j], curr[j-1], prev[j-1]);
  }
  swap(prev, curr);
}`,
        },
        {
          name: '1D knapsack rolling (decreasing)',
          when: '0/1 Knapsack — each item at most once',
          code: `vector<int> dp(W+1, 0);
for (int i = 0; i < n; i++)
  for (int w = W; w >= weight[i]; w--)
    dp[w] = max(dp[w], dp[w-weight[i]] + val[i]);`,
        },
        {
          name: '1D knapsack rolling (increasing)',
          when: 'Unbounded Knapsack — items reusable',
          code: `vector<int> dp(W+1, 0);
for (int i = 0; i < n; i++)
  for (int w = weight[i]; w <= W; w++)
    dp[w] = max(dp[w], dp[w-weight[i]] + val[i]);`,
        },
      ],
      reduction   : { time: 'None', space: 'O(n) or O(nm) → O(1) or O(m)' },
      examples    : ['Fibonacci', 'LCS', '0/1 Knapsack', 'Edit Distance'],
    },

    {
      id          : 'opt_cht',
      label       : 'Convex Hull Trick (CHT)',
      category    : 'time',
      tagline     : 'O(n²) → O(n log n) or O(n)',
      description : 'When dp[i] = min over all j < i of (dp[j] + b[j] * a[i] + c[j]), the transition has a linear structure in a[i]. Maintain a lower convex hull of lines y = b[j]*x + dp[j], query at x = a[i].',
      appliesWhen : [
        'Transition is: dp[i] = min/max over j < i of dp[j] + cost(i, j)',
        'cost(i, j) can be written as b[j] * a[i] + c[j] — linear in a[i]',
        'Slope b[j] and intercept dp[j]+c[j] define a line per state j',
        'Query is: find minimum line value at x = a[i]',
      ],
      doesNotApply: [
        'cost(i,j) is not linear in either i or j',
        'Both i and j appear in a non-separable way in cost',
        'Transition depends on more than just dp[j] and linear function of i',
      ],
      verifyBefore: [
        'Write cost(i,j) explicitly. Can it be written as f(j) * g(i) + h(j)?',
        'If slopes b[j] are monotone — O(n) deque suffices',
        'If slopes not monotone — O(n log n) with Li Chao tree or sorted set',
      ],
      variants    : [
        {
          name: 'Monotone slopes — deque O(n)',
          when: 'b[j] is monotone increasing/decreasing as j increases',
          code: `struct Line { long long m, b; long long eval(long long x) { return m*x + b; } };
deque<Line> hull;

auto bad = [](Line l1, Line l2, Line l3) {
  return (__int128)(l3.b-l1.b)*(l1.m-l2.m) <= (__int128)(l2.b-l1.b)*(l1.m-l3.m);
};

for (int i = 0; i < n; i++) {
  // Query best line at x = query[i]
  while (hull.size() > 1 && hull[0].eval(query[i]) >= hull[1].eval(query[i]))
    hull.pop_front();
  dp[i] = hull.front().eval(query[i]) + extra[i];

  // Add new line for state i
  Line newLine = {slope[i], intercept[i]};
  while (hull.size() > 1 && bad(hull[hull.size()-2], hull.back(), newLine))
    hull.pop_back();
  hull.push_back(newLine);
}`,
        },
        {
          name: 'Non-monotone — Li Chao tree O(n log n)',
          when: 'slopes not monotone, queries not monotone',
          code: `// Li Chao tree — add line, query minimum at x
struct LiChao {
  struct Line { long long m = 0, b = LLONG_MAX; long long eval(long long x) { return m*x+b; } };
  vector<Line> tree;
  int lo, hi;
  LiChao(int lo, int hi) : lo(lo), hi(hi), tree(4*(hi-lo+1)) {}
  void add(Line line, int node=1, int l=-1, int r=-1) { /* standard impl */ }
  long long query(long long x, int node=1, int l=-1, int r=-1) { /* standard impl */ }
};`,
        },
      ],
      reduction   : { time: 'O(n²) → O(n) or O(n log n)', space: 'No change' },
      examples    : [
        'Slope trick DP problems',
        'Minimum cost to divide array with penalty',
        'Optimal splitting with quadratic cost',
        'Certain scheduling DP variants',
      ],
      recognitionTest: 'Write dp[i] = min over j of dp[j] + COST. Factor COST into f(j)*g(i) + h(j). If possible — CHT applies.',
    },

    {
      id          : 'opt_dc_dp',
      label       : 'Divide and Conquer DP',
      category    : 'time',
      tagline     : 'O(n²) per layer → O(n log n) per layer',
      description : 'When the optimal split point opt(i) for dp[i] is monotone — opt(i) ≤ opt(i+1) — use divide and conquer to avoid redundant search. Recurse on left and right halves sharing the split point range.',
      appliesWhen : [
        'dp[i] = min over k in [lo, hi] of dp_prev[k] + cost(k, i)',
        'The optimal k for dp[i] is monotone: opt(i) ≤ opt(i+1)',
        'Optimal split point property (monotone SMAWK condition)',
        'Used when Knuth optimization does not apply but monotonicity holds',
      ],
      doesNotApply: [
        'Optimal split point is NOT monotone',
        'Cannot determine opt(i) without computing full cost for all k',
        'Interval DP — use Knuth instead',
      ],
      verifyBefore: [
        'Verify monotonicity: for a few test cases, check that opt(i) ≤ opt(i+1)',
        'If cost satisfies quadrangle inequality — monotonicity is guaranteed',
        'Small example: compute all opt(i) for n=8. Is the sequence non-decreasing?',
      ],
      code        : `void solve(int lo, int hi, int optLo, int optHi) {
  if (lo > hi) return;
  int mid = (lo + hi) / 2;
  int best = optLo;
  dp[mid] = INF;

  // Find optimal split for mid in [optLo, min(optHi, mid)]
  for (int k = optLo; k <= min(optHi, mid); k++) {
    long long val = dp_prev[k] + cost(k, mid);
    if (val < dp[mid]) {
      dp[mid] = val;
      best = k;
    }
  }

  // Left half uses [optLo, best], right half uses [best, optHi]
  solve(lo, mid-1, optLo, best);
  solve(mid+1, hi, best, optHi);
}

// Call: solve(0, n-1, 0, n-1)`,
      reduction   : { time: 'O(n²) per layer → O(n log n) per layer', space: 'O(log n) recursion stack' },
      examples    : [
        'K-partition of array minimizing maximum/total cost',
        'Optimal polygon triangulation',
        'Certain scheduling problems with k rounds',
        'Bin packing variants with monotone optimal split',
      ],
      recognitionTest: 'Compute opt(i) for small n. Is opt(0) ≤ opt(1) ≤ ... ≤ opt(n-1)? If yes — D&C DP applicable.',
    },

    {
      id          : 'opt_knuth',
      label       : 'Knuth Optimization',
      category    : 'time',
      tagline     : 'O(n³) → O(n²) for Interval DP',
      description : 'For interval DP where dp[i][j] = min over k of dp[i][k] + dp[k+1][j] + C(i,j), if cost C satisfies the quadrangle inequality AND optimal split opt(i,j) is monotone, limit the k search to [opt(i,j-1), opt(i+1,j)].',
      appliesWhen : [
        'Interval DP of the form dp[i][j] = min over k of dp[i][k] + dp[k+1][j] + C(i,j)',
        'Cost C satisfies quadrangle inequality: C(a,c) + C(b,d) ≤ C(a,d) + C(b,c) for a≤b≤c≤d',
        'Optimal split opt(i,j) is monotone: opt(i,j-1) ≤ opt(i,j) ≤ opt(i+1,j)',
      ],
      doesNotApply: [
        'Cost does not satisfy quadrangle inequality',
        'dp[i][j] transition does not split into two sub-intervals cleanly',
      ],
      verifyBefore: [
        'Check quadrangle inequality on small examples: C(0,2)+C(1,3) ≤ C(0,3)+C(1,2)?',
        'Check opt monotonicity: for small n, compute all opt[i][j] and verify opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j]',
        'Both conditions must hold simultaneously',
      ],
      code        : `int opt[MAXN][MAXN] = {};
// Fill by length
for (int len = 2; len <= n; len++) {
  for (int i = 0; i + len - 1 < n; i++) {
    int j = i + len - 1;
    dp[i][j] = INF;
    // k only ranges from opt[i][j-1] to opt[i+1][j]
    int lo = opt[i][j-1];
    int hi = (j < n-1) ? opt[i+1][j] : j-1;
    for (int k = lo; k <= min(hi, j-1); k++) {
      long long val = dp[i][k] + dp[k+1][j] + cost(i, j);
      if (val < dp[i][j]) {
        dp[i][j] = val;
        opt[i][j] = k;
      }
    }
  }
}`,
      reduction   : { time: 'O(n³) → O(n²)', space: 'O(n²) extra for opt table' },
      examples    : [
        'Optimal BST construction',
        'Matrix chain multiplication with specific cost structure',
        'Stone merging (certain variants)',
        'Hu-Shing algorithm for matrix chain',
      ],
      recognitionTest: 'Is it interval DP? Write cost(i,j). Check C(a,c)+C(b,d) ≤ C(a,d)+C(b,c) for 3-4 examples.',
    },

    {
      id          : 'opt_mono_deque',
      label       : 'Monotonic Deque DP',
      category    : 'time',
      tagline     : 'O(nk) → O(n)',
      description : 'When dp[i] = max/min over j in sliding window [i-k, i-1] of dp[j] + cost(j,i), a monotonic deque maintains the optimal j in O(1) amortized per query.',
      appliesWhen : [
        'dp[i] = max/min of dp[j] + something, for j in [i-k, i-1]',
        'Window of valid previous states has fixed or bounded size k',
        'Need running max/min over a sliding window of DP values',
        '"Jump at most k steps" or "use resources at most k ago" feel',
      ],
      doesNotApply: [
        'Window size is not bounded or query range is not a contiguous window',
        'Optimal j requires comparison other than simple max/min of dp[j]',
        'Random access to previous states (not a window)',
      ],
      verifyBefore: [
        'Is j restricted to a contiguous window [i-k, i-1]?',
        'Are you taking max or min of dp[j] (plus something that does not depend on j)?',
        'Does the window slide by exactly 1 each step?',
      ],
      code        : `deque<int> dq; // stores indices in decreasing dp order
for (int i = 0; i < n; i++) {
  // Step 1: remove indices outside window [i-k, i-1]
  while (!dq.empty() && dq.front() < i - k)
    dq.pop_front();

  // Step 2: use front of deque (best valid previous state)
  dp[i] = (dq.empty() ? 0 : dp[dq.front()]) + cost[i];

  // Step 3: maintain decreasing order in deque
  while (!dq.empty() && dp[dq.back()] <= dp[i])
    dq.pop_back();
  dq.push_back(i);
}`,
      reduction   : { time: 'O(nk) → O(n)', space: 'O(k) deque' },
      examples    : [
        'Jump game with at most k steps (min jumps)',
        'Constrained subsequence sum (LeetCode 1425)',
        'Maximum sum with no two adjacent within k distance',
        'Sliding window maximum applied to DP',
      ],
      recognitionTest: 'Does the valid j range for each i form a sliding window of fixed size? If yes — monotonic deque.',
    },

    {
      id          : 'opt_lis_bsearch',
      label       : 'LIS Binary Search (Patience Sorting)',
      category    : 'time',
      tagline     : 'O(n²) → O(n log n) for LIS-type problems',
      description : 'For LIS-type DP where dp[i] = 1 + max(dp[j]) for j < i with a[j] < a[i], maintain a "tails" array where tails[k] = smallest tail element of any increasing subsequence of length k+1. Binary search for position of current element.',
      appliesWhen : [
        'dp[i] = length of longest [increasing/non-decreasing] subsequence ending at i',
        'Transition: for all j < i where a[j] < a[i] (or ≤ for non-strict)',
        'Russian Doll Envelopes (2D LIS)',
        'Any LIS-type with strict or non-strict ordering',
      ],
      doesNotApply: [
        'LIS with weighted values (need different approach)',
        'When reconstruction of actual subsequence is needed (need patience sort with stacks)',
        'When ordering condition is not a simple comparison',
      ],
      verifyBefore: [
        'Is the transition strictly dp[i] = 1 + max(dp[j]) for j where a[j] < a[i]?',
        'For strict LIS: use lower_bound. For non-strict: use upper_bound',
        'Verify: tails array is always sorted (invariant)',
      ],
      code        : `// Strict LIS (strictly increasing)
vector<int> tails;
for (int x : nums) {
  auto it = lower_bound(tails.begin(), tails.end(), x);
  if (it == tails.end()) tails.push_back(x);
  else *it = x;
}
int lisLength = tails.size();

// Non-strict LIS (non-decreasing)
vector<int> tails2;
for (int x : nums) {
  auto it = upper_bound(tails2.begin(), tails2.end(), x);
  if (it == tails2.end()) tails2.push_back(x);
  else *it = x;
}`,
      reduction   : { time: 'O(n²) → O(n log n)', space: 'O(n) tails array' },
      examples    : [
        'Longest Increasing Subsequence',
        'Longest Non-Decreasing Subsequence',
        'Russian Doll Envelopes (sort by width, LIS on height)',
        'Number of Longest Increasing Subsequences (harder — needs BIT)',
      ],
      recognitionTest: 'Is this LIS or a direct reduction to LIS? If yes — patience sorting in O(n log n).',
    },
  ];

  // ─── DECISION FLOWCHART ────────────────────────────────────────────────────
  // Which optimization to consider given transition type

  const DECISION_FLOW = [
    {
      question : 'Is this a 1D DP where dp[i] only reads from dp[i-1] or dp[i-2]?',
      ifYes    : 'opt_rolling_array',
      ifNo     : 'continue',
    },
    {
      question : 'Is this a 2D two-sequence DP where dp[i][j] only reads from row i-1?',
      ifYes    : 'opt_rolling_array',
      ifNo     : 'continue',
    },
    {
      question : 'Is this LIS or a direct reduction to LIS?',
      ifYes    : 'opt_lis_bsearch',
      ifNo     : 'continue',
    },
    {
      question : 'Is dp[i] = min/max over sliding window [i-k, i-1] of dp[j]?',
      ifYes    : 'opt_mono_deque',
      ifNo     : 'continue',
    },
    {
      question : 'Is dp[i] = min over j < i of dp[j] + b[j]*a[i] + c[j]? (Linear cost)',
      ifYes    : 'opt_cht',
      ifNo     : 'continue',
    },
    {
      question : 'Is this Interval DP and cost satisfies quadrangle inequality?',
      ifYes    : 'opt_knuth',
      ifNo     : 'continue',
    },
    {
      question : 'Is optimal split point monotone but quadrangle inequality not verified?',
      ifYes    : 'opt_dc_dp',
      ifNo     : 'no_optimization',
    },
  ];

  // ─── COMPLEXITY REDUCTION TABLE ───────────────────────────────────────────

  const REDUCTION_TABLE = [
    { technique: 'Rolling Array',        timeBefore: 'Same',  timeAfter: 'Same',        spaceBefore: 'O(n) or O(nm)', spaceAfter: 'O(1) or O(m)' },
    { technique: 'Convex Hull Trick',    timeBefore: 'O(n²)', timeAfter: 'O(n log n)',  spaceBefore: 'Same',          spaceAfter: 'O(n)' },
    { technique: 'D&C DP Optimization', timeBefore: 'O(n²)', timeAfter: 'O(n log n)',  spaceBefore: 'Same',          spaceAfter: '+O(log n)' },
    { technique: 'Knuth Optimization',   timeBefore: 'O(n³)', timeAfter: 'O(n²)',       spaceBefore: 'O(n²)',         spaceAfter: 'O(n²)' },
    { technique: 'Monotonic Deque DP',  timeBefore: 'O(nk)', timeAfter: 'O(n)',         spaceBefore: 'Same',          spaceAfter: '+O(k)' },
    { technique: 'LIS Binary Search',   timeBefore: 'O(n²)', timeAfter: 'O(n log n)',  spaceBefore: 'O(n)',          spaceAfter: 'O(n)' },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAll()              { return [...OPTIMIZATIONS]; }
  function getById(id)           { return OPTIMIZATIONS.find(o => o.id === id) ?? null; }
  function getDecisionFlow()     { return [...DECISION_FLOW]; }
  function getReductionTable()   { return [...REDUCTION_TABLE]; }

  // Get optimizations applicable for a given DP type id
  function getForDPType(dpTypeId) {
    const TYPE_OPT_MAP = {
      dp_1d          : ['opt_rolling_array', 'opt_cht', 'opt_dc_dp', 'opt_mono_deque', 'opt_lis_bsearch'],
      dp_2d_seq      : ['opt_rolling_array'],
      dp_interval    : ['opt_knuth', 'opt_dc_dp'],
      dp_bitmask     : [],
      dp_tree        : ['opt_rolling_array'],
      dp_digit       : [],
      dp_knapsack    : ['opt_rolling_array'],
      dp_state_machine: ['opt_rolling_array'],
      dp_grid        : ['opt_rolling_array'],
    };
    const ids = TYPE_OPT_MAP[dpTypeId] ?? [];
    return ids.map(id => getById(id)).filter(Boolean);
  }

  // Walk through decision flow and return recommended optimization
  function recommend(context) {
    const {
      isAdjacent,
      isTwoSequence,
      isLIS,
      isSlidingWindow,
      isLinearCost,
      isIntervalDP,
      isMonotoneOpt,
    } = context;

    if (isAdjacent || isTwoSequence) return getById('opt_rolling_array');
    if (isLIS)                        return getById('opt_lis_bsearch');
    if (isSlidingWindow)              return getById('opt_mono_deque');
    if (isLinearCost)                 return getById('opt_cht');
    if (isIntervalDP)                 return getById('opt_knuth');
    if (isMonotoneOpt)                return getById('opt_dc_dp');
    return null;
  }

  // Build a human-readable summary of all applicable optimizations
  function buildApplicabilitySummary(dpTypeId, transitionTypeId) {
    const byDP         = getForDPType(dpTypeId);
    const reductionRow = REDUCTION_TABLE.find(r =>
      byDP.some(o => o.label === r.technique)
    );

    return {
      applicable  : byDP,
      bestReduction: reductionRow ?? null,
      decisionFlow: DECISION_FLOW,
    };
  }

  return {
    getAll,
    getById,
    getDecisionFlow,
    getReductionTable,
    getForDPType,
    recommend,
    buildApplicabilitySummary,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DPOptimization;
}
