// stages/stage7/output/direction-builder.js
// Builds the final 2-3 candidate directions shown in Stage 7 output
// Each direction has: label, why, verify-before, failure-conditions, complexity
// Used by: stage7.js

const DirectionBuilder = (() => {

  // ─── DIRECTION TEMPLATES ──────────────────────────────────────────────────
  // These are the canonical directions the tool can recommend.
  // Each is assembled from structural property answers in Stage 3.

  const DIRECTION_TEMPLATES = [
    {
      id          : 'dir_binary_search_answer',
      family      : 'binary_search',
      label       : 'Binary Search on Answer',
      complexity  : 'O(log(range) × isFeasible)',
      trigger     : {
        requires : ['feasibility_boundary_yes'],
        boosts   : ['order_sensitivity_no'],
        excludes : [],
      },
      why         : 'The answer has a monotonic feasibility boundary — if X works, X+1 also works. Binary search finds the boundary in O(log(range)) calls to isFeasible.',
      verifyBefore: 'Write isFeasible(X). Confirm with two concrete examples: one where X is feasible and one where X is not. Verify the boundary is clean.',
      codeShape   : `int lo = MIN_ANS, hi = MAX_ANS;
while (lo < hi) {
  int mid = lo + (hi - lo) / 2;
  if (isFeasible(mid)) hi = mid;
  else                 lo = mid + 1;
}
return lo;`,
      watchOut    : [
        'isFeasible must be monotone — validate before writing',
        'lo/hi: lo = min possible answer, hi = max possible answer',
        'Minimize: hi = mid. Maximize: lo = mid (with upper mid)',
      ],
    },
    {
      id          : 'dir_dp_1d',
      family      : 'dp',
      label       : '1D Dynamic Programming',
      complexity  : 'O(n) or O(n²) depending on transitions',
      trigger     : {
        requires : ['subproblem_overlap_yes', 'order_sensitivity_yes'],
        boosts   : ['dependency_structure_linear'],
        excludes : ['feasibility_boundary_yes'],
      },
      why         : 'Subproblems overlap and depend on the sequence order. Each state dp[i] captures the optimal answer for a prefix ending at index i.',
      verifyBefore: 'Define dp[i] precisely. Ask: given only i and dp[0..i-1], can I determine dp[i]? If yes, state is complete.',
      codeShape   : `vector<int> dp(n, INF);
dp[0] = base;
for (int i = 1; i < n; i++)
  for (int j = 0; j < i; j++)
    if (valid(j, i))
      dp[i] = min(dp[i], dp[j] + cost(j, i));
return dp[n-1];`,
      watchOut    : [
        'Initialize dp with INF (minimize) or -INF (maximize) or 0 (count)',
        'Define dp[i] as "ending AT i" vs "ending BY i" — they differ',
        'Off-by-one in base case is the most common bug',
      ],
    },
    {
      id          : 'dir_dp_2d',
      family      : 'dp',
      label       : '2D Dynamic Programming',
      complexity  : 'O(n × m)',
      trigger     : {
        requires : ['subproblem_overlap_yes', 'state_space_2d'],
        boosts   : ['dependency_structure_2d'],
        excludes : [],
      },
      why         : 'Two independent sequence dimensions both contribute to the state. dp[i][j] captures answer for considering s1[0..i] and s2[0..j].',
      verifyBefore: 'Confirm dp[i][j] cannot be reduced to 1D. Verify fill order: row by row or by interval length.',
      codeShape   : `vector<vector<int>> dp(n+1, vector<int>(m+1, 0));
for (int i = 1; i <= n; i++)
  for (int j = 1; j <= m; j++)
    dp[i][j] = f(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
return dp[n][m];`,
      watchOut    : [
        'Diagonal value dp[i-1][j-1] corrupted in rolling row — save before overwriting',
        'Fill order for interval DP: by length, not by i then j',
      ],
    },
    {
      id          : 'dir_greedy',
      family      : 'greedy',
      label       : 'Greedy',
      complexity  : 'O(n log n) sort + O(n) scan',
      trigger     : {
        requires : ['local_optimality_yes'],
        boosts   : ['order_sensitivity_no', 'subproblem_overlap_no'],
        excludes : [],
      },
      why         : 'Local optimal choice leads to global optimum. Each step makes the best immediate decision without revisiting previous choices.',
      verifyBefore: 'Find a counter-example: 3-5 elements where greedy and optimal diverge. If no counter-example found after adversarial testing, proceed.',
      codeShape   : `sort(items.begin(), items.end(), comparator);
int result = 0;
for (auto& item : items) {
  if (canTake(item)) {
    result += value(item);
    take(item);
  }
}
return result;`,
      watchOut    : [
        'Must verify greedy correctness — exchange argument or stays-ahead proof',
        'Counter-example: coins=[1,3,4], amount=6 breaks greedy',
        'Weighted intervals: greedy by count works, greedy by value does not',
      ],
    },
    {
      id          : 'dir_graph_bfs',
      family      : 'graph',
      label       : 'BFS — Shortest Path',
      complexity  : 'O(V + E)',
      trigger     : {
        requires : ['dependency_structure_graph', 'graph_goal_shortest_path'],
        boosts   : ['order_sensitivity_no'],
        excludes : ['weighted_edges'],
      },
      why         : 'Unweighted graph with shortest path goal. BFS explores in level order, guaranteeing minimum hops.',
      verifyBefore: 'Confirm edges are unweighted (all cost 1). Confirm goal is minimum number of steps, not minimum weighted cost.',
      codeShape   : `vector<int> dist(V, -1);
queue<int> q;
dist[src] = 0; q.push(src);
while (!q.empty()) {
  int u = q.front(); q.pop();
  for (int v : adj[u])
    if (dist[v] == -1) { dist[v] = dist[u]+1; q.push(v); }
}`,
      watchOut    : [
        'Never use BFS on weighted graph for shortest path',
        'Disconnected graph: nodes unreachable from src have dist == -1',
        'Grid BFS: check bounds before pushing neighbor',
      ],
    },
    {
      id          : 'dir_graph_dijkstra',
      family      : 'graph',
      label       : 'Dijkstra — Weighted Shortest Path',
      complexity  : 'O((V + E) log V)',
      trigger     : {
        requires : ['dependency_structure_graph', 'graph_goal_shortest_path', 'weighted_edges'],
        boosts   : [],
        excludes : ['negative_edges'],
      },
      why         : 'Weighted graph, non-negative edges, single-source shortest path. Priority queue greedily expands cheapest reachable node.',
      verifyBefore: 'Confirm all edge weights are non-negative. Confirm goal is minimum total cost, not minimum hops.',
      codeShape   : `vector<long long> dist(V, LLONG_MAX);
priority_queue<pair<long long,int>,...,greater<>> pq;
dist[src]=0; pq.push({0,src});
while(!pq.empty()){
  auto[d,u]=pq.top(); pq.pop();
  if(d>dist[u]) continue;
  for(auto[v,w]:adj[u])
    if(dist[u]+w<dist[v]){ dist[v]=dist[u]+w; pq.push({dist[v],v}); }
}`,
      watchOut    : [
        'Negative weights → WRONG ANSWER silently — use Bellman-Ford',
        'Lazy deletion: if (d > dist[u]) continue — critical for correctness',
        'Use long long for distances to avoid overflow',
      ],
    },
    {
      id          : 'dir_graph_topo',
      family      : 'graph',
      label       : 'Topological Sort',
      complexity  : 'O(V + E)',
      trigger     : {
        requires : ['dependency_structure_graph', 'graph_goal_topological'],
        boosts   : [],
        excludes : [],
      },
      why         : 'Directed graph with dependency constraints. Topological sort produces valid processing order. Cycle detection built in.',
      verifyBefore: 'Confirm graph is directed. Verify that a valid ordering exists (no cycles). Check: after Kahn\'s, order.size() == V.',
      codeShape   : `vector<int> indeg(V,0);
for(auto[u,v]:edges) indeg[v]++;
queue<int> q;
for(int i=0;i<V;i++) if(!indeg[i]) q.push(i);
vector<int> order;
while(!q.empty()){
  int u=q.front();q.pop();order.push_back(u);
  for(int v:adj[u]) if(--indeg[v]==0) q.push(v);
}
bool hasCycle = order.size()<V;`,
      watchOut    : [
        'order.size() < V means cycle — topological sort failed',
        'Multiple valid orderings may exist — any is acceptable unless otherwise stated',
      ],
    },
    {
      id          : 'dir_sliding_window',
      family      : 'sliding_window',
      label       : 'Sliding Window',
      complexity  : 'O(n)',
      trigger     : {
        requires : ['order_sensitivity_yes', 'search_space_contiguous'],
        boosts   : ['subproblem_overlap_no'],
        excludes : [],
      },
      why         : 'Contiguous subarray/substring with a monotone validity condition. Expanding right grows window, shrinking left removes invalid elements.',
      verifyBefore: 'Confirm answer must be contiguous. Confirm adding elements always makes validity non-decreasing (monotone). Mixed signs may break this.',
      codeShape   : `int lo = 0, result = 0;
for (int hi = 0; hi < n; hi++) {
  add(a[hi]);
  while (!valid()) remove(a[lo++]);
  result = max(result, hi - lo + 1);
}
return result;`,
      watchOut    : [
        'Sliding window requires non-negative values for monotone validity in most formulations',
        'Substring (contiguous) ≠ subsequence (non-contiguous) — wrong choice here',
        'Fixed window: slide without inner while loop',
      ],
    },
    {
      id          : 'dir_two_pointer',
      family      : 'two_pointer',
      label       : 'Two Pointer',
      complexity  : 'O(n log n) sort + O(n) scan',
      trigger     : {
        requires : ['order_sensitivity_no', 'search_space_pair'],
        boosts   : ['feasibility_boundary_no'],
        excludes : [],
      },
      why         : 'Sorted array with pair-condition. Left and right pointers converge — sum too small moves left pointer right, sum too large moves right pointer left.',
      verifyBefore: 'Confirm sorting does not break the problem. Confirm condition is monotone after sorting — moving pointer always improves or worsens condition.',
      codeShape   : `sort(a.begin(), a.end());
int lo = 0, hi = n-1;
while (lo < hi) {
  int sum = a[lo] + a[hi];
  if      (sum == target) { /* found */ lo++; hi--; }
  else if (sum <  target) lo++;
  else                    hi--;
}`,
      watchOut    : [
        'Duplicates: skip equal elements after finding valid pair to avoid overcounting',
        'Two pointer only works on SORTED array — verify sort does not break problem',
      ],
    },
    {
      id          : 'dir_backtracking',
      family      : 'backtracking',
      label       : 'Backtracking',
      complexity  : 'O(2^n) or O(n!) — exponential',
      trigger     : {
        requires : ['search_space_exhaustive'],
        boosts   : [],
        excludes : ['subproblem_overlap_yes'],
      },
      why         : 'Need to enumerate all valid configurations. Backtracking prunes invalid branches early, but worst case is still exponential.',
      verifyBefore: 'Confirm n ≤ 15 (n ≤ 20 at absolute most). Confirm no overlapping subproblems — if they exist, use DP instead of backtracking.',
      codeShape   : `void backtrack(int pos, vector<int>& current, vector<vector<int>>& result) {
  if (isComplete(current)) { result.push_back(current); return; }
  for (int choice : choices(pos)) {
    if (isValid(choice, current)) {
      current.push_back(choice);
      backtrack(pos+1, current, result);
      current.pop_back(); // undo
    }
  }
}`,
      watchOut    : [
        'n > 20 with backtracking = TLE — check n constraint first',
        'Pruning is critical — without it, pure backtracking TLEs on n=15+',
        'If subproblems repeat across branches — memoize or switch to DP',
      ],
    },
    {
      id          : 'dir_union_find',
      family      : 'union_find',
      label       : 'Union Find',
      complexity  : 'O(n α(n)) ≈ O(n)',
      trigger     : {
        requires : ['dependency_structure_graph'],
        boosts   : ['order_sensitivity_no'],
        excludes : ['graph_goal_shortest_path', 'graph_goal_topological'],
      },
      why         : 'Dynamic connectivity — groups merging over time. Union Find tracks components in near-O(1) per operation with path compression.',
      verifyBefore: 'Confirm graph is undirected or functional. Confirm goal is connectivity / component count, not shortest path.',
      codeShape   : `vector<int> par(n); iota(par.begin(), par.end(), 0);
function<int(int)> find = [&](int x) {
  return par[x]==x ? x : par[x]=find(par[x]);
};
auto unite = [&](int a, int b) {
  par[find(a)] = find(b);
};`,
      watchOut    : [
        'Union Find does not track edge direction — undirected only',
        'Cycle detection: if find(u) == find(v) before uniting, edge creates cycle',
      ],
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAll()       { return [...DIRECTION_TEMPLATES]; }
  function getById(id)    { return DIRECTION_TEMPLATES.find(d => d.id === id) ?? null; }
  function getByFamily(f) { return DIRECTION_TEMPLATES.filter(d => d.family === f); }

  // Build directions from stage answers
  function buildDirections(stageAnswers) {
    const props         = stageAnswers.stage3?.properties  ?? {};
    const graphGoal     = stageAnswers.stage3?.graphGoal   ?? null;
    const inputTypes    = stageAnswers.stage1?.inputTypes  ?? [];
    const variantId     = stageAnswers.stage4_5?.variantSelected ?? null;
    const s35Transform  = stageAnswers.stage3_5?.transformationApplied ?? null;

    const signals = _extractSignals(props, graphGoal, inputTypes, stageAnswers);
    const scored  = _scoreDirections(signals, stageAnswers);

    // Top 2-3 directions
    const top = scored
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(d => ({
        ...d.template,
        score            : d.score,
        variantOverride  : variantId,
        transformApplied : s35Transform !== 'none' ? s35Transform : null,
      }));

    return top;
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  function _extractSignals(props, graphGoal, inputTypes, answers) {
    const signals = new Set();

    // From structural properties
    if (props.feasibility_boundary === 'yes')    signals.add('feasibility_boundary_yes');
    if (props.subproblem_overlap   === 'yes')    signals.add('subproblem_overlap_yes');
    if (props.subproblem_overlap   === 'no')     signals.add('subproblem_overlap_no');
    if (props.local_optimality     === 'yes')    signals.add('local_optimality_yes');
    if (props.order_sensitivity    === 'yes')    signals.add('order_sensitivity_yes');
    if (props.order_sensitivity    === 'no')     signals.add('order_sensitivity_no');
    if (props.state_space          === '2d')     signals.add('state_space_2d');
    if (props.dependency_structure === 'graph')  signals.add('dependency_structure_graph');
    if (props.dependency_structure === 'linear') signals.add('dependency_structure_linear');
    if (props.search_space         === 'contiguous') signals.add('search_space_contiguous');
    if (props.search_space         === 'pair')       signals.add('search_space_pair');
    if (props.search_space         === 'exhaustive') signals.add('search_space_exhaustive');

    // From graph deep-dive
    if (graphGoal === 'gg_shortest_path')   signals.add('graph_goal_shortest_path');
    if (graphGoal === 'gg_topological_sort') signals.add('graph_goal_topological');

    // From stage 3 graph properties
    const graphProps = answers.stage3?.graphProperties ?? {};
    if (graphProps.weighted === 'Yes')  signals.add('weighted_edges');
    if (graphProps.negative === 'Yes')  signals.add('negative_edges');

    return signals;
  }

  function _scoreDirections(signals, answers) {
    return DIRECTION_TEMPLATES.map(template => {
      let score = 0;

      // Hard requirements — must ALL be present
      const allRequired = template.trigger.requires.every(r => signals.has(r));
      if (!allRequired) return { template, score: 0 };

      score += template.trigger.requires.length * 10;

      // Boost signals
      template.trigger.boosts.forEach(b => {
        if (signals.has(b)) score += 5;
      });

      // Exclusion signals — if any present, direction is invalid
      const anyExcluded = template.trigger.excludes.some(e => signals.has(e));
      if (anyExcluded) return { template, score: 0 };

      // Boost from variant selection
      const variantId = answers.stage4_5?.variantSelected ?? '';
      if (variantId && variantId.startsWith(template.family.slice(0, 3))) {
        score += 8;
      }

      // Boost from verification passing
      const s5 = answers.stage5 ?? {};
      if (template.family === 'dp'           && s5.dpStateVerified)       score += 5;
      if (template.family === 'binary_search' && s5.monotonicityVerified) score += 5;
      if (template.family === 'greedy'       && s5.greedyTested)          score += 5;
      if (template.family === 'graph'        && s5.graphPropertiesVerified) score += 5;

      return { template, score };
    });
  }

  return {
    getAll,
    getById,
    getByFamily,
    buildDirections,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DirectionBuilder;
}