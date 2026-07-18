// stages/stage4-5/variants/geometry-sweep-variants.js
// Geometry, Sweep Line, Meet in the Middle, Mo's Algorithm, general Divide and Conquer
// Used by: stage4-5.js

const GeometrySweepVariants = (() => {

  const VARIANTS = [
    {
      id          : 'gs_convex_hull',
      label       : 'Convex Hull',
      tagline     : 'Find the smallest shape wrapping all given points',
      complexity  : 'O(n log n)',
      when        : [
        'Need the outer boundary wrapping a set of 2D points',
      ],
      template    : `// Andrew's monotone chain: sort points, build lower half then
// upper half, popping the last point whenever three points make
// a non-left (clockwise) turn -- cross product sign determines this.
long long cross(Point O, Point A, Point B) {
  return (A.x-O.x)*(B.y-O.y) - (A.y-O.y)*(B.x-O.x);
}`,
      checkQuestion: 'Do you need the outer boundary of a point set, discarding interior points?',
      watchOut    : [
        'Dedupe identical points first -- duplicates can break the turn-direction checks',
        'Cross product sign convention determines winding order -- get it backwards and the hull comes out wrong',
      ],
      examples    : [
        'Erect the Fence (convex hull)',
        'Minimum area enclosing all points',
      ],
    },
    {
      id          : 'gs_line_sweep',
      label       : 'Line Sweep',
      tagline     : 'Process events left-to-right along a line, maintaining running state',
      complexity  : 'O(n log n)',
      when        : [
        'Intervals or geometric events happen along a timeline/axis',
        'Need max overlap, merged intervals, or closest pair style problems',
      ],
      template    : `// Convert each interval into +1 (start) and -1 (end) events,
// sort by position, sweep while tracking a running counter.
vector<pair<int,int>> events;
for (auto& iv : intervals) {
  events.push_back({iv.start, +1});
  events.push_back({iv.end,   -1});
}
sort(events.begin(), events.end());`,
      checkQuestion: 'Can this be reframed as "process points/events in sorted order along one axis"?',
      watchOut    : [
        'Tie-break order at equal coordinates (end-before-start vs start-before-end) changes whether touching intervals count as overlapping',
      ],
      examples    : [
        'Maximum overlapping intervals',
        'Merge Intervals',
        'Skyline Problem',
      ],
    },
    {
      id          : 'gs_meet_in_middle',
      label       : 'Meet in the Middle',
      tagline     : 'Split into two halves, brute-force each, combine efficiently',
      complexity  : 'O(2^(n/2))',
      when        : [
        'n is too big for full 2^n brute force (n > ~25) but small enough to split in half (n <= ~40)',
      ],
      template    : `// Enumerate all subset sums of each half separately, sort one
// half, then binary search the other half against it to find
// the best combined result.`,
      checkQuestion: 'Is n roughly 30-40 -- too big for 2^n, small enough for 2^(n/2)?',
      watchOut    : [
        'Must sort one half before the binary-search combine step',
        'Splitting unevenly (not roughly in half) defeats the purpose of the technique',
      ],
      examples    : [
        'Closest subset sum to a target with n up to 40',
        'Partition into two equal-sum groups (larger n variant)',
      ],
    },
    {
      id          : 'gs_mos_algorithm',
      label       : 'Mo Algorithm',
      tagline     : 'Answer many OFFLINE range queries by sorting them for minimal total window movement',
      complexity  : 'O((n + q) * sqrt(n))',
      when        : [
        'Many range queries, all known upfront (offline), no updates in between',
        'Query type is not easily handled by a plain segment tree (e.g. count distinct values in range)',
      ],
      template    : `// Sort queries by (left / blockSize, right), then slide a
// window between consecutive queries, adding/removing only
// the few elements needed to reach the new range.`,
      checkQuestion: 'Are ALL queries known upfront, with no updates needed between them?',
      watchOut    : [
        'If queries must be answered in a specific given order, or updates happen between them, this does not apply -- use Segment Tree/Fenwick instead',
        'Block-size tie-break ordering (alternating ascending/descending right endpoint per block) is easy to get backwards',
      ],
      examples    : [
        'Count distinct values in a range, many queries',
        'Range mode query (most frequent element in range)',
      ],
    },
    {
      id          : 'gs_divide_conquer_general',
      label       : 'Divide and Conquer (general paradigm)',
      tagline     : 'Split into independent halves, solve each, combine -- distinct from DP-optimization D&C',
      complexity  : 'Varies, commonly O(n log n)',
      when        : [
        'Problem splits into genuinely INDEPENDENT halves (not overlapping subproblems -- that would be DP instead)',
      ],
      template    : `// Classic shape: merge sort, counting inversions, closest
// pair of points -- solve(lo, mid), solve(mid+1, hi), then
// combine results, often during a merge step.`,
      checkQuestion: 'Are the two halves solved completely independently, with no shared overlapping subproblem?',
      watchOut    : [
        'If the same smaller question keeps recurring from different paths, that is DP, not plain D&C -- see DP family',
        'Most of the actual cleverness lives in the COMBINE step, not the split',
      ],
      examples    : [
        'Count Inversions (via merge sort)',
        'Closest Pair of Points',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isGSDirection = directions.some(d =>
      (d.family ?? '').includes('geometry_sweep') ||
      (d.family ?? '').includes('divide_conquer') ||
      (d.id     ?? '').includes('geometry_sweep') ||
      (d.id     ?? '').includes('divide_conquer')
    );
    if (!isGSDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeometrySweepVariants;
}
