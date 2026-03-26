// stages/stage7/output/next-action.js
// Builds the concrete next-action list after direction is confirmed
// "What to do FIRST when you open your editor"
// Used by: stage7.js

const NextAction = (() => {

  // Per-family first actions
  const FIRST_ACTIONS = {
    binary_search: [
      {
        order : 1,
        action: 'Write isFeasible(X) as a standalone function first',
        detail: 'Before writing binary search loop, get isFeasible working and tested. Binary search is useless if isFeasible is wrong.',
        code  : 'bool isFeasible(int x) {\n  // implement greedy check here\n  return /* condition */;\n}',
      },
      {
        order : 2,
        action: 'Determine lo and hi bounds explicitly',
        detail: 'lo = minimum possible answer. hi = maximum possible answer. Write these as named constants with comments explaining why.',
        code  : 'int lo = /* min possible */;\nint hi = /* max possible */;',
      },
      {
        order : 3,
        action: 'Write binary search loop and test on sample',
        detail: 'Use the minimize template (hi=mid) or maximize template (lo=mid with upper mid). Test on provided examples before edge cases.',
        code  : 'while (lo < hi) {\n  int mid = lo + (hi-lo)/2;\n  if (isFeasible(mid)) hi = mid;\n  else lo = mid+1;\n}\nreturn lo;',
      },
    ],

    dp: [
      {
        order : 1,
        action: 'Write the dp[i] definition as a comment before writing any code',
        detail: '"dp[i] = [what it represents for prefix/element ending at i]". This sentence determines every subsequent decision. Do not skip it.',
        code  : '// dp[i] = maximum sum of subarray ending exactly at index i\n// dp[0] = a[0]\nvector<int> dp(n);',
      },
      {
        order : 2,
        action: 'Write and verify base cases before the main loop',
        detail: 'Initialize all base cases. Trace manually for n=1 and n=2 to confirm they give the right answer.',
        code  : 'dp[0] = a[0]; // base: single element\n// verify: dp[0] gives correct answer for single-element input',
      },
      {
        order : 3,
        action: 'Write the recurrence transition and trace on small input',
        detail: 'Write dp[i] = f(dp[j]). Trace on 4-element input by hand before running. Confirm fill order is correct.',
        code  : 'for (int i = 1; i < n; i++) {\n  dp[i] = dp[i-1]; // or whatever transition\n  // verify with: [1,2,3,4]\n}',
      },
    ],

    greedy: [
      {
        order : 1,
        action: 'Write the comparator / sort key first',
        detail: 'Most greedy algorithms start with a sort. Define the comparator precisely. Wrong sort key = wrong greedy.',
        code  : 'sort(items.begin(), items.end(), [](auto& a, auto& b) {\n  return a.end < b.end; // sort by end time\n});',
      },
      {
        order : 2,
        action: 'Write the greedy rule as a comment, then implement it',
        detail: '"At each step, I always pick [X]". One sentence. If you cannot write this sentence, you do not understand the greedy rule yet.',
        code  : '// Greedy rule: always pick the item with earliest end time\n// that does not conflict with last selected item\nint last = -1;\nfor (auto& item : items) {\n  if (item.start >= last) { result++; last = item.end; }\n}',
      },
      {
        order : 3,
        action: 'Test adversarial input before submitting',
        detail: 'Run your solution on the specific counter-example you tested in Stage 5. Confirm it produces the same answer as brute force.',
        code  : '// Test: adversarial input from Stage 5 verification\n// Expected: [your verified answer]',
      },
    ],

    graph: [
      {
        order : 1,
        action: 'Build the adjacency list / matrix from input',
        detail: 'Do not process any graph logic until the graph is correctly built. Verify edge direction and weight storage.',
        code  : 'vector<vector<pair<int,int>>> adj(V);\nfor (auto [u,v,w] : edges)\n  adj[u].push_back({v, w}); // directed\n  // adj[v].push_back({u, w}); // if undirected',
      },
      {
        order : 2,
        action: 'Initialize distance / visited array correctly',
        detail: 'dist = INF for all except src=0. visited = false for all. For grid: check bounds before accessing.',
        code  : 'vector<long long> dist(V, LLONG_MAX);\ndist[src] = 0;\n// or for grid: vector<vector<bool>> vis(rows, vector<bool>(cols, false));',
      },
      {
        order : 3,
        action: 'Add bounds check or null guard before every neighbor access',
        detail: 'The most common graph WA is accessing an invalid neighbor. Write the guard once, use it everywhere.',
        code  : '// For grid: ALWAYS check before pushing\nfor (auto [dr,dc] : dirs) {\n  int nr=r+dr, nc=c+dc;\n  if (nr<0||nr>=rows||nc<0||nc>=cols||vis[nr][nc]) continue;\n  // safe to process\n}',
      },
    ],

    sliding_window: [
      {
        order : 1,
        action: 'Define what "valid window" means as a comment',
        detail: '"Window [lo, hi] is valid when [condition]". This determines the while loop condition. Get this wrong and nothing else works.',
        code  : '// Valid window: window contains at most k distinct characters\nmap<char,int> freq;\nint lo = 0;',
      },
      {
        order : 2,
        action: 'Write expand (hi++) and shrink (lo++) logic separately',
        detail: 'Expand: add a[hi] to window state. Shrink: remove a[lo] from window state. Keep these symmetrical.',
        code  : '// Expand\nfreq[a[hi]]++;\n// Shrink while invalid\nwhile (freq.size() > k) {\n  freq[a[lo]]--;\n  if (!freq[a[lo]]) freq.erase(a[lo]);\n  lo++;\n}',
      },
      {
        order : 3,
        action: 'Update result AFTER shrinking, not before',
        detail: 'Result is captured when window is valid (after shrinking). Capturing before shrink gives wrong answer for minimum-window problems.',
        code  : '// After shrink: window is now valid\nresult = max(result, hi - lo + 1);',
      },
    ],

    two_pointer: [
      {
        order : 1,
        action: 'Sort the array first and verify it does not break the problem',
        detail: 'Two pointer requires sorted input. Write sort line first. Check: is this a subarray problem (order matters)? If yes, two pointer may not apply.',
        code  : 'sort(a.begin(), a.end());\n// verify: problem allows sorting (order-insensitive)',
      },
      {
        order : 2,
        action: 'Initialize lo=0, hi=n-1 and write convergence condition',
        detail: 'while (lo < hi) is the standard convergence. Both pointers move inward only.',
        code  : 'int lo = 0, hi = n-1;\nwhile (lo < hi) {\n  // check a[lo] + a[hi] vs target\n}',
      },
      {
        order : 3,
        action: 'Write duplicate-skipping logic if counting unique pairs',
        detail: 'After finding valid pair: advance past all duplicates on both sides. Prevents overcounting.',
        code  : '// After recording pair (a[lo], a[hi]):\nwhile (lo < hi && a[lo] == a[lo+1]) lo++;\nwhile (lo < hi && a[hi] == a[hi-1]) hi--;\nlo++; hi--;',
      },
    ],

    backtracking: [
      {
        order : 1,
        action: 'Write the base case (complete state) first',
        detail: 'What does a complete solution look like? Write isComplete() or the base case check before writing any recursion.',
        code  : 'if (pos == n) { // or: if current.size() == target_size\n  result.push_back(current);\n  return;\n}',
      },
      {
        order : 2,
        action: 'Write modify → recurse → undo template explicitly',
        detail: 'These three steps must ALWAYS appear together. Missing the undo step corrupts state across branches.',
        code  : 'for (int choice : choices) {\n  current.push_back(choice); // modify\n  backtrack(pos+1, current); // recurse\n  current.pop_back();        // UNDO — never skip this\n}',
      },
      {
        order : 3,
        action: 'Add pruning condition before the recursive call',
        detail: 'Pruning is the difference between TLE and passing. Add at least one pruning condition that eliminates invalid branches early.',
        code  : 'for (int choice : choices) {\n  if (!isValid(choice, current)) continue; // PRUNE\n  current.push_back(choice);\n  backtrack(pos+1, current);\n  current.pop_back();\n}',
      },
    ],

    union_find: [
      {
        order : 1,
        action: 'Initialize parent array: par[i] = i for all i',
        detail: 'Every node starts as its own component. iota fills this in one line.',
        code  : 'vector<int> par(n);\niota(par.begin(), par.end(), 0); // par[i] = i',
      },
      {
        order : 2,
        action: 'Write find() with path compression',
        detail: 'Without path compression, repeated find() degrades to O(n). With it, nearly O(1).',
        code  : 'function<int(int)> find = [&](int x) {\n  return par[x]==x ? x : par[x]=find(par[x]);\n};',
      },
      {
        order : 3,
        action: 'Write unite() and use find() — never access par[] directly',
        detail: 'Always go through find() when uniting or checking connectivity. Direct par[] access misses path compression.',
        code  : 'auto unite = [&](int a, int b) {\n  par[find(a)] = find(b);\n};\n// Check connected: find(a) == find(b)',
      },
    ],
  };

  function getForFamily(family) {
    return [...(FIRST_ACTIONS[family] ?? [])];
  }

  function getForDirection(dirId) {
    const dir = DirectionBuilder.getById(dirId);
    if (!dir) return [];
    return getForFamily(dir.family);
  }

  function buildActionList(directions) {
    if (!directions.length) return [];
    const primary = directions[0];
    return getForFamily(primary.family);
  }

  return {
    getForFamily,
    getForDirection,
    buildActionList,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NextAction;
}