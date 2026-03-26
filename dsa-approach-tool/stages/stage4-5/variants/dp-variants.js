// stages/stage4-5/variants/dp-variants.js
// DP approach variants — specific DP optimizations and formulations
// Used by: stage4-5.js

const DPVariants = (() => {

  const VARIANTS = [
    {
      id          : 'dp_standard',
      label       : 'Standard DP (tabulation)',
      tagline     : 'Bottom-up table fill in topological order',
      complexity  : 'O(states × transitions)',
      when        : [
        'All subproblems needed (no sparse access)',
        'Bottom-up order is clear',
        'Prefer iterative over recursive',
      ],
      template    : `// Standard bottom-up DP
vector<int> dp(n+1, INF);
dp[0] = 0; // base case
for (int i = 1; i <= n; i++) {
  for (int j = 0; j < i; j++) {
    if (valid(j, i))
      dp[i] = min(dp[i], dp[j] + cost(j, i));
  }
}
return dp[n];`,
      watchOut    : [
        'Ensure fill order respects dependencies — base cases first',
        'Initialize to INF (minimize) or -INF (maximize) or 0 (count)',
        'Off-by-one in loop bounds is the most common bug',
      ],
      examples    : ['Coin change', 'Climbing stairs', 'Knapsack'],
    },
    {
      id          : 'dp_memoization',
      label       : 'DP with Memoization (top-down)',
      tagline     : 'Recursive with cache — sparse subproblem access',
      complexity  : 'O(states × transitions)',
      when        : [
        'Not all subproblems are needed (sparse)',
        'Recursion order is more natural',
        'State space is large but only subset accessed',
      ],
      template    : `unordered_map<int, int> memo;

int solve(int state) {
  if (baseCase(state)) return baseValue(state);
  if (memo.count(state)) return memo[state];

  int res = INF;
  for (auto next : transitions(state))
    res = min(res, solve(next) + cost(state, next));

  return memo[state] = res;
}`,
      watchOut    : [
        'HashMap memo has higher constant than array — use array when state is bounded',
        'Recursion depth limit — may need iterative for n=10^5',
        'Ensure all states eventually reach base case (no infinite recursion)',
      ],
      examples    : ['Game theory', 'Digit DP', 'Bitmask DP'],
    },
    {
      id          : 'dp_rolling_array',
      label       : 'DP with Rolling Array',
      tagline     : 'Reduce O(n) or O(nm) space to O(1) or O(m)',
      complexity  : 'Same time, reduced space',
      when        : [
        'dp[i] only reads from dp[i-1] (adjacent transition)',
        '2D DP where dp[i][j] only reads from row i-1',
        'Value only needed — no path reconstruction',
      ],
      template    : `// Rolling array for 1D DP
int prev = dp_base_0, curr;
for (int i = 1; i <= n; i++) {
  curr = f(prev);
  prev = curr;
}

// Rolling row for 2D DP
vector<int> prev_row(m+1), curr_row(m+1);
for (int i = 1; i <= n; i++) {
  for (int j = 1; j <= m; j++)
    curr_row[j] = f(prev_row[j], curr_row[j-1], prev_row[j-1]);
  swap(prev_row, curr_row);
}`,
      watchOut    : [
        'Cannot reconstruct path/solution — only final value',
        'Diagonal value dp[i-1][j-1] corrupted in rolling row — save before overwriting',
        'Knapsack 0/1: must iterate W decreasing to prevent reuse',
      ],
      examples    : ['LCS space optimized', 'Knapsack 1D', 'Edit distance O(m) space'],
    },
    {
      id          : 'dp_cht',
      label       : 'DP with Convex Hull Trick',
      tagline     : 'O(n²) → O(n log n) for linear transition cost',
      complexity  : 'O(n log n) or O(n) if monotone',
      when        : [
        'dp[i] = min over j < i of dp[j] + b[j] × a[i] + c',
        'Cost decomposes into f(j) × g(i) — linear in query variable',
        'Standard O(n²) DP is TLE for n=10^5',
      ],
      template    : `struct Line { long long m, b; long long eval(long long x) { return m*x+b; } };
deque<Line> hull;

auto bad = [](Line l1, Line l2, Line l3) {
  return (__int128)(l3.b-l1.b)*(l1.m-l2.m) <=
         (__int128)(l2.b-l1.b)*(l1.m-l3.m);
};

for (int i = 0; i < n; i++) {
  // Query best line at x = query_i
  while (hull.size()>1 && hull[0].eval(q[i]) >= hull[1].eval(q[i]))
    hull.pop_front();
  dp[i] = hull.front().eval(q[i]) + extra[i];

  // Add new line for state i
  Line newLine = {slope[i], intercept[i]};
  while (hull.size()>1 && bad(hull[hull.size()-2], hull.back(), newLine))
    hull.pop_back();
  hull.push_back(newLine);
}`,
      watchOut    : [
        'Monotone slopes: deque O(n). Non-monotone: Li Chao tree O(n log n)',
        'Must verify: cost(i,j) = f(j) × g(i) exactly — no extra terms',
        'CHT minimizes — negate everything to maximize',
      ],
      examples    : ['Minimum cost to divide array', 'Slope trick DP problems'],
    },
    {
      id          : 'dp_divide_conquer',
      label       : 'D&C DP Optimization',
      tagline     : 'O(n²) per layer → O(n log n) if opt point monotone',
      complexity  : 'O(n log n) per DP layer',
      when        : [
        'dp[i] = min over k in [lo,hi] of dp_prev[k] + cost(k,i)',
        'Optimal split point opt(i) is monotone: opt(i) ≤ opt(i+1)',
        'Used when Knuth does not apply but monotonicity holds',
      ],
      template    : `void solve(int lo, int hi, int optLo, int optHi) {
  if (lo > hi) return;
  int mid = (lo + hi) / 2, best = optLo;
  dp[mid] = INF;
  for (int k = optLo; k <= min(optHi, mid); k++) {
    long long val = dp_prev[k] + cost(k, mid);
    if (val < dp[mid]) { dp[mid] = val; best = k; }
  }
  solve(lo, mid-1, optLo, best);
  solve(mid+1, hi, best, optHi);
}`,
      watchOut    : [
        'Verify opt monotonicity on small examples before applying',
        'Each layer costs O(n log n) — if k layers, total O(kn log n)',
        'Do not confuse with Knuth — Knuth needs stronger quadrangle inequality',
      ],
      examples    : ['K-partition DP', 'Optimal polygon triangulation'],
    },
    {
      id          : 'dp_knuth',
      label       : 'Knuth Optimization',
      tagline     : 'O(n³) Interval DP → O(n²)',
      complexity  : 'O(n²)',
      when        : [
        'Interval DP: dp[i][j] = min over k of dp[i][k] + dp[k+1][j] + C(i,j)',
        'Cost C satisfies quadrangle inequality',
        'opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j]',
      ],
      template    : `int opt[MAXN][MAXN] = {};
for (int len = 2; len <= n; len++) {
  for (int i = 0; i+len-1 < n; i++) {
    int j = i+len-1;
    dp[i][j] = INF;
    int lo = opt[i][j-1];
    int hi = (j < n-1) ? opt[i+1][j] : j-1;
    for (int k = lo; k <= min(hi, j-1); k++) {
      long long val = dp[i][k] + dp[k+1][j] + cost(i,j);
      if (val < dp[i][j]) { dp[i][j] = val; opt[i][j] = k; }
    }
  }
}`,
      watchOut    : [
        'Must verify quadrangle inequality: C(a,c)+C(b,d) ≤ C(a,d)+C(b,c)',
        'Opt table needs correct initialization — opt[i][i] = i',
        'Fill order still by length — same as standard interval DP',
      ],
      examples    : ['Optimal BST', 'Matrix chain with specific cost structure'],
    },
    {
      id          : 'dp_bitmask',
      label       : 'Bitmask DP',
      tagline     : 'Track subset of n ≤ 20 items as integer bitmask',
      complexity  : 'O(2^n × n)',
      when        : [
        'n ≤ 20 with all-subsets structure',
        'TSP-type, assignment, covering problems',
        'State = which items have been processed/selected',
      ],
      template    : `// dp[mask][i] = optimal cost visiting cities in mask, ending at i
vector<vector<long long>> dp(1<<n, vector<long long>(n, INF));
dp[1][0] = 0; // start at city 0

for (int mask = 1; mask < (1<<n); mask++) {
  for (int u = 0; u < n; u++) {
    if (!(mask >> u & 1)) continue;
    if (dp[mask][u] == INF) continue;
    for (int v = 0; v < n; v++) {
      if (mask >> v & 1) continue;
      int newMask = mask | (1<<v);
      dp[newMask][v] = min(dp[newMask][v], dp[mask][u] + dist[u][v]);
    }
  }
}`,
      watchOut    : [
        'n ≤ 20 ONLY — 2^25 = 33M states is borderline TLE',
        'Integer overflow: use 1LL << n for n near 32',
        'Submask enumeration: for(sub=mask; sub>0; sub=(sub-1)&mask)',
      ],
      examples    : ['TSP', 'Minimum cost assignment', 'Shortest path visiting all nodes'],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = [], dpSubtype = null) {
    const isDPDirection = directions.some(d =>
      (d.family ?? '').includes('dp') ||
      (d.id     ?? '').includes('dp')
    );
    if (!isDPDirection) return [];

    // Prioritize based on dp subtype
    if (dpSubtype === 'dp_bitmask')   return [getById('dp_bitmask'),   ...getAll().filter(v => v.id !== 'dp_bitmask')];
    if (dpSubtype === 'dp_interval')  return [getById('dp_knuth'),     ...getAll().filter(v => v.id !== 'dp_knuth')];
    if (dpSubtype === 'dp_1d')        return [getById('dp_standard'),  getById('dp_rolling_array'), ...getAll().filter(v => !['dp_standard','dp_rolling_array'].includes(v.id))];

    return getAll();
  }

  function getVariantComplexity(variantId) {
    return getById(variantId)?.complexity ?? null;
  }

  return {
    getAll,
    getById,
    getRelevant,
    getVariantComplexity,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DPVariants;
}