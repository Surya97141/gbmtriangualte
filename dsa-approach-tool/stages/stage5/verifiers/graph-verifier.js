// stages/stage5/verifiers/graph-verifier.js
// 5D — Graph property verification
// Used by: stage5.js

const GraphVerifier = (() => {

  const VERIFIER = {
    id      : 'graph_verifier',
    label   : 'Graph Property Verification',
    purpose : 'Confirm graph type before choosing algorithm — wrong type = wrong algorithm',
    when    : 'Use whenever leaning toward a graph direction',
  };

  const CHECKS = [
    {
      id      : 'directed_check',
      label   : 'Directed vs Undirected',
      question: 'Are edges one-directional? Does A→B imply B→A?',
      why     : 'Cycle detection, SCC, and topological sort require directed graph. Union Find works for undirected.',
      options : [
        { id: 'directed',   label: 'Directed',   implication: 'Use DFS 3-color for cycle detection. Topological sort possible. SCC algorithms apply.' },
        { id: 'undirected', label: 'Undirected',  implication: 'Use Union Find or DFS+parent for cycle detection. Bipartite check available.' },
      ],
    },
    {
      id      : 'weighted_check',
      label   : 'Weighted vs Unweighted',
      question: 'Do edges have numeric costs or distances?',
      why     : 'BFS only works for unweighted. Weighted requires Dijkstra or Bellman-Ford.',
      options : [
        { id: 'weighted',   label: 'Weighted',   implication: 'BFS gives wrong shortest path. Use Dijkstra (non-neg) or Bellman-Ford (neg).' },
        { id: 'unweighted', label: 'Unweighted',  implication: 'BFS gives optimal shortest path in O(V+E).' },
      ],
    },
    {
      id      : 'negative_check',
      label   : 'Negative edge weights',
      question: 'Can any edge weight be negative?',
      why     : 'Negative weights eliminate Dijkstra entirely.',
      options : [
        { id: 'negative',    label: 'Negative possible', implication: 'Dijkstra FAILS. Use Bellman-Ford (SSSP) or Floyd-Warshall (APSP).' },
        { id: 'non_negative',label: 'All non-negative',   implication: 'Dijkstra is safe.' },
      ],
    },
    {
      id      : 'cycle_check',
      label   : 'Cycles in graph',
      question: 'Can the graph contain cycles?',
      why     : 'DAG enables topological sort and O(V+E) longest path. Cyclic graph needs cycle handling.',
      options : [
        { id: 'acyclic',        label: 'Acyclic (DAG)',  implication: 'Topological sort valid. DP in topological order. Longest path in O(V+E).' },
        { id: 'cycles_possible',label: 'Cycles possible', implication: 'Must track visited nodes. Topological sort may fail.' },
      ],
    },
    {
      id      : 'density_check',
      label   : 'Graph density',
      question: 'Is E closer to V or to V²?',
      why     : 'Dense graph may warrant adjacency matrix. Sparse graph must use adjacency list.',
      options : [
        { id: 'sparse', label: 'Sparse (E ≈ V)',  implication: 'Adjacency list. Dijkstra with PQ: O((V+E) log V).' },
        { id: 'dense',  label: 'Dense (E ≈ V²)',  implication: 'Adjacency matrix acceptable if V ≤ 4000. Dijkstra with array: O(V²).' },
      ],
    },
    {
      id      : 'special_check',
      label   : 'Special structure',
      question: 'Does the graph have special structure (tree, bipartite, DAG)?',
      why     : 'Special structures enable specialized algorithms.',
      options : [
        { id: 'tree',      label: 'Tree',       implication: 'DFS from root. Tree DP. LCA queries. Diameter in two DFS passes.' },
        { id: 'bipartite', label: 'Bipartite',  implication: 'Maximum matching via Hopcroft-Karp. König\'s theorem.' },
        { id: 'dag',       label: 'DAG',        implication: 'Topological DP. Longest/shortest path in O(V+E).' },
        { id: 'general',   label: 'General',    implication: 'No special structure — use standard graph algorithms.' },
      ],
    },
  ];

  const ALGORITHM_MATRIX = [
    {
      goal          : 'Shortest path',
      unweighted    : 'BFS — O(V+E)',
      weighted_pos  : 'Dijkstra PQ — O((V+E) log V)',
      weighted_neg  : 'Bellman-Ford — O(V×E)',
      all_pairs     : 'Floyd-Warshall — O(V³), V ≤ 500',
    },
    {
      goal          : 'Cycle detection',
      directed      : 'DFS 3-color — O(V+E)',
      undirected    : 'DFS + parent OR Union Find',
      functional    : "Floyd's — O(n) time O(1) space",
    },
    {
      goal          : 'Connectivity',
      undirected    : 'BFS/DFS or Union Find — O(V+E)',
      directed_scc  : 'Tarjan or Kosaraju — O(V+E)',
    },
    {
      goal          : 'Topological order',
      standard      : "Kahn's BFS — O(V+E), detects cycle",
      recursive     : 'DFS post-order + reverse',
    },
    {
      goal          : 'MST',
      sparse        : "Kruskal's — O(E log E)",
      dense         : "Prim's — O((V+E) log V)",
    },
  ];

  function getVerifier()       { return { ...VERIFIER }; }
  function getChecks()         { return [...CHECKS]; }
  function getAlgorithmMatrix(){ return [...ALGORITHM_MATRIX]; }

  function buildResult(checkAnswers) {
    const issues = [];

    // Check for common conflicts
    if (checkAnswers.weighted === 'weighted' && checkAnswers.algorithm === 'bfs') {
      issues.push('BFS cannot give shortest path in weighted graph — use Dijkstra');
    }
    if (checkAnswers.negative === 'negative' && checkAnswers.algorithm === 'dijkstra') {
      issues.push('Dijkstra fails with negative weights — use Bellman-Ford');
    }
    if (checkAnswers.directed_check === 'undirected' && checkAnswers.algorithm === 'tarjan_scc') {
      issues.push('SCC is for directed graphs only — use connected components for undirected');
    }
    if (checkAnswers.cycle_check === 'directed' && checkAnswers.detection === 'union_find') {
      issues.push('Union Find does not respect edge direction — use DFS 3-color for directed graphs');
    }

    return {
      issues,
      passed: issues.length === 0,
      verdict: issues.length === 0
        ? { label: 'Properties verified ✓', color: 'green',  message: 'Graph properties confirmed — algorithm choice is valid' }
        : { label: 'Conflicts found ✗',      color: 'red',    message: `${issues.length} algorithm conflict(s) — review before coding` },
    };
  }

  function getAlgorithmForConditions(conditions) {
    const { weighted, negative, directed, goal, allPairs } = conditions;

    if (goal === 'shortest_path') {
      if (!weighted)             return 'BFS — O(V+E)';
      if (negative)              return 'Bellman-Ford — O(V×E)';
      if (allPairs)              return 'Floyd-Warshall — O(V³)';
      return 'Dijkstra with Priority Queue — O((V+E) log V)';
    }
    if (goal === 'topological')  return "Kahn's Algorithm — O(V+E)";
    if (goal === 'scc')          return 'Tarjan — O(V+E)';
    if (goal === 'mst')          return "Kruskal's — O(E log E)";
    return 'BFS/DFS — O(V+E)';
  }

  return {
    getVerifier,
    getChecks,
    getAlgorithmMatrix,
    buildResult,
    getAlgorithmForConditions,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphVerifier;
}