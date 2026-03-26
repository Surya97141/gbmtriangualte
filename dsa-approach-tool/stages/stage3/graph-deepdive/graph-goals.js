// stages/stage3/graph-deepdive/graph-goals.js
// Graph goal definitions — what the problem is asking for on the graph
// Used by: graph-classifier.js, stage3.js

const GraphGoals = (() => {

  // ─── GOAL DEFINITIONS ─────────────────────────────────────────────────────

  const GOALS = [
    {
      id          : 'gg_shortest_path',
      label       : 'Shortest / minimum cost path',
      category    : 'path',
      question    : 'Find minimum cost or fewest steps from source to target',
      recognize   : [
        'Minimum distance from A to B',
        'Minimum number of steps/moves/hops',
        'Cheapest route between two nodes',
        'Shortest time to reach destination',
        '"What is the minimum cost to get from X to Y"',
      ],
      decisionTree: [
        {
          check    : 'Are edges unweighted (or all cost 1)?',
          ifYes    : 'BFS — O(V+E)',
          ifNo     : 'continue',
        },
        {
          check    : 'Are edge weights only 0 or 1?',
          ifYes    : '0-1 BFS with deque — O(V+E)',
          ifNo     : 'continue',
        },
        {
          check    : 'Are all edge weights non-negative?',
          ifYes    : 'Dijkstra with Priority Queue — O((V+E) log V)',
          ifNo     : 'continue',
        },
        {
          check    : 'Need all-pairs shortest path? V ≤ 500?',
          ifYes    : 'Floyd-Warshall — O(V³)',
          ifNo     : 'continue',
        },
        {
          check    : 'Negative weights, single source?',
          ifYes    : 'Bellman-Ford — O(V × E)',
          ifNo     : 'continue',
        },
        {
          check    : 'Negative weights, all-pairs, large V?',
          ifYes    : "Johnson's Algorithm — O(V² log V + VE)",
          ifNo     : 'No standard shortest path applies — check for negative cycle',
        },
      ],
      algorithms  : [
        {
          name      : 'BFS',
          when      : 'Unweighted graph',
          complexity: 'O(V + E)',
          note      : 'Level order = shortest hops. Never use for weighted.',
        },
        {
          name      : '0-1 BFS',
          when      : 'Edge weights are exactly 0 or 1',
          complexity: 'O(V + E)',
          note      : 'Deque — 0-cost to front, 1-cost to back.',
        },
        {
          name      : 'Dijkstra (Priority Queue)',
          when      : 'Weighted, all non-negative, sparse',
          complexity: 'O((V+E) log V)',
          note      : 'Standard choice for weighted shortest path.',
        },
        {
          name      : 'Dijkstra (Array)',
          when      : 'Weighted, all non-negative, dense (E ≈ V²)',
          complexity: 'O(V²)',
          note      : 'Better than PQ when E = O(V²).',
        },
        {
          name      : 'Bellman-Ford',
          when      : 'Negative edge weights',
          complexity: 'O(V × E)',
          note      : 'Also detects negative cycles — V-th round still relaxes.',
        },
        {
          name      : 'Floyd-Warshall',
          when      : 'All-pairs, V ≤ 500',
          complexity: 'O(V³)',
          note      : 'Simple 3-loop DP. Handles negatives (not negative cycles).',
        },
        {
          name      : 'A* Search',
          when      : 'Single target, heuristic available',
          complexity: 'O((V+E) log V) worst case',
          note      : 'Faster in practice for single target with admissible heuristic.',
        },
      ],
      keyInsight  : 'Algorithm choice is almost entirely determined by edge weights. Check weights first.',
      watchOut    : [
        'BFS on weighted graph → wrong answer, no error message',
        'Dijkstra on negative weights → wrong answer silently',
        'Floyd-Warshall at V=1000 → TLE (10⁹ ops)',
      ],
    },

    {
      id          : 'gg_reachability',
      label       : 'Reachability — can I get from A to B?',
      category    : 'traversal',
      question    : 'Determine if target is reachable from source',
      recognize   : [
        'Is node B reachable from node A?',
        'Can all nodes be reached from source?',
        'Is the graph connected?',
        '"Is there a path from X to Y?"',
        'Flood fill — how many cells reachable from start',
      ],
      decisionTree: [
        {
          check    : 'Undirected graph — simple connectivity?',
          ifYes    : 'BFS or DFS from source — O(V+E)',
          ifNo     : 'continue',
        },
        {
          check    : 'Directed graph — one source to one target?',
          ifYes    : 'BFS/DFS from source — O(V+E)',
          ifNo     : 'continue',
        },
        {
          check    : 'Many connectivity queries on undirected graph?',
          ifYes    : 'Union Find — O(α(V)) per query after O(E) build',
          ifNo     : 'BFS/DFS from each query source',
        },
      ],
      algorithms  : [
        {
          name      : 'BFS',
          when      : 'Single source, shortest path as bonus',
          complexity: 'O(V + E)',
          note      : 'Also gives distance as bonus.',
        },
        {
          name      : 'DFS',
          when      : 'Reachability only, path not needed',
          complexity: 'O(V + E)',
          note      : 'Simpler recursively but risks stack overflow for n=10^5.',
        },
        {
          name      : 'Union Find',
          when      : 'Undirected graph, many connectivity queries',
          complexity: 'O(α(V)) per query',
          note      : 'Best for dynamic edges added over time.',
        },
      ],
      watchOut    : [
        'Directed graph: A reaches B ≠ B reaches A',
        'Check all components — graph may be disconnected',
        'DFS recursion depth for n=10^5 skewed graph → stack overflow',
      ],
    },

    {
      id          : 'gg_components',
      label       : 'Connected components',
      category    : 'traversal',
      question    : 'Count or identify separate connected groups',
      recognize   : [
        'How many separate groups/islands/clusters exist?',
        'Which nodes belong to the same group?',
        'Count connected islands in grid',
        'Find all nodes reachable from each other',
        '"Group all mutually connected nodes"',
      ],
      decisionTree: [
        {
          check    : 'Undirected graph, static edges?',
          ifYes    : 'BFS/DFS — count calls from unvisited nodes',
          ifNo     : 'continue',
        },
        {
          check    : 'Undirected, edges added dynamically?',
          ifYes    : 'Union Find — dynamic connectivity',
          ifNo     : 'continue',
        },
        {
          check    : 'Directed graph — strongly connected components?',
          ifYes    : 'Tarjan or Kosaraju — O(V+E)',
          ifNo     : 'BFS/DFS for weakly connected components',
        },
      ],
      algorithms  : [
        {
          name      : 'BFS/DFS Component Count',
          when      : 'Static undirected graph',
          complexity: 'O(V + E)',
          note      : 'Count BFS/DFS calls on unvisited nodes = component count.',
        },
        {
          name      : 'Union Find',
          when      : 'Dynamic edges, many queries',
          complexity: 'O(E α(V))',
          note      : 'Count roots = component count after all unions.',
        },
        {
          name      : 'Tarjan / Kosaraju',
          when      : 'Directed graph SCCs',
          complexity: 'O(V + E)',
          note      : 'Directed SCCs ≠ undirected components.',
        },
      ],
      watchOut    : [
        'Undirected components vs directed SCCs are completely different',
        'Grid islands: count BFS calls from unvisited land cells',
        'Union Find count: number of nodes where find(i) == i',
      ],
    },

    {
      id          : 'gg_topological_sort',
      label       : 'Topological ordering',
      category    : 'ordering',
      question    : 'Find a linear order respecting all directed dependencies',
      recognize   : [
        'What order to take courses given prerequisites?',
        'What order to compile files given dependencies?',
        'Can all tasks be completed?',
        '"Find a valid ordering such that all dependencies are satisfied"',
        '"Is there a circular dependency?"',
      ],
      decisionTree: [
        {
          check    : 'Need to detect cycle + get ordering?',
          ifYes    : "Kahn's Algorithm — O(V+E), cycle detection built in",
          ifNo     : 'continue',
        },
        {
          check    : 'Prefer recursive DFS formulation?',
          ifYes    : 'DFS post-order + reverse — O(V+E)',
          ifNo     : "Kahn's Algorithm (default choice)",
        },
      ],
      algorithms  : [
        {
          name      : "Kahn's Algorithm",
          when      : 'Standard topological sort with cycle detection',
          complexity: 'O(V + E)',
          note      : 'Process in-degree 0 nodes. If count < V — cycle exists.',
          code      : `vector<int> indegree(V, 0);
for (auto [u,v] : edges) indegree[v]++;
queue<int> q;
for (int i=0; i<V; i++) if (indegree[i]==0) q.push(i);
vector<int> order;
while (!q.empty()) {
  int u = q.front(); q.pop();
  order.push_back(u);
  for (int v : adj[u]) if (--indegree[v] == 0) q.push(v);
}
bool hasCycle = (order.size() < V);`,
        },
        {
          name      : 'DFS Post-Order Topological Sort',
          when      : 'Recursive preference',
          complexity: 'O(V + E)',
          note      : 'Add node to result AFTER visiting all descendants. Reverse at end.',
        },
      ],
      watchOut    : [
        'Only valid for DAGs. If cycle exists — topological sort impossible.',
        "After Kahn's: check order.size() == V. Partial order is wrong.",
        'Multiple valid topological orders may exist — any is usually acceptable.',
      ],
    },

    {
      id          : 'gg_spanning_tree',
      label       : 'Minimum spanning tree',
      category    : 'tree',
      question    : 'Connect all nodes with minimum total edge cost',
      recognize   : [
        'Connect all nodes with minimum total wire/road/cost',
        'n-1 edges connecting all n nodes at minimum cost',
        '"Minimum cost to connect all cities"',
        '"What is the cheapest network connecting all nodes?"',
      ],
      decisionTree: [
        {
          check    : 'Sparse graph?',
          ifYes    : "Kruskal's — O(E log E)",
          ifNo     : 'continue',
        },
        {
          check    : 'Dense graph?',
          ifYes    : "Prim's — O((V+E) log V)",
          ifNo     : "Kruskal's (default)",
        },
      ],
      algorithms  : [
        {
          name      : "Kruskal's",
          when      : 'Sparse graphs — sort edges + Union Find',
          complexity: 'O(E log E)',
          note      : 'Sort edges by weight, add if no cycle. Simpler to implement.',
          code      : `sort(edges.begin(), edges.end());
vector<int> par(V); iota(par.begin(), par.end(), 0);
function<int(int)> find = [&](int x) {
  return par[x]==x ? x : par[x]=find(par[x]);
};
long long cost = 0; int cnt = 0;
for (auto [w,u,v] : edges) {
  if (find(u) != find(v)) {
    par[find(u)] = find(v);
    cost += w; cnt++;
    if (cnt == V-1) break;
  }
}`,
        },
        {
          name      : "Prim's",
          when      : 'Dense graphs — grow from source',
          complexity: 'O((V+E) log V)',
          note      : 'Better for dense graphs where E ≈ V².',
        },
      ],
      watchOut    : [
        'MST only for undirected graphs. Directed → minimum arborescence (much harder).',
        'If graph is disconnected — MST does not exist (minimum spanning forest).',
        'Maximum spanning tree: negate weights then run MST.',
      ],
    },

    {
      id          : 'gg_cycle_detection',
      label       : 'Cycle detection',
      category    : 'structural',
      question    : 'Determine if graph contains a cycle',
      recognize   : [
        'Does this graph contain a cycle?',
        'Can all dependencies be satisfied (no circular dependency)?',
        'Is this a DAG?',
        '"Detect if there is a cycle in the directed/undirected graph"',
      ],
      decisionTree: [
        {
          check    : 'Directed graph?',
          ifYes    : 'DFS 3-color — O(V+E)',
          ifNo     : 'continue',
        },
        {
          check    : 'Undirected, static edges?',
          ifYes    : 'DFS with parent OR Union Find — O(V+E)',
          ifNo     : 'continue',
        },
        {
          check    : 'Undirected, dynamic edge additions?',
          ifYes    : 'Union Find — detect when union of same component',
          ifNo     : 'DFS with parent tracking',
        },
      ],
      algorithms  : [
        {
          name      : 'DFS 3-color (directed)',
          when      : 'Directed graph cycle detection',
          complexity: 'O(V + E)',
          note      : 'White=unvisited, Gray=in-stack, Black=done. Gray→Gray = cycle.',
        },
        {
          name      : 'DFS with parent (undirected)',
          when      : 'Undirected static graph',
          complexity: 'O(V + E)',
          note      : 'Back edge to non-parent = cycle.',
        },
        {
          name      : 'Union Find (undirected)',
          when      : 'Undirected, online edge additions',
          complexity: 'O(E α(V))',
          note      : 'Same component when union attempted = cycle.',
        },
        {
          name      : "Floyd's Cycle (functional graph)",
          when      : 'Each node has exactly one outgoing edge',
          complexity: 'O(n) time O(1) space',
          note      : 'Slow + fast pointer meet inside cycle.',
        },
      ],
      watchOut    : [
        '3-color DFS on undirected graph → false positives from parent edge',
        'Undirected DFS: track parent to avoid false cycle via parent edge',
        "Kahn's cycle detection: if topological order contains < V nodes → cycle exists",
      ],
    },

    {
      id          : 'gg_scc',
      label       : 'Strongly connected components',
      category    : 'structural',
      question    : 'Find groups where every node can reach every other',
      recognize   : [
        'Find groups where all nodes mutually reachable',
        'Condense directed graph into DAG of SCCs',
        '2-SAT (reduces to SCC)',
        '"Which nodes form strongly connected groups?"',
        '"After condensation — what is the DAG structure?"',
      ],
      algorithms  : [
        {
          name      : "Tarjan's Algorithm",
          when      : 'One-pass DFS',
          complexity: 'O(V + E)',
          note      : 'Outputs SCCs in reverse topological order of condensation DAG.',
          code      : `// Tarjan SCC
int timer = 0;
vector<int> disc(V,-1), low(V), comp(V,-1);
vector<bool> onStack(V,false);
stack<int> st;
int numSCC = 0;

function<void(int)> dfs = [&](int u) {
  disc[u] = low[u] = timer++;
  st.push(u); onStack[u] = true;
  for (int v : adj[u]) {
    if (disc[v] == -1) { dfs(v); low[u] = min(low[u], low[v]); }
    else if (onStack[v]) low[u] = min(low[u], disc[v]);
  }
  if (low[u] == disc[u]) {
    while (true) {
      int v = st.top(); st.pop();
      onStack[v] = false;
      comp[v] = numSCC;
      if (v == u) break;
    }
    numSCC++;
  }
};
for (int i=0; i<V; i++) if (disc[i]==-1) dfs(i);`,
        },
        {
          name      : "Kosaraju's Algorithm",
          when      : 'Two-pass DFS — conceptually simpler',
          complexity: 'O(V + E)',
          note      : 'Pass 1: DFS on original → finish order. Pass 2: DFS on reversed graph in reverse finish order.',
        },
      ],
      watchOut    : [
        'After SCC condensation — result is ALWAYS a DAG. Apply DAG DP after.',
        'SCC ≠ connected components. Directed graph requires different algorithm.',
        '2-SAT: literal x and ¬x in same SCC → unsatisfiable.',
      ],
    },

    {
      id          : 'gg_bridges',
      label       : 'Bridges and articulation points',
      category    : 'structural',
      question    : 'Find edges or nodes whose removal disconnects the graph',
      recognize   : [
        'Critical connections in a network',
        '"Which edges if removed disconnect the graph?"',
        '"Which nodes are single points of failure?"',
        'Network reliability analysis',
        'Find all bridges in undirected graph',
      ],
      algorithms  : [
        {
          name      : "Tarjan's Bridge Finding",
          when      : 'Find all bridge edges',
          complexity: 'O(V + E)',
          note      : 'Edge (u,v) is bridge if low[v] > disc[u].',
          code      : `int timer = 0;
vector<int> disc(V,-1), low(V);
vector<pair<int,int>> bridges;

function<void(int,int)> dfs = [&](int u, int parent) {
  disc[u] = low[u] = timer++;
  for (int v : adj[u]) {
    if (disc[v] == -1) {
      dfs(v, u);
      low[u] = min(low[u], low[v]);
      if (low[v] > disc[u]) bridges.push_back({u, v});
    } else if (v != parent) {
      low[u] = min(low[u], disc[v]);
    }
  }
};
for (int i=0; i<V; i++) if (disc[i]==-1) dfs(i,-1);`,
        },
        {
          name      : "Tarjan's Articulation Points",
          when      : 'Find all articulation point nodes',
          complexity: 'O(V + E)',
          note      : 'Node u is articulation point if child v has low[v] >= disc[u] (non-root), or u is root with 2+ children.',
        },
      ],
      watchOut    : [
        'Both use disc[] and low[] arrays — low[v] = min discovery time reachable from subtree of v',
        'Parallel edges need careful handling — do not use edge index 0,1,2 to distinguish parent',
        'Root of DFS tree is articulation point only if it has ≥ 2 DFS children',
      ],
    },

    {
      id          : 'gg_bipartite',
      label       : 'Bipartite check or matching',
      category    : 'matching',
      question    : 'Check if graph is bipartite or find maximum matching',
      recognize   : [
        'Can nodes be split into two groups with no within-group edges?',
        'Assign items from set A to items from set B',
        'Workers and jobs — find maximum assignment',
        '"Is this graph 2-colorable?"',
        'Maximum matching in bipartite graph',
      ],
      decisionTree: [
        {
          check    : 'Only need to check if bipartite?',
          ifYes    : 'BFS 2-coloring — O(V+E)',
          ifNo     : 'continue',
        },
        {
          check    : 'Need maximum bipartite matching?',
          ifYes    : 'Hungarian or Hopcroft-Karp',
          ifNo     : 'BFS check suffices',
        },
      ],
      algorithms  : [
        {
          name      : 'BFS 2-coloring',
          when      : 'Check bipartiteness only',
          complexity: 'O(V + E)',
          note      : 'Try to 2-color. Conflict on same-color edge = not bipartite.',
        },
        {
          name      : 'Hungarian (Augmenting Path)',
          when      : 'Maximum bipartite matching — simple implementation',
          complexity: 'O(V × E)',
          note      : 'Find augmenting paths via DFS. Each path increases matching by 1.',
        },
        {
          name      : 'Hopcroft-Karp',
          when      : 'Maximum bipartite matching — large graphs',
          complexity: 'O(E √V)',
          note      : 'Find all shortest augmenting paths in each BFS phase.',
        },
      ],
      watchOut    : [
        'Verify graph is bipartite before applying matching algorithms',
        "König's theorem (MIS = V - max matching) only holds for bipartite graphs",
        'Hopcroft-Karp is significantly faster for large inputs — prefer over Hungarian',
      ],
    },

    {
      id          : 'gg_max_flow',
      label       : 'Maximum flow / minimum cut',
      category    : 'flow',
      question    : 'Find maximum flow through network from source to sink',
      recognize   : [
        'Maximum amount that can flow from source to sink',
        'Pipes with capacities — maximum water flow',
        '"What is the maximum number of edge-disjoint paths?"',
        'Min-cut = max-flow (by max-flow min-cut theorem)',
        'Minimum number of edges to remove to disconnect source from sink',
      ],
      algorithms  : [
        {
          name      : 'Edmonds-Karp (BFS Ford-Fulkerson)',
          when      : 'General max flow, moderate size',
          complexity: 'O(V × E²)',
          note      : 'BFS finds shortest augmenting path. More predictable than DFS Ford-Fulkerson.',
        },
        {
          name      : "Dinic's Algorithm",
          when      : 'Large flow networks — faster in practice',
          complexity: 'O(V² × E)',
          note      : 'Layer graph + blocking flow. Much faster in practice than Edmonds-Karp.',
          code      : `// Dinic's — build level graph with BFS, find blocking flow with DFS
// Standard template — commonly used in competitive programming`,
        },
      ],
      keyInsight  : 'Max-flow min-cut theorem: maximum flow = minimum cut. Often problems asking for minimum cut are solved via max flow.',
      watchOut    : [
        'Max flow on bipartite graph = maximum bipartite matching',
        'Dinic\'s on unit capacity graphs runs in O(E √V) — same as Hopcroft-Karp',
        'Check for integer capacities — fractional capacities need careful handling',
      ],
    },

    {
      id          : 'gg_lca',
      label       : 'Lowest common ancestor',
      category    : 'tree',
      question    : 'Given tree — find common ancestor of two nodes',
      recognize   : [
        'Find common ancestor of nodes u and v in tree',
        'Distance between two nodes in tree',
        'Path from u to v in tree (goes through LCA)',
        '"What is the most recent common ancestor?"',
        'Range minimum query via Euler tour reduction',
      ],
      decisionTree: [
        {
          check    : 'q ≤ 100 queries?',
          ifYes    : 'Naive DFS — O(n) per query',
          ifNo     : 'continue',
        },
        {
          check    : 'q ≤ 10^5 queries?',
          ifYes    : 'Binary Lifting — O(n log n) preprocessing + O(log n) per query',
          ifNo     : 'continue',
        },
        {
          check    : 'q ≤ 10^6 queries and O(1) needed?',
          ifYes    : 'Euler Tour + Sparse Table RMQ — O(n log n) preprocessing + O(1) per query',
          ifNo     : 'Binary Lifting (safe default)',
        },
      ],
      algorithms  : [
        {
          name      : 'Naive DFS',
          when      : 'Few queries',
          complexity: 'O(n) per query',
          note      : 'Find path from root to both nodes, find divergence point.',
        },
        {
          name      : 'Binary Lifting',
          when      : 'Many queries — q up to 10^5',
          complexity: 'O(n log n) preprocess + O(log n) query',
          note      : 'Precompute 2^k ancestors. Jump both nodes to same depth then jump together.',
          code      : `const int LOG = 20;
vector<vector<int>> up(LOG, vector<int>(n+1, 0));
vector<int> depth(n+1, 0);

// BFS/DFS to fill up[0] (direct parent) and depth[]
// Then fill up[k][v] = up[k-1][up[k-1][v]] for k=1..LOG-1

auto lca = [&](int u, int v) {
  if (depth[u] < depth[v]) swap(u, v);
  int diff = depth[u] - depth[v];
  for (int k = 0; k < LOG; k++)
    if ((diff >> k) & 1) u = up[k][u];
  if (u == v) return u;
  for (int k = LOG-1; k >= 0; k--)
    if (up[k][u] != up[k][v]) { u = up[k][u]; v = up[k][v]; }
  return up[0][u];
};`,
        },
        {
          name      : 'Euler Tour + Sparse Table',
          when      : 'Extreme query count — O(1) per query',
          complexity: 'O(n log n) preprocess + O(1) query',
          note      : 'Reduce LCA to RMQ on Euler tour array. Sparse table for O(1) RMQ.',
        },
      ],
      watchOut    : [
        'Binary lifting requires rooted tree — choose/fix root before preprocessing',
        'Binary lifting needs O(n log n) space — fine for n ≤ 10^5',
        'LCA of node with itself = the node itself — handle as base case',
        'Dist(u,v) = depth[u] + depth[v] - 2 × depth[LCA(u,v)]',
      ],
    },

    {
      id          : 'gg_grid_path',
      label       : 'Shortest path in grid',
      category    : 'path',
      question    : 'Find minimum steps or cost to traverse a 2D grid',
      recognize   : [
        'Minimum steps from start cell to end cell',
        'Grid with obstacles — find shortest route',
        'Some cells blocked or have different movement costs',
        '"Minimum moves in matrix from (0,0) to (n-1,m-1)"',
      ],
      decisionTree: [
        {
          check    : 'All moves cost 1 (uniform cost)?',
          ifYes    : 'BFS — O(n × m)',
          ifNo     : 'continue',
        },
        {
          check    : 'Move costs are only 0 or 1?',
          ifYes    : '0-1 BFS — O(n × m)',
          ifNo     : 'continue',
        },
        {
          check    : 'Non-uniform move costs?',
          ifYes    : 'Dijkstra — O(n × m × log(n × m))',
          ifNo     : 'BFS default',
        },
      ],
      algorithms  : [
        {
          name      : 'BFS on grid',
          when      : 'Uniform movement cost',
          complexity: 'O(n × m)',
          note      : 'Add (r,c) to queue, mark visited, expand 4 directions.',
          code      : `vector<vector<int>> dist(rows, vector<int>(cols, -1));
queue<pair<int,int>> q;
dist[sr][sc] = 0; q.push({sr,sc});
int dr[]={-1,1,0,0}, dc[]={0,0,-1,1};
while (!q.empty()) {
  auto [r,c] = q.front(); q.pop();
  for (int d=0; d<4; d++) {
    int nr=r+dr[d], nc=c+dc[d];
    if (nr>=0 && nr<rows && nc>=0 && nc<cols
        && grid[nr][nc]!='#' && dist[nr][nc]==-1) {
      dist[nr][nc] = dist[r][c] + 1;
      q.push({nr,nc});
    }
  }
}`,
        },
        {
          name      : '0-1 BFS on grid',
          when      : 'Mixed 0/1 cost movement',
          complexity: 'O(n × m)',
          note      : 'Deque: free moves to front, cost-1 to back.',
        },
        {
          name      : 'Dijkstra on grid',
          when      : 'Cell-dependent costs',
          complexity: 'O(n × m × log(nm))',
          note      : 'Priority queue keyed on cost to reach cell.',
        },
      ],
      watchOut    : [
        'Always check bounds before pushing to queue — 0 ≤ r < rows AND 0 ≤ c < cols',
        'Mark visited WHEN pushed, not when popped — prevents re-queuing',
        'Multi-source BFS: add ALL sources to queue initially before starting',
      ],
    },
  ];

  // ─── GOAL CATEGORIZATION ──────────────────────────────────────────────────

  const CATEGORIES = [
    { id: 'path',       label: 'Path finding',          goals: ['gg_shortest_path', 'gg_reachability', 'gg_grid_path'] },
    { id: 'traversal',  label: 'Traversal',              goals: ['gg_reachability', 'gg_components'] },
    { id: 'ordering',   label: 'Ordering',               goals: ['gg_topological_sort'] },
    { id: 'tree',       label: 'Tree operations',        goals: ['gg_spanning_tree', 'gg_lca'] },
    { id: 'structural', label: 'Structural analysis',    goals: ['gg_cycle_detection', 'gg_scc', 'gg_bridges'] },
    { id: 'matching',   label: 'Matching',               goals: ['gg_bipartite'] },
    { id: 'flow',       label: 'Flow',                   goals: ['gg_max_flow'] },
  ];

  // ─── GOAL RECOGNITION KEYWORDS ────────────────────────────────────────────

  const KEYWORDS = {
    gg_shortest_path   : ['shortest', 'minimum cost', 'fewest steps', 'minimum distance', 'cheapest'],
    gg_reachability    : ['can reach', 'is reachable', 'connected', 'path exists', 'flood fill'],
    gg_components      : ['groups', 'islands', 'clusters', 'components', 'how many separate'],
    gg_topological_sort: ['order', 'schedule', 'prerequisites', 'dependencies', 'circular dependency'],
    gg_spanning_tree   : ['connect all', 'minimum spanning', 'minimum cost network', 'minimum wire'],
    gg_cycle_detection : ['cycle', 'circular', 'loop detection', 'acyclic', 'DAG check'],
    gg_scc             : ['strongly connected', 'condense', 'SCC', '2-SAT'],
    gg_bridges         : ['bridge', 'critical connection', 'articulation', 'single point of failure'],
    gg_bipartite       : ['bipartite', '2-colorable', 'matching', 'assign workers', 'assign tasks'],
    gg_max_flow        : ['max flow', 'minimum cut', 'capacity', 'disjoint paths', 'flow network'],
    gg_lca             : ['common ancestor', 'LCA', 'distance in tree', 'path in tree'],
    gg_grid_path       : ['grid', 'matrix', 'cells', 'rows and columns', 'minimum moves in grid'],
  };

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAll()          { return [...GOALS]; }
  function getById(id)       { return GOALS.find(g => g.id === id) ?? null; }
  function getCategories()   { return [...CATEGORIES]; }
  function getKeywords()     { return { ...KEYWORDS }; }

  // Get goals by category
  function getByCategory(categoryId) {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return [];
    return cat.goals.map(id => getById(id)).filter(Boolean);
  }

  // Match goal from problem text keywords
  function matchFromText(text) {
    const lower   = text.toLowerCase();
    let bestId    = null;
    let bestCount = 0;

    Object.entries(KEYWORDS).forEach(([id, keywords]) => {
      const count = keywords.filter(kw => lower.includes(kw)).length;
      if (count > bestCount) { bestCount = count; bestId = id; }
    });

    return bestId ? getById(bestId) : null;
  }

  // Get all algorithms for a goal
  function getAlgorithms(goalId) {
    const goal = getById(goalId);
    return goal?.algorithms ?? [];
  }

  // Get decision tree for a goal
  function getDecisionTree(goalId) {
    const goal = getById(goalId);
    return goal?.decisionTree ?? [];
  }

  // Get watchouts for a goal
  function getWatchOuts(goalId) {
    const goal = getById(goalId);
    return goal?.watchOut ?? [];
  }

  // Build full summary for selected goal + conditions
  function buildGoalSummary(goalId, conditions = {}) {
    const goal       = getById(goalId);
    if (!goal) return null;

    const algorithms = goal.algorithms ?? [];
    const applicable = algorithms.filter(alg => {
      if (conditions.weighted === false && alg.name === 'BFS') return true;
      if (conditions.weighted === true  && alg.name === 'BFS') return false;
      return true;
    });

    return {
      goal,
      applicableAlgorithms: applicable,
      decisionTree        : goal.decisionTree ?? [],
      watchOut            : goal.watchOut ?? [],
      keyInsight          : goal.keyInsight ?? null,
    };
  }

  return {
    getAll,
    getById,
    getCategories,
    getByCategory,
    getKeywords,
    matchFromText,
    getAlgorithms,
    getDecisionTree,
    getWatchOuts,
    buildGoalSummary,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphGoals;
}
