// utils/math-utils.js
// Operation count calculator, feasibility checks, complexity math
// Used by: Stage 0 (complexity budget), Stage 4-5 (variant re-check), confidence-utils

const MathUtils = {

  // ─── CONSTANTS ─────────────────────────────────────────────────────────────

  OPS_PER_SECOND: 100_000_000,        // 10^8 simple operations per second
  HEAVY_OPS_PER_SECOND: 10_000_000,   // 10^7 for cache-miss heavy operations
  LOG2_TABLE: {},                      // memoized log2 values

  // ─── CORE OPERATION COUNT ──────────────────────────────────────────────────

  // Given n and complexity class string — return exact operation count
  // e.g. computeOps(100000, 'n log n') → 1700000
  computeOps(n, complexityClass) {
    const c = complexityClass.toLowerCase().replace(/\s/g, '');
    const logn  = this.log2(n);
    const sqrtn = Math.sqrt(n);

    const map = {
      'o(1)'         : 1,
      'o(logn)'      : logn,
      'o(log2n)'     : logn * logn,
      'o(sqrtn)'     : sqrtn,
      'o(n)'         : n,
      'o(nlogn)'     : n * logn,
      'o(nlog2n)'    : n * logn * logn,
      'o(nsqrtn)'    : n * sqrtn,
      'o(n^2)'       : n * n,
      'o(n^2logn)'   : n * n * logn,
      'o(n^2/64)'    : (n * n) / 64,
      'o(n^3)'       : n * n * n,
      'o(2^n)'       : Math.pow(2, n),
      'o(n!)'        : this.factorial(n),
    };

    return map[c] ?? null;
  },

  // Compute ops for combined constraints — e.g. Q queries each O(log n)
  computeCombinedOps(n, q, perQueryClass) {
    const perQuery = this.computeOps(n, perQueryClass);
    if (perQuery === null) return null;
    return q * perQuery;
  },

  // ─── FEASIBILITY ───────────────────────────────────────────────────────────

  // Given op count and time limit — return green / yellow / red
  feasibility(ops, timeLimitSeconds = 1, heavy = false) {
    if (ops === null || ops === undefined) return 'red';
    const opsPerSec = heavy
      ? this.HEAVY_OPS_PER_SECOND
      : this.OPS_PER_SECOND;
    const budget = opsPerSec * timeLimitSeconds;
    if (ops <= budget * 0.3)  return 'green';
    if (ops <= budget)        return 'yellow';
    return 'red';
  },

  // Check if a complexity class is feasible at given n and time limit
  isFeasible(n, complexityClass, timeLimitSeconds = 1, heavy = false) {
    const ops = this.computeOps(n, complexityClass);
    return this.feasibility(ops, timeLimitSeconds, heavy);
  },

  // Return estimated runtime in seconds
  estimateRuntime(ops, heavy = false) {
    const opsPerSec = heavy
      ? this.HEAVY_OPS_PER_SECOND
      : this.OPS_PER_SECOND;
    return ops / opsPerSec;
  },

  // Format runtime for display — e.g. 0.017s or 170ms or 1.7μs
  formatRuntime(seconds) {
    if (seconds < 0.000001) return `${(seconds * 1e9).toFixed(1)}ns`;
    if (seconds < 0.001)    return `${(seconds * 1e6).toFixed(1)}μs`;
    if (seconds < 1)        return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(2)}s`;
  },

  // ─── OP COUNT DISPLAY ──────────────────────────────────────────────────────

  // Format large numbers for display — e.g. 1700000 → '1.7M'
  formatOps(ops) {
    if (ops === null || ops === undefined) return '—';
    if (ops >= 1e18) return `${(ops / 1e18).toFixed(1)}E`;
    if (ops >= 1e15) return `${(ops / 1e15).toFixed(1)}P`;
    if (ops >= 1e12) return `${(ops / 1e12).toFixed(1)}T`;
    if (ops >= 1e9)  return `${(ops / 1e9).toFixed(1)}B`;
    if (ops >= 1e6)  return `${(ops / 1e6).toFixed(1)}M`;
    if (ops >= 1e3)  return `${(ops / 1e3).toFixed(1)}K`;
    return `${ops}`;
  },

  // ─── MEMORY CALCULATIONS ───────────────────────────────────────────────────

  // Bytes for a 1D int array of size n
  intArrayBytes(n) { return n * 4; },

  // Bytes for a 1D long array of size n
  longArrayBytes(n) { return n * 8; },

  // Bytes for a 2D int array n x m
  array2DBytes(n, m) { return n * m * 4; },

  // Bytes for segment tree (4n nodes, each int)
  segTreeBytes(n) { return n * 4 * 4; },

  // Bytes for segment tree with lazy (8n nodes)
  segTreeLazyBytes(n) { return n * 8 * 4; },

  // Bytes for sparse table n * log2(n) ints
  sparseTableBytes(n) { return n * this.log2(n) * 4; },

  // Convert bytes to MB
  bytesToMB(bytes) { return bytes / (1024 * 1024); },

  // Format MB for display
  formatMB(mb) {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    if (mb >= 1)    return `${mb.toFixed(1)} MB`;
    return `${(mb * 1024).toFixed(0)} KB`;
  },

  // Check if structure fits in memory limit
  fitsInMemory(bytes, limitMB) {
    return this.bytesToMB(bytes) <= limitMB;
  },

  // ─── MATH HELPERS ──────────────────────────────────────────────────────────

  log2(n) {
    if (n <= 0) return 0;
    if (this.LOG2_TABLE[n]) return this.LOG2_TABLE[n];
    const result = Math.log2(n);
    this.LOG2_TABLE[n] = result;
    return result;
  },

  log10(n) {
    if (n <= 0) return 0;
    return Math.log10(n);
  },

  // Safe factorial — returns Infinity for large n (do not compute past 20)
  factorial(n) {
    if (n > 20) return Infinity;
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  },

  // Nearest power of 2 ceiling
  nextPow2(n) {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
  },

  // Clamp value between lo and hi
  clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  },

  // ─── CONSTRAINT ANALYSIS ───────────────────────────────────────────────────

  // Given n — return the constraint bucket it falls into
  // Returns one of: n_10 | n_20 | n_100 | n_500 | n_3000 | n_10000 | n_100000 | n_1000000 | n_1000000000
  getConstraintBucket(n) {
    if (n <= 10)          return 'n_10';
    if (n <= 20)          return 'n_20';
    if (n <= 100)         return 'n_100';
    if (n <= 500)         return 'n_500';
    if (n <= 3000)        return 'n_3000';
    if (n <= 10000)       return 'n_10000';
    if (n <= 100000)      return 'n_100000';
    if (n <= 1000000)     return 'n_1000000';
    return 'n_1000000000';
  },

  // Build full feasibility report for a given n, q, timeLimit, memLimit
  buildFeasibilityReport(n, q = 1, timeLimitSec = 1, memLimitMB = 256) {
    const classes = [
      { label: 'O(log n)',    class: 'o(logn)'   },
      { label: 'O(√n)',       class: 'o(sqrtn)'  },
      { label: 'O(n)',        class: 'o(n)'       },
      { label: 'O(n log n)',  class: 'o(nlogn)'  },
      { label: 'O(n√n)',      class: 'o(nsqrtn)' },
      { label: 'O(n²)',       class: 'o(n^2)'    },
      { label: 'O(n² log n)', class: 'o(n^2logn)'},
      { label: 'O(n³)',       class: 'o(n^3)'    },
      { label: 'O(2ⁿ)',       class: 'o(2^n)'    },
    ];

    return classes.map(c => {
      const ops    = q > 1
        ? this.computeCombinedOps(n, q, c.class)
        : this.computeOps(n, c.class);
      const status = this.feasibility(ops, timeLimitSec);
      const time   = ops !== null
        ? this.formatRuntime(this.estimateRuntime(ops))
        : '—';

      return {
        label       : c.label,
        complexityId: c.class,
        ops         : ops,
        opsDisplay  : this.formatOps(ops),
        status      : status,             // green | yellow | red
        estimatedTime: time,
      };
    });
  },

  // Build memory report for common structures at given n and memory limit
  buildMemoryReport(n, memLimitMB = 256) {
    const structures = [
      { name: 'int array',          bytes: this.intArrayBytes(n) },
      { name: 'long array',         bytes: this.longArrayBytes(n) },
      { name: '2D int [n][n]',      bytes: this.array2DBytes(n, n) },
      { name: 'Segment Tree',       bytes: this.segTreeBytes(n) },
      { name: 'Seg Tree + Lazy',    bytes: this.segTreeLazyBytes(n) },
      { name: 'Sparse Table',       bytes: this.sparseTableBytes(n) },
    ];

    return structures.map(s => {
      const mb     = this.bytesToMB(s.bytes);
      const fits   = mb <= memLimitMB;
      return {
        name   : s.name,
        mb     : mb,
        display: this.formatMB(mb),
        fits   : fits,
        status : fits
          ? (mb <= memLimitMB * 0.5 ? 'green' : 'yellow')
          : 'red',
      };
    });
  },

  // ─── OPERATION COUNT RULE ──────────────────────────────────────────────────

  // The key rule from the PDF — calculate ACTUAL ops not just Big-O
  // Returns a human-readable breakdown string
  explainOps(n, complexityClass, timeLimitSec = 1) {
    const ops    = this.computeOps(n, complexityClass);
    const status = this.feasibility(ops, timeLimitSec);
    const time   = this.formatRuntime(this.estimateRuntime(ops));
    const logn   = this.log2(n).toFixed(1);

    const explanations = {
      'o(nlogn)' : `n × log₂(n) = ${this.formatOps(n)} × ${logn} = ${this.formatOps(ops)}`,
      'o(n^2)'   : `n² = ${this.formatOps(n)}² = ${this.formatOps(ops)}`,
      'o(n^3)'   : `n³ = ${this.formatOps(n)}³ = ${this.formatOps(ops)}`,
      'o(2^n)'   : `2ⁿ = 2^${n} = ${this.formatOps(ops)}`,
      'o(n)'     : `n = ${this.formatOps(ops)}`,
      'o(logn)'  : `log₂(n) = ${logn} ≈ ${this.formatOps(ops)}`,
    };

    const c = complexityClass.toLowerCase().replace(/\s/g, '');
    const expr = explanations[c] ?? `f(${this.formatOps(n)}) = ${this.formatOps(ops)}`;

    return {
      expression   : expr,
      ops          : ops,
      opsDisplay   : this.formatOps(ops),
      estimatedTime: time,
      status       : status,
      verdict      : status === 'green'
        ? `Safe — ${time} at ${timeLimitSec}s limit`
        : status === 'yellow'
          ? `Borderline — ${time} at ${timeLimitSec}s limit`
          : `TLE — ${time} far exceeds ${timeLimitSec}s limit`,
    };
  },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathUtils;
}