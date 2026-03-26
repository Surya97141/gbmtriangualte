// stages/stage7/output/tradeoff-resolver.js
// When multiple directions exist — helps user pick between them
// Shows complexity, risk, and implementation difficulty tradeoffs
// Used by: stage7.js

const TradeoffResolver = (() => {

  // Per-direction metadata for tradeoff comparison
  const DIRECTION_META = {
    dir_binary_search_answer: {
      implementationDifficulty: 'medium',
      riskOfWA                : 'low',
      riskOfTLE               : 'low',
      codeLength              : 'short',
      debuggability           : 'easy',
      notes                   : 'isFeasible must be correct — verify monotonicity before coding',
    },
    dir_dp_1d: {
      implementationDifficulty: 'medium',
      riskOfWA                : 'medium',
      riskOfTLE               : 'low',
      codeLength              : 'medium',
      debuggability           : 'medium',
      notes                   : 'Base case and fill order bugs are subtle',
    },
    dir_dp_2d: {
      implementationDifficulty: 'hard',
      riskOfWA                : 'high',
      riskOfTLE               : 'medium',
      codeLength              : 'medium',
      debuggability           : 'hard',
      notes                   : 'Diagonal value corruption and fill order bugs are hard to spot',
    },
    dir_greedy: {
      implementationDifficulty: 'easy',
      riskOfWA                : 'high',
      riskOfTLE               : 'low',
      codeLength              : 'short',
      debuggability           : 'easy',
      notes                   : 'High WA risk if greedy correctness not formally verified',
    },
    dir_graph_bfs: {
      implementationDifficulty: 'easy',
      riskOfWA                : 'low',
      riskOfTLE               : 'low',
      codeLength              : 'short',
      debuggability           : 'easy',
      notes                   : 'Bounds check on grid is the most common source of bugs',
    },
    dir_graph_dijkstra: {
      implementationDifficulty: 'medium',
      riskOfWA                : 'medium',
      riskOfTLE               : 'low',
      codeLength              : 'medium',
      debuggability           : 'medium',
      notes                   : 'Lazy deletion and long long for distances are easy to forget',
    },
    dir_graph_topo: {
      implementationDifficulty: 'easy',
      riskOfWA                : 'low',
      riskOfTLE               : 'low',
      codeLength              : 'short',
      debuggability           : 'easy',
      notes                   : 'Check order.size() == V after Kahn\'s for cycle detection',
    },
    dir_sliding_window: {
      implementationDifficulty: 'medium',
      riskOfWA                : 'medium',
      riskOfTLE               : 'low',
      codeLength              : 'short',
      debuggability           : 'medium',
      notes                   : 'Fails silently on negative values — verify input is non-negative',
    },
    dir_two_pointer: {
      implementationDifficulty: 'easy',
      riskOfWA                : 'medium',
      riskOfTLE               : 'low',
      codeLength              : 'short',
      debuggability           : 'easy',
      notes                   : 'Duplicate handling is subtle — easy to overcount',
    },
    dir_backtracking: {
      implementationDifficulty: 'medium',
      riskOfWA                : 'medium',
      riskOfTLE               : 'high',
      codeLength              : 'medium',
      debuggability           : 'hard',
      notes                   : 'High TLE risk without effective pruning',
    },
    dir_union_find: {
      implementationDifficulty: 'easy',
      riskOfWA                : 'low',
      riskOfTLE               : 'low',
      codeLength              : 'short',
      debuggability           : 'easy',
      notes                   : 'Only for undirected graphs — do not use on directed graphs',
    },
  };

  const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };
  const RISK_ORDER        = { low: 0, medium: 1, high: 2 };

  function getMetaForDirection(dirId) {
    return DIRECTION_META[dirId] ?? null;
  }

  // Build comparison table for a list of directions
  function buildComparison(directions) {
    return directions.map(dir => {
      const meta = getMetaForDirection(dir.id) ?? {};
      return {
        id        : dir.id,
        label     : dir.label,
        complexity: dir.complexity,
        difficulty: meta.implementationDifficulty ?? 'unknown',
        riskWA    : meta.riskOfWA                ?? 'unknown',
        riskTLE   : meta.riskOfTLE               ?? 'unknown',
        codeLength: meta.codeLength              ?? 'unknown',
        notes     : meta.notes                   ?? '',
      };
    });
  }

  // Recommend the best direction given user's context
  function recommend(directions, context = {}) {
    if (!directions.length) return null;
    if (directions.length === 1) return directions[0];

    const {
      prioritizeLowWA   = true,
      prioritizeLowTLE  = false,
      prioritizeEasyImpl= false,
    } = context;

    const scored = directions.map(dir => {
      const meta  = getMetaForDirection(dir.id) ?? {};
      let score   = 100;

      if (prioritizeLowWA) {
        score -= (RISK_ORDER[meta.riskOfWA  ?? 'medium'] ?? 1) * 20;
      }
      if (prioritizeLowTLE) {
        score -= (RISK_ORDER[meta.riskOfTLE ?? 'medium'] ?? 1) * 20;
      }
      if (prioritizeEasyImpl) {
        score -= (DIFFICULTY_ORDER[meta.implementationDifficulty ?? 'medium'] ?? 1) * 10;
      }

      return { dir, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].dir;
  }

  return {
    getMetaForDirection,
    buildComparison,
    recommend,
    DIRECTION_META,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TradeoffResolver;
}