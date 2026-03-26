// stages/stage0/complexity-table.js
// All complexity class definitions, op count mappings, and elimination rules
// Used by: stage0.js

const ComplexityTable = (() => {

  // ─── COMPLEXITY CLASSES ────────────────────────────────────────────────────

  const CLASSES = [
    {
      id          : 'o_1',
      label       : 'O(1)',
      family      : 'constant',
      description : 'Constant time — no iteration',
      color       : 'green',
      sortOrder   : 0,
    },
    {
      id          : 'o_logn',
      label       : 'O(log n)',
      family      : 'logarithmic',
      description : 'Logarithmic — halving each step',
      color       : 'green',
      sortOrder   : 1,
    },
    {
      id          : 'o_sqrtn',
      label       : 'O(√n)',
      family      : 'sublinear',
      description : 'Square root — block decomposition',
      color       : 'green',
      sortOrder   : 2,
    },
    {
      id          : 'o_n',
      label       : 'O(n)',
      family      : 'linear',
      description : 'Linear — single pass',
      color       : 'green',
      sortOrder   : 3,
    },
    {
      id          : 'o_nlogn',
      label       : 'O(n log n)',
      family      : 'linearithmic',
      description : 'Linearithmic — sorting, divide and conquer',
      color       : 'green',
      sortOrder   : 4,
    },
    {
      id          : 'o_nlog2n',
      label       : 'O(n log² n)',
      family      : 'linearithmic',
      description : 'Log-squared — segment tree with binary search',
      color       : 'green',
      sortOrder   : 5,
    },
    {
      id          : 'o_nsqrtn',
      label       : 'O(n √n)',
      family      : 'subquadratic',
      description : 'Mo\'s algorithm, sqrt decomposition',
      color       : 'yellow',
      sortOrder   : 6,
    },
    {
      id          : 'o_n2',
      label       : 'O(n²)',
      family      : 'quadratic',
      description : 'Quadratic — nested loops',
      color       : 'yellow',
      sortOrder   : 7,
    },
    {
      id          : 'o_n2_64',
      label       : 'O(n²/64)',
      family      : 'quadratic_bitset',
      description : 'Bitset-optimized quadratic',
      color       : 'yellow',
      sortOrder   : 8,
    },
    {
      id          : 'o_n2logn',
      label       : 'O(n² log n)',
      family      : 'quadratic',
      description : 'Quadratic with log factor',
      color       : 'yellow',
      sortOrder   : 9,
    },
    {
      id          : 'o_n3',
      label       : 'O(n³)',
      family      : 'cubic',
      description : 'Cubic — triple nested loops',
      color       : 'red',
      sortOrder   : 10,
    },
    {
      id          : 'o_2n',
      label       : 'O(2ⁿ)',
      family      : 'exponential',
      description : 'Exponential — all subsets',
      color       : 'red',
      sortOrder   : 11,
    },
    {
      id          : 'o_nfact',
      label       : 'O(n!)',
      family      : 'factorial',
      description : 'Factorial — all permutations',
      color       : 'red',
      sortOrder   : 12,
    },
  ];

  // ─── OPERATION COUNT TABLE ──────────────────────────────────────────────────
  // For each N bucket — exact op counts per complexity class

  const OP_COUNT_TABLE = [
    {
      nBucket   : 'n_10',
      maxN      : 10,
      display   : 'N ≤ 10',
      counts    : {
        o_logn  : 3,
        o_sqrtn : 3,
        o_n     : 10,
        o_nlogn : 33,
        o_nsqrtn: 31,
        o_n2    : 100,
        o_n3    : 1000,
        o_2n    : 1024,
        o_nfact : 3628800,
      },
    },
    {
      nBucket   : 'n_20',
      maxN      : 20,
      display   : 'N ≤ 20',
      counts    : {
        o_logn  : 4,
        o_sqrtn : 4,
        o_n     : 20,
        o_nlogn : 86,
        o_nsqrtn: 89,
        o_n2    : 400,
        o_n3    : 8000,
        o_2n    : 1048576,
        o_nfact : null,   // too large
      },
    },
    {
      nBucket   : 'n_100',
      maxN      : 100,
      display   : 'N ≤ 100',
      counts    : {
        o_logn  : 7,
        o_sqrtn : 10,
        o_n     : 100,
        o_nlogn : 664,
        o_nsqrtn: 1000,
        o_n2    : 10000,
        o_n3    : 1000000,
        o_2n    : null,
        o_nfact : null,
      },
    },
    {
      nBucket   : 'n_500',
      maxN      : 500,
      display   : 'N ≤ 500',
      counts    : {
        o_logn  : 9,
        o_sqrtn : 22,
        o_n     : 500,
        o_nlogn : 4483,
        o_nsqrtn: 11180,
        o_n2    : 250000,
        o_n2logn: 2238751,
        o_n3    : 125000000,
        o_2n    : null,
        o_nfact : null,
      },
    },
    {
      nBucket   : 'n_3000',
      maxN      : 3000,
      display   : 'N ≤ 3,000',
      counts    : {
        o_logn  : 12,
        o_sqrtn : 55,
        o_n     : 3000,
        o_nlogn : 34170,
        o_nsqrtn: 164317,
        o_n2    : 9000000,
        o_n2_64 : 140625,
        o_n3    : 27000000000,
        o_2n    : null,
        o_nfact : null,
      },
    },
    {
      nBucket   : 'n_10000',
      maxN      : 10000,
      display   : 'N ≤ 10,000',
      counts    : {
        o_logn  : 14,
        o_sqrtn : 100,
        o_n     : 10000,
        o_nlogn : 132877,
        o_nlog2n: 1763834,
        o_nsqrtn: 1000000,
        o_n2    : 100000000,
        o_n2_64 : 1562500,
        o_n3    : null,
        o_2n    : null,
      },
    },
    {
      nBucket   : 'n_100000',
      maxN      : 100000,
      display   : 'N ≤ 100,000',
      counts    : {
        o_logn  : 17,
        o_sqrtn : 316,
        o_n     : 100000,
        o_nlogn : 1660964,
        o_nlog2n: 27576197,
        o_nsqrtn: 31622776,
        o_n2    : 10000000000,
        o_n3    : null,
        o_2n    : null,
      },
    },
    {
      nBucket   : 'n_1000000',
      maxN      : 1000000,
      display   : 'N ≤ 1,000,000',
      counts    : {
        o_logn  : 20,
        o_sqrtn : 1000,
        o_n     : 1000000,
        o_nlogn : 19931568,
        o_nlog2n: 398631369,
        o_nsqrtn: 1000000000,
        o_n2    : null,
        o_n3    : null,
        o_2n    : null,
      },
    },
    {
      nBucket   : 'n_1000000000',
      maxN      : 1000000000,
      display   : 'N ≤ 10⁹',
      counts    : {
        o_logn  : 30,
        o_sqrtn : 31623,
        o_n     : null,
        o_nlogn : null,
        o_n2    : null,
        o_n3    : null,
        o_2n    : null,
      },
    },
  ];

  // ─── FEASIBILITY MATRIX ────────────────────────────────────────────────────
  // For each N bucket + time limit — which complexity classes are feasible
  // status: 'green' | 'yellow' | 'red'

  const SAFE_THRESHOLD  = 100_000_000;  // 10^8 ops at 1s
  const RISKY_THRESHOLD = 300_000_000;  // 3×10^8 ops at 1s

  function getFeasibilityMatrix(nBucket, timeLimitSec = 1) {
    const row = OP_COUNT_TABLE.find(r => r.nBucket === nBucket);
    if (!row) return {};

    const budget      = SAFE_THRESHOLD  * timeLimitSec;
    const riskyBudget = RISKY_THRESHOLD * timeLimitSec;

    const matrix = {};
    CLASSES.forEach(cls => {
      const ops = row.counts[cls.id];
      if (ops === null || ops === undefined) {
        matrix[cls.id] = 'red';
      } else if (ops <= budget) {
        matrix[cls.id] = 'green';
      } else if (ops <= riskyBudget) {
        matrix[cls.id] = 'yellow';
      } else {
        matrix[cls.id] = 'red';
      }
    });

    return matrix;
  }

  // ─── ELIMINATION RULES ─────────────────────────────────────────────────────
  // Constraint-based elimination — beyond just N size

  const ELIMINATION_RULES = [
    {
      id       : 'er_updates_and_queries',
      condition: 'Updates AND queries both present',
      eliminates: ['Sparse Table'],
      keeps    : ['Segment Tree', 'Fenwick Tree'],
      reason   : 'Sparse Table is static — cannot handle updates',
    },
    {
      id       : 'er_online_queries',
      condition: 'Queries must be answered online (immediately)',
      eliminates: ["Mo's Algorithm"],
      keeps    : ['Segment Tree', 'Fenwick Tree', 'Sparse Table'],
      reason   : "Mo's Algorithm requires offline sorting of queries",
    },
    {
      id       : 'er_negative_edges',
      condition: 'Graph has negative edge weights',
      eliminates: ['Dijkstra'],
      keeps    : ['Bellman-Ford', 'Floyd-Warshall'],
      reason   : 'Dijkstra assumes non-negative weights — gives wrong answer with negatives',
    },
    {
      id       : 'er_strict_time',
      condition: 'Time limit ≤ 0.5s',
      eliminates: ['O(n²) at n=10⁴', 'O(n√n) at n=10⁵'],
      keeps    : ['O(n log n) and below'],
      reason   : 'Strict time limit halves the operation budget',
    },
    {
      id       : 'er_small_n',
      condition: 'N < 10',
      eliminates: ['Segment Tree', 'Fenwick Tree', 'All heavy preprocessing'],
      keeps    : ['Direct computation', 'Hashing', 'Math', 'Greedy'],
      reason   : 'N is tiny — heavy structures add overhead with no benefit',
    },
    {
      id       : 'er_single_query',
      condition: 'Only one query (q = 1)',
      eliminates: ['All preprocessing structures'],
      keeps    : ['Direct computation'],
      reason   : 'Preprocessing cost is wasted if only one query is answered',
    },
    {
      id       : 'er_adj_matrix_large',
      condition: 'Graph with N > 4,000 nodes',
      eliminates: ['Adjacency Matrix'],
      keeps    : ['Adjacency List'],
      reason   : 'Adjacency matrix for N=10⁵ requires 40 GB memory',
    },
  ];

  // ─── COMBINED CONSTRAINT TABLE ─────────────────────────────────────────────

  const COMBINED_CONSTRAINTS = [
    {
      id      : 'cc_nq_logn',
      scenario: 'N=10⁵ queries, O(log n) per query',
      formula : 'Q × log(N)',
      ops     : 1700000,
      status  : 'green',
      verdict : 'Safe — Segment Tree or Fenwick',
    },
    {
      id      : 'cc_nq_n',
      scenario: 'N=10⁵ elements, Q=10⁵ queries, O(n) per query',
      formula : 'Q × N',
      ops     : 10000000000,
      status  : 'red',
      verdict : 'Hard TLE — need O(log n) per query',
    },
    {
      id      : 'cc_nq_sqrtn',
      scenario: 'N=10⁵ elements, Q=10⁵ queries, O(√n) per query',
      formula : 'Q × √N',
      ops     : 31622776,
      status  : 'green',
      verdict : "Safe — Mo's Algorithm range",
    },
    {
      id      : 'cc_bitmask_k20',
      scenario: 'Bitmask DP, k=20 items',
      formula : '2ᵏ × k',
      ops     : 20971520,
      status  : 'green',
      verdict : 'Safe — standard Bitmask DP',
    },
    {
      id      : 'cc_bitmask_k25',
      scenario: 'Bitmask DP, k=25 items',
      formula : '2ᵏ × k',
      ops     : 838860800,
      status  : 'red',
      verdict : 'TLE — k=25 exceeds bitmask DP range',
    },
    {
      id      : 'cc_grid_bfs',
      scenario: 'Grid N×M = 1000×1000, BFS',
      formula : 'N × M',
      ops     : 1000000,
      status  : 'green',
      verdict : 'Safe',
    },
    {
      id      : 'cc_dijkstra_sparse',
      scenario: 'Sparse graph N=10⁵, Dijkstra with PQ',
      formula : '(V+E) log V',
      ops     : 3400000,
      status  : 'green',
      verdict : 'Safe',
    },
    {
      id      : 'cc_floyd_large',
      scenario: 'Floyd-Warshall at N=1,000',
      formula : 'N³',
      ops     : 1000000000,
      status  : 'red',
      verdict : 'TLE — Floyd-Warshall only safe at N ≤ 500',
    },
  ];

  // ─── MEMORY TABLE ──────────────────────────────────────────────────────────

  const MEMORY_TABLE = [
    {
      structure : 'int array[N]',
      formula   : '4 × N bytes',
      at_1e5    : '0.4 MB',
      at_1e6    : '4 MB',
      at_1e7    : '38 MB',
      safe64    : 'N ≤ 16M',
    },
    {
      structure : 'long array[N]',
      formula   : '8 × N bytes',
      at_1e5    : '0.8 MB',
      at_1e6    : '8 MB',
      at_1e7    : '76 MB',
      safe64    : 'N ≤ 8M',
    },
    {
      structure : '2D int[N][N]',
      formula   : '4 × N² bytes',
      at_1e3    : '4 MB',
      at_3e3    : '36 MB',
      at_5e3    : '100 MB',
      safe64    : 'N ≤ 4,000',
    },
    {
      structure : 'Segment Tree',
      formula   : '16 × N bytes (4n nodes)',
      at_1e5    : '1.6 MB',
      at_1e6    : '16 MB',
      at_4e6    : '64 MB',
      safe64    : 'N ≤ 4M',
    },
    {
      structure : 'Sparse Table',
      formula   : '4 × N × log(N) bytes',
      at_1e5    : '6.7 MB',
      at_5e5    : '38 MB',
      at_1e6    : '80 MB',
      safe64    : 'N ≤ 500K',
    },
    {
      structure : 'Adjacency Matrix',
      formula   : '4 × N² bytes',
      at_1e3    : '4 MB',
      at_4e3    : '64 MB',
      at_1e5    : '40 GB',
      safe64    : 'N ≤ 4,000 only',
    },
    {
      structure : 'Adjacency List',
      formula   : '8 × (N + E) bytes',
      at_1e5    : '1.6 MB (E=10⁵)',
      at_1e6    : '16 MB (E=10⁶)',
      safe64    : 'E ≤ 8M',
    },
  ];

  // ─── KEY INSIGHT MESSAGES ──────────────────────────────────────────────────
  // Shown to user after feasibility computed

  const KEY_INSIGHTS = {
    n_10         : 'N is tiny. No optimization needed. Write naive first.',
    n_20         : 'Bitmask DP territory. 2²⁰ = 1M is safe.',
    n_100        : 'O(n³) = 1M is fine. Interval DP and Floyd-Warshall work here.',
    n_500        : 'O(n²) is comfortable. O(n³) is risky — 125M ops.',
    n_3000       : 'O(n²) = 9M is fine. O(n³) is dead. Bitset trick available.',
    n_10000      : 'O(n²) is borderline. Aim for O(n log n). Verify op count.',
    n_100000     : 'Must be O(n log n) or better. This is the most common constraint.',
    n_1000000    : 'O(n log n) with tight constant. Memory matters here.',
    n_1000000000 : 'Cannot iterate. Binary search on answer or mathematical formula only.',
  };

  // ─── WATCH OUT MESSAGES ────────────────────────────────────────────────────

  const WATCH_OUT = {
    n_10         : 'Do not over-engineer. Segment Tree for n=10 is absurd.',
    n_20         : 'k > 20 for bitmask DP will TLE. Verify k.',
    n_100        : 'O(n² × k) needs care — only safe if k stays small.',
    n_500        : 'If your solution is O(n³) at n=500 — expect TLE.',
    n_3000       : 'LCS DP at n=3000 is fine. Interval DP is risky.',
    n_10000      : 'O(n²) may pass at 2s but not 1s. Always calculate actual ops.',
    n_100000     : 'O(n log n) = 1.7M is very safe. O(n²) = 10B is hard TLE.',
    n_1000000    : 'Even O(n log n) with large constant can TLE. int[10⁶] = 4MB.',
    n_1000000000 : 'If n is this large you need binary search on answer or a formula.',
  };

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  // Get N bucket from raw N value
  function getBucket(n) {
    const row = OP_COUNT_TABLE.find(r => n <= r.maxN);
    return row ?? OP_COUNT_TABLE[OP_COUNT_TABLE.length - 1];
  }

  // Get all complexity classes
  function getAllClasses() {
    return [...CLASSES];
  }

  // Get op count for a specific N bucket and complexity class
  function getOpCount(nBucket, classId) {
    const row = OP_COUNT_TABLE.find(r => r.nBucket === nBucket);
    return row?.counts[classId] ?? null;
  }

  // Get elimination rules applicable to given constraints
  function getEliminationRules(constraints = {}) {
    return ELIMINATION_RULES.filter(rule => {
      if (constraints.hasUpdatesAndQueries && rule.id === 'er_updates_and_queries') return true;
      if (constraints.onlineQueries        && rule.id === 'er_online_queries')       return true;
      if (constraints.negativeEdges        && rule.id === 'er_negative_edges')       return true;
      if (constraints.strictTime           && rule.id === 'er_strict_time')          return true;
      if (constraints.smallN               && rule.id === 'er_small_n')              return true;
      if (constraints.singleQuery          && rule.id === 'er_single_query')         return true;
      if (constraints.largeGraph           && rule.id === 'er_adj_matrix_large')     return true;
      return false;
    });
  }

  // Get combined constraint scenarios
  function getCombinedConstraints() {
    return [...COMBINED_CONSTRAINTS];
  }

  // Get memory table
  function getMemoryTable() {
    return [...MEMORY_TABLE];
  }

  // Get key insight for N bucket
  function getInsight(nBucket) {
    return KEY_INSIGHTS[nBucket] ?? null;
  }

  // Get watch out for N bucket
  function getWatchOut(nBucket) {
    return WATCH_OUT[nBucket] ?? null;
  }

  // Get full row for a bucket
  function getRow(nBucket) {
    return OP_COUNT_TABLE.find(r => r.nBucket === nBucket) ?? null;
  }

  return {
    CLASSES,
    OP_COUNT_TABLE,
    ELIMINATION_RULES,
    COMBINED_CONSTRAINTS,
    MEMORY_TABLE,

    getBucket,
    getAllClasses,
    getOpCount,
    getFeasibilityMatrix,
    getEliminationRules,
    getCombinedConstraints,
    getMemoryTable,
    getInsight,
    getWatchOut,
    getRow,
  };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComplexityTable;
}