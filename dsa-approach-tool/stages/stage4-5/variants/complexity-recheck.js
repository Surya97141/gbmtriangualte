// stages/stage4-5/variants/complexity-recheck.js
// Re-check complexity after variant selection — confirms approach fits N
// Used by: stage4-5.js, engine.js (postProcess stage4_5)

const ComplexityRecheck = (() => {

  // Maps variant id → its complexity class string (for MathUtils)
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
      'binary_search': Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('bs_')),
      'dp'           : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('dp_')),
      'graph'        : Object.keys(VARIANT_COMPLEXITY_MAP).filter(k => k.startsWith('gv_')),
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