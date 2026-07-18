// stages/stage4-5/variants/pattern-resources.js
// Phase 4.5 — static pattern → canonical URL map for "learn more" links.
// No live fetching/summarizing: a static link is more honest about where
// the deeper explanation actually lives, and costs nothing to serve.
//
// Every URL below was checked directly against cp-algorithms.com's real
// table of contents before being added (not recalled from training and
// assumed correct) — several initial guesses during that check turned out
// wrong (Mo's algorithm and Trie have no dedicated page there at all;
// Sprague-Grundy's real path differs from the plausible-looking guess).
// A variant id is deliberately left OUT of this map rather than pointed at
// an unverified guess — `getUrl` returning null means "no link shown", not
// "broken link shown". Expanding coverage later means verifying the next
// URL, not filling every remaining id with a best guess.
const PatternResources = (() => {

  const BASE = 'https://cp-algorithms.com/';

  const MAP = {
    // Graph
    gv_bfs_standard       : 'graph/breadth-first-search.html',
    gv_dfs                : 'graph/depth-first-search.html',
    gv_dijkstra            : 'graph/dijkstra.html',
    gv_bellman_ford         : 'graph/bellman_ford.html',
    gv_floyd_warshall       : 'graph/all-pair-shortest-path-floyd-warshall.html',
    gv_kahn_topo            : 'graph/topological-sort.html',
    gv_kruskal              : 'graph/mst_kruskal.html',
    gv_tarjan_scc           : 'graph/strongly-connected-components.html',
    gv_zero_one_bfs         : 'graph/01_bfs.html',
    gv_network_flow         : 'graph/edmonds_karp.html',
    gv_bipartite_matching   : 'graph/kuhn_maximum_bipartite_matching.html',
    rq_heavy_light          : 'graph/hld.html',

    // Data structures
    rq_segment_tree         : 'data_structures/segment_tree.html',
    rq_fenwick_tree          : 'data_structures/fenwick.html',
    rq_sparse_table          : 'data_structures/sparse-table.html',
    rq_dsu                   : 'data_structures/disjoint_set_union.html',
    ds_monotonic_stack        : 'data_structures/stack_queue_modification.html',
    ds_monotonic_deque         : 'data_structures/stack_queue_modification.html',
    ds_bit_manipulation         : 'algebra/bit-manipulation.html',
    ds_hashing                   : 'string/string-hashing.html',
    ds_queue_bfs_support          : 'graph/breadth-first-search.html',

    // String
    str_kmp                : 'string/prefix-function.html',
    str_z_function           : 'string/z-function.html',
    str_rabin_karp             : 'string/rabin-karp.html',
    str_aho_corasick             : 'string/aho_corasick.html',
    str_trie                      : 'string/aho_corasick.html', // no standalone Trie page — this one builds a Trie as its core structure
    str_suffix_array               : 'string/suffix-array.html',
    str_manacher                    : 'string/manacher.html',

    // Math / algebra
    math_sieve                       : 'algebra/sieve-of-eratosthenes.html',
    math_binary_exponentiation         : 'algebra/binary-exp.html',
    math_modular_arithmetic              : 'algebra/module-inverse.html',
    math_crt                              : 'algebra/chinese-remainder-theorem.html',
    math_combinatorics                     : 'combinatorics/binomial-coefficients.html',
    math_matrix_expo                        : 'algebra/binary-exp.html', // covered as an application, not a standalone page

    // Geometry
    gs_convex_hull          : 'geometry/convex-hull.html',
    dp_cht                   : 'geometry/convex_hull_trick.html',

    // Numerical methods
    bs_on_answer   : 'num_methods/binary_search.html',
    bs_on_index     : 'num_methods/binary_search.html',
    bs_on_prefix     : 'num_methods/binary_search.html',
    bs_rotated        : 'num_methods/binary_search.html',
    bs_2d              : 'num_methods/binary_search.html',

    // Game theory
    gt_sprague_grundy : 'game_theory/sprague-grundy-nim.html',
  };

  // variantId -> full URL, or null if nothing verified yet for this one.
  function getUrl(variantId) {
    const path = MAP[variantId];
    return path ? BASE + path : null;
  }

  return { getUrl };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = PatternResources;
