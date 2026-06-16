// stages/stage7/output/code-chunker.js
// Splits a direction's codeShape into named, translated chunks for Stage 8.
// Called by Stage 8 when entering the code-translation flow.
//
// chunkCodeShape(direction, graphGoal, dpSubtype, inputType, graphProperties?)
//   → Array<Chunk>
//
// Chunk shape:
//   { id, stepNumber, name, mentalModelLine, code: { python, javascript, cpp, java } }

const CodeChunker = (() => {

  // ─── PUBLIC ENTRY POINT ────────────────────────────────────────────────────

  // graphProperties is optional — needed only to distinguish BFS from Dijkstra
  // when graphGoal === 'shortest_path'.
  function chunkCodeShape(direction, graphGoal, dpSubtype, inputType, graphProperties) {
    const props  = graphProperties ?? {};
    const family = _identifyFamily(direction, graphGoal, dpSubtype, props);

    switch (family) {
      case 'kruskal_mst':  return _chunksKruskal();
      case 'bfs':          return _chunksBFS();
      case 'dijkstra':     return _chunksDijkstra();
      case 'dp_1d':        return _chunksDP1D();
      default:             return _fallbackChunks(direction);
    }
  }

  // ─── FAMILY IDENTIFICATION ─────────────────────────────────────────────────

  function _identifyFamily(direction, graphGoal, dpSubtype, graphProperties) {
    const label    = (direction.label ?? '').toLowerCase();
    const id       = (direction.id   ?? '').toLowerCase();
    const weighted = graphProperties.weighted === 'yes';

    if (graphGoal === 'mst' || label.includes('kruskal') || label.includes('mst')) {
      return 'kruskal_mst';
    }

    if (graphGoal === 'shortest_path' || label.includes('shortest')) {
      if (weighted || label.includes('dijkstra')) return 'dijkstra';
      return 'bfs';
    }

    if (
      dpSubtype === 'lis_type'   ||
      dpSubtype === '1d_linear'  ||
      label.includes('lis')      ||
      (id.includes('dp') && !label.includes('2d') && !label.includes('knapsack'))
    ) {
      return 'dp_1d';
    }

    return 'fallback';
  }

  // ─── FAMILY 1 — KRUSKAL MST + UNION FIND ───────────────────────────────────
  // graphGoal === 'mst'

  function _chunksKruskal() {
    return [
      {
        id            : 'chunk_1',
        stepNumber    : 1,
        name          : 'Union Find — loop detector',
        mentalModelLine: 'This answers one question: are these two nodes already in the same group? If yes, adding this edge creates a loop — skip it.',
        code: {
          python: [
            'class UnionFind:',
            '    def __init__(self, n):',
            '        self.parent = list(range(n))',
            '    def find(self, x):',
            '        if self.parent[x] != x:',
            '            self.parent[x] = self.find(self.parent[x])',
            '        return self.parent[x]',
            '    def union(self, x, y):',
            '        px, py = self.find(x), self.find(y)',
            '        if px == py: return False',
            '        self.parent[px] = py',
            '        return True',
          ].join('\n'),

          javascript: [
            'class UnionFind {',
            '  constructor(n) {',
            '    this.parent = Array.from({length: n}, (_, i) => i);',
            '  }',
            '  find(x) {',
            '    if (this.parent[x] !== x)',
            '      this.parent[x] = this.find(this.parent[x]);',
            '    return this.parent[x];',
            '  }',
            '  union(x, y) {',
            '    const px = this.find(x), py = this.find(y);',
            '    if (px === py) return false;',
            '    this.parent[px] = py;',
            '    return true;',
            '  }',
            '}',
          ].join('\n'),

          cpp: [
            'struct UnionFind {',
            '    vector<int> parent;',
            '    UnionFind(int n) : parent(n) {',
            '        iota(parent.begin(), parent.end(), 0);',
            '    }',
            '    int find(int x) {',
            '        if (parent[x] != x)',
            '            parent[x] = find(parent[x]);',
            '        return parent[x];',
            '    }',
            '    bool unite(int x, int y) {',
            '        int px = find(x), py = find(y);',
            '        if (px == py) return false;',
            '        parent[px] = py;',
            '        return true;',
            '    }',
            '};',
          ].join('\n'),

          java: [
            'class UnionFind {',
            '    int[] parent;',
            '    UnionFind(int n) {',
            '        parent = new int[n];',
            '        for (int i = 0; i < n; i++) parent[i] = i;',
            '    }',
            '    int find(int x) {',
            '        if (parent[x] != x)',
            '            parent[x] = find(parent[x]);',
            '        return parent[x];',
            '    }',
            '    boolean union(int x, int y) {',
            '        int px = find(x), py = find(y);',
            '        if (px == py) return false;',
            '        parent[px] = py;',
            '        return true;',
            '    }',
            '}',
          ].join('\n'),
        },
      },

      {
        id            : 'chunk_2',
        stepNumber    : 2,
        name          : 'Sort edges by cost',
        mentalModelLine: 'The greedy rule: always consider the cheapest road first. Sorting makes this possible.',
        code: {
          python     : 'edges.sort(key=lambda e: e[2])',
          javascript : 'edges.sort((a, b) => a[2] - b[2]);',
          cpp        : 'sort(edges.begin(), edges.end(),\n    [](const auto& a, const auto& b){ return a[2] < b[2]; });',
          java       : 'Arrays.sort(edges, (a, b) -> a[2] - b[2]);',
        },
      },

      {
        id            : 'chunk_3',
        stepNumber    : 3,
        name          : 'Build the MST',
        mentalModelLine: 'Walk through sorted edges. Add each one unless it creates a loop. Stop when n-1 edges are added.',
        code: {
          python: [
            'uf = UnionFind(n)',
            'mst = []',
            'for u, v, w in edges:',
            '    if uf.union(u, v):',
            '        mst.append((u, v, w))',
            '        if len(mst) == n - 1:',
            '            break',
          ].join('\n'),

          javascript: [
            'const uf = new UnionFind(n);',
            'const mst = [];',
            'for (const [u, v, w] of edges) {',
            '  if (uf.union(u, v)) {',
            '    mst.push([u, v, w]);',
            '    if (mst.length === n - 1) break;',
            '  }',
            '}',
          ].join('\n'),

          cpp: [
            'UnionFind uf(n);',
            'vector<array<int,3>> mst;',
            'for (auto& e : edges) {',
            '    if (uf.unite(e[0], e[1])) {',
            '        mst.push_back(e);',
            '        if ((int)mst.size() == n - 1) break;',
            '    }',
            '}',
          ].join('\n'),

          java: [
            'UnionFind uf = new UnionFind(n);',
            'List<int[]> mst = new ArrayList<>();',
            'for (int[] e : edges) {',
            '    if (uf.union(e[0], e[1])) {',
            '        mst.add(e);',
            '        if (mst.size() == n - 1) break;',
            '    }',
            '}',
          ].join('\n'),
        },
      },

      {
        id            : 'chunk_4',
        stepNumber    : 4,
        name          : 'Return result',
        mentalModelLine: 'The MST is complete. Return the edges or their total weight depending on what the problem asks.',
        code: {
          python     : 'return sum(w for u, v, w in mst)',
          javascript : 'return mst.reduce((sum, [u, v, w]) => sum + w, 0);',
          cpp        : 'int total = 0;\nfor (auto& e : mst) total += e[2];\nreturn total;',
          java       : 'int total = 0;\nfor (int[] e : mst) total += e[2];\nreturn total;',
        },
      },
    ];
  }

  // ─── FAMILY 2 — BFS SHORTEST PATH ─────────────────────────────────────────
  // graphGoal === 'shortest_path' && graphProperties.weighted !== 'yes'

  function _chunksBFS() {
    return [
      {
        id            : 'chunk_1',
        stepNumber    : 1,
        name          : 'Queue and visited set',
        mentalModelLine: 'BFS explores level by level — all nodes 1 step away, then all 2 steps away. The queue enforces this order.',
        code: {
          python: [
            'from collections import deque',
            'queue = deque([(start, 0)])',
            'visited = {start}',
          ].join('\n'),

          javascript: [
            '// Array used as queue; shift() acts as popleft',
            'const queue = [[start, 0]];',
            'const visited = new Set([start]);',
          ].join('\n'),

          cpp: [
            'queue<pair<int,int>> q;',
            'unordered_set<int> visited;',
            'q.push({start, 0});',
            'visited.insert(start);',
          ].join('\n'),

          java: [
            'Queue<int[]> queue = new LinkedList<>();',
            'Set<Integer> visited = new HashSet<>();',
            'queue.offer(new int[]{start, 0});',
            'visited.add(start);',
          ].join('\n'),
        },
      },

      {
        id            : 'chunk_2',
        stepNumber    : 2,
        name          : 'BFS loop',
        mentalModelLine: 'Process each node, add its unvisited neighbours. First time we reach the target is the shortest path.',
        code: {
          python: [
            'while queue:',
            '    node, dist = queue.popleft()',
            '    if node == target:',
            '        return dist',
            '    for nei in graph[node]:',
            '        if nei not in visited:',
            '            visited.add(nei)',
            '            queue.append((nei, dist + 1))',
            'return -1',
          ].join('\n'),

          javascript: [
            'while (queue.length) {',
            '  const [node, dist] = queue.shift();',
            '  if (node === target) return dist;',
            '  for (const nei of (graph[node] || [])) {',
            '    if (!visited.has(nei)) {',
            '      visited.add(nei);',
            '      queue.push([nei, dist + 1]);',
            '    }',
            '  }',
            '}',
            'return -1;',
          ].join('\n'),

          cpp: [
            'while (!q.empty()) {',
            '    auto [node, dist] = q.front(); q.pop();',
            '    if (node == target) return dist;',
            '    for (int nei : graph[node]) {',
            '        if (!visited.count(nei)) {',
            '            visited.insert(nei);',
            '            q.push({nei, dist + 1});',
            '        }',
            '    }',
            '}',
            'return -1;',
          ].join('\n'),

          java: [
            'while (!queue.isEmpty()) {',
            '    int[] curr = queue.poll();',
            '    int node = curr[0], dist = curr[1];',
            '    if (node == target) return dist;',
            '    for (int nei : graph.getOrDefault(node, Collections.emptyList())) {',
            '        if (!visited.contains(nei)) {',
            '            visited.add(nei);',
            '            queue.offer(new int[]{nei, dist + 1});',
            '        }',
            '    }',
            '}',
            'return -1;',
          ].join('\n'),
        },
      },
    ];
  }

  // ─── FAMILY 3 — DIJKSTRA SHORTEST PATH ────────────────────────────────────
  // graphGoal === 'shortest_path' && graphProperties.weighted === 'yes'

  function _chunksDijkstra() {
    return [
      {
        id            : 'chunk_1',
        stepNumber    : 1,
        name          : 'Min-heap and distances',
        mentalModelLine: 'We always process the cheapest unvisited node next. A min-heap enforces this greedily.',
        code: {
          python: [
            'import heapq',
            'dist = [float(\'inf\')] * n',
            'dist[src] = 0',
            'heap = [(0, src)]',
          ].join('\n'),

          // A self-contained MinHeap is included here so the chunk is runnable
          // without an external library — JS has no built-in priority queue.
          javascript: [
            'class MinHeap {',
            '  constructor() { this.h = []; }',
            '  push(item) { this.h.push(item); this._up(this.h.length - 1); }',
            '  pop() {',
            '    const top = this.h[0], last = this.h.pop();',
            '    if (this.h.length) { this.h[0] = last; this._down(0); }',
            '    return top;',
            '  }',
            '  get size() { return this.h.length; }',
            '  _up(i) {',
            '    while (i > 0) {',
            '      const p = (i - 1) >> 1;',
            '      if (this.h[p][0] <= this.h[i][0]) break;',
            '      [this.h[p], this.h[i]] = [this.h[i], this.h[p]]; i = p;',
            '    }',
            '  }',
            '  _down(i) {',
            '    const n = this.h.length;',
            '    while (true) {',
            '      let s = i, l = 2*i+1, r = 2*i+2;',
            '      if (l < n && this.h[l][0] < this.h[s][0]) s = l;',
            '      if (r < n && this.h[r][0] < this.h[s][0]) s = r;',
            '      if (s === i) break;',
            '      [this.h[s], this.h[i]] = [this.h[i], this.h[s]]; i = s;',
            '    }',
            '  }',
            '}',
            'const dist = new Array(n).fill(Infinity);',
            'dist[src] = 0;',
            'const heap = new MinHeap();',
            'heap.push([0, src]);',
          ].join('\n'),

          cpp: [
            'vector<int> dist(n, INT_MAX);',
            'dist[src] = 0;',
            'priority_queue<pair<int,int>,',
            '    vector<pair<int,int>>,',
            '    greater<pair<int,int>>> pq;',
            'pq.push({0, src});',
          ].join('\n'),

          java: [
            'int[] dist = new int[n];',
            'Arrays.fill(dist, Integer.MAX_VALUE);',
            'dist[src] = 0;',
            'PriorityQueue<int[]> pq =',
            '    new PriorityQueue<>((a, b) -> a[0] - b[0]);',
            'pq.offer(new int[]{0, src});',
          ].join('\n'),
        },
      },

      {
        id            : 'chunk_2',
        stepNumber    : 2,
        name          : 'Dijkstra loop',
        mentalModelLine: 'Pop cheapest node. Relax its neighbours — if going through this node is cheaper, update and re-add to heap.',
        code: {
          python: [
            'while heap:',
            '    d, u = heapq.heappop(heap)',
            '    if d > dist[u]: continue',
            '    for v, w in graph[u]:',
            '        if dist[u] + w < dist[v]:',
            '            dist[v] = dist[u] + w',
            '            heapq.heappush(heap, (dist[v], v))',
          ].join('\n'),

          javascript: [
            'while (heap.size) {',
            '  const [d, u] = heap.pop();',
            '  if (d > dist[u]) continue;',
            '  for (const [v, w] of (graph[u] || [])) {',
            '    if (dist[u] + w < dist[v]) {',
            '      dist[v] = dist[u] + w;',
            '      heap.push([dist[v], v]);',
            '    }',
            '  }',
            '}',
          ].join('\n'),

          cpp: [
            'while (!pq.empty()) {',
            '    auto [d, u] = pq.top(); pq.pop();',
            '    if (d > dist[u]) continue;',
            '    for (auto [v, w] : graph[u]) {',
            '        if (dist[u] + w < dist[v]) {',
            '            dist[v] = dist[u] + w;',
            '            pq.push({dist[v], v});',
            '        }',
            '    }',
            '}',
          ].join('\n'),

          java: [
            'while (!pq.isEmpty()) {',
            '    int[] curr = pq.poll();',
            '    int d = curr[0], u = curr[1];',
            '    if (d > dist[u]) continue;',
            '    for (int[] edge : graph.getOrDefault(u, Collections.emptyList())) {',
            '        int v = edge[0], w = edge[1];',
            '        if (dist[u] + w < dist[v]) {',
            '            dist[v] = dist[u] + w;',
            '            pq.offer(new int[]{dist[v], v});',
            '        }',
            '    }',
            '}',
          ].join('\n'),
        },
      },

      {
        id            : 'chunk_3',
        stepNumber    : 3,
        name          : 'Return distances',
        mentalModelLine: 'dist[target] now holds the minimum cost from src to every node. Return the full array or just dist[target] depending on what the problem asks.',
        code: {
          python     : 'return dist',
          javascript : 'return dist;',
          cpp        : 'return dist;',
          java       : 'return dist;',
        },
      },
    ];
  }

  // ─── FAMILY 4 — 1D DP (LIS / SUBARRAY TYPE) ───────────────────────────────
  // dpSubtype === 'lis_type' || dpSubtype === '1d_linear'

  function _chunksDP1D() {
    return [
      {
        id            : 'chunk_1',
        stepNumber    : 1,
        name          : 'DP array initialisation',
        mentalModelLine: 'Each dp[i] stores the best answer considering only the first i elements. Start with the base case: each element alone.',
        code: {
          python     : 'n = len(nums)\ndp = [1] * n',
          javascript : 'const n = nums.length;\nconst dp = new Array(n).fill(1);',
          cpp        : 'int n = nums.size();\nvector<int> dp(n, 1);',
          java       : 'int n = nums.length;\nint[] dp = new int[n];\nArrays.fill(dp, 1);',
        },
      },

      {
        id            : 'chunk_2',
        stepNumber    : 2,
        name          : 'Fill the DP table',
        mentalModelLine: 'For each position, look back at all previous positions and take the best valid transition.',
        code: {
          python: [
            'for i in range(1, n):',
            '    for j in range(i):',
            '        if nums[j] < nums[i]:',
            '            dp[i] = max(dp[i], dp[j] + 1)',
          ].join('\n'),

          javascript: [
            'for (let i = 1; i < n; i++) {',
            '  for (let j = 0; j < i; j++) {',
            '    if (nums[j] < nums[i]) {',
            '      dp[i] = Math.max(dp[i], dp[j] + 1);',
            '    }',
            '  }',
            '}',
          ].join('\n'),

          cpp: [
            'for (int i = 1; i < n; i++)',
            '    for (int j = 0; j < i; j++)',
            '        if (nums[j] < nums[i])',
            '            dp[i] = max(dp[i], dp[j] + 1);',
          ].join('\n'),

          java: [
            'for (int i = 1; i < n; i++)',
            '    for (int j = 0; j < i; j++)',
            '        if (nums[j] < nums[i])',
            '            dp[i] = Math.max(dp[i], dp[j] + 1);',
          ].join('\n'),
        },
      },

      {
        id            : 'chunk_3',
        stepNumber    : 3,
        name          : 'Extract answer',
        mentalModelLine: 'The final answer is the maximum value across all dp[i] — the longest valid sequence ending at any position.',
        code: {
          python     : 'return max(dp)',
          javascript : 'return Math.max(...dp);',
          cpp        : 'return *max_element(dp.begin(), dp.end());',
          java       : 'int ans = 0;\nfor (int x : dp) ans = Math.max(ans, x);\nreturn ans;',
        },
      },
    ];
  }

  // ─── FALLBACK — SPLIT EXISTING CODE SHAPE ─────────────────────────────────
  // For algorithm families not listed above: split codeShape by blank lines
  // into groups of 3-5 lines. All four languages show the same pseudocode.

  function _fallbackChunks(direction) {
    const raw = (direction.codeShape ?? '').trim();

    if (!raw) {
      return [{
        id             : 'chunk_1',
        stepNumber     : 1,
        name           : 'Step 1',
        mentalModelLine: 'Connect this code to the mental model you built before starting.',
        code: {
          python    : '# No code shape available for this direction.',
          javascript: '// No code shape available for this direction.',
          cpp       : '// No code shape available for this direction.',
          java      : '// No code shape available for this direction.',
        },
      }];
    }

    // Split on blank lines first; then group lines so each chunk is 3-5 lines
    const allLines = raw.split('\n');
    const groups   = [];
    let   current  = [];

    allLines.forEach(line => {
      if (line.trim() === '' && current.length >= 3) {
        groups.push(current.slice());
        current = [];
      } else {
        current.push(line);
        if (current.length === 5) {
          groups.push(current.slice());
          current = [];
        }
      }
    });
    if (current.length) groups.push(current);

    return groups.map((lines, idx) => {
      const code = lines.join('\n');
      return {
        id             : `chunk_${idx + 1}`,
        stepNumber     : idx + 1,
        name           : `Step ${idx + 1}`,
        mentalModelLine: 'Connect this code to the mental model you built before starting.',
        code: {
          python    : code,
          javascript: code,
          cpp       : code,
          java      : code,
        },
      };
    });
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return { chunkCodeShape };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = CodeChunker;
