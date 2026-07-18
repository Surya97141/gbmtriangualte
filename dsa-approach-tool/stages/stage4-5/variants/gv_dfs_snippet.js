// INSERT this object into the existing VARIANTS array in
// stages/stage4-5/variants/graph-variants.js (it is currently missing
// plain DFS as its own direction -- Tarjan's SCC uses DFS internally but
// is not the same recommendation as "just do a DFS to check connectivity
// or find a cycle").

{
  id          : 'gv_dfs',
  label       : 'DFS (plain)',
  tagline     : 'Explore as deep as possible before backtracking',
  complexity  : 'O(V + E)',
  when        : [
    'Check connectivity or find connected components',
    'Detect a cycle in a graph',
    'Explore all reachable nodes, order does not matter',
  ],
  template    : `vector<bool> visited(n, false);
void dfs(int u) {
  visited[u] = true;
  for (int v : adj[u]) {
    if (!visited[v]) dfs(v);
  }
}`,
  checkQuestion: 'Do you just need reachability/connectivity/cycle-detection, not shortest path?',
  watchOut    : [
    'Mark a node visited BEFORE recursing into it, not after -- otherwise cycles cause infinite recursion',
    'Recursion depth can overflow on very deep graphs -- switch to an explicit stack for large n',
    'If you actually need shortest path/steps, use BFS instead -- DFS does not guarantee minimal distance',
  ],
  examples    : [
    'Number of Connected Components',
    'Detect Cycle in an Undirected/Directed Graph',
    'Flood Fill',
  ],
},
