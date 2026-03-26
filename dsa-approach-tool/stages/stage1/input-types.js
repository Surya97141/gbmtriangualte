// stages/stage1/input-types.js
// All input shape definitions, secondary signals, query type options
// Used by: stage1.js

const InputTypes = (() => {

  // ─── PRIMARY INPUT SHAPES ──────────────────────────────────────────────────

  const PRIMARY = [
    {
      id          : 'single_array',
      label       : 'Single array',
      sublabel    : 'One sequence of values',
      icon        : '▤',
      examples    : ['nums = [1,3,2,5,4]', 'heights = [2,1,5,6,2,3]'],
      opens       : ['Two Pointer', 'Sliding Window', 'Prefix Sum', 'Sorting', 'DP 1D'],
      watchOut    : 'Check if order matters before sorting',
    },
    {
      id          : 'two_arrays',
      label       : 'Two arrays',
      sublabel    : 'Two sequences — merge, compare, combine',
      icon        : '▤▤',
      examples    : ['nums1, nums2', 'words1, words2'],
      opens       : ['Two Pointer (merge)', 'Binary Search (on one)', '2D DP'],
      watchOut    : 'Are both sorted? Does relative order matter?',
    },
    {
      id          : 'single_string',
      label       : 'Single string',
      sublabel    : 'One character sequence',
      icon        : '"..."',
      examples    : ['s = "abcabc"', 'word = "leetcode"'],
      opens       : ['Sliding Window', 'KMP / Z-Algorithm', 'DP on string', 'Hashing'],
      watchOut    : 'Substring vs subsequence — contiguous or not?',
    },
    {
      id          : 'two_strings',
      label       : 'Two strings',
      sublabel    : 'Compare, align, or transform',
      icon        : '"s1" "s2"',
      examples    : ['s = "horse", t = "ros"', 'text, pattern'],
      opens       : ['2D DP (LCS, Edit Distance)', 'KMP', 'Hashing'],
      watchOut    : 'Edit distance is 2D DP. Pattern matching is KMP.',
    },
    {
      id          : 'multiple_strings',
      label       : 'Multiple strings / word list',
      sublabel    : 'Array of strings — search or match',
      icon        : '["...","..."]',
      examples    : ['words = ["cat","cats","dog"]', 'dictionary = [...]'],
      opens       : ['Trie', 'Aho-Corasick', 'Hashing', 'Sorting by length'],
      watchOut    : 'Multiple pattern search — Aho-Corasick not multiple KMP',
    },
    {
      id          : 'matrix_grid',
      label       : 'Matrix / Grid',
      sublabel    : '2D array — cells, rows, columns',
      icon        : '⊞',
      examples    : ['grid[n][m]', 'board[rows][cols]'],
      opens       : ['BFS / DFS', '2D DP', '2D Prefix Sum', 'Union Find'],
      watchOut    : 'Movement in all 4 directions → BFS. One direction only → 2D DP.',
    },
    {
      id          : 'graph_edge_list',
      label       : 'Graph — edge list',
      sublabel    : 'Explicit edges given as pairs',
      icon        : '◉—◉',
      examples    : ['edges = [[0,1],[1,2]]', 'connections = [[a,b,cost]]'],
      opens       : ['BFS', 'DFS', 'Dijkstra', 'MST', 'Union Find', 'Topo Sort'],
      watchOut    : 'Weighted or unweighted? Directed or undirected?',
    },
    {
      id          : 'graph_adjacency',
      label       : 'Graph — adjacency list / matrix',
      sublabel    : 'Neighbors given directly',
      icon        : '◉→◉',
      examples    : ['graph[i] = [neighbors]', 'adj[u][v] = weight'],
      opens       : ['BFS', 'DFS', 'Dijkstra', 'Floyd-Warshall (matrix only)'],
      watchOut    : 'Adjacency matrix for n > 4000 is 40GB — use list',
    },
    {
      id          : 'implicit_graph',
      label       : 'Implicit graph',
      sublabel    : 'Graph defined by a rule — not stored',
      icon        : '◎ ⟿ ◎',
      examples    : ['grid cells connected by movement', 'words connected by one edit'],
      opens       : ['BFS on states', 'DFS', 'BFS shortest path'],
      watchOut    : 'Generate neighbors on the fly — do NOT build explicit adjacency list',
    },
    {
      id          : 'tree_explicit',
      label       : 'Tree — explicit',
      sublabel    : 'Given as root node or parent array',
      icon        : '⬡',
      examples    : ['root = TreeNode(1)', 'parent[i] = parent of node i'],
      opens       : ['Tree DP', 'DFS post-order', 'LCA', 'Euler Tour'],
      watchOut    : 'Recursive DFS on skewed tree n=10^5 → stack overflow. Use iterative.',
    },
    {
      id          : 'intervals',
      label       : 'Intervals / ranges',
      sublabel    : 'Start and end pairs',
      icon        : '[——]',
      examples    : ['intervals = [[1,3],[2,6],[8,10]]', 'meetings = [[s,e]]'],
      opens       : ['Sort + Greedy', 'Line Sweep', 'Priority Queue', 'Difference Array'],
      watchOut    : 'Sort by start time first. Check if touching endpoints count as overlap.',
    },
    {
      id          : 'single_number',
      label       : 'Single number',
      sublabel    : 'One integer — large or small',
      icon        : '42',
      examples    : ['n = 12', 'num = 1234567890'],
      opens       : ['Math / Number Theory', 'Digit DP (if n up to 10^18)', 'Binary Search'],
      watchOut    : 'If n up to 10^18 and property depends on digits → Digit DP',
    },
    {
      id          : 'multiple_numbers',
      label       : 'Multiple independent numbers',
      sublabel    : 'Not a sequence — separate values',
      icon        : 'a b c',
      examples    : ['a = 3, b = 5, k = 2', 'n, m, q given separately'],
      opens       : ['Math', 'GCD / LCM', 'Modular Arithmetic'],
      watchOut    : 'Check for overflow when multiplying large values',
    },
  ];

  // ─── SECONDARY SIGNALS ─────────────────────────────────────────────────────
  // Additional properties of the input that refine the approach

  const SECONDARY = [
    {
      id         : 'sig_sorted',
      label      : 'Input is already sorted',
      category   : 'ordering',
      implication: 'Binary Search and Two Pointer become directly applicable',
      opens      : ['Binary Search', 'Two Pointer'],
    },
    {
      id         : 'sig_bounded_values',
      label      : 'Values are in a small range (0–26, 0–9, 0–1)',
      category   : 'values',
      implication: 'Use direct array indexing instead of HashMap. Frequency arrays over HashMaps.',
      opens      : ['Counting Sort', 'Direct frequency array', 'Bit manipulation'],
    },
    {
      id         : 'sig_duplicates',
      label      : 'Input contains duplicates',
      category   : 'values',
      implication: 'Two pointer needs careful handling at equal values',
      opens      : [],
      watchOut   : 'Strict vs non-strict comparisons. Binary search boundary handling.',
    },
    {
      id         : 'sig_all_distinct',
      label      : 'All values are distinct',
      category   : 'values',
      implication: 'Permutation-style reasoning possible. No duplicate handling needed.',
      opens      : [],
    },
    {
      id         : 'sig_non_negative',
      label      : 'All values are non-negative',
      category   : 'values',
      implication: 'Sliding window sum is monotonically increasing — window technique valid',
      opens      : ['Sliding Window (sum constraint)'],
    },
    {
      id         : 'sig_negative_possible',
      label      : 'Values can be negative',
      category   : 'values',
      implication: 'Sliding window sum no longer monotonic. Prefix sum + HashMap needed.',
      opens      : ['Prefix Sum + HashMap', 'Kadane variant'],
      watchOut   : 'Negative values break standard sliding window — use prefix sum approach',
    },
    {
      id         : 'sig_weighted',
      label      : 'Graph edges are weighted',
      category   : 'graph',
      implication: 'BFS no longer gives shortest path. Use Dijkstra or Bellman-Ford.',
      opens      : ['Dijkstra', 'Bellman-Ford', 'MST (Kruskal/Prim)'],
      watchOut   : 'Never use BFS for shortest path in weighted graph',
    },
    {
      id         : 'sig_directed',
      label      : 'Graph is directed',
      category   : 'graph',
      implication: 'Topological sort possible. SCC algorithms apply. Cycle detection needs 3-color.',
      opens      : ['Topological Sort', 'SCC (Tarjan/Kosaraju)'],
    },
    {
      id         : 'sig_tree_rooted',
      label      : 'Tree is rooted',
      category   : 'tree',
      implication: 'DFS from root. dp[node] defined via children. Post-order traversal.',
      opens      : ['Tree DP', 'LCA with Binary Lifting'],
    },
    {
      id         : 'sig_large_values',
      label      : 'Values can be very large (up to 10⁹ or 10¹⁸)',
      category   : 'values',
      implication: 'Cannot use value as array index. Coordinate compression or HashMap needed.',
      opens      : ['Coordinate Compression', 'HashMap'],
      watchOut   : 'Intermediate multiplication can overflow int — use long long',
    },
    {
      id         : 'sig_mod_required',
      label      : 'Answer requires modulo 10⁹+7',
      category   : 'output',
      implication: 'Answer is a count — exponentially large. DP counting variant needed.',
      opens      : ['DP counting with modular arithmetic'],
      watchOut   : 'Apply mod after every addition and multiplication — not just at the end',
    },
    {
      id         : 'sig_binary_values',
      label      : 'Values are binary (0 or 1)',
      category   : 'values',
      implication: 'Bitset operations possible. XOR / AND / OR tricks applicable.',
      opens      : ['Bit manipulation', 'Bitset DP'],
    },
    {
      id         : 'sig_coordinates_2d',
      label      : 'Input is 2D points / coordinates',
      category   : 'geometry',
      implication: 'Convex hull, sweep line, or geometric algorithms may apply.',
      opens      : ['Convex Hull', 'Sweep Line', 'Coordinate Compression'],
    },
    {
      id         : 'sig_parent_array',
      label      : 'Array where a[i] = parent of node i',
      category   : 'implicit_structure',
      implication: 'This IS a tree. Reconstruct and apply tree DP.',
      opens      : ['Tree reconstruction', 'Tree DP'],
      watchOut   : 'Hidden tree — do not treat as plain array',
    },
    {
      id         : 'sig_next_array',
      label      : 'Array where a[i] = next state from i',
      category   : 'implicit_structure',
      implication: 'Functional graph — rho structure with cycles. Each node has out-degree 1.',
      opens      : ["Floyd's Cycle Detection", 'Binary Lifting for k-th successor'],
      watchOut   : 'Do not confuse with general directed graph',
    },
  ];

  // ─── QUERY TYPE OPTIONS ────────────────────────────────────────────────────

  const QUERY_TYPES = [
    {
      id          : 'none',
      label       : 'No queries',
      sublabel    : 'Single computation on the full input',
      implication : 'No preprocessing needed — solve directly',
      eliminates  : [],
    },
    {
      id          : 'single',
      label       : 'One query',
      sublabel    : 'q = 1, answer one specific question',
      implication : 'Preprocessing structures (Segment Tree, Fenwick) are overkill',
      eliminates  : ['Segment Tree', 'Fenwick Tree', 'Sparse Table', "Mo's Algorithm"],
    },
    {
      id          : 'offline',
      label       : 'Multiple queries — offline',
      sublabel    : 'All queries known upfront — can sort them',
      implication : "Mo's Algorithm becomes available. Can process queries in optimal order.",
      eliminates  : [],
      opens       : ["Mo's Algorithm", 'Sort queries + sweep'],
    },
    {
      id          : 'online',
      label       : 'Multiple queries — online',
      sublabel    : 'Must answer each query before seeing next',
      implication : "Cannot sort queries. Mo's Algorithm eliminated.",
      eliminates  : ["Mo's Algorithm"],
      opens       : ['Segment Tree', 'Fenwick Tree', 'Sparse Table (static only)'],
    },
    {
      id          : 'updates_and_queries',
      label       : 'Updates AND queries both',
      sublabel    : 'Modify data and answer range questions',
      implication : 'Sparse Table eliminated — it is static. Must use dynamic structure.',
      eliminates  : ['Sparse Table'],
      opens       : ['Segment Tree', 'Fenwick Tree', 'Sqrt Decomposition'],
    },
  ];

  // ─── HYBRID COMBINATIONS ──────────────────────────────────────────────────
  // When user selects multiple input types — show combined implications

  const HYBRID_SIGNALS = [
    {
      id          : 'h_array_tree',
      inputs      : ['single_array', 'tree_explicit'],
      label       : 'Array + Tree',
      implication : 'Cartesian Tree (implicitly defined). Stack-based construction.',
      template    : 'Cartesian Tree → Stack construction → Tree DP',
    },
    {
      id          : 'h_graph_queries',
      inputs      : ['graph_edge_list', 'graph_adjacency'],
      label       : 'Graph + Many queries',
      implication : 'Preprocess graph structure. BFS/DFS once, answer queries in O(1) or O(log n).',
      template    : 'BFS + Sparse Table for LCA queries',
    },
    {
      id          : 'h_grid_queries',
      inputs      : ['matrix_grid'],
      queryTypes  : ['online', 'updates_and_queries'],
      label       : 'Grid + Multiple queries',
      implication : '2D Prefix Sum (static) or 2D Segment Tree (dynamic)',
      template    : '2D Prefix Sum for static. 2D Segment Tree for dynamic.',
    },
    {
      id          : 'h_strings_pattern',
      inputs      : ['multiple_strings', 'single_string'],
      label       : 'Text + Multiple patterns',
      implication : 'Multiple pattern matching in one pass. Aho-Corasick not multiple KMP.',
      template    : 'Aho-Corasick automaton',
    },
    {
      id          : 'h_intervals_coords',
      inputs      : ['intervals'],
      label       : 'Intervals + Point queries',
      implication : 'Coordinate compression then Segment Tree or BIT',
      template    : 'Coordinate Compression → Segment Tree',
    },
    {
      id          : 'h_two_arrays_sorted',
      inputs      : ['two_arrays'],
      signals     : ['sig_sorted'],
      label       : 'Two sorted arrays',
      implication : 'Binary search on one while iterating the other. Two Pointer merge in O(n).',
      template    : 'Two Pointer (merge) or Binary Search on one array',
    },
  ];

  // ─── IMPLICIT STRUCTURE HINTS ─────────────────────────────────────────────
  // When input type + signals suggest hidden structure

  const IMPLICIT_HINTS = [
    {
      id        : 'ih_hidden_dag',
      condition : (inputTypes, signals) =>
        inputTypes.some(t => ['single_array', 'multiple_numbers'].includes(t)) &&
        signals.includes('sig_parent_array'),
      hint      : 'Parent array detected — this is a hidden tree. Go to Stage 2.5.',
    },
    {
      id        : 'ih_functional_graph',
      condition : (inputTypes, signals) =>
        inputTypes.includes('single_array') && signals.includes('sig_next_array'),
      hint      : 'next[] array detected — functional graph with rho structure.',
    },
    {
      id        : 'ih_bipartite',
      condition : (inputTypes, signals) =>
        inputTypes.some(t => ['graph_edge_list', 'graph_adjacency'].includes(t)) &&
        signals.includes('sig_directed') === false,
      hint      : 'Undirected graph — check if 2-colorable (bipartite). May open matching.',
    },
    {
      id        : 'ih_bitmask',
      condition : (inputTypes, signals, n) =>
        n <= 20 && inputTypes.some(t =>
          ['single_array', 'multiple_strings'].includes(t)
        ),
      hint      : 'n ≤ 20 — Bitmask DP over subsets is feasible (2²⁰ = 1M).',
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  // Get all primary input types
  function getAll() { return [...PRIMARY]; }

  // Get a single type by id
  function getById(id) {
    return PRIMARY.find(t => t.id === id) ?? null;
  }

  // Get all secondary signals
  function getSecondarySignals() { return [...SECONDARY]; }

  // Get a signal by id
  function getSignalById(id) {
    return SECONDARY.find(s => s.id === id) ?? null;
  }

  // Get all query type options
  function getQueryTypes() { return [...QUERY_TYPES]; }

  // Get query type by id
  function getQueryTypeById(id) {
    return QUERY_TYPES.find(q => q.id === id) ?? null;
  }

  // Get hybrid signals that apply given selected inputs and query type
  function getActiveHybrids(selectedInputIds, queryTypeId) {
    return HYBRID_SIGNALS.filter(h => {
      const inputMatch = h.inputs
        ? h.inputs.every(i => selectedInputIds.includes(i))
        : true;
      const queryMatch = h.queryTypes
        ? h.queryTypes.includes(queryTypeId)
        : true;
      return inputMatch && queryMatch;
    });
  }

  // Get implicit structure hints based on selections
  function getImplicitHints(selectedInputIds, selectedSignalIds, n) {
    return IMPLICIT_HINTS.filter(h => {
      try { return h.condition(selectedInputIds, selectedSignalIds, n); }
      catch { return false; }
    });
  }

  // Get all templates opened by a set of selected input types
  function getOpenedTemplates(selectedInputIds) {
    const opened = new Set();
    selectedInputIds.forEach(id => {
      const t = getById(id);
      if (t?.opens) t.opens.forEach(o => opened.add(o));
    });
    return [...opened];
  }

  // Get all watch-outs for selected inputs
  function getWatchOuts(selectedInputIds) {
    return selectedInputIds
      .map(id => getById(id))
      .filter(t => t?.watchOut)
      .map(t => ({ inputId: t.id, label: t.label, watchOut: t.watchOut }));
  }

  // Get eliminations from selected query type
  function getQueryEliminations(queryTypeId) {
    const qt = getQueryTypeById(queryTypeId);
    return qt?.eliminates ?? [];
  }

  return {
    getAll,
    getById,
    getSecondarySignals,
    getSignalById,
    getQueryTypes,
    getQueryTypeById,
    getActiveHybrids,
    getImplicitHints,
    getOpenedTemplates,
    getWatchOuts,
    getQueryEliminations,
  };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputTypes;
}