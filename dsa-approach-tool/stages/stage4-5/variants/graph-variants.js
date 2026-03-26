// stages/stage4-5/variants/graph-variants.js
// Graph approach variants — algorithm selection for each goal
// Used by: stage4-5.js

const GraphVariants = (() => {

  const VARIANTS = [
    {
      id          : 'gv_bfs_standard',
      label       : 'Standard BFS',
      tagline     : 'Shortest path in unweighted graph — O(V+E)',
      complexity  : 'O(V + E)',
      when        : [
        'Unweighted graph — all edges cost 1',
        'Minimum number of hops or steps',
        'Level-order traversal needed',
      ],
      template    : `vector<int> dist(V, -1);
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
      watchOut    : ['Never use BFS on weighted graph for shortest path'],
    },
    {
      id          : 'gv_dijkstra',
      label       : 'Dijkstra with Priority Queue',
      tagline     : 'Shortest path in weighted graph — O((V+E) log V)',
      complexity  : 'O((V + E) log V)',
      when        : [
        'Weighted graph, all non-negative weights',
        'Single source shortest path',
        'Sparse graph (E ≈ V or V log V)',
      ],
      template    : `vector<long long> dist(V, LLONG_MAX);
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
      watchOut    : [
        'Negative weights → wrong answer silently',
        'Lazy deletion: skip if d > dist[u]',
      ],
    },
    {
      id          : 'gv_bellman_ford',
      label       : 'Bellman-Ford',
      tagline     : 'Shortest path with negative weights — O(V×E)',
      complexity  : 'O(V × E)',
      when        : [
        'Negative edge weights present',
        'Need to detect negative cycles',
        'SPFA as optimization in practice',
      ],
      template    : `vector<long long> dist(V, LLONG_MAX);
dist[src] = 0;
for (int i = 0; i < V-1; i++) {
  for (auto [u, v, w] : edges) {
    if (dist[u] != LLONG_MAX && dist[u]+w < dist[v])
      dist[v] = dist[u] + w;
  }
}
// Detect negative cycle
bool hasNegCycle = false;
for (auto [u,v,w] : edges)
  if (dist[u] != LLONG_MAX && dist[u]+w < dist[v])
    hasNegCycle = true;`,
      watchOut    : ['Run V-1 rounds. V-th round still relaxing = negative cycle'],
    },
    {
      id          : 'gv_floyd_warshall',
      label       : 'Floyd-Warshall',
      tagline     : 'All-pairs shortest path — O(V³)',
      complexity  : 'O(V³)',
      when        : [
        'All-pairs shortest path needed',
        'V ≤ 500',
        'Negative edges OK (no negative cycles)',
      ],
      template    : `// Initialize dist[i][j] = edge weight, INF if no edge, 0 if i==j
for (int k = 0; k < V; k++)
  for (int i = 0; i < V; i++)
    for (int j = 0; j < V; j++)
      if (dist[i][k] != INF && dist[k][j] != INF)
        dist[i][j] = min(dist[i][j], dist[i][k]+dist[k][j]);`,
      watchOut    : [
        'V=1000 → 10⁹ ops → TLE. Only use V ≤ 500.',
        'Negative cycle: dist[i][i] < 0 after algorithm',
      ],
    },
    {
      id          : 'gv_tarjan_scc',
      label       : "Tarjan's SCC",
      tagline     : 'Strongly connected components — O(V+E)',
      complexity  : 'O(V + E)',
      when        : [
        'Directed graph — find SCCs',
        'Condensation DAG needed',
        '2-SAT problem',
      ],
      template    : `int timer=0;
vector<int> disc(V,-1), low(V), comp(V,-1);
vector<bool> onStack(V,false);
stack<int> st; int numSCC=0;

function<void(int)> dfs=[&](int u){
  disc[u]=low[u]=timer++;
  st.push(u); onStack[u]=true;
  for(int v:adj[u]){
    if(disc[v]==-1){dfs(v);low[u]=min(low[u],low[v]);}
    else if(onStack[v]) low[u]=min(low[u],disc[v]);
  }
  if(low[u]==disc[u]){
    while(true){int v=st.top();st.pop();onStack[v]=false;comp[v]=numSCC;if(v==u)break;}
    numSCC++;
  }
};`,
      watchOut    : ['Output is in reverse topological order of condensation DAG'],
    },
    {
      id          : 'gv_kahn_topo',
      label       : "Kahn's Topological Sort",
      tagline     : 'Topological order + cycle detection — O(V+E)',
      complexity  : 'O(V + E)',
      when        : [
        'Need topological ordering of DAG',
        'Need to detect if cycle exists',
        'Course schedule, build order problems',
      ],
      template    : `vector<int> indegree(V, 0);
for (auto [u,v] : edges) indegree[v]++;
queue<int> q;
for (int i=0; i<V; i++) if (indegree[i]==0) q.push(i);
vector<int> order;
while (!q.empty()) {
  int u = q.front(); q.pop();
  order.push_back(u);
  for (int v : adj[u]) if (--indegree[v]==0) q.push(v);
}
bool hasCycle = (order.size() < V);`,
      watchOut    : ['order.size() < V means cycle exists — topological sort failed'],
    },
    {
      id          : 'gv_kruskal',
      label       : "Kruskal's MST",
      tagline     : 'Minimum spanning tree — O(E log E)',
      complexity  : 'O(E log E)',
      when        : [
        'Minimum spanning tree of undirected weighted graph',
        'Sparse graphs (better than Prim)',
        'All edges available upfront',
      ],
      template    : `sort(edges.begin(), edges.end()); // by weight
vector<int> par(V); iota(par.begin(),par.end(),0);
function<int(int)> find=[&](int x){
  return par[x]==x?x:par[x]=find(par[x]);
};
long long cost=0; int cnt=0;
for (auto [w,u,v]:edges){
  if(find(u)!=find(v)){
    par[find(u)]=find(v);
    cost+=w; cnt++;
    if(cnt==V-1) break;
  }
}`,
      watchOut    : ['Undirected graphs only. Directed → minimum arborescence (much harder)'],
    },
    {
      id          : 'gv_zero_one_bfs',
      label       : '0-1 BFS',
      tagline     : 'Shortest path with 0 or 1 edge weights — O(V+E)',
      complexity  : 'O(V + E)',
      when        : [
        'Edge weights are exactly 0 or 1',
        'Free moves and cost-1 moves mixed',
        'Grid with teleportation (0 cost) and steps (1 cost)',
      ],
      template    : `vector<int> dist(V, INT_MAX);
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
      watchOut    : ['Only for weights 0 and 1. For general small weights use Dijkstra'],
    },
  ];

  function getAll()    { return [...VARIANTS]; }
  function getById(id) { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = [], graphGoal = null, graphProperties = {}) {
    const isGraphDirection = directions.some(d =>
      (d.family ?? '').includes('graph') ||
      (d.id     ?? '').includes('graph')
    );
    if (!isGraphDirection) return [];

    const relevant = [];

    if (graphGoal === 'gg_shortest_path' || graphGoal === 'gg_grid_path') {
      if (!graphProperties.weighted) relevant.push(getById('gv_bfs_standard'));
      if (graphProperties.weighted && !graphProperties.negative) relevant.push(getById('gv_dijkstra'));
      if (graphProperties.negative) relevant.push(getById('gv_bellman_ford'));
      if (graphProperties.zeroOne) relevant.push(getById('gv_zero_one_bfs'));
    }
    if (graphGoal === 'gg_topological_sort' || graphGoal === 'gg_cycle_detection') {
      relevant.push(getById('gv_kahn_topo'));
    }
    if (graphGoal === 'gg_scc') {
      relevant.push(getById('gv_tarjan_scc'));
    }
    if (graphGoal === 'gg_spanning_tree') {
      relevant.push(getById('gv_kruskal'));
    }
    if (graphGoal === 'gg_shortest_path' && graphProperties.allPairs) {
      relevant.push(getById('gv_floyd_warshall'));
    }

    // Deduplicate and fill with all if empty
    const seen = new Set();
    const filtered = relevant.filter(v => {
      if (!v || seen.has(v.id)) return false;
      seen.add(v.id); return true;
    });

    return filtered.length ? filtered : getAll();
  }

  function getVariantComplexity(variantId) {
    return getById(variantId)?.complexity ?? null;
  }

  return {
    getAll,
    getById,
    getRelevant,
    getVariantComplexity,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphVariants;
}