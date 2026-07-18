// stages/stage4-5/variants/range-query-variants.js
// Range Query Structure approach variants (Segment Tree, Fenwick, Sparse Table, HLD, DSU)
// Used by: stage4-5.js

const RangeQueryVariants = (() => {

  const VARIANTS = [
    {
      id          : 'rq_segment_tree',
      label       : 'Segment Tree',
      tagline     : 'Tree of pre-summarized chunks, O(log n) query and update',
      complexity  : 'O(log n) per query/update, O(n) build',
      when        : [
        'Need range sum/min/max queries AND the array changes over time',
        'Need range UPDATES (whole-interval), not just point updates -- with lazy propagation',
      ],
      template    : `void build(vector<int>& tree, vector<int>& a, int node, int lo, int hi) {
  if (lo == hi) { tree[node] = a[lo]; return; }
  int mid = (lo + hi) / 2;
  build(tree, a, 2*node+1, lo, mid);
  build(tree, a, 2*node+2, mid+1, hi);
  tree[node] = tree[2*node+1] + tree[2*node+2];
}`,
      checkQuestion: 'Does the array change (point or range updates) AND do you need range queries in between?',
      watchOut    : [
        'Off-by-one in the recursive (lo, hi, mid) boundaries is the classic segment tree bug',
        'Forgetting lazy propagation for RANGE updates degrades to O(n) per update',
      ],
      examples    : [
        'Range Sum Query - Mutable',
        'Range Minimum Query with updates',
      ],
    },
    {
      id          : 'rq_fenwick_tree',
      label       : 'Fenwick Tree (BIT)',
      tagline     : 'Simpler, more compact alternative to Segment Tree for range sums with point updates',
      complexity  : 'O(log n) per query/update',
      when        : [
        'Need JUST range sums with point updates -- no min/max, no range updates',
      ],
      template    : `void update(vector<int>& bit, int i, int delta, int n) {
  for (++i; i <= n; i += i & (-i)) bit[i] += delta;
}
int prefixSum(vector<int>& bit, int i) {
  int sum = 0;
  for (++i; i > 0; i -= i & (-i)) sum += bit[i];
  return sum;
}`,
      checkQuestion: 'Is this specifically range SUM with point updates, nothing fancier?',
      watchOut    : [
        'Mixing up 0-indexed input with the tree internal 1-indexed storage is the most common bug',
        'Does not work directly for min/max range queries -- use Segment Tree or Sparse Table for those',
      ],
      examples    : [
        'Range Sum Query - Mutable (simpler than Segment Tree)',
        'Count of smaller elements after self (BIT on values)',
      ],
    },
    {
      id          : 'rq_sparse_table',
      label       : 'Sparse Table',
      tagline     : 'O(1) range min/max queries on a STATIC array via precomputed overlapping ranges',
      complexity  : 'O(n log n) build, O(1) per query',
      when        : [
        'Array NEVER changes, and you need range min/max/gcd queries',
      ],
      template    : `// table[j][i] = result over range [i, i + 2^j)
for (int j = 1; (1<<j) <= n; j++)
  for (int i = 0; i + (1<<j) <= n; i++)
    table[j][i] = min(table[j-1][i], table[j-1][i + (1<<(j-1))]);
// Query [l, r]: k = log2(r-l+1); combine table[k][l] and table[k][r-(1<<k)+1]`,
      checkQuestion: 'Is the array truly static -- no updates at all, ever?',
      watchOut    : [
        'Only works for idempotent operations (min/max/gcd) -- SUM double-counts the overlap, use prefix sums or Fenwick for that',
        'The moment the array changes even once, rebuild is required -- there is no efficient update',
      ],
      examples    : [
        'Range Minimum Query - Immutable',
        'Range GCD Query - static array',
      ],
    },
    {
      id          : 'rq_heavy_light',
      label       : 'Heavy-Light Decomposition',
      tagline     : 'Flatten a tree into chains so any path touches only O(log n) segments',
      complexity  : 'O(log^2 n) per path query/update',
      when        : [
        'Range queries/updates but the structure is a TREE (path between two nodes), not a flat array',
      ],
      template    : `// Identify the "heavy" child (largest subtree) at each node,
// chain heavy edges together into one flattened array segment.
// Path query between u and v jumps chain-by-chain (O(log n)
// chains total), running a segment tree query on each chain.`,
      checkQuestion: 'Is the range query actually a PATH BETWEEN TWO NODES in a tree, not a simple array slice?',
      watchOut    : [
        'Always jump the pointer whose chain head is DEEPER first -- getting this backwards breaks the path reconstruction',
        'This is Segment Tree UNDER something else -- the segment tree part itself is unchanged, only the flattening is new',
      ],
      examples    : [
        'Path sum queries on a tree with updates',
        'LCA-adjacent path aggregate queries',
      ],
    },
    {
      id          : 'rq_dsu',
      label       : 'DSU (Disjoint Set Union)',
      tagline     : 'Track group membership efficiently as connections are added over time',
      complexity  : 'O(alpha(n)) amortized, effectively O(1)',
      when        : [
        'Need "are these connected?" queries as new connections get added incrementally',
        'Building a Minimum Spanning Tree (Kruskal uses this internally)',
      ],
      template    : `int find(vector<int>& parent, int x) {
  while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
  return x;
}
bool unite(vector<int>& parent, vector<int>& rank_, int a, int b) {
  a = find(parent, a); b = find(parent, b);
  if (a == b) return false;
  if (rank_[a] < rank_[b]) swap(a, b);
  parent[b] = a;
  if (rank_[a] == rank_[b]) rank_[a]++;
  return true;
}`,
      checkQuestion: 'Are connections added incrementally over time, needing fast "are these connected NOW" answers?',
      watchOut    : [
        'Use BOTH path compression AND union by rank/size -- using only one still works but is much slower',
        'Different from a one-time BFS/DFS connected-components pass -- DSU specifically handles connections appearing INCREMENTALLY',
      ],
      examples    : [
        'Number of Connected Components after each union',
        'Kruskal Minimum Spanning Tree (DSU as the cycle check)',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isRangeQueryDirection = directions.some(d =>
      (d.family ?? '').includes('range_query') ||
      (d.id     ?? '').includes('range_query')
    );
    if (!isRangeQueryDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RangeQueryVariants;
}
