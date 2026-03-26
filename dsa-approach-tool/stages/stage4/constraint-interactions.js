// stages/stage4/constraint-interactions.js
// Constraint interaction patterns — how N, Q, K, and special flags combine
// Used by: stage4.js

const ConstraintInteractions = (() => {

  // ─── INTERACTION PATTERNS ─────────────────────────────────────────────────

  const INTERACTIONS = [
    {
      id          : 'ci_n_and_q',
      label       : 'N elements + Q queries',
      pattern     : 'N × Q',
      recognize   : [
        'Given N elements and Q queries on those elements',
        'Each query asks about a range, sum, max, or property of a subarray',
        'Q can be up to 10^5 — naive O(N) per query = O(NQ) TLE',
      ],
      analysis    : [
        { condition: 'Q = 1',              verdict: 'No preprocessing needed. O(N) direct solve.',           structure: null },
        { condition: 'Q ≤ 300, N ≤ 300',  verdict: 'O(N²Q) or O(NQ) — nested loops acceptable.',           structure: null },
        { condition: 'Static, no updates', verdict: 'Prefix Sum (range sum) or Sparse Table (range min/max)', structure: 'Prefix Sum / Sparse Table' },
        { condition: 'Updates + queries',  verdict: 'Segment Tree or Fenwick Tree — O(log N) each',          structure: 'Segment Tree / BIT' },
        { condition: 'Offline queries OK', verdict: "Mo's Algorithm — O((N+Q)√N) for range queries",         structure: "Mo's Algorithm" },
        { condition: 'Online — immediate', verdict: 'Cannot sort queries. Need persistent structure.',        structure: 'Segment Tree / Wavelet Tree' },
      ],
      complexity  : {
        naive     : 'O(N × Q)',
        optimized : 'O((N + Q) log N)',
        best      : 'O(N log N) build + O(log N) or O(1) per query',
      },
      watchOut    : [
        'Sparse Table answers range MIN/MAX in O(1) but cannot handle updates',
        'Prefix Sum handles range SUM in O(1) but cannot handle updates',
        'Segment Tree handles both updates and queries in O(log N)',
        "Mo's Algorithm requires offline queries — cannot answer online",
      ],
    },

    {
      id          : 'ci_n_and_k',
      label       : 'N elements + K constraint',
      pattern     : 'N × K',
      recognize   : [
        'At most K operations, selections, or jumps allowed',
        'Partition into exactly K groups',
        'K transactions, K colors, K distinct values',
        'DP state includes remaining K budget',
      ],
      analysis    : [
        { condition: 'K is small (K ≤ 10)',  verdict: 'Add K as DP dimension. O(NK) feasible.',              structure: 'DP with K dimension' },
        { condition: 'K ≈ N',                verdict: 'DP with K dimension may be O(N²) — verify.',         structure: 'DP possibly O(N²)' },
        { condition: 'K = 2 specifically',   verdict: 'Often simplifies to two passes or two pointers.',    structure: 'Two Pass / Two Pointer' },
        { condition: 'K is very large',      verdict: 'K constraint may be effectively unlimited — simplify.', structure: 'Check if K ≥ N/2' },
        { condition: 'Minimize K',           verdict: 'Greedy often works — minimize K directly.',           structure: 'Greedy' },
      ],
      complexity  : {
        naive     : 'O(N^K) in worst case',
        optimized : 'O(N × K) with DP',
        best      : 'O(N log N) if K constraint is loose',
      },
      watchOut    : [
        'K as DP dimension: dp[i][k] = answer at index i with k budget remaining',
        'If K is large and each unit of K costs 1 — check if greedy exhausts K optimally',
        'Stock trading with K transactions — classic O(NK) DP',
      ],
    },

    {
      id          : 'ci_n_and_w',
      label       : 'N items + Weight W capacity',
      pattern     : 'N × W',
      recognize   : [
        'Items with weights and values',
        'Total capacity or budget constraint W',
        'Maximize value subject to total weight ≤ W',
        'Knapsack-type problem',
      ],
      analysis    : [
        { condition: 'W ≤ 10^4',           verdict: 'Standard 0/1 Knapsack DP — O(NW) feasible.',          structure: '0/1 Knapsack' },
        { condition: 'W ≤ 10^6',           verdict: 'O(NW) is 10^7-10^8 — check constant factor.',         structure: '0/1 Knapsack with bitset' },
        { condition: 'W > 10^6',           verdict: 'O(NW) TLE. Consider meet-in-middle or approximation.', structure: 'Meet in Middle' },
        { condition: 'Items reusable',      verdict: 'Unbounded Knapsack — iterate W increasing.',           structure: 'Unbounded Knapsack' },
        { condition: 'Weights are small',   verdict: 'Group by weight — reduce item count.',                 structure: 'Grouped Knapsack' },
        { condition: 'N ≤ 40',             verdict: 'Meet in middle — split items, combine halves.',        structure: 'Meet in Middle' },
      ],
      complexity  : {
        naive     : 'O(2^N)',
        optimized : 'O(N × W)',
        best      : 'O(N × W) or O(2^(N/2)) for meet in middle',
      },
      watchOut    : [
        '0/1 knapsack: iterate W DECREASING (prevents reuse)',
        'Unbounded knapsack: iterate W INCREASING (allows reuse)',
        'Mixing iteration directions silently converts one into the other',
      ],
    },

    {
      id          : 'ci_small_n',
      label       : 'Very small N (N ≤ 20)',
      pattern     : 'Bitmask / Exponential',
      recognize   : [
        'N ≤ 20 explicitly in constraints',
        'Problem involves assigning or selecting from N items',
        'TSP-type, assignment-type problems',
      ],
      analysis    : [
        { condition: 'N ≤ 10',  verdict: 'O(N!) = 3.6M feasible. Even permutation enumeration OK.', structure: 'Backtracking / Permutations' },
        { condition: 'N ≤ 15',  verdict: 'O(2^N × N) = 500K. Bitmask DP comfortable.',             structure: 'Bitmask DP' },
        { condition: 'N ≤ 20',  verdict: 'O(2^N × N) = 20M. Bitmask DP feasible.',                 structure: 'Bitmask DP' },
        { condition: 'N ≤ 25',  verdict: 'O(2^N) = 33M. Tight — simple bitmask without N factor.', structure: 'Pure Bitmask' },
        { condition: 'N ≤ 40',  verdict: 'O(2^(N/2)) = 1M. Meet in middle required.',              structure: 'Meet in Middle' },
      ],
      complexity  : {
        naive     : 'O(N!) or O(2^N × N)',
        optimized : 'O(2^N × N) bitmask DP',
        best      : 'O(2^(N/2)) meet in middle for N ≤ 40',
      },
      watchOut    : [
        'N ≤ 20 is the signal for bitmask DP — do not miss it',
        '2^20 = 1,048,576 states × N transitions each',
        'For N = 25: 2^25 = 33M — only if each state is O(1) work',
      ],
    },

    {
      id          : 'ci_large_values',
      label       : 'Large values (values up to 10^9 or 10^18)',
      pattern     : 'Value compression or mathematical',
      recognize   : [
        'Values themselves are large but count of distinct values is small',
        'Cannot use value as array index',
        'Need data structure indexed by value',
        'Answer may require modular arithmetic',
      ],
      analysis    : [
        { condition: 'N distinct values, values up to 10^9', verdict: 'Coordinate compress to [0, N). BIT/Segment Tree on compressed.', structure: 'Coordinate Compression + BIT' },
        { condition: 'Values up to 10^18, need digit properties', verdict: 'Digit DP — process digit by digit.', structure: 'Digit DP' },
        { condition: 'Answer is exponentially large', verdict: 'Modular arithmetic — apply mod 10^9+7 at every step.', structure: 'Modular DP' },
        { condition: 'Linear recurrence, n up to 10^18', verdict: 'Matrix exponentiation — O(k³ log n).', structure: 'Matrix Exponentiation' },
      ],
      complexity  : {
        naive     : 'Impossible to index values directly',
        optimized : 'O(N log N) with coordinate compression',
        best      : 'O(log N) per query after preprocessing',
      },
      watchOut    : [
        'Never use value as direct array index if value up to 10^9',
        'Always apply mod BEFORE multiplying: (a * b) % MOD not a * b % MOD (may overflow)',
        'Digit DP: store N as string for digit access',
      ],
    },

    {
      id          : 'ci_graph_constraints',
      label       : 'Graph V + E constraints',
      pattern     : 'V/E determines algorithm',
      recognize   : [
        'Graph problem with explicit V and E bounds',
        'Algorithm choice depends on V vs E ratio',
        'Memory feasibility depends on V² for matrix',
      ],
      analysis    : [
        { condition: 'V ≤ 500',   verdict: 'Floyd-Warshall O(V³) = 125M — borderline feasible.',        structure: 'Floyd-Warshall or Dijkstra-array' },
        { condition: 'V ≤ 1000',  verdict: 'Dijkstra with array O(V²) = 1M — fine for dense.',          structure: 'Dijkstra (array)' },
        { condition: 'V ≤ 10^5',  verdict: 'Dijkstra with PQ O((V+E) log V) — standard.',               structure: 'Dijkstra (PQ)' },
        { condition: 'E ≈ V',     verdict: 'Sparse — adjacency list, PQ Dijkstra.',                     structure: 'Adjacency List' },
        { condition: 'E ≈ V²',    verdict: 'Dense — adjacency matrix acceptable if V ≤ 4000.',          structure: 'Adjacency Matrix' },
        { condition: 'E > 4×10^5',verdict: 'Heavy graph — watch memory with adjacency list.',           structure: 'Compact adjacency list' },
      ],
      complexity  : {
        naive     : 'O(V²) Dijkstra with array',
        optimized : 'O((V+E) log V) Dijkstra with PQ',
        best      : 'O(V+E) BFS for unweighted',
      },
      watchOut    : [
        'Adjacency matrix for V=10^5 = 40GB — physically impossible',
        'Floyd-Warshall for V=1000 = 10⁹ ops — TLE',
        'Always check V and E bounds before choosing representation',
      ],
    },

    {
      id          : 'ci_string_constraints',
      label       : 'String length + pattern count',
      pattern     : 'Text × Patterns',
      recognize   : [
        'Text of length N, pattern of length M',
        'Multiple patterns to search for',
        'Substring or subsequence queries',
      ],
      analysis    : [
        { condition: 'Single pattern, exact match',     verdict: 'KMP or Z-algorithm — O(N+M).',                          structure: 'KMP / Z-algorithm' },
        { condition: 'Multiple patterns',               verdict: 'Aho-Corasick automaton — O(N + total pattern length).', structure: 'Aho-Corasick' },
        { condition: 'Substring queries on same string',verdict: 'Suffix Array + LCP — O(N log N) build, O(log N) query.',structure: 'Suffix Array' },
        { condition: 'Prefix queries / autocomplete',   verdict: 'Trie — O(M) insert and search per pattern.',            structure: 'Trie' },
        { condition: 'Palindrome queries',              verdict: 'Manacher\'s — O(N) all palindromes.',                   structure: "Manacher's" },
      ],
      complexity  : {
        naive     : 'O(N × M) per pattern search',
        optimized : 'O(N + M) with KMP',
        best      : 'O(N + total) with Aho-Corasick for multiple patterns',
      },
      watchOut    : [
        'Never use naive O(NM) for N=M=10^5 — 10^10 ops',
        'Aho-Corasick for multiple patterns, not repeated KMP',
        'Suffix array for substring queries, not rebuilding every time',
      ],
    },

    {
      id          : 'ci_tree_constraints',
      label       : 'Tree N + query type',
      pattern     : 'Tree N × Q',
      recognize   : [
        'Tree with N nodes',
        'Q queries about paths, subtrees, or ancestors',
        'Updates on nodes or edges',
      ],
      analysis    : [
        { condition: 'Subtree sum queries, static',       verdict: 'Euler Tour + BIT — O(N log N) build, O(log N) query.',    structure: 'Euler Tour + BIT' },
        { condition: 'Path queries (u to v)',             verdict: 'HLD (Heavy-Light Decomposition) — O(log² N) per query.',  structure: 'HLD + Segment Tree' },
        { condition: 'LCA queries, Q ≤ 10^5',            verdict: 'Binary Lifting — O(N log N) build, O(log N) per query.',  structure: 'Binary Lifting' },
        { condition: 'LCA queries, Q ≤ 10^6',            verdict: 'Euler Tour + Sparse Table RMQ — O(1) per query.',         structure: 'Euler Tour + Sparse Table' },
        { condition: 'Dynamic tree (edges change)',       verdict: 'Link-Cut Tree — O(log N) per operation.',                 structure: 'Link-Cut Tree' },
      ],
      complexity  : {
        naive     : 'O(N) per query via DFS',
        optimized : 'O(log N) per query with preprocessing',
        best      : 'O(1) per LCA query with Euler Tour + Sparse Table',
      },
      watchOut    : [
        'HLD for path queries, not just LCA',
        'Binary Lifting requires fixed root — establish before preprocessing',
        'Euler Tour: subtree of v = range [tin[v], tout[v]]',
      ],
    },
  ];

  // ─── HIDDEN STRUCTURE DETECTION ───────────────────────────────────────────
  // After constraint interaction — check if a hidden structure was missed

  const HIDDEN_STRUCTURES = [
    {
      id       : 'hs_monotonic_stack',
      label    : 'Monotonic Stack',
      signal   : 'Need next greater / previous smaller element for each position',
      examples : [
        'Next Greater Element — O(n) with monotonic stack not O(n²)',
        'Largest rectangle in histogram',
        'Daily temperatures',
      ],
      complexity: 'O(n) instead of O(n²)',
    },
    {
      id       : 'hs_prefix_sum',
      label    : 'Prefix Sum',
      signal   : 'Repeated range sum queries on static array',
      examples : [
        'Range sum query — O(1) with prefix sum not O(n)',
        'Number of subarrays with sum = k — prefix sum + HashMap',
        '2D range sum — 2D prefix sum',
      ],
      complexity: 'O(1) query after O(n) build',
    },
    {
      id       : 'hs_two_pointer',
      label    : 'Two Pointer',
      signal   : 'Looking for pairs satisfying a monotone condition on sorted array',
      examples : [
        'Two sum on sorted array — O(n) not O(n²)',
        'Minimum window satisfying condition — sliding window',
        'Count pairs with sum in range',
      ],
      complexity: 'O(n) instead of O(n²)',
    },
    {
      id       : 'hs_union_find',
      label    : 'Union Find',
      signal   : 'Dynamic connectivity — groups merging over time',
      examples : [
        'Accounts merge — union emails sharing accounts',
        'Number of provinces — connected components with merges',
        'Redundant connection — detect cycle during construction',
      ],
      complexity: 'O(α(n)) per operation',
    },
    {
      id       : 'hs_segment_tree',
      label    : 'Segment Tree',
      signal   : 'Range queries AND point/range updates on array',
      examples : [
        'Range max with point updates — O(log n) each',
        'Range sum with range updates — lazy propagation',
        'Count elements in range satisfying condition',
      ],
      complexity: 'O(log n) per operation',
    },
    {
      id       : 'hs_trie',
      label    : 'Trie',
      signal   : 'Multiple strings sharing prefixes, XOR maximization',
      examples : [
        'Longest common prefix — O(total chars) not O(n²)',
        'Maximum XOR of two numbers — binary trie',
        'Word search / autocomplete',
      ],
      complexity: 'O(L) per insert/search where L = string length',
    },
  ];

  // ─── CONSTRAINT COMBINATION WARNINGS ─────────────────────────────────────

  const COMBINATION_WARNINGS = [
    {
      id      : 'cw_nq_too_slow',
      check   : (n, q) => n > 1000 && q > 1000,
      warning : 'N > 1000 and Q > 1000: O(NQ) = 10⁶ at minimum. Need O(log N) per query.',
    },
    {
      id      : 'cw_n2_too_slow',
      check   : (n) => n > 10000,
      warning : 'N > 10,000: O(N²) = 10⁸ — borderline TLE. Aim for O(N log N).',
    },
    {
      id      : 'cw_bitmask_too_large',
      check   : (n) => n > 20 && n <= 40,
      warning : 'N > 20: standard Bitmask DP is TLE. Use Meet in Middle.',
    },
    {
      id      : 'cw_floyd_too_large',
      check   : (v) => v > 500,
      warning : 'V > 500: Floyd-Warshall O(V³) will TLE. Use Dijkstra from each source.',
    },
    {
      id      : 'cw_adj_matrix_too_large',
      check   : (v) => v > 4000,
      warning : 'V > 4000: adjacency matrix exceeds 256MB. Use adjacency list.',
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAll()               { return [...INTERACTIONS]; }
  function getById(id)            { return INTERACTIONS.find(i => i.id === id) ?? null; }
  function getHiddenStructures()  { return [...HIDDEN_STRUCTURES]; }
  function getCombinationWarnings(){ return [...COMBINATION_WARNINGS]; }

  // Get interactions relevant to current answers
  function getRelevant(stage0Answers, stage1Answers) {
    const n = stage0Answers?.n ?? 0;
    const q = stage0Answers?.q ?? 0;
    const inputTypes = stage1Answers?.inputTypes ?? [];
    const queryType  = stage1Answers?.queryType  ?? 'none';
    const relevant   = [];

    if (q > 1 && queryType !== 'none') {
      relevant.push(getById('ci_n_and_q'));
    }
    if (n <= 40) {
      relevant.push(getById('ci_small_n'));
    }
    if (inputTypes.some(t => ['graph_edge_list','graph_adjacency','implicit_graph'].includes(t))) {
      relevant.push(getById('ci_graph_constraints'));
    }
    if (inputTypes.some(t => ['single_string','two_strings','multiple_strings'].includes(t))) {
      relevant.push(getById('ci_string_constraints'));
    }
    if (inputTypes.includes('tree_explicit')) {
      relevant.push(getById('ci_tree_constraints'));
    }
    // Always include large values and N+K
    relevant.push(getById('ci_large_values'));
    relevant.push(getById('ci_n_and_k'));

    const seen = new Set();
    return relevant.filter(i => {
      if (!i || seen.has(i.id)) return false;
      seen.add(i.id); return true;
    });
  }

  // Get active warnings given N, Q, V
  function getActiveWarnings(n, q, v) {
    return COMBINATION_WARNINGS.filter(w => {
      try {
        return w.check(n, q, v);
      } catch { return false; }
    });
  }

  // Get verdict for a specific interaction and conditions
  function getVerdict(interactionId, conditions = {}) {
    const interaction = getById(interactionId);
    if (!interaction) return null;

    return interaction.analysis.find(a => {
      const cond = a.condition.toLowerCase();
      if (conditions.hasUpdates && cond.includes('updates')) return true;
      if (conditions.offline    && cond.includes('offline')) return true;
      if (conditions.online     && cond.includes('online'))  return true;
      if (conditions.singleQuery && cond.includes('q = 1'))  return true;
      return false;
    }) ?? interaction.analysis[0];
  }

  return {
    getAll,
    getById,
    getHiddenStructures,
    getCombinationWarnings,
    getRelevant,
    getActiveWarnings,
    getVerdict,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConstraintInteractions;
}