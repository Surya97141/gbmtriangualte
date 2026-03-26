// stages/stage3/graph-deepdive/graph-properties.js
// Graph property definitions — directed, weighted, density, special structures
// Used by: graph-classifier.js, stage3.js

const GraphProperties = (() => {

  // ─── CORE PROPERTIES ──────────────────────────────────────────────────────

  const PROPERTIES = [
    {
      id          : 'gp_directed',
      label       : 'Directed',
      question    : 'Are edges one-way? Does A→B imply B→A?',
      category    : 'structure',
      values      : [
        {
          id      : 'directed',
          label   : 'Directed (one-way edges)',
          sublabel: 'A→B does NOT imply B→A',
          signals : [
            'Problem mentions prerequisites, dependencies, flow direction',
            'Words: "from A to B", "one-way", "incoming", "outgoing"',
            'Topological ordering is asked for',
            'Course schedule, task dependencies, compilation order',
          ],
          implications: [
            'Cycle detection needs DFS 3-color (not Union Find)',
            'Topological sort is possible if no cycles (DAG)',
            'SCC algorithms apply (Tarjan, Kosaraju)',
            'Reachability is NOT symmetric — A reaches B ≠ B reaches A',
            'In-degree and out-degree are distinct and matter',
          ],
          eliminates: [
            'Simple Union Find for connectivity',
            'Undirected connected component algorithms',
          ],
        },
        {
          id      : 'undirected',
          label   : 'Undirected (bidirectional edges)',
          sublabel: 'A-B means both A→B and B→A',
          signals : [
            'Problem mentions roads, friendships, connections, adjacency',
            'Words: "between", "connected", "neighbor"',
            'No direction implied in relationships',
          ],
          implications: [
            'Cycle detection with parent tracking in DFS',
            'Union Find works directly for connectivity',
            'Bipartite check with 2-coloring',
            'Bridge and articulation point finding (Tarjan)',
            'MST algorithms (Kruskal, Prim) applicable',
          ],
          eliminates: [
            'SCC (makes no sense for undirected — use connected components)',
            'Topological sort (undirected graphs can have cycles freely)',
          ],
        },
      ],
      watchOut    : 'Do not use 3-color DFS cycle detection on undirected graphs — parent edge causes false positive',
    },

    {
      id          : 'gp_weighted',
      label       : 'Weighted',
      question    : 'Do edges carry a numeric weight, cost, or distance?',
      category    : 'structure',
      values      : [
        {
          id      : 'weighted',
          label   : 'Weighted',
          sublabel: 'Edges have associated numeric values',
          signals : [
            'Problem gives travel time, cost, distance, capacity',
            'Asks for minimum cost path or maximum flow',
            'Edge list includes a third value: (u, v, weight)',
          ],
          implications: [
            'BFS no longer gives shortest path — use Dijkstra or Bellman-Ford',
            'MST algorithms use edge weights (Kruskal sorts by weight)',
            'Negative weights possible — must check for Dijkstra eligibility',
          ],
          eliminates: [
            'BFS for shortest path',
          ],
        },
        {
          id      : 'unweighted',
          label   : 'Unweighted',
          sublabel: 'All edges have equal cost (effectively cost 1)',
          signals : [
            'Problem asks for minimum number of steps, hops, or moves',
            'Edge list contains only (u, v) pairs — no weight',
            'Grid movement with uniform cost per cell',
          ],
          implications: [
            'BFS gives shortest path in O(V+E) — optimal',
            'No need for priority queue',
            'Level-order BFS = shortest distance',
          ],
          eliminates: [
            'Dijkstra (overkill for unweighted)',
            'Bellman-Ford (unnecessary complexity)',
          ],
        },
        {
          id      : 'zero_one',
          label   : 'Weights are only 0 or 1',
          sublabel: 'Special case — some edges free, others cost 1',
          signals : [
            'Movement is free in some directions, costs 1 in others',
            'Teleportation (cost 0) vs walking (cost 1)',
          ],
          implications: [
            '0-1 BFS with deque — O(V+E) like BFS but handles mixed costs',
            'Push 0-cost edges to front of deque, 1-cost to back',
            'Faster than Dijkstra for this specific case',
          ],
          eliminates: [
            'Standard BFS (wrong for cost-1 edges)',
            'Dijkstra (overkill — O(V+E) solution exists)',
          ],
        },
      ],
      watchOut    : 'Never use BFS for shortest path in weighted graph — gives wrong answer silently',
    },

    {
      id          : 'gp_negative',
      label       : 'Negative weights',
      question    : 'Can any edge weight be negative?',
      category    : 'weight',
      values      : [
        {
          id      : 'all_positive',
          label   : 'All non-negative',
          sublabel: 'All edge weights ≥ 0',
          signals : [
            'Problem involves distances, costs, or times (inherently non-negative)',
            'No mention of penalties or profit loss',
          ],
          implications: [
            'Dijkstra is applicable and optimal',
            'Greedy relaxation in Dijkstra is valid',
          ],
          eliminates: [],
        },
        {
          id      : 'negative_possible',
          label   : 'Negative weights possible',
          sublabel: 'Some edge weights may be < 0',
          signals : [
            'Problem mentions penalties, discounts, profit differences',
            'Currency exchange with conversion rates',
            'Maximizing value (negate values to minimize)',
          ],
          implications: [
            'Dijkstra FAILS — eliminate it immediately',
            'Use Bellman-Ford for single-source shortest path',
            'Use Floyd-Warshall for all-pairs',
            'Must check for negative cycles — makes shortest path undefined',
          ],
          eliminates: [
            'Dijkstra (all variants)',
            'A* search',
          ],
        },
        {
          id      : 'negative_cycle',
          label   : 'Negative cycle exists or possible',
          sublabel: 'A cycle whose total weight is negative',
          signals : [
            'Currency arbitrage problems',
            'Problem asks to detect negative cycles specifically',
            'Bellman-Ford still relaxes in round V',
          ],
          implications: [
            'Shortest path is undefined if negative cycle is reachable',
            'Bellman-Ford detects negative cycles in V-th round',
            'Floyd-Warshall: negative cycle if dist[i][i] < 0 after algorithm',
            'Problem may be asking to detect or report the cycle itself',
          ],
          eliminates: [
            'All standard shortest path algorithms as optimization',
          ],
        },
      ],
      watchOut    : 'Dijkstra with negative edges gives wrong answer — no error, just incorrect result',
    },

    {
      id          : 'gp_density',
      label       : 'Graph density',
      question    : 'Is the graph sparse (E ≈ V) or dense (E ≈ V²)?',
      category    : 'size',
      values      : [
        {
          id      : 'sparse',
          label   : 'Sparse',
          sublabel: 'E ≈ V or E ≈ V log V — most nodes have low degree',
          signals : [
            'Each node connects to a small number of neighbors',
            'Tree-like structure or grid with obstacles',
            'Road networks — each city connects to a few roads',
          ],
          implications: [
            'Use adjacency list — O(V+E) space',
            'Dijkstra with priority queue: O((V+E) log V)',
            'BFS/DFS: O(V+E)',
          ],
          eliminates: [
            'Adjacency matrix (wastes O(V²) memory for sparse graph)',
            'Dijkstra with array (O(V²) — worse than PQ for sparse)',
          ],
        },
        {
          id      : 'dense',
          label   : 'Dense',
          sublabel: 'E ≈ V² — most pairs of nodes are connected',
          signals : [
            'Complete or near-complete graph',
            'Tournament graphs',
            'V is small (V ≤ 1000) with many edges',
          ],
          implications: [
            'Adjacency matrix acceptable: O(V²) space, O(1) edge lookup',
            'Dijkstra with array: O(V²) — beats PQ when E = O(V²)',
            'Floyd-Warshall feasible if V ≤ 500',
          ],
          eliminates: [],
        },
      ],
      watchOut    : 'Dense graph with V=10^5: adjacency matrix = 40GB. Always check V before choosing representation.',
    },

    {
      id          : 'gp_cycles',
      label       : 'Cycles',
      question    : 'Can the graph contain cycles?',
      category    : 'structure',
      values      : [
        {
          id      : 'acyclic',
          label   : 'Acyclic (DAG or tree)',
          sublabel: 'No cycles guaranteed by problem constraints',
          signals : [
            'Problem guarantees valid ordering exists',
            'Dependencies always flow forward',
            'Tree structure given',
            '"Assume no circular dependencies"',
          ],
          implications: [
            'Topological sort always succeeds',
            'DP in topological order gives optimal paths',
            'Longest path in DAG solvable in O(V+E)',
            'No need for Bellman-Ford negative cycle check on DAG',
          ],
          eliminates: [
            'Cycle detection algorithms (not needed)',
            'SCC (trivial — each node is its own SCC)',
          ],
        },
        {
          id      : 'cycles_possible',
          label   : 'Cycles possible',
          sublabel: 'Graph may contain cycles',
          signals : [
            'No explicit guarantee of acyclicity',
            'General graph problem',
            'Friendship or road network (naturally cyclic)',
          ],
          implications: [
            'Must handle cycles in traversal — use visited array',
            'Topological sort may fail — check after Kahn\'s',
            'Shortest path algorithms must handle cycles',
          ],
          eliminates: [
            'Simple recursion without memoization (infinite loop risk)',
          ],
        },
        {
          id      : 'must_detect',
          label   : 'Must detect if cycles exist',
          sublabel: 'Problem asks to determine if graph is cyclic',
          signals : [
            '"Can all courses be completed?"',
            '"Is there a circular dependency?"',
            '"Does a valid ordering exist?"',
          ],
          implications: [
            'Directed: DFS 3-color or Kahn\'s (check if processed count < V)',
            'Undirected: DFS with parent tracking or Union Find',
          ],
          eliminates: [],
        },
      ],
    },

    {
      id          : 'gp_special',
      label       : 'Special structure',
      question    : 'Does the graph have a special structure?',
      category    : 'special',
      values      : [
        {
          id      : 'tree',
          label   : 'Tree',
          sublabel: 'Connected, V nodes, V-1 edges, no cycles',
          signals : [
            'Problem says "tree" explicitly',
            'Exactly n-1 edges for n nodes',
            'Rooted tree with parent-child relationships',
          ],
          implications: [
            'DFS from root gives parent-child structure',
            'Tree DP: post-order traversal',
            'LCA queries: Binary Lifting',
            'Diameter: two BFS/DFS passes',
            'Euler tour for subtree range queries',
          ],
          watchOut: 'Recursive DFS on skewed tree with n=10^5 → stack overflow. Use iterative.',
        },
        {
          id      : 'bipartite',
          label   : 'Bipartite',
          sublabel: 'Nodes split into two sets, edges only cross sets',
          signals : [
            'Matching problems: workers to jobs',
            'Two distinct types of nodes',
            '2-colorable — no odd cycles',
            '"Assign X to Y" problems',
          ],
          implications: [
            'Maximum matching: Hopcroft-Karp O(E√V)',
            'Maximum independent set = V - maximum matching (König)',
            'Minimum vertex cover = maximum matching (König)',
            'Check bipartiteness: BFS 2-coloring',
          ],
          watchOut: 'König\'s theorem ONLY holds for bipartite graphs',
        },
        {
          id      : 'grid',
          label   : 'Grid / implicit graph',
          sublabel: 'Cells in 2D grid — adjacency defined by movement rules',
          signals : [
            '2D matrix with movement (up/down/left/right)',
            'Cells connected by proximity',
            'No explicit edge list — adjacency is positional',
          ],
          implications: [
            'Do NOT build explicit adjacency list — generate neighbors on the fly',
            'BFS for shortest path (uniform cost)',
            '0-1 BFS for mixed cost movement',
            'DFS for reachability / flood fill',
          ],
          watchOut: 'Always check bounds before processing neighbor: 0 ≤ r < rows AND 0 ≤ c < cols',
        },
        {
          id      : 'dag',
          label   : 'DAG (Directed Acyclic Graph)',
          sublabel: 'Directed + guaranteed no cycles',
          signals : [
            'Directed + problem guarantees acyclicity',
            'Dependencies, prerequisites with no circular refs',
            'Build order, compilation order',
          ],
          implications: [
            'Topological sort always valid',
            'DP in topological order: O(V+E)',
            'Longest path in O(V+E) — unlike general graphs',
            'Shortest path without negative cycles concern',
          ],
          watchOut: 'Verify no cycles before assuming DAG. If problem does not guarantee — must check.',
        },
        {
          id      : 'complete',
          label   : 'Complete graph',
          sublabel: 'Every pair of nodes is connected',
          signals : [
            'All-pairs distances needed',
            'E = V(V-1)/2',
            'Small V guaranteed',
          ],
          implications: [
            'Adjacency matrix appropriate',
            'Floyd-Warshall feasible if V ≤ 500',
            'Dijkstra with array O(V²) beats PQ',
          ],
          watchOut: 'Complete graph for V=10^5 has 5×10⁹ edges — cannot store',
        },
        {
          id      : 'functional',
          label   : 'Functional graph',
          sublabel: 'Each node has exactly one outgoing edge (out-degree 1)',
          signals : [
            'Array where next[i] defines the next node from i',
            'Each element maps to exactly one other element',
            'Permutation or successor function',
          ],
          implications: [
            'Rho structure (ρ): tails leading into cycles',
            'Floyd\'s cycle detection: O(n) time O(1) space',
            'Binary lifting for k-th successor queries',
            'Cycle detection + cycle length in O(n)',
          ],
          watchOut: 'Do not confuse with general directed graph — out-degree 1 gives special structure',
        },
      ],
    },

    {
      id          : 'gp_size',
      label       : 'Size constraints',
      question    : 'What are V (vertices) and E (edges)?',
      category    : 'size',
      values      : [
        {
          id      : 'tiny',
          label   : 'V ≤ 10, E ≤ 45',
          sublabel: 'Tiny — brute force or bitmask feasible',
          implications: [
            'Floyd-Warshall: V³ = 1000 ops — trivially fast',
            'Bitmask DP over nodes feasible',
            'Brute force path enumeration possible',
          ],
        },
        {
          id      : 'small',
          label   : 'V ≤ 500, E ≤ 250,000',
          sublabel: 'Small — O(V²) algorithms work',
          implications: [
            'Floyd-Warshall: V³ = 1.25 × 10⁸ — borderline feasible',
            'Dijkstra with array: V² = 250,000 — fast',
            'Adjacency matrix: V² = 250,000 — acceptable',
          ],
        },
        {
          id      : 'medium',
          label   : 'V ≤ 10,000, E ≤ 10⁵',
          sublabel: 'Medium — O(V log V + E) algorithms needed',
          implications: [
            'Floyd-Warshall: V³ = 10¹² — TLE',
            'Dijkstra with PQ: (V+E) log V ≈ 10⁶ — fast',
            'Adjacency list essential',
          ],
          eliminates: ['Floyd-Warshall', 'Dijkstra with array'],
        },
        {
          id      : 'large',
          label   : 'V ≤ 100,000, E ≤ 10⁶',
          sublabel: 'Large — O(E log V) or better required',
          implications: [
            'Dijkstra with PQ: (V+E) log V ≈ 2 × 10⁷ — fast',
            'BFS/DFS: V+E = 10⁶ — fast',
            'Kruskal: E log E ≈ 2 × 10⁷ — fast',
            'Adjacency list mandatory',
          ],
          eliminates: [
            'Floyd-Warshall',
            'Dijkstra with array',
            'Adjacency matrix (10¹⁰ bytes = 40GB)',
          ],
        },
      ],
    },
  ];

  // ─── REPRESENTATION GUIDE ─────────────────────────────────────────────────

  const REPRESENTATION_GUIDE = [
    {
      structure : 'Adjacency List',
      when      : 'Default choice for most problems. Always use for sparse graphs.',
      space     : 'O(V + E)',
      edgeLookup: 'O(degree)',
      bestFor   : ['BFS', 'DFS', 'Dijkstra with PQ', 'Kruskal', 'Topological sort'],
      code      : `vector<vector<pair<int,int>>> adj(V); // adj[u] = {v, weight}
adj[u].push_back({v, w});`,
    },
    {
      structure : 'Adjacency Matrix',
      when      : 'Dense graphs with V ≤ 3000-4000. Floyd-Warshall. O(1) edge check.',
      space     : 'O(V²)',
      edgeLookup: 'O(1)',
      bestFor   : ['Floyd-Warshall', 'Dense graph Dijkstra', 'Small tournament graphs'],
      code      : `vector<vector<int>> dist(V, vector<int>(V, INF));
dist[u][v] = w; dist[u][u] = 0;`,
    },
    {
      structure : 'Edge List',
      when      : 'Kruskal\'s MST, Bellman-Ford. When you iterate over all edges repeatedly.',
      space     : 'O(E)',
      edgeLookup: 'O(E)',
      bestFor   : ['Kruskal', 'Bellman-Ford', 'Edge-centric algorithms'],
      code      : `vector<tuple<int,int,int>> edges; // {weight, u, v}
edges.push_back({w, u, v});`,
    },
    {
      structure : 'Implicit (generate neighbors on the fly)',
      when      : 'Grid graphs, state graphs, word ladder. No explicit storage.',
      space     : 'O(1) extra',
      edgeLookup: 'O(1) — compute from position',
      bestFor   : ['Grid BFS', 'State space BFS', 'Word ladder'],
      code      : `// Grid neighbors — generated on the fly
int dr[] = {-1,1,0,0}, dc[] = {0,0,-1,1};
for (int d = 0; d < 4; d++) {
  int nr = r + dr[d], nc = c + dc[d];
  if (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
    process(nr, nc);
}`,
    },
  ];

  // ─── MEMORY IMPLICATIONS ──────────────────────────────────────────────────

  const MEMORY_IMPLICATIONS = [
    {
      v       : 1000,
      adjList : '~8KB (sparse)',
      adjMatrix: '4MB',
      verdict : 'Both fine. Use matrix if V² edge checks needed.',
    },
    {
      v       : 10000,
      adjList : '~80KB (sparse)',
      adjMatrix: '400MB',
      verdict : 'Adjacency list only. Matrix exceeds 256MB limit.',
    },
    {
      v       : 100000,
      adjList : '~800KB (sparse)',
      adjMatrix: '40GB',
      verdict : 'Adjacency list mandatory. Matrix is physically impossible.',
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAll()                { return [...PROPERTIES]; }
  function getById(id)             { return PROPERTIES.find(p => p.id === id) ?? null; }
  function getByCategory(cat)      { return PROPERTIES.filter(p => p.category === cat); }
  function getRepresentations()    { return [...REPRESENTATION_GUIDE]; }
  function getMemoryImplications() { return [...MEMORY_IMPLICATIONS]; }

  // Get all implications from a set of selected property values
  function collectImplications(selections) {
    const implications = new Set();
    const eliminates   = new Set();

    selections.forEach(({ propertyId, valueId }) => {
      const prop = getById(propertyId);
      if (!prop) return;
      const val = prop.values.find(v => v.id === valueId);
      if (!val) return;
      (val.implications ?? []).forEach(i => implications.add(i));
      (val.eliminates   ?? []).forEach(e => eliminates.add(e));
    });

    return {
      implications: [...implications],
      eliminates  : [...eliminates],
    };
  }

  // Get best representation given V and E
  function recommendRepresentation(v, e) {
    const ratio = e / (v * v);
    if (ratio > 0.5 && v <= 4000) return REPRESENTATION_GUIDE[1]; // matrix
    if (e < v * Math.log2(v) * 3) return REPRESENTATION_GUIDE[0]; // list
    return REPRESENTATION_GUIDE[0]; // default list
  }

  // Check if adjacency matrix is feasible at given V
  function matrixFeasible(v, memLimitMB = 256) {
    const bytes = v * v * 4;
    const mb    = bytes / (1024 * 1024);
    return { feasible: mb <= memLimitMB, mb: mb.toFixed(1) };
  }

  return {
    getAll,
    getById,
    getByCategory,
    getRepresentations,
    getMemoryImplications,
    collectImplications,
    recommendRepresentation,
    matrixFeasible,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphProperties;
}