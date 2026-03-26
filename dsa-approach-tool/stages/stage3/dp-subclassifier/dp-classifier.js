// stages/stage3/dp-subclassifier/dp-classifier.js
// 3H — Which kind of DP applies? Routes to specific DP variant
// Used by: stage3.js

const DPClassifier = (() => {

  // ─── CLASSIFIER QUESTIONS ──────────────────────────────────────────────────
  // Asked sequentially — each answer narrows to a DP type

  const QUESTIONS = [
    {
      id      : 'q_input_shape',
      text    : 'What does your DP state index represent?',
      sublabel: 'What varies between different subproblems?',
      options : [
        {
          id      : 'single_position',
          label   : 'A single position in one sequence',
          sublabel: 'dp[i] = answer for prefix ending at i',
          leadsTo : 'dp_1d',
        },
        {
          id      : 'two_positions',
          label   : 'Two positions — one in each of two sequences',
          sublabel: 'dp[i][j] = answer using first i of s1 and first j of s2',
          leadsTo : 'dp_2d_seq',
        },
        {
          id      : 'range',
          label   : 'A range [i, j] within one sequence',
          sublabel: 'dp[i][j] = answer for subarray/substring from i to j',
          leadsTo : 'dp_interval',
        },
        {
          id      : 'subset',
          label   : 'A subset of elements',
          sublabel: 'dp[mask] = answer for subset represented by bitmask',
          leadsTo : 'dp_bitmask',
        },
        {
          id      : 'tree_node',
          label   : 'A node in a tree',
          sublabel: 'dp[node] = answer for subtree rooted at node',
          leadsTo : 'dp_tree',
        },
        {
          id      : 'digit_position',
          label   : 'A digit position in a number',
          sublabel: 'dp[pos][tight][state] = count of valid numbers',
          leadsTo : 'dp_digit',
        },
        {
          id      : 'capacity',
          label   : 'Position + remaining capacity/budget',
          sublabel: 'dp[i][w] = best value using first i items with capacity w',
          leadsTo : 'dp_knapsack',
        },
        {
          id      : 'mode',
          label   : 'Position + current mode or phase',
          sublabel: 'dp[i][state] = answer at index i being in given state',
          leadsTo : 'dp_state_machine',
        },
        {
          id      : 'grid',
          label   : 'A cell (row, col) in a grid',
          sublabel: 'dp[r][c] = answer for reaching cell (r,c)',
          leadsTo : 'dp_grid',
        },
      ],
    },
  ];

  // ─── DP TYPE DEFINITIONS ──────────────────────────────────────────────────

  const DP_TYPES = {
    dp_1d: {
      id          : 'dp_1d',
      label       : '1D DP',
      description : 'Single index over one sequence',
      stateShape  : 'dp[i]',
      stateExample: 'dp[i] = max sum of subarray ending at index i',
      transition  : 'dp[i] = f(dp[i-1], dp[i-2], ...) or max over j < i of dp[j] + cost',
      baseCase    : 'dp[0] = base value (0 or a[0] depending on problem)',
      spaceOpt    : 'If dp[i] only uses dp[i-1] — reduce to O(1) using two variables',
      fillOrder   : 'Left to right: i = 0, 1, 2, ..., n-1',
      examples    : [
        'Maximum subarray sum (Kadane)',
        'Climbing stairs',
        'House robber',
        'Minimum cost to reach end',
        'Longest increasing subsequence (O(n²) version)',
      ],
      watchOut    : [
        'Define dp[i] meaning precisely — ending AT i vs ending BY i are different',
        'Check base case dp[0] carefully — often the hardest part',
      ],
      complexity  : 'O(n) time, O(n) space → O(1) with rolling variables',
    },

    dp_2d_seq: {
      id          : 'dp_2d_seq',
      label       : '2D DP — two sequences',
      description : 'Two indices, one per sequence',
      stateShape  : 'dp[i][j]',
      stateExample: 'dp[i][j] = LCS length of s1[0..i-1] and s2[0..j-1]',
      transition  : 'If s1[i]==s2[j]: dp[i][j] = dp[i-1][j-1]+1. Else: max(dp[i-1][j], dp[i][j-1])',
      baseCase    : 'dp[0][j] = 0 for all j, dp[i][0] = 0 for all i',
      spaceOpt    : 'Only need previous row — reduce from O(nm) to O(m) space',
      fillOrder   : 'Row by row: i = 1 to n, j = 1 to m',
      examples    : [
        'Longest Common Subsequence',
        'Edit Distance (Levenshtein)',
        'Shortest Common Supersequence',
        'Regular expression matching',
        'Wildcard matching',
      ],
      watchOut    : [
        'At n=m=10^4, full table needs 400MB — always apply rolling row optimization',
        'Indices often off by one — dp[i][j] usually refers to prefixes of length i and j',
      ],
      complexity  : 'O(nm) time, O(nm) space → O(m) with rolling row',
    },

    dp_interval: {
      id          : 'dp_interval',
      label       : 'Interval DP',
      description : 'Range [i,j] within one sequence',
      stateShape  : 'dp[i][j]',
      stateExample: 'dp[i][j] = minimum cost to multiply matrices i through j',
      transition  : 'dp[i][j] = min over k in [i,j-1] of dp[i][k] + dp[k+1][j] + cost(i,j)',
      baseCase    : 'dp[i][i] = 0 (single element, no cost)',
      spaceOpt    : 'Cannot easily reduce — O(n²) space is standard',
      fillOrder   : 'CRITICAL: by increasing interval LENGTH, not by row. len=1, then len=2, ..., len=n',
      examples    : [
        'Matrix chain multiplication',
        'Burst balloons',
        'Minimum cost to merge stones',
        'Longest palindromic subsequence',
        'Optimal BST construction',
      ],
      watchOut    : [
        'Fill order is CRITICAL — must fill by length, not by row. Wrong order → wrong answers',
        'Knuth optimization reduces O(n³) to O(n²) if cost satisfies quadrangle inequality',
      ],
      complexity  : 'O(n³) time (standard), O(n²) with Knuth optimization, O(n²) space',
    },

    dp_bitmask: {
      id          : 'dp_bitmask',
      label       : 'Bitmask DP',
      description : 'Subset of elements tracked as bitmask',
      stateShape  : 'dp[mask] or dp[mask][i]',
      stateExample: 'dp[mask][i] = min cost to visit exactly the cities in mask, ending at city i',
      transition  : 'dp[mask|(1<<j)][j] = min(dp[mask][i] + cost[i][j]) for all j not in mask',
      baseCase    : 'dp[1<<start][start] = 0 (at start city, visited only start)',
      spaceOpt    : '2^n × n states — cannot reduce further',
      fillOrder   : 'By increasing popcount of mask (number of bits set)',
      examples    : [
        'Travelling Salesman Problem (TSP)',
        'Minimum cost to assign tasks to workers',
        'Shortest path visiting all required nodes',
        'Partition into k equal subsets',
        'Hamiltonian path problems',
      ],
      watchOut    : [
        'ONLY feasible for n ≤ 20. At n=25, 2^25×25 ≈ 838M — borderline TLE',
        'Verify n ≤ 20 from Stage 0 before using Bitmask DP',
        'Iterating over submasks: for(sub=mask; sub>0; sub=(sub-1)&mask)',
      ],
      complexity  : 'O(2^n × n) time and space — feasible only for n ≤ 20',
    },

    dp_tree: {
      id          : 'dp_tree',
      label       : 'Tree DP',
      description : 'DP on tree nodes, computed bottom-up',
      stateShape  : 'dp[node] or dp[node][state]',
      stateExample: 'dp[node][0] = max independent set not including node',
      transition  : 'dp[node] = f(dp[child1], dp[child2], ...) combining all children',
      baseCase    : 'dp[leaf] = leaf value or 0',
      spaceOpt    : 'O(n) — one state per node',
      fillOrder   : 'Post-order DFS — process all children before current node',
      examples    : [
        'Maximum independent set on tree',
        'Minimum vertex cover on tree',
        'Diameter of tree',
        'Maximum path sum in tree',
        'Number of nodes in subtree satisfying property',
      ],
      watchOut    : [
        'Recursive DFS on skewed tree with n=10^5 → stack overflow. Use iterative post-order',
        'For path problems through tree: track best path going up, update global answer at each node',
        'Rerooting technique needed if root can be any node',
      ],
      complexity  : 'O(n) time, O(n) space',
    },

    dp_digit: {
      id          : 'dp_digit',
      label       : 'Digit DP',
      description : 'Count numbers in range satisfying digit property',
      stateShape  : 'dp[pos][tight][accumulated_state]',
      stateExample: 'dp[pos][tight][sum] = count of valid numbers from position pos onward',
      transition  : 'For each digit d from 0 to (tight ? current_digit : 9): recurse with new tight and new state',
      baseCase    : 'dp[n_digits][any_tight][valid_state] = 1 if state valid, 0 otherwise',
      spaceOpt    : 'Memoize — states are (pos, tight, accumulated). tight is boolean.',
      fillOrder   : 'Top-down memoization — process digit by digit from most significant',
      examples    : [
        'Count numbers up to N with digit sum equal to k',
        'Count numbers with no two adjacent equal digits',
        'Count stepping numbers (adjacent digits differ by 1)',
        'Count numbers divisible by d with specific digit patterns',
        'Lucky numbers (only 4s and 7s) up to N',
      ],
      watchOut    : [
        'tight constraint must be passed correctly — if current digit < limit digit, tight becomes false',
        'Leading zero handling needs separate flag in some problems',
        'N can be up to 10^18 — store as string for digit access',
      ],
      complexity  : 'O(digits × 2 × state_space) — usually O(log N × state)',
    },

    dp_knapsack: {
      id          : 'dp_knapsack',
      label       : 'Knapsack DP',
      description : 'Items with weight/cost constraint',
      stateShape  : 'dp[i][w] or dp[w]',
      stateExample: 'dp[w] = max value achievable with capacity exactly w',
      transition  : {
        '0/1'      : 'Iterate w from W DOWN to weight[i]: dp[w] = max(dp[w], dp[w-weight[i]] + val[i])',
        'unbounded': 'Iterate w from weight[i] UP to W: dp[w] = max(dp[w], dp[w-weight[i]] + val[i])',
      },
      baseCase    : 'dp[0] = 0',
      spaceOpt    : '1D array with correct iteration direction',
      fillOrder   : '0/1: w DECREASING (prevents reuse). Unbounded: w INCREASING (allows reuse)',
      examples    : [
        '0/1 Knapsack (each item once)',
        'Unbounded Knapsack (items reusable) — Coin change',
        'Subset sum (value = weight = element)',
        'Partition equal subset sum',
        'Target sum with + and - assignments',
      ],
      watchOut    : [
        'CRITICAL: 0/1 needs DECREASING w order. Unbounded needs INCREASING w order',
        'Mixing these silently converts 0/1 into unbounded — no error, wrong answer',
        'This is the most common knapsack bug',
      ],
      complexity  : 'O(n×W) time, O(W) space with 1D optimization',
    },

    dp_state_machine: {
      id          : 'dp_state_machine',
      label       : 'State Machine DP',
      description : 'Explicit states/modes with transitions between them',
      stateShape  : 'dp[i][state]',
      stateExample: 'dp[i][HOLD] = max profit on day i while holding stock',
      transition  : 'dp[i][HOLD] = max(dp[i-1][HOLD], dp[i-1][EMPTY] - price[i])',
      baseCase    : 'dp[0][each_state] = initial value for that state',
      spaceOpt    : 'Only need previous row — O(states) space',
      fillOrder   : 'Left to right: i = 0 to n-1, update all states at each i',
      examples    : [
        'Buy and sell stock with cooldown',
        'Buy and sell with at most k transactions',
        'Paint fence — at most 2 consecutive same color',
        'Problems with limited number of operations allowed',
      ],
      watchOut    : [
        'Draw state transition diagram BEFORE coding — missing one transition causes subtle bugs',
        'Initial states must be set carefully — invalid states should be -∞ or ∞',
      ],
      complexity  : 'O(n × states) time, O(states) space',
    },

    dp_grid: {
      id          : 'dp_grid',
      label       : 'Grid DP',
      description : 'DP on 2D grid, movement restricted to specific directions',
      stateShape  : 'dp[r][c]',
      stateExample: 'dp[r][c] = number of paths to reach cell (r,c)',
      transition  : 'dp[r][c] = dp[r-1][c] + dp[r][c-1] (paths) or min(dp[r-1][c], dp[r][c-1]) + cost (min cost)',
      baseCase    : 'dp[0][c] = prefix along top row, dp[r][0] = prefix along left column',
      spaceOpt    : 'Only need previous row — reduce from O(nm) to O(m) space',
      fillOrder   : 'Row by row, left to right: r=0 to n-1, c=0 to m-1',
      examples    : [
        'Unique paths in grid',
        'Minimum path sum',
        'Dungeon game (min health to reach end)',
        'Maximal square of 1s',
        'Cherry pickup (two simultaneous paths)',
      ],
      watchOut    : [
        'If movement is in all 4 directions — DP breaks. Use BFS/DFS instead',
        'Grid DP requires one-directional movement (usually right and down only)',
      ],
      complexity  : 'O(nm) time, O(nm) → O(m) space',
    },
  };

  // ─── TRANSITION TYPE ANALYSIS ─────────────────────────────────────────────

  const TRANSITION_PATTERNS = [
    {
      id         : 'adjacent',
      label      : 'Adjacent only',
      pattern    : 'dp[i] depends on dp[i-1] or dp[i-2]',
      spaceOpt   : 'O(1) — keep last 1 or 2 values only',
      examples   : ['Fibonacci', 'Climbing stairs', 'House robber'],
    },
    {
      id         : 'all_previous',
      label      : 'All previous',
      pattern    : 'dp[i] = max/min over all j < i of dp[j] + cost(j,i)',
      spaceOpt   : 'O(n) minimum — may optimize with CHT or D&C DP',
      examples   : ['LIS O(n²)', 'Max sum increasing subsequence'],
    },
    {
      id         : 'range_split',
      label      : 'Range split',
      pattern    : 'dp[i][j] = min over k in [i,j) of dp[i][k] + dp[k+1][j] + cost',
      spaceOpt   : 'O(n²) always — Knuth optimization reduces time not space',
      examples   : ['Matrix chain', 'Burst balloons', 'Optimal BST'],
    },
    {
      id         : 'sliding_window',
      label      : 'Sliding window',
      pattern    : 'dp[i] = max/min over j in [i-k, i-1] of dp[j] + cost',
      spaceOpt   : 'Monotonic deque reduces O(nk) to O(n)',
      examples   : ['Jump game with range limit', 'Constrained subsequence sum'],
    },
  ];

  // ─── OPTIMIZATION FLAGS ───────────────────────────────────────────────────

  const OPTIMIZATIONS = [
    {
      id         : 'opt_rolling',
      label      : 'Rolling array',
      when       : 'dp[i] only reads from dp[i-1] or dp[i-2]',
      reduces    : 'O(n) or O(nm) space → O(1) or O(m)',
      caveat     : 'Cannot reconstruct path — need full table for backtracking',
    },
    {
      id         : 'opt_cht',
      label      : 'Convex Hull Trick',
      when       : 'dp[i] = min over j < i of dp[j] + b[j]×a[i] — linear cost structure',
      reduces    : 'O(n²) → O(n log n) or O(n) if slopes monotone',
      caveat     : 'Requires specific linear structure in transition cost',
    },
    {
      id         : 'opt_dc',
      label      : 'Divide and Conquer DP',
      when       : 'dp[i][j] optimal split point is monotone: opt(i,j) ≤ opt(i,j+1)',
      reduces    : 'O(n²) per layer → O(n log n) per layer',
      caveat     : 'Requires monotone optimal split — verify before applying',
    },
    {
      id         : 'opt_knuth',
      label      : 'Knuth Optimization',
      when       : 'Interval DP where cost satisfies quadrangle inequality',
      reduces    : 'O(n³) → O(n²)',
      caveat     : 'Must verify quadrangle inequality: cost(a,c)+cost(b,d) ≤ cost(a,d)+cost(b,c)',
    },
    {
      id         : 'opt_mono_deque',
      label      : 'Monotonic Deque DP',
      when       : 'dp[i] = max/min over sliding window of previous states',
      reduces    : 'O(nk) → O(n)',
      caveat     : 'Window must have fixed or bounded size',
    },
  ];

  // ─── STATE VERIFICATION ───────────────────────────────────────────────────

  const STATE_CHECKS = [
    {
      id     : 'completeness',
      label  : 'Completeness',
      check  : 'Can I reconstruct the full solution from just this state?',
      example: 'dp[i] = max sum ending at i → global max = max over all dp[i] ✓',
      failExample: 'dp[i] = true if some subset sums to i → cannot recover which subset ✗',
      fix    : 'Add parent[] or choice[] array to track decisions',
    },
    {
      id     : 'redundancy',
      label  : 'Non-redundancy',
      check  : 'Is any part of the state derivable from other parts?',
      example: 'dp[i][j][sum] where sum = prefix[j]-prefix[i] → sum is redundant → use dp[i][j]',
      fix    : 'Remove redundant dimensions — saves memory and time',
    },
    {
      id     : 'dimension',
      label  : 'Dimension reduction',
      check  : 'Do I actually need all dimensions or can one be eliminated?',
      example: 'dp[i][j] where j = i-1 always → dp[i] with implicit j from loop',
      fix    : 'Eliminate dimensions fixed by loop structure',
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getQuestions()           { return [...QUESTIONS]; }
  function getAllTypes()             { return { ...DP_TYPES }; }
  function getTypeById(id)          { return DP_TYPES[id] ?? null; }
  function getTransitionPatterns()  { return [...TRANSITION_PATTERNS]; }
  function getOptimizations()       { return [...OPTIMIZATIONS]; }
  function getStateChecks()         { return [...STATE_CHECKS]; }

  // Given question option id — get the DP type it leads to
  function getTypeFromOption(optionId) {
    for (const q of QUESTIONS) {
      const opt = q.options.find(o => o.id === optionId);
      if (opt?.leadsTo) return getTypeById(opt.leadsTo);
    }
    return null;
  }

  // Get applicable optimizations for a DP type
  function getApplicableOptimizations(typeId) {
    const always = ['opt_rolling'];
    const byType = {
      dp_interval    : ['opt_knuth', 'opt_dc'],
      dp_1d          : ['opt_cht', 'opt_mono_deque', 'opt_dc'],
      dp_2d_seq      : ['opt_rolling'],
      dp_knapsack    : ['opt_rolling'],
      dp_state_machine: ['opt_rolling'],
      dp_grid        : ['opt_rolling'],
    };
    const specific = byType[typeId] ?? [];
    return [...new Set([...always, ...specific])]
      .map(id => OPTIMIZATIONS.find(o => o.id === id))
      .filter(Boolean);
  }

  // Quick summary for a determined DP type
  function buildTypeSummary(typeId) {
    const type = getTypeById(typeId);
    if (!type) return null;
    return {
      type,
      optimizations: getApplicableOptimizations(typeId),
      stateChecks  : STATE_CHECKS,
    };
  }

  return {
    getQuestions,
    getAllTypes,
    getTypeById,
    getTransitionPatterns,
    getOptimizations,
    getStateChecks,
    getTypeFromOption,
    getApplicableOptimizations,
    buildTypeSummary,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DPClassifier;
}