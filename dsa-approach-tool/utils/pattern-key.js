// utils/pattern-key.js
// Single source of truth for pattern name → canonical key.
// Used by PatternMap (card render path) and Stage 8 (unlock path).
// Every algorithm name — whether a short dir.label like "Dynamic Programming"
// or a JSON signal string like "DP O(n^2)" or a dp-patterns type like
// "1D DP — single position index" — produces the same canonical key.

const PatternKey = (() => {

  // ─── ALIAS TABLE ───────────────────────────────────────────────────────────
  // Keys are the intermediate normalised strings produced AFTER:
  //   lowercase → strip parens → strip em-dash suffixes → strip non-alphanumeric → collapse spaces
  // Values are the stable canonical keys stored in localStorage.
  // Add new entries when new dir.labels or JSON signal strings are introduced.

  const ALIASES = {
    // ── Dynamic Programming (all subtypes collapse to 'dp') ──────────────────
    'dynamic programming'                    : 'dp',
    'dp'                                     : 'dp',
    '1d dp'                                  : 'dp',
    '2d dp'                                  : 'dp',
    '2d dp levenshtein'                      : 'dp',
    'bitmask dp'                             : 'dp',
    'bitmask dp if n20'                      : 'dp',
    'tree dp'                                : 'dp',
    'digit dp'                               : 'dp',
    'grid dp'                                : 'dp',
    'state machine dp'                       : 'dp',
    'lis type dp'                            : 'dp',
    'subsequence dp'                         : 'dp',
    'interval dp'                            : 'dp',
    'knuth optimization'                     : 'dp',
    '01 knapsack'                            : 'dp',
    '0 1 knapsack'                           : 'dp',
    'unbounded knapsack'                     : 'dp',
    'dp 01 knapsack'                         : 'dp',
    'dp unbounded knapsack'                  : 'dp',
    'dp unbounded knapsack variant'          : 'dp',
    'dp counting variant'                    : 'dp',
    'dp partition dp'                        : 'dp',
    'dp state machine'                       : 'dp',
    'dp expand around center'               : 'dp',
    'trie  dp'                               : 'dp',
    'trie dp'                                : 'dp',

    // ── BFS ──────────────────────────────────────────────────────────────────
    'breadth first search'                   : 'bfs',
    'bfs'                                    : 'bfs',
    'bfs 2 coloring'                         : 'bfs',
    'level order encoding'                   : 'bfs',
    '01 bfs'                                 : 'bfs',
    '0 1 bfs'                                : 'bfs',

    // ── DFS ──────────────────────────────────────────────────────────────────
    'depth first search'                     : 'dfs',
    'dfs'                                    : 'dfs',
    'dfs post order'                         : 'dfs',
    'dfs 3 color'                            : 'dfs',
    'dfs 3 color directed'                   : 'dfs',
    'dfs 2 coloring'                         : 'dfs',
    'dfs bfs tree traversal'                 : 'dfs',
    'dfs  bfs tree traversal'               : 'dfs',
    'bfs dfs'                                : 'bfs',
    'bfs  dfs'                               : 'bfs',

    // ── MST ──────────────────────────────────────────────────────────────────
    'minimum spanning tree'                  : 'mst',
    'mst'                                    : 'mst',
    'kruskal'                                : 'mst',
    'kruskal union find'                     : 'mst',
    'kruskal  union find'                    : 'mst',
    'kruskal sort edges  union find'         : 'mst',
    'kruskal sort edges union find'          : 'mst',
    'kruskal  sort edges   union find'      : 'mst',
    'prim'                                   : 'mst',

    // ── Greedy ───────────────────────────────────────────────────────────────
    'greedy'                                 : 'greedy',
    'greedy build answer left to right'      : 'greedy',
    'greedy if unlimited transactions'       : 'greedy',
    'greedy can reach end'                   : 'greedy',
    'greedy if equal partition'              : 'greedy',

    // ── Binary Search on Answer (specific dir.label — distinct canonical key) ─
    'binary search on answer'                : 'binary_search_on_answer',

    // ── Binary Search (general array search) ─────────────────────────────────
    'binary search'                          : 'binary_search',
    'binary search  patience sorting'        : 'binary_search',
    'binary search patience sorting'         : 'binary_search',

    // ── Backtracking ──────────────────────────────────────────────────────────
    'backtracking'                           : 'backtracking',

    // ── Divide and Conquer ────────────────────────────────────────────────────
    'divide and conquer'                     : 'divide_and_conquer',

    // ── Graph (generic dir.label from engine.js) ──────────────────────────────
    'graph traversal  algorithm'             : 'graph',
    'graph traversal algorithm'              : 'graph',
    'graph'                                  : 'graph',
    'reachability'                           : 'graph',

    // ── Two Pointer (as labelled by engine.js dir.label) ─────────────────────
    'two pointer  sliding window'            : 'two_pointer',
    'two pointer sliding window'             : 'two_pointer',
    'two pointer'                            : 'two_pointer',
    'two pointer on sorted array'            : 'two_pointer',
    'two pointer after sort'                 : 'two_pointer',

    // ── Sliding Window (standalone signal) ────────────────────────────────────
    'sliding window'                         : 'sliding_window',
    'sliding window  frequency array'        : 'sliding_window',
    'sliding window frequency array'         : 'sliding_window',

    // ── Prefix Sum ───────────────────────────────────────────────────────────
    'prefix sum'                             : 'prefix_sum',

    // ── Union Find ────────────────────────────────────────────────────────────
    'union find'                             : 'union_find',
    'union find undirected'                  : 'union_find',

    // ── Shortest Path ─────────────────────────────────────────────────────────
    'shortest path'                          : 'shortest_path',
    'shortest path in grid'                  : 'shortest_path',

    // ── Dijkstra ──────────────────────────────────────────────────────────────
    'dijkstra'                               : 'dijkstra',
    'dijkstra if variable move costs'        : 'dijkstra',

    // ── Bellman-Ford ──────────────────────────────────────────────────────────
    'bellman ford'                           : 'bellman_ford',
    'bellmanford'                            : 'bellman_ford',

    // ── Floyd-Warshall ────────────────────────────────────────────────────────
    'floyd warshall'                         : 'floyd_warshall',
    'floydwarshall'                          : 'floyd_warshall',

    // ── Topological Sort ─────────────────────────────────────────────────────
    'topological sort'                       : 'topological_sort',
    'kahns algorithm'                        : 'topological_sort',
    'kahns algorithm bfs'                    : 'topological_sort',
    'kahn s algorithm bfs'                   : 'topological_sort',

    // ── SCC ──────────────────────────────────────────────────────────────────
    'strongly connected components'          : 'scc',
    'scc'                                    : 'scc',
    'tarjans algorithm'                      : 'scc',
    'tarjan s algorithm'                     : 'scc',
    'kosarajus algorithm'                    : 'scc',
    'kosaraju s algorithm'                   : 'scc',

    // ── Cycle Detection ───────────────────────────────────────────────────────
    'cycle detection'                        : 'cycle_detection',
    'floyds algorithm'                       : 'cycle_detection',
    'floyd s algorithm'                      : 'cycle_detection',
    'floyds algorithm linked list'           : 'cycle_detection',
    'floyd s algorithm linked list'          : 'cycle_detection',

    // ── Connected Components ──────────────────────────────────────────────────
    'connected components'                   : 'connected_components',

    // ── Bipartite ─────────────────────────────────────────────────────────────
    'bipartite matching'                     : 'bipartite',
    'bipartite'                              : 'bipartite',
    'bfs 2 coloring'                         : 'bipartite',
    'dfs 2 coloring'                         : 'bipartite',

    // ── LCA ───────────────────────────────────────────────────────────────────
    'lowest common ancestor'                 : 'lca',
    'lca'                                    : 'lca',

    // ── Bridges ───────────────────────────────────────────────────────────────
    'bridges and articulation points'        : 'bridges',

    // ── Monotonic Stack ───────────────────────────────────────────────────────
    'monotonic stack'                        : 'monotonic_stack',
    'monotonic stack decreasing'             : 'monotonic_stack',
    'monotonic stack increasing'             : 'monotonic_stack',

    // ── Monotonic Queue / Deque ───────────────────────────────────────────────
    'deque'                                  : 'monotonic_queue',
    'deque monotonic queue'                  : 'monotonic_queue',

    // ── Heap / Priority Queue ─────────────────────────────────────────────────
    'min heap of size k'                     : 'heap',
    'max heap of size k'                     : 'heap',
    'priority queue min heap of end times'   : 'heap',

    // ── Hashing / HashMap ─────────────────────────────────────────────────────
    'hashing'                                : 'hashing',
    'hashmap  frequency array'               : 'hashing',
    'hashmap frequency array'                : 'hashing',
    'hashmap'                                : 'hashing',
    'hashset'                                : 'hashing',
    'hashmap o n'                            : 'hashing',
    'hash map o n'                           : 'hashing',

    // ── Segment Tree ─────────────────────────────────────────────────────────
    'segment tree'                           : 'segment_tree',
    'segment tree with lazy propagation'     : 'segment_tree',

    // ── Fenwick Tree ──────────────────────────────────────────────────────────
    'fenwick tree'                           : 'fenwick_tree',

    // ── Sparse Table ──────────────────────────────────────────────────────────
    'sparse table'                           : 'sparse_table',

    // ── Kadane ────────────────────────────────────────────────────────────────
    'kadanes algorithm'                      : 'kadane',
    'kadane s algorithm'                     : 'kadane',
    'kadane'                                 : 'kadane',

    // ── Manacher ──────────────────────────────────────────────────────────────
    'manachers algorithm'                    : 'manacher',
    'manacher s algorithm'                   : 'manacher',
    'manacher'                               : 'manacher',

    // ── QuickSelect ───────────────────────────────────────────────────────────
    'quickselect'                            : 'quickselect',
    'quickselect average'                    : 'quickselect',
    'quickselect  average'                   : 'quickselect',

    // ── Sorting ───────────────────────────────────────────────────────────────
    'counting sort'                          : 'sorting',
    'sorting  deduplication'                 : 'sorting',
    'sorting deduplication'                  : 'sorting',

    // ── Line Sweep ────────────────────────────────────────────────────────────
    'line sweep'                             : 'line_sweep',
    'sort by start  greedy'                  : 'line_sweep',
    'sort by start greedy'                   : 'line_sweep',

    // ── Difference Array ──────────────────────────────────────────────────────
    'difference array'                       : 'difference_array',

    // ── Combinatorics ─────────────────────────────────────────────────────────
    'combinatorics'                          : 'combinatorics',

    // ── Trie (standalone — trie+dp already mapped to dp above) ───────────────
    'trie'                                   : 'trie',
  };

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  /**
   * normalisePatternKey(rawName) → canonical key string
   *
   * Steps applied in order:
   *  1. Lowercase
   *  2. Strip content in parentheses (and the parens): "(BFS)", "O(n^2)", "(if n<=20)"
   *  3. Strip em-dash / en-dash suffixes and everything that follows:
   *     "— single source", "– if unweighted", "— can I get from A to B?"
   *  4. Strip non-alphanumeric characters (preserving spaces)
   *  5. Collapse whitespace
   *  6. Alias lookup → return canonical key
   *  7. Fallback: collapse spaces to underscores (for unknown future patterns)
   */
  function normalisePatternKey(rawName) {
    if (!rawName) return '';

    // Step 1 — lowercase
    let s = String(rawName).toLowerCase();

    // Step 2 — strip parenthesised content (handles "O(n^2)", "(if n<=20)", "(BFS)", etc.)
    s = s.replace(/\s*\([^)]*\)/g, '');

    // Step 3 — strip em-dash / en-dash and everything after
    // Covers: "1D DP — single position index", "BFS — if unweighted",
    //         "Reachability — can I get from A to B?", "Shortest Path — single source"
    s = s.replace(/\s*[—–]\s*.+$/, '');

    // Step 4 — strip non-alphanumeric (slashes, apostrophes, plus signs, etc.)
    s = s.replace(/[^a-z0-9\s]/g, ' ');

    // Step 5 — collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();

    // Step 6 — alias lookup
    if (ALIASES[s] !== undefined) return ALIASES[s];

    // Step 7 — unknown pattern: produce raw underscore key so new patterns
    // still get a stable key without crashing.
    return s.replace(/\s+/g, '_') || '';
  }

  return { normalisePatternKey };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PatternKey;
}
