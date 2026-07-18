// stages/stage4-5/variants/complexity-recheck.js
// Re-check complexity after variant selection — confirms approach fits N
// Used by: stage4-5.js, engine.js (postProcess stage4_5)

const ComplexityRecheck = (() => {

  // Maps variant id → its complexity class string (for MathUtils)
  //
  // Entries marked "approximation" below have a true complexity that's
  // multi-variable (e.g. O(V*E^2), O(2^(n/2))) and doesn't reduce cleanly
  // to MathUtils.computeOps's single-n model. Where an exact class exists
  // (o(nsqrtn), o(nlog2n)) it's used; otherwise the nearest class that
  // won't UNDER-estimate cost was chosen deliberately, so a recheck warning
  // errs toward "check this yourself" rather than a false "safe."
  const VARIANT_COMPLEXITY_MAP = {
    // Binary Search
    'bs_on_answer'         : 'o(nlogn)',
    'bs_on_index'          : 'o(logn)',
    'bs_on_prefix'         : 'o(nlogn)',
    'bs_rotated'           : 'o(logn)',
    'bs_2d'                : 'o(logn)',

    // DP
    'dp_standard'          : 'o(n^2)',
    'dp_memoization'       : 'o(n^2)',
    'dp_rolling_array'     : 'o(n^2)',
    'dp_cht'               : 'o(nlogn)',
    'dp_divide_conquer'    : 'o(nlogn)',
    'dp_knuth'             : 'o(n^2)',
    'dp_bitmask'           : 'o(2^n)',

    // Graph
    'gv_bfs_standard'      : 'o(n)',
    'gv_dijkstra'          : 'o(nlogn)',
    'gv_bellman_ford'      : 'o(n^2)',
    'gv_floyd_warshall'    : 'o(n^3)',
    'gv_tarjan_scc'        : 'o(n)',
    'gv_kahn_topo'         : 'o(n)',
    'gv_kruskal'           : 'o(nlogn)',
    'gv_zero_one_bfs'      : 'o(n)',
    'gv_dfs'               : 'o(n)',
    'gv_network_flow'      : 'o(n^3)',  // true O(V*E^2) -- approximation, see note above
    'gv_bipartite_matching': 'o(n^2)',  // true O(V*E) -- approximation

    // Two Pointer
    'tp_opposite_ends'     : 'o(n)',
    'tp_fast_slow'         : 'o(n)',
    'tp_partition'         : 'o(n)',

    // Sliding Window
    'sw_fixed_size'             : 'o(n)',
    'sw_variable_shrink'        : 'o(n)',
    'sw_variable_grow_to_target': 'o(n)',

    // Greedy
    'g_interval_scheduling' : 'o(nlogn)',
    'g_exchange_argument'   : 'o(nlogn)',
    'g_priority_queue'      : 'o(nlogn)',
    'g_two_pointer_greedy'  : 'o(nlogn)',

    // String
    'str_kmp'          : 'o(n)',
    'str_z_function'   : 'o(n)',
    'str_rabin_karp'   : 'o(n)',
    'str_aho_corasick' : 'o(n)',
    'str_suffix_array' : 'o(nlogn)',
    'str_manacher'     : 'o(n)',
    'str_trie'         : 'o(n)',

    // Math
    'math_sieve'                 : 'o(nlogn)', // true O(n log log n) -- nlogn is the nearest safe upper bound
    'math_binary_exponentiation' : 'o(logn)',
    'math_modular_arithmetic'    : 'o(logn)',
    'math_crt'                   : 'o(logn)',
    'math_combinatorics'         : 'o(n)',
    'math_matrix_expo'           : 'o(logn)',  // log of the exponent N, not the array-size n

    // Data Structure
    'ds_monotonic_stack'     : 'o(n)',
    'ds_queue_bfs_support'   : 'o(n)',
    'ds_monotonic_deque'     : 'o(n)',
    'ds_heap_priority_queue' : 'o(nlogn)',
    'ds_hashing'             : 'o(n)',
    'ds_bit_manipulation'    : 'o(n)',

    // Geometry / Sweep
    'gs_convex_hull'            : 'o(nlogn)',
    'gs_line_sweep'             : 'o(nlogn)',
    'gs_meet_in_middle'         : 'o(2^n)',    // true O(2^(n/2)) -- approximation, see note above
    'gs_mos_algorithm'          : 'o(nsqrtn)',
    'gs_divide_conquer_general' : 'o(nlogn)',

    // Game Theory
    'gt_backtracking'   : 'o(2^n)',
    'gt_minimax'        : 'o(2^n)',
    'gt_sprague_grundy' : 'o(n)',

    // Range Query
    'rq_segment_tree' : 'o(nlogn)',
    'rq_fenwick_tree' : 'o(nlogn)',
    'rq_sparse_table' : 'o(nlogn)',
    'rq_heavy_light'  : 'o(nlog2n)',
    'rq_dsu'          : 'o(n)',
  };

  // Recheck result grades
  const GRADES = {
    SAFE    : 'safe',
    WARN    : 'warn',
    TLE     : 'tle',
  };

  function recheck(variantId, n, timeLimitSec = 1) {
    const complexityClass = VARIANT_COMPLEXITY_MAP[variantId];
    if (!complexityClass) return null;

    const ops      = MathUtils.computeOps(n, complexityClass);
    const status   = MathUtils.feasibility(ops, timeLimitSec);
    const runtime  = MathUtils.formatRuntime(MathUtils.estimateRuntime(ops));
    const opsDisplay = MathUtils.formatOps(ops);

    return {
      variantId,
      complexityClass,
      n,
      ops,
      opsDisplay,
      estimatedRuntime: runtime,
      status,
      grade: status === 'green' ? GRADES.SAFE
           : status === 'yellow' ? GRADES.WARN
           : GRADES.TLE,
      message: _buildMessage(status, complexityClass, n, opsDisplay, runtime),
    };
  }

  function _buildMessage(status, cls, n, ops, runtime) {
    if (status === 'green') {
      return `✓ Safe — ${cls} at n=${n} = ${ops} ops (~${runtime})`;
    }
    if (status === 'yellow') {
      return `~ Borderline — ${cls} at n=${n} = ${ops} ops (~${runtime}). May pass with tight constant.`;
    }
    return `✗ TLE — ${cls} at n=${n} = ${ops} ops (~${runtime}). Need faster approach.`;
  }

  // Recheck all variants and return sorted by feasibility
  function recheckAll(variantIds, n, timeLimitSec = 1) {
    return variantIds
      .map(id => recheck(id, n, timeLimitSec))
      .filter(Boolean)
      .sort((a, b) => {
        const order = { safe: 0, warn: 1, tle: 2 };
        return order[a.grade] - order[b.grade];
      });
  }

  // Given a variant id — return if it's feasible at given n
  function isFeasible(variantId, n, timeLimitSec = 1) {
    const result = recheck(variantId, n, timeLimitSec);
    return result ? result.grade !== GRADES.TLE : null;
  }

  // Get all variant ids for a direction family
  function getVariantIdsForFamily(family) {
    const MAP = {
      'binary_search'  : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('bs_')),
      'dp'             : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('dp_')),
      'graph'          : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('gv_')),
      'two_pointer'    : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('tp_')),
      'sliding_window' : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('sw_')),
      'greedy'         : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('g_')),
      'string'         : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('str_')),
      'math'           : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('math_')),
      'data_structure' : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('ds_')),
      'geometry_sweep' : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('gs_')),
      'game_theory'    : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('gt_')),
      'range_query'    : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('rq_')),
    };
    return MAP[family] ?? [];
  }

  return {
    recheck,
    recheckAll,
    isFeasible,
    getVariantIdsForFamily,
    GRADES,
    VARIANT_COMPLEXITY_MAP,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComplexityRecheck;
}