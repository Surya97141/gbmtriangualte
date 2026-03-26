// stages/stage3/dp-subclassifier/state-index-types.js
// Detailed state index type definitions and recognition patterns
// Used by: dp-classifier.js, stage3.js

const StateIndexTypes = (() => {

  // ─── STATE INDEX TYPE REGISTRY ─────────────────────────────────────────────

  const TYPES = [
    {
      id           : 'sit_single_index',
      label        : 'Single index — i',
      shortLabel   : 'dp[i]',
      category     : 'sequence',
      recognize    : [
        'Single array or string input',
        'Answer for prefix ending at position i',
        'No interaction between two sequences',
        'Problem says "ending at", "including", "up to" index i',
      ],
      stateTemplate: 'dp[i] = [optimal answer] for [prefix/suffix] ending at/by index i',
      examples     : [
        {
          problem   : 'Maximum subarray sum',
          state     : 'dp[i] = maximum sum of subarray ending exactly at index i',
          transition: 'dp[i] = max(a[i], dp[i-1] + a[i])',
          base      : 'dp[0] = a[0]',
        },
        {
          problem   : 'Longest increasing subsequence',
          state     : 'dp[i] = length of LIS ending at index i',
          transition: 'dp[i] = 1 + max(dp[j]) for all j < i where a[j] < a[i]',
          base      : 'dp[i] = 1 for all i (each element alone)',
        },
        {
          problem   : 'Minimum cost to reach index i',
          state     : 'dp[i] = minimum cost to reach index i',
          transition: 'dp[i] = min(dp[i-1], dp[i-2]) + cost[i]',
          base      : 'dp[0] = cost[0], dp[1] = min(cost[0], cost[1])',
        },
      ],
      commonMistakes: [
        'Confusing "ending at i" vs "ending by i" — different base cases',
        'Forgetting that dp[i] may not include element i in some formulations',
        'Not handling the case where taking element i alone is valid',
      ],
      spaceNote    : 'Usually O(n) → O(1) if only dp[i-1] needed',
    },
    {
      id           : 'sit_two_indices',
      label        : 'Two indices — i, j',
      shortLabel   : 'dp[i][j]',
      category     : 'two_sequence',
      recognize    : [
        'Two string or array inputs',
        'Problem involves matching, aligning, or comparing two sequences',
        'Edit distance, LCS, alignment problems',
        'Answer depends on prefix of s1 AND prefix of s2 simultaneously',
      ],
      stateTemplate: 'dp[i][j] = [optimal answer] considering s1[0..i-1] and s2[0..j-1]',
      examples     : [
        {
          problem   : 'Edit distance',
          state     : 'dp[i][j] = min edits to convert s1[0..i-1] to s2[0..j-1]',
          transition: 'if s1[i-1]==s2[j-1]: dp[i][j] = dp[i-1][j-1], else min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1',
          base      : 'dp[0][j] = j (delete all of s2 prefix), dp[i][0] = i',
        },
        {
          problem   : 'Longest Common Subsequence',
          state     : 'dp[i][j] = length of LCS of s1[0..i-1] and s2[0..j-1]',
          transition: 'if s1[i-1]==s2[j-1]: dp[i-1][j-1]+1, else max(dp[i-1][j], dp[i][j-1])',
          base      : 'dp[0][j] = 0, dp[i][0] = 0',
        },
      ],
      commonMistakes: [
        'At n=m=10^4, full table is 400MB — always apply rolling row',
        '1-indexed vs 0-indexed state definition — be consistent',
        'Wrong base case — dp[i][0] and dp[0][j] are often different from 0',
      ],
      spaceNote    : 'O(nm) → O(m) with rolling row (cannot reconstruct path with rolling)',
    },
    {
      id           : 'sit_range',
      label        : 'Range — i to j',
      shortLabel   : 'dp[i][j]',
      category     : 'interval',
      recognize    : [
        'Single sequence but answer involves a range within it',
        'Optimal way to split or combine elements in a range',
        'Problem involves palindromes, optimal parenthesization, stone merging',
        '"For every subarray/substring from i to j" pattern',
      ],
      stateTemplate: 'dp[i][j] = [optimal answer] for elements from index i to j inclusive',
      fillOrderNote: 'CRITICAL: fill by increasing interval length, NOT by row',
      fillOrderCode: `for (int len = 1; len <= n; len++) {
  for (int i = 0; i + len - 1 < n; i++) {
    int j = i + len - 1;
    // compute dp[i][j]
  }
}`,
      examples     : [
        {
          problem   : 'Matrix chain multiplication',
          state     : 'dp[i][j] = minimum multiplications to compute matrices i through j',
          transition: 'dp[i][j] = min over k in [i,j-1] of dp[i][k] + dp[k+1][j] + dims[i]*dims[k+1]*dims[j+1]',
          base      : 'dp[i][i] = 0 (single matrix needs no multiplication)',
        },
        {
          problem   : 'Longest palindromic subsequence',
          state     : 'dp[i][j] = length of LPS within s[i..j]',
          transition: 'if s[i]==s[j]: dp[i+1][j-1]+2, else max(dp[i+1][j], dp[i][j-1])',
          base      : 'dp[i][i] = 1 (single character is palindrome)',
        },
        {
          problem   : 'Burst balloons',
          state     : 'dp[i][j] = max coins from bursting all balloons strictly between i and j',
          transition: 'dp[i][j] = max over k in (i,j) of dp[i][k] + dp[k][j] + nums[i]*nums[k]*nums[j]',
          base      : 'dp[i][i+1] = 0 (no balloons between adjacent indices)',
        },
      ],
      commonMistakes: [
        'MOST COMMON: filling by row instead of by length → accessing uncomputed dp[i+1][j-1]',
        'Off-by-one in range boundaries — is range inclusive or exclusive?',
        'Confusing open vs closed interval formulations (especially Burst Balloons uses open intervals)',
      ],
      spaceNote    : 'O(n²) always — cannot reduce without losing ability to compute transitions',
    },
    {
      id           : 'sit_subset',
      label        : 'Subset — bitmask',
      shortLabel   : 'dp[mask]',
      category     : 'bitmask',
      recognize    : [
        'n is small (n ≤ 20)',
        'Problem involves assigning each of n items exactly once',
        'Need to track which items have been used so far',
        'TSP-type, assignment problems, minimum cost to cover all items',
      ],
      stateTemplate: 'dp[mask] or dp[mask][i] = [optimal] for subset represented by mask (ending at item i)',
      bitTricks    : [
        'Check if bit i is set: (mask >> i) & 1',
        'Set bit i: mask | (1 << i)',
        'Clear bit i: mask & ~(1 << i)',
        'Iterate over all submasks: for(sub=mask; sub>0; sub=(sub-1)&mask)',
        'Number of bits set: __builtin_popcount(mask)',
        'Iterate over all masks: for(mask=0; mask<(1<<n); mask++)',
      ],
      examples     : [
        {
          problem   : 'Travelling Salesman Problem',
          state     : 'dp[mask][i] = min cost to visit cities in mask, ending at city i',
          transition: 'dp[mask|(1<<j)][j] = min(dp[mask|(1<<j)][j], dp[mask][i] + dist[i][j])',
          base      : 'dp[1<<start][start] = 0',
        },
        {
          problem   : 'Minimum cost to assign tasks',
          state     : 'dp[mask] = min cost to assign tasks in mask to first popcount(mask) workers',
          transition: 'dp[mask] = min over all i in mask of dp[mask^(1<<i)] + cost[popcount(mask)-1][i]',
          base      : 'dp[0] = 0',
        },
        {
          problem   : 'Partition into k equal subsets',
          state     : 'dp[mask] = can we partition elements in mask into complete groups?',
          transition: 'Fill groups greedily, use mask to track remaining elements',
          base      : 'dp[0] = true',
        },
      ],
      commonMistakes: [
        'Using for n > 20 — 2^25 = 33M states, may TLE',
        'Integer overflow when (1 << n) for n = 32 on 32-bit int — use 1LL << n',
        'Off-by-one in worker/item assignment mapping',
      ],
      spaceNote    : 'O(2^n × n) — irreducible',
    },
    {
      id           : 'sit_tree_node',
      label        : 'Tree node',
      shortLabel   : 'dp[node]',
      category     : 'tree',
      recognize    : [
        'Input is explicitly a tree',
        'Answer for a node depends on answers for its children',
        'Problem involves subtree properties',
        'Need to combine answers from all children at each node',
      ],
      stateTemplate: 'dp[node] or dp[node][state] = [optimal] for subtree rooted at node',
      traversalNote: 'Always post-order DFS — children fully computed before parent',
      rerootingNote: 'If any node can be root — use rerooting technique (two DFS passes)',
      examples     : [
        {
          problem   : 'Maximum independent set on tree',
          state     : 'dp[node][0] = MIS size in subtree not including node, dp[node][1] = including node',
          transition: 'dp[node][0] = sum over children c of max(dp[c][0], dp[c][1]). dp[node][1] = 1 + sum of dp[c][0]',
          base      : 'dp[leaf][0] = 0, dp[leaf][1] = 1',
        },
        {
          problem   : 'Diameter of tree',
          state     : 'dp[node] = length of longest path going DOWN from node',
          transition: 'At each node, combine two longest child paths for global answer. dp[node] = 1 + max child dp',
          base      : 'dp[leaf] = 0',
        },
        {
          problem   : 'Sum of distances to all nodes',
          state     : 'dp[node] = sum of distances from node to all nodes in its subtree',
          transition: 'dp[node] = sum over children c of dp[c] + size[c]',
          base      : 'dp[leaf] = 0, size[leaf] = 1',
        },
      ],
      commonMistakes: [
        'Recursive DFS on n=10^5 with skewed tree → stack overflow → use iterative',
        'Forgetting to handle paths that go THROUGH the current node (not just down)',
        'Confusing subtree dp with global answer — update global separately at each node',
      ],
      spaceNote    : 'O(n) — one value per node',
    },
    {
      id           : 'sit_digit',
      label        : 'Digit position',
      shortLabel   : 'dp[pos][tight][state]',
      category     : 'digit',
      recognize    : [
        'Count numbers in range [0, N] satisfying a property',
        'N can be very large — up to 10^18',
        'Property depends on individual digits not magnitude',
        'Digit sum, digit count, digit pattern constraints',
      ],
      stateTemplate: 'dp[pos][tight][accumulated_state] = count of valid completions from position pos',
      tightExplained: 'tight=true: digits chosen so far equal N\'s prefix, next digit ≤ N[pos]. tight=false: free to use 0-9',
      examples     : [
        {
          problem   : 'Count numbers with digit sum = k up to N',
          state     : 'dp[pos][tight][sum_so_far]',
          transition: 'For each digit d: recurse(pos+1, tight && d==N[pos], sum+d)',
          base      : 'pos == len: return sum == k ? 1 : 0',
        },
        {
          problem   : 'Count numbers with no two adjacent equal digits',
          state     : 'dp[pos][tight][last_digit]',
          transition: 'For each digit d ≠ last_digit: recurse(pos+1, tight && d==N[pos], d)',
          base      : 'pos == len: return 1',
        },
      ],
      commonMistakes: [
        'Not passing tight flag correctly — if current digit < N[pos], tight must become false',
        'Leading zeros: need separate flag is_leading to handle numbers shorter than N',
        'Storing N as integer — access digits by converting to string first',
      ],
      spaceNote    : 'O(log(N) × 2 × state_space) — memoize with map or array',
    },
    {
      id           : 'sit_capacity',
      label        : 'Position + capacity',
      shortLabel   : 'dp[i][w]',
      category     : 'knapsack',
      recognize    : [
        'Items with weights and values',
        'Fixed capacity or budget constraint',
        'Binary choice per item (0/1) or unlimited reuse',
        'Maximize value subject to weight constraint',
      ],
      stateTemplate: 'dp[i][w] = max value using items from [0..i] with remaining capacity w',
      criticalNote : '0/1 knapsack: iterate w DECREASING. Unbounded: iterate w INCREASING. Mixing these is the #1 knapsack bug.',
      iterationCode: {
        zero_one  : `// 0/1 knapsack — each item used at most once
for (int i = 0; i < n; i++)
  for (int w = W; w >= weight[i]; w--)  // DECREASING
    dp[w] = max(dp[w], dp[w-weight[i]] + val[i]);`,
        unbounded : `// Unbounded knapsack — items reusable
for (int i = 0; i < n; i++)
  for (int w = weight[i]; w <= W; w++)  // INCREASING
    dp[w] = max(dp[w], dp[w-weight[i]] + val[i]);`,
      },
      examples     : [
        {
          problem   : '0/1 Knapsack',
          state     : 'dp[w] = max value with capacity w (1D optimized)',
          transition: 'dp[w] = max(dp[w], dp[w-weight[i]] + val[i]) — iterate w DECREASING',
          base      : 'dp[0] = 0, dp[w] = 0 for all w',
        },
        {
          problem   : 'Coin change (minimum coins)',
          state     : 'dp[amount] = min coins to make amount',
          transition: 'dp[amount] = 1 + min(dp[amount - coin]) for all valid coins — INCREASING',
          base      : 'dp[0] = 0, dp[amount] = INF for amount > 0',
        },
        {
          problem   : 'Partition equal subset sum',
          state     : 'dp[sum] = can we achieve exactly sum using some subset',
          transition: 'dp[sum] = dp[sum] || dp[sum - num] — DECREASING order (0/1)',
          base      : 'dp[0] = true',
        },
      ],
      commonMistakes: [
        'Wrong iteration direction — DECREASING for 0/1, INCREASING for unbounded',
        'Not checking dp[amount] != INF before using it',
        'Integer overflow when W × n is large',
      ],
      spaceNote    : 'O(nW) → O(W) with 1D array',
    },
    {
      id           : 'sit_mode',
      label        : 'Position + mode',
      shortLabel   : 'dp[i][state]',
      category     : 'state_machine',
      recognize    : [
        'Problem has distinct phases or modes',
        'Can transition between modes at each step',
        'Stock trading problems (holding / not holding)',
        'Limited number of operations remaining',
        'Cooldown constraints between actions',
      ],
      stateTemplate: 'dp[i][mode] = [optimal] at position i while being in mode',
      diagramNote  : 'Draw state transition diagram BEFORE coding — label each transition with its condition',
      examples     : [
        {
          problem   : 'Stock trading with cooldown',
          states    : ['HOLD (holding stock)', 'EMPTY (no stock, can buy)', 'COOL (cooldown)'],
          transitions: [
            'HOLD → HOLD (do nothing)',
            'HOLD → COOL (sell)',
            'EMPTY → EMPTY (do nothing)',
            'EMPTY → HOLD (buy)',
            'COOL → EMPTY (wait out cooldown)',
          ],
          base      : 'dp[0][HOLD] = -price[0], dp[0][EMPTY] = 0, dp[0][COOL] = -INF',
        },
        {
          problem   : 'Stock with at most k transactions',
          states    : ['(transactions_done, holding)'],
          transitions: 'Buy: transactions stays same, holding becomes true. Sell: transactions+1, holding false',
          base      : 'dp[0][0][false] = 0, dp[0][0][true] = -price[0]',
        },
      ],
      commonMistakes: [
        'Missing a valid transition in state diagram — causes wrong answer with no obvious error',
        'Invalid initial states should be set to -INF (max) or INF (min) — not 0',
        'Confusing when transaction count increments (usually on sell, not buy)',
      ],
      spaceNote    : 'O(n × states) → O(states) with rolling',
    },
    {
      id           : 'sit_grid',
      label        : 'Grid cell (r, c)',
      shortLabel   : 'dp[r][c]',
      category     : 'grid',
      recognize    : [
        '2D grid or matrix input',
        'Movement restricted to right and down (or similar one-directional)',
        'Counting paths or finding optimal path',
        'No backtracking — movement is strictly one-directional',
      ],
      stateTemplate: 'dp[r][c] = [optimal] to reach or at cell (r, c)',
      movementNote : 'Grid DP requires movement in limited directions. All-4-directions → BFS not DP.',
      examples     : [
        {
          problem   : 'Unique paths (right/down only)',
          state     : 'dp[r][c] = number of paths from (0,0) to (r,c)',
          transition: 'dp[r][c] = dp[r-1][c] + dp[r][c-1]',
          base      : 'dp[0][c] = 1 for all c (top row), dp[r][0] = 1 for all r (left col)',
        },
        {
          problem   : 'Minimum path sum',
          state     : 'dp[r][c] = minimum sum path from (0,0) to (r,c)',
          transition: 'dp[r][c] = min(dp[r-1][c], dp[r][c-1]) + grid[r][c]',
          base      : 'dp[0][0] = grid[0][0], first row/col are cumulative sums',
        },
        {
          problem   : 'Maximal square of 1s',
          state     : 'dp[r][c] = side length of largest square with bottom-right corner at (r,c)',
          transition: 'dp[r][c] = min(dp[r-1][c], dp[r][c-1], dp[r-1][c-1]) + 1 if grid[r][c]==1',
          base      : 'dp[r][c] = grid[r][c] for first row and column',
        },
      ],
      commonMistakes: [
        'Using grid DP when movement is in all 4 directions — must use BFS',
        'Wrong base case for first row and column — they need cumulative computation',
        'Obstacles not handled — dp[r][c] = 0 if grid[r][c] is blocked',
      ],
      spaceNote    : 'O(nm) → O(m) with rolling row',
    },
  ];

  // ─── RECOGNITION HELPERS ──────────────────────────────────────────────────

  // Keywords that suggest each state type
  const RECOGNITION_KEYWORDS = {
    sit_single_index : ['ending at', 'up to index', 'prefix ending', 'subarray ending at'],
    sit_two_indices  : ['two strings', 'two sequences', 'match', 'align', 'edit distance', 'LCS'],
    sit_range        : ['subarray from i to j', 'substring from i to j', 'interval', 'merge', 'palindrome in range'],
    sit_subset       : ['assign', 'all items', 'visit all', 'cover all', 'subset', 'TSP'],
    sit_tree_node    : ['subtree', 'rooted at', 'children', 'parent', 'tree structure'],
    sit_digit        : ['count numbers', 'up to N', 'digit sum', 'digit property', 'N up to 10^18'],
    sit_capacity     : ['weight limit', 'capacity', 'budget', 'at most W', 'knapsack', 'coin'],
    sit_mode         : ['at most k', 'cooldown', 'holding', 'transaction', 'phase', 'mode'],
    sit_grid         : ['grid', 'matrix', 'right and down', 'path in grid', 'rows and columns'],
  };

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAll()            { return [...TYPES]; }
  function getById(id)         { return TYPES.find(t => t.id === id) ?? null; }
  function getByCategory(cat)  { return TYPES.filter(t => t.category === cat); }
  function getKeywords()       { return { ...RECOGNITION_KEYWORDS }; }

  // Get type that best matches given keywords
  function matchFromKeywords(text) {
    const lower = text.toLowerCase();
    let bestMatch = null;
    let bestCount = 0;

    Object.entries(RECOGNITION_KEYWORDS).forEach(([typeId, keywords]) => {
      const count = keywords.filter(kw => lower.includes(kw)).length;
      if (count > bestCount) {
        bestCount = count;
        bestMatch = typeId;
      }
    });

    return bestMatch ? getById(bestMatch) : null;
  }

  // Get example problems for a type
  function getExamples(typeId) {
    const t = getById(typeId);
    return t?.examples ?? [];
  }

  // Get common mistakes for a type
  function getMistakes(typeId) {
    const t = getById(typeId);
    return t?.commonMistakes ?? [];
  }

  // Build state definition prompt for the user
  function buildStatePrompt(typeId) {
    const t = getById(typeId);
    if (!t) return null;
    return {
      template : t.stateTemplate,
      fillIn   : `dp[${t.shortLabel}] = _____ for _____`,
      examples : t.examples.map(e => ({
        problem: e.problem,
        state  : e.state,
      })),
    };
  }

  return {
    getAll,
    getById,
    getByCategory,
    getKeywords,
    matchFromKeywords,
    getExamples,
    getMistakes,
    buildStatePrompt,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateIndexTypes;
}