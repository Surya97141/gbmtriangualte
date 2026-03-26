// stages/stage6/edge-cases/graph-cases.js
// Edge cases specific to graph inputs
// Used by: stage6.js

const GraphCases = (() => {

  const CASES = [
    {
      id           : 'gc_single_node',
      label        : 'Graph with single node and no edges',
      priority     : 'critical',
      whyItMatters : 'Distance from node to itself = 0, not undefined. Connected components = 1. BFS/DFS from single node covers entire graph.',
      checkQuestion: 'Does your solution handle an isolated single node?',
      commonFailure: 'Returning 0 components instead of 1. Shortest path to self = 0 not handled (returns -1).',
      fix          : 'Initialize dist[src] = 0 before BFS. Component count starts at 0, increments when DFS starts from any unvisited node.',
      testInput    : 'V=1, E=0',
      expected     : '1 component, dist[0][0]=0, degree=0',
    },
    {
      id           : 'gc_disconnected',
      label        : 'Disconnected graph (multiple components)',
      priority     : 'critical',
      whyItMatters : 'BFS/DFS from single source marks some nodes unreachable. Algorithms that assume connectivity silently give wrong answers for disconnected nodes.',
      checkQuestion: 'Does your solution handle nodes unreachable from the source?',
      commonFailure: 'Topological sort: skips nodes unreachable from "start". Shortest path: returns -1 for unreachable (must check dist == INF).',
      fix          : 'BFS/DFS from EVERY unvisited node (outer for loop). Topological sort: iterate all nodes, not just those with indegree 0 initially.',
      testInput    : 'V=6: components {0,1,2} and {3,4,5} with no edges between them',
      expected     : '2 components. Unreachable dist = INF (or -1 by convention)',
    },
    {
      id           : 'gc_self_loop',
      label        : 'Node with self-loop (edge to itself)',
      priority     : 'high',
      whyItMatters : 'DFS visits node via self-loop and reports a cycle. Union Find tries to merge same component (no-op but may count as cycle).',
      checkQuestion: 'Does your cycle detection handle self-loops without false positives?',
      commonFailure: 'DFS: visited[u] = true, then edge u→u, visited[u] already true → reports cycle (correct for directed, but check semantics).',
      fix          : 'For undirected cycle detection: skip edge to parent. Self-loop: if u == v, it IS a cycle.',
      testInput    : 'Graph: edge (0,0)',
      expected     : 'Self-loop IS a cycle — report correctly',
    },
    {
      id           : 'gc_parallel_edges',
      label        : 'Multiple edges between same pair of nodes',
      priority     : 'high',
      whyItMatters : 'Kruskal may add both parallel edges (bug). Edge count vs pair count differs. Adjacency list has multiple entries for same neighbor.',
      checkQuestion: 'Does your solution correctly handle parallel edges?',
      commonFailure: 'Kruskal: if Union Find not used properly, may add both parallel edges to MST. Degree count double-counts parallel edges.',
      fix          : 'For MST: Union Find correctly rejects second edge between same pair. For simple graph problems: deduplicate edges first.',
      testInput    : 'Edges: (0,1,5), (0,1,3) — two edges between 0 and 1',
      expected     : 'MST uses edge with weight 3 only',
    },
    {
      id           : 'gc_negative_cycle',
      label        : 'Graph containing negative weight cycle',
      priority     : 'critical',
      whyItMatters : 'Negative cycle makes shortest path undefined — can keep cycling to reduce cost indefinitely. Bellman-Ford must detect and report this.',
      checkQuestion: 'Does your solution detect negative cycles and handle them correctly?',
      commonFailure: 'Running Bellman-Ford V-1 rounds without checking V-th round → returns wrong "shortest path" that passes through negative cycle.',
      fix          : 'After V-1 rounds: run one more round. If any edge still relaxes → negative cycle exists → return error.',
      testInput    : 'Directed triangle: 0→1 (w=1), 1→2 (w=-3), 2→0 (w=1). Cycle sum = -1.',
      expected     : 'Report "negative cycle detected", not wrong distances',
    },
    {
      id           : 'gc_complete_graph',
      label        : 'Complete graph (every pair connected)',
      priority     : 'high',
      whyItMatters : 'E = V(V-1)/2 for complete graph. Adjacency matrix is 40GB at V=10^5. Even listing all edges is too slow for large complete graphs.',
      checkQuestion: 'Does your solution handle dense graphs without MLE or TLE?',
      commonFailure: 'Building V×V adjacency matrix for V=10^5. O(V^2) edge iteration when only O(V) or O(E) needed.',
      fix          : 'Always check: for complete graph with V=10^5, E=5×10^9 — impossible to store all edges. Problem must have small V.',
      testInput    : 'Complete graph V=1000 — E=500,000 edges',
      expected     : 'Algorithm still runs in acceptable time with adjacency list',
    },
    {
      id           : 'gc_all_same_weight',
      label        : 'All edges have identical weight',
      priority     : 'medium',
      whyItMatters : 'Dijkstra degenerates to BFS behavior but with log factor overhead. MST: any spanning tree is minimum.',
      checkQuestion: 'Does your weighted graph algorithm give correct answer when all weights are equal?',
      commonFailure: 'Usually correct but verify: MST weight = (V-1) × edge_weight. Dijkstra gives same result as BFS.',
      fix          : 'This case is usually fine — verify output not algorithm behavior.',
      testInput    : 'All edges weight = 5',
      expected     : 'Dijkstra correct, MST weight = (V-1)×5',
    },
    {
      id           : 'gc_grid_bounds',
      label        : 'Grid graph — boundary cells',
      priority     : 'critical',
      whyItMatters : 'BFS on grids without bounds checking: accessing row -1 or row n causes array out of bounds crash or wrong cell processing.',
      checkQuestion: 'Does every neighbor generation in your grid BFS check bounds before accessing?',
      commonFailure: 'grid[-1][0] accessed without check. queue.push({r+dr, c+dc}) before checking validity.',
      fix          : 'Check BEFORE pushing: if (nr>=0 && nr<rows && nc>=0 && nc<cols && !visited[nr][nc]) push.',
      testInput    : 'Start from corner (0,0) or (n-1,m-1)',
      expected     : 'Only 2 valid neighbors from corner, no out-of-bounds',
    },
    {
      id           : 'gc_star_graph',
      label        : 'Star graph (one center, all others connect only to center)',
      priority     : 'medium',
      whyItMatters : 'Diameter = 2 (any two leaves through center). Center is an articulation point. All nodes reachable from center in 1 hop.',
      checkQuestion: 'Does your solution correctly handle star topology?',
      commonFailure: 'Diameter calculation: direct leaf-to-leaf path goes through center → distance = 2, not 1.',
      fix          : 'Trace BFS from a leaf: distance to center=1, distance to all other leaves=2. Verify.',
      testInput    : 'V=6: center=0, leaves=1,2,3,4,5',
      expected     : 'Diameter=2, center is articulation point',
    },
  ];

  function getAll()         { return [...CASES]; }
  function getById(id)      { return CASES.find(c => c.id === id) ?? null; }
  function getCritical()    { return CASES.filter(c => c.priority === 'critical'); }
  function getByPriority(p) { return CASES.filter(c => c.priority === p); }

  return { getAll, getById, getCritical, getByPriority };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphCases;
}