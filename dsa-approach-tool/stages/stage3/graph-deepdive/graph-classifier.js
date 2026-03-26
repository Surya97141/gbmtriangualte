// stages/stage3/graph-deepdive/graph-classifier.js
// 3I — Graph deep-dive classifier — identifies graph type and routes to algorithm
// Used by: stage3.js

const GraphClassifier = (() => {

  // ─── CLASSIFICATION QUESTIONS ──────────────────────────────────────────────
  // Sequential yes/no questions that narrow graph type and goal

  const QUESTIONS = [
    {
      id      : 'q_directed',
      text    : 'Are edges directed? (A→B does not imply B→A)',
      sublabel: 'Look for: prerequisites, dependencies, one-way roads, flow direction',
      options : [
        { id: 'yes', label: 'Yes — directed',   leadsTo: 'directed_branch'   },
        { id: 'no',  label: 'No — undirected',  leadsTo: 'undirected_branch' },
      ],
    },
    {
      id      : 'q_weighted',
      text    : 'Do edges have weights, costs, or distances?',
      sublabel: 'Look for: travel time, cost, distance, capacity',
      options : [
        { id: 'yes', label: 'Yes — weighted',   leadsTo: 'weighted_branch'   },
        { id: 'no',  label: 'No — unweighted',  leadsTo: 'unweighted_branch' },
      ],
    },
    {
      id      : 'q_negative',
      text    : 'Can any edge weight be negative?',
      sublabel: 'Negative weights eliminate Dijkstra entirely',
      options : [
        { id: 'yes', label: 'Yes — negatives possible', leadsTo: 'negative_branch' },
        { id: 'no',  label: 'No — all non-negative',    leadsTo: 'positive_branch' },
      ],
    },
    {
      id      : 'q_goal',
      text    : 'What is your primary goal on the graph?',
      sublabel: 'Pick the closest match',
      options : [
        { id: 'shortest_path',  label: 'Shortest / minimum cost path'       },
        { id: 'reachability',   label: 'Can I reach node B from node A?'    },
        { id: 'components',     label: 'Connected components / grouping'     },
        { id: 'ordering',       label: 'Topological ordering of nodes'       },
        { id: 'spanning_tree',  label: 'Minimum spanning tree'               },
        { id: 'cycle',          label: 'Cycle detection'                     },
        { id: 'scc',            label: 'Strongly connected components'       },
        { id: 'bipartite',      label: 'Bipartite check or matching'         },
        { id: 'flow',           label: 'Maximum flow / minimum cut'          },
        { id: 'bridges',        label: 'Bridges or articulation points'      },
        { id: 'lca',            label: 'Lowest common ancestor on tree'      },
      ],
    },
  ];

  // ─── ALGORITHM RECOMMENDATIONS ────────────────────────────────────────────
  // Given (directed, weighted, negative, goal) → algorithm + complexity + notes

  const RECOMMENDATIONS = [
    // ── SHORTEST PATH ────────────────────────────────────────────────────────
    {
      conditions: { weighted: false, goal: 'shortest_path' },
      algorithm : 'BFS',
      complexity : 'O(V + E)',
      why        : 'Unweighted graph — BFS level-order gives shortest hop count',
      code       : `vector<int> dist(V, -1);
queue<int> q;
dist[src] = 0; q.push(src);
while (!q.empty()) {
  int u = q.front(); q.pop();
  for (int v : adj[u]) {
    if (dist[v] == -1) {
      dist[v] = dist[u] + 1;
      q.push(v);
    }
  }
}`,
      watchOut   : 'BFS on weighted graph gives wrong answer — use Dijkstra',
    },
    {
      conditions: { weighted: true, negative: false, goal: 'shortest_path', dense: false },
      algorithm : 'Dijkstra with Priority Queue',
      complexity : 'O((V + E) log V)',
      why        : 'Weighted, no negatives, sparse — standard Dijkstra with min-heap',
      code       : `vector<long long> dist(V, LLONG_MAX);
priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
dist[src] = 0; pq.push({0, src});
while (!pq.empty()) {
  auto [d, u] = pq.top(); pq.pop();
  if (d > dist[u]) continue;
  for (auto [v, w] : adj[u]) {
    if (dist[u] + w < dist[v]) {
      dist[v] = dist[u] + w;
      pq.push({dist[v], v});
    }
  }
}`,
      watchOut   : 'Negative edges → Dijkstra gives wrong answer silently',
    },
    {
      conditions: { weighted: true, negative: false, goal: 'shortest_path', dense: true },
      algorithm : 'Dijkstra with Array (dense graphs)',
      complexity : 'O(V²)',
      why        : 'Dense graph E ≈ V² — array Dijkstra beats PQ when E = O(V²)',
      code       : `vector<long long> dist(V, LLONG_MAX);
vector<bool> vis(V, false);
dist[src] = 0;
for (int i = 0; i < V; i++) {
  int u = -1;
  for (int v = 0; v < V; v++)
    if (!vis[v] && (u == -1 || dist[v] < dist[u])) u = v;
  vis[u] = true;
  for (auto [v, w] : adj[u])
    if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
}`,
      watchOut   : 'Only better than PQ when E = O(V²). For sparse graphs always use PQ.',
    },
    {
      conditions: { weighted: true, negative: true, goal: 'shortest_path' },
      algorithm : 'Bellman-Ford',
      complexity : 'O(V × E)',
      why        : 'Negative weights — Dijkstra fails, Bellman-Ford handles negatives and detects negative cycles',
      code       : `vector<long long> dist(V, LLONG_MAX);
dist[src] = 0;
for (int i = 0; i < V - 1; i++) {
  for (auto [u, v, w] : edges) {
    if (dist[u] != LLONG_MAX && dist[u] + w < dist[v])
      dist[v] = dist[u] + w;
  }
}
// Detect negative cycle
for (auto [u, v, w] : edges) {
  if (dist[u] != LLONG_MAX && dist[u] + w < dist[v])
    hasNegativeCycle = true;
}`,
      watchOut   : 'Run V-1 rounds then check round V — if still relaxing → negative cycle exists',
    },
    {
      conditions: { goal: 'shortest_path', allPairs: true },
      algorithm : 'Floyd-Warshall',
      complexity : 'O(V³)',
      why        : 'All-pairs shortest path — handles negative edges (not negative cycles)',
      code       : `// Initialize dist[i][j] = weight of edge (i,j) or INF if no edge, dist[i][i] = 0
for (int k = 0; k < V; k++)
  for (int i = 0; i < V; i++)
    for (int j = 0; j < V; j++)
      if (dist[i][k] != INF && dist[k][j] != INF)
        dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);`,
      watchOut   : 'Only feasible for V ≤ 500. At V=1000, 10⁹ ops → TLE',
    },
    {
      conditions: { weighted: false, zeroOne: true, goal: 'shortest_path' },
      algorithm : '0-1 BFS',
      complexity : 'O(V + E)',
      why        : 'Edge weights are only 0 or 1 — deque BFS runs in O(V+E)',
      code       : `vector<int> dist(V, INT_MAX);
deque<int> dq;
dist[src] = 0; dq.push_back(src);
while (!dq.empty()) {
  int u = dq.front(); dq.pop_front();
  for (auto [v, w] : adj[u]) {
    if (dist[u] + w < dist[v]) {
      dist[v] = dist[u] + w;
      if (w == 0) dq.push_front(v);
      else        dq.push_back(v);
    }
  }
}`,
      watchOut   : 'Only works for edge weights 0 and 1 — not for general small weights',
    },

    // ── REACHABILITY ─────────────────────────────────────────────────────────
    {
      conditions: { goal: 'reachability' },
      algorithm : 'BFS or DFS',
      complexity : 'O(V + E)',
      why        : 'Reachability only — simple traversal from source suffices',
      code       : `// BFS reachability
vector<bool> visited(V, false);
queue<int> q;
visited[src] = true; q.push(src);
while (!q.empty()) {
  int u = q.front(); q.pop();
  for (int v : adj[u])
    if (!visited[v]) { visited[v] = true; q.push(v); }
}
bool canReach = visited[target];`,
      watchOut   : 'For directed graphs — reachability from A to B ≠ reachability from B to A',
    },

    // ── CONNECTED COMPONENTS ─────────────────────────────────────────────────
    {
      conditions: { directed: false, goal: 'components' },
      algorithm : 'BFS/DFS or Union Find',
      complexity : 'O(V + E) or O(E α(V))',
      why        : 'Undirected components — DFS/BFS or Union Find both work. Union Find better for dynamic edges.',
      code       : `// Union Find for components
vector<int> parent(V); iota(parent.begin(), parent.end(), 0);
function<int(int)> find = [&](int x) {
  return parent[x] == x ? x : parent[x] = find(parent[x]);
};
auto unite = [&](int x, int y) { parent[find(x)] = find(y); };

for (auto [u, v] : edges) unite(u, v);
int components = count_if(parent.begin(), parent.end(),
  [&](int i) { return find(i) == i; });`,
      watchOut   : 'For directed graph — use Tarjan/Kosaraju for SCCs, not simple BFS',
    },
    {
      conditions: { directed: true, goal: 'components' },
      algorithm : 'Tarjan or Kosaraju (SCC)',
      complexity : 'O(V + E)',
      why        : 'Directed graph connectivity → Strongly Connected Components',
      watchOut   : 'SCC ≠ connected components. Directed graph requires SCC algorithms.',
    },

    // ── TOPOLOGICAL ORDER ────────────────────────────────────────────────────
    {
      conditions: { goal: 'ordering' },
      algorithm : "Kahn's Algorithm (BFS Topological Sort)",
      complexity : 'O(V + E)',
      why        : 'Process nodes with in-degree 0. Detect cycles — if processed count < V, cycle exists.',
      code       : `vector<int> indegree(V, 0);
for (auto [u, v] : edges) indegree[v]++;
queue<int> q;
for (int i = 0; i < V; i++) if (indegree[i] == 0) q.push(i);
vector<int> order;
while (!q.empty()) {
  int u = q.front(); q.pop();
  order.push_back(u);
  for (int v : adj[u])
    if (--indegree[v] == 0) q.push(v);
}
bool hasCycle = (order.size() < V);`,
      watchOut   : 'If order.size() < V after Kahn — cycle exists. Topological sort impossible.',
    },

    // ── MINIMUM SPANNING TREE ────────────────────────────────────────────────
    {
      conditions: { goal: 'spanning_tree', dense: false },
      algorithm : "Kruskal's Algorithm",
      complexity : 'O(E log E)',
      why        : 'Sort edges, add if no cycle (Union Find). Better for sparse graphs.',
      code       : `sort(edges.begin(), edges.end()); // by weight
vector<int> parent(V); iota(parent.begin(), parent.end(), 0);
function<int(int)> find = [&](int x) {
  return parent[x] == x ? x : parent[x] = find(parent[x]);
};
long long mstCost = 0; int edgesUsed = 0;
for (auto [w, u, v] : edges) {
  if (find(u) != find(v)) {
    parent[find(u)] = find(v);
    mstCost += w; edgesUsed++;
    if (edgesUsed == V-1) break;
  }
}`,
      watchOut   : 'Kruskal requires all edges upfront — sort by weight first',
    },
    {
      conditions: { goal: 'spanning_tree', dense: true },
      algorithm : "Prim's Algorithm",
      complexity : 'O((V + E) log V)',
      why        : 'Grow tree from source — better for dense graphs',
      watchOut   : 'Only for undirected graphs. For directed — use Edmonds\' algorithm.',
    },

    // ── CYCLE DETECTION ───────────────────────────────────────────────────────
    {
      conditions: { directed: true, goal: 'cycle' },
      algorithm : 'DFS 3-color',
      complexity : 'O(V + E)',
      why        : 'White=unvisited, Gray=in-stack, Black=done. Gray→Gray edge = cycle.',
      code       : `vector<int> color(V, 0); // 0=white 1=gray 2=black
bool hasCycle = false;
function<void(int)> dfs = [&](int u) {
  color[u] = 1;
  for (int v : adj[u]) {
    if (color[v] == 1) { hasCycle = true; return; }
    if (color[v] == 0) dfs(v);
  }
  color[u] = 2;
};
for (int i = 0; i < V; i++) if (color[i] == 0) dfs(i);`,
      watchOut   : '3-color DFS is for DIRECTED graphs only. Undirected needs parent tracking.',
    },
    {
      conditions: { directed: false, goal: 'cycle' },
      algorithm : 'DFS with parent tracking or Union Find',
      complexity : 'O(V + E)',
      why        : 'Back edge to non-parent = cycle in undirected graph',
      code       : `// Union Find cycle detection
vector<int> parent(V); iota(parent.begin(), parent.end(), 0);
function<int(int)> find = [&](int x) {
  return parent[x] == x ? x : parent[x] = find(parent[x]);
};
bool hasCycle = false;
for (auto [u, v] : edges) {
  if (find(u) == find(v)) { hasCycle = true; break; }
  parent[find(u)] = find(v);
}`,
      watchOut   : 'Do NOT use 3-color DFS on undirected graph — false positives from parent edge',
    },

    // ── STRONGLY CONNECTED COMPONENTS ────────────────────────────────────────
    {
      conditions: { goal: 'scc' },
      algorithm : "Tarjan's Algorithm",
      complexity : 'O(V + E)',
      why        : 'One-pass DFS with stack. Outputs SCCs in reverse topological order of condensation DAG.',
      watchOut   : 'After SCC condensation the result is always a DAG — can apply DAG algorithms',
    },

    // ── BIPARTITE ────────────────────────────────────────────────────────────
    {
      conditions: { goal: 'bipartite' },
      algorithm : 'BFS 2-coloring',
      complexity : 'O(V + E)',
      why        : 'Try to color graph with 2 colors — conflict means not bipartite',
      code       : `vector<int> color(V, -1);
bool isBipartite = true;
for (int start = 0; start < V && isBipartite; start++) {
  if (color[start] != -1) continue;
  queue<int> q; color[start] = 0; q.push(start);
  while (!q.empty() && isBipartite) {
    int u = q.front(); q.pop();
    for (int v : adj[u]) {
      if (color[v] == -1) { color[v] = 1 - color[u]; q.push(v); }
      else if (color[v] == color[u]) isBipartite = false;
    }
  }
}`,
      watchOut   : 'Check all components — graph may be disconnected',
    },

    // ── BRIDGES AND ARTICULATION POINTS ──────────────────────────────────────
    {
      conditions: { goal: 'bridges' },
      algorithm : "Tarjan's Bridge Finding",
      complexity : 'O(V + E)',
      why        : 'Edge (u,v) is bridge if low[v] > disc[u] — removing it disconnects graph',
      watchOut   : 'Only for undirected graphs. Track disc[] and low[] arrays in DFS.',
    },

    // ── LCA ──────────────────────────────────────────────────────────────────
    {
      conditions: { goal: 'lca', manyQueries: false },
      algorithm : 'Naive DFS / Path to Root',
      complexity : 'O(n) per query',
      why        : 'Few queries — find paths from root to both nodes, find divergence',
      watchOut   : 'For many queries use Binary Lifting O(n log n) preprocessing O(log n) per query',
    },
    {
      conditions: { goal: 'lca', manyQueries: true },
      algorithm : 'Binary Lifting',
      complexity : 'O(n log n) preprocessing + O(log n) per query',
      why        : 'Many LCA queries — precompute 2^k ancestors for each node',
      code       : `// Binary Lifting LCA
const int LOG = 20;
vector<vector<int>> up(LOG, vector<int>(n, -1));
// Fill up[0][v] = parent[v], then up[k][v] = up[k-1][up[k-1][v]]
// Query: jump both nodes to same depth, then jump together`,
      watchOut   : 'Requires rooted tree. Binary lifting needs O(n log n) space.',
    },
  ];

  // ─── GRAPH PROPERTY FLAGS ─────────────────────────────────────────────────

  const PROPERTY_FLAGS = [
    {
      id      : 'pf_sparse',
      label   : 'Sparse graph',
      check   : 'E ≈ V or E ≈ V log V',
      impact  : 'Use adjacency list. Dijkstra with PQ beats array version.',
    },
    {
      id      : 'pf_dense',
      label   : 'Dense graph',
      check   : 'E ≈ V²',
      impact  : 'Adjacency matrix acceptable. Dijkstra with array O(V²) may beat PQ.',
    },
    {
      id      : 'pf_dag',
      label   : 'DAG (no cycles)',
      check   : 'Directed AND no cycles guaranteed by problem',
      impact  : 'Topological sort gives processing order. DP on DAG finds longest/shortest path.',
    },
    {
      id      : 'pf_tree',
      label   : 'Tree (connected, n-1 edges)',
      check   : 'V nodes, V-1 edges, connected, no cycles',
      impact  : 'DFS/BFS from root. Tree DP. LCA queries. Diameter in two BFS passes.',
    },
    {
      id      : 'pf_bipartite',
      label   : 'Bipartite',
      check   : '2-colorable — no odd cycles',
      impact  : 'Maximum matching via Hopcroft-Karp. König\'s theorem for vertex cover.',
    },
    {
      id      : 'pf_negative_cycle',
      label   : 'May contain negative cycle',
      check   : 'Negative weights AND directed cycles possible',
      impact  : 'Shortest path is undefined if negative cycle reachable. Bellman-Ford detects it.',
    },
  ];

  // ─── COMMON GRAPH MISTAKES ────────────────────────────────────────────────

  const COMMON_MISTAKES = [
    {
      id      : 'gm_bfs_weighted',
      mistake : 'Using BFS for shortest path in weighted graph',
      why     : 'BFS treats all edges equally — ignores weights',
      fix     : 'Use Dijkstra for non-negative weights, Bellman-Ford for negative',
    },
    {
      id      : 'gm_dijkstra_negative',
      mistake : 'Using Dijkstra with negative edge weights',
      why     : 'Dijkstra assumes finalized nodes have optimal distance — negative edges violate this',
      fix     : 'Use Bellman-Ford or handle with Johnson\'s reweighting',
    },
    {
      id      : 'gm_undirected_3color',
      mistake : 'Using DFS 3-color cycle detection on undirected graph',
      why     : 'Every undirected edge appears as back-edge to parent — false positive cycle',
      fix     : 'Track parent in DFS. Only flag back edge if neighbor is not parent.',
    },
    {
      id      : 'gm_directed_uf',
      mistake : 'Using Union Find for directed graph connectivity',
      why     : 'Union Find ignores direction — merges u and v even if only u→v edge exists',
      fix     : 'Use DFS/BFS for directed reachability. Use Tarjan/Kosaraju for SCCs.',
    },
    {
      id      : 'gm_floyd_large',
      mistake : 'Using Floyd-Warshall for V > 500',
      why     : 'O(V³) = 10⁹ at V=1000 → TLE',
      fix     : 'Run Dijkstra from each source: O(V × (V+E) log V)',
    },
    {
      id      : 'gm_grid_bounds',
      mistake : 'Not checking grid bounds before pushing to BFS queue',
      why     : 'Array out of bounds or processing invalid cells',
      fix     : 'Always check: 0 ≤ r < rows AND 0 ≤ c < cols before processing neighbor',
    },
    {
      id      : 'gm_topo_no_cycle_check',
      mistake : 'Returning topological sort result without checking if all nodes processed',
      why     : 'Cycle makes full topological sort impossible — partial result returned silently',
      fix     : 'After Kahn\'s: check if order.size() == V. If not — cycle exists.',
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getQuestions()        { return [...QUESTIONS]; }
  function getPropertyFlags()    { return [...PROPERTY_FLAGS]; }
  function getCommonMistakes()   { return [...COMMON_MISTAKES]; }

  // Get recommendation given conditions object
  function getRecommendation(conditions) {
    return RECOMMENDATIONS.find(rec => {
      return Object.entries(rec.conditions).every(([key, val]) =>
        conditions[key] === val
      );
    }) ?? null;
  }

  // Get all recommendations matching partial conditions
  function getMatching(partialConditions) {
    return RECOMMENDATIONS.filter(rec => {
      return Object.entries(partialConditions).every(([key, val]) =>
        rec.conditions[key] === val
      );
    });
  }

  // Get algorithm for specific goal
  function getForGoal(goal, extraConditions = {}) {
    return RECOMMENDATIONS.filter(rec =>
      rec.conditions.goal === goal &&
      Object.entries(extraConditions).every(([k, v]) => rec.conditions[k] === v)
    );
  }

  // Build summary given user answers
  function buildSummary(answers) {
    const {
      directed, weighted, negative,
      goal, dense, allPairs,
      manyQueries, zeroOne,
    } = answers;

    const conditions = {
      directed, weighted, negative,
      goal, dense, allPairs,
      manyQueries, zeroOne,
    };

    // Remove undefined keys
    Object.keys(conditions).forEach(k => {
      if (conditions[k] === undefined) delete conditions[k];
    });

    const rec        = getRecommendation(conditions);
    const fallback   = rec ? null : getForGoal(goal)[0] ?? null;
    const chosen     = rec ?? fallback;
    const mistakes   = COMMON_MISTAKES.filter(m => {
      if (!weighted && m.id === 'gm_bfs_weighted'   ) return true;
      if (negative  && m.id === 'gm_dijkstra_negative') return true;
      if (!directed && m.id === 'gm_undirected_3color') return goal === 'cycle';
      if (directed  && m.id === 'gm_directed_uf'     ) return goal === 'components';
      return false;
    });

    return {
      algorithm   : chosen,
      conditions,
      relevantMistakes: mistakes,
      propertyFlags: PROPERTY_FLAGS.filter(f => {
        if (f.id === 'pf_sparse' && !dense)    return true;
        if (f.id === 'pf_dense'  && dense)     return true;
        if (f.id === 'pf_dag'    && directed)  return true;
        if (f.id === 'pf_negative_cycle' && negative) return true;
        return false;
      }),
    };
  }

  return {
    getQuestions,
    getPropertyFlags,
    getCommonMistakes,
    getRecommendation,
    getMatching,
    getForGoal,
    buildSummary,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphClassifier;
}