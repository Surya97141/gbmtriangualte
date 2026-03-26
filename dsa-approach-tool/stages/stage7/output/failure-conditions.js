// stages/stage7/output/failure-conditions.js
// Failure conditions for each direction — what will break this approach
// Used by: stage7.js

const FailureConditions = (() => {

  // Per-family failure conditions
  const FAILURES = {
    binary_search: [
      {
        id         : 'fs_not_monotone',
        condition  : 'isFeasible(X) is NOT monotone',
        consequence: 'Binary search converges to wrong boundary — returns incorrect answer silently',
        detection  : 'Test: does isFeasible(X)=true guarantee isFeasible(X+1)=true? Verify with 3 examples.',
        fix        : 'If not monotone — cannot use Binary Search on Answer. Reconsider approach.',
      },
      {
        id         : 'fs_bs_overflow',
        condition  : 'mid = (lo + hi) / 2 when lo + hi overflows',
        consequence: 'Negative mid value → infinite loop',
        detection  : 'Check: lo and hi both close to INT_MAX?',
        fix        : 'Always use: mid = lo + (hi - lo) / 2',
      },
      {
        id         : 'fs_bs_wrong_half',
        condition  : 'Minimize uses lo = mid instead of hi = mid (or vice versa)',
        consequence: 'Off-by-one — returns lo+1 or lo-1 instead of correct answer',
        detection  : 'Test on known input where answer is at boundary.',
        fix        : 'Minimize: if feasible → hi = mid. Maximize: if feasible → lo = mid (use upper mid).',
      },
    ],

    dp: [
      {
        id         : 'fd_incomplete_state',
        condition  : 'State does not capture all decision-relevant information',
        consequence: 'dp[i] returns different values for same i depending on history → wrong answer',
        detection  : 'Ask: given only the state variable(s), can I determine the optimal next step?',
        fix        : 'Add the missing information as a new state dimension.',
      },
      {
        id         : 'fd_wrong_init',
        condition  : 'Base case initialized with wrong value (0 instead of INT_MIN, or vice versa)',
        consequence: 'Propagates wrong base throughout DP table → wrong final answer',
        detection  : 'Trace through n=1 and n=2 manually. Verify base case matches problem definition.',
        fix        : 'Maximize: init with INT_MIN or a[0]. Minimize: init with INT_MAX. Count: init with 0.',
      },
      {
        id         : 'fd_wrong_order',
        condition  : 'Fill order does not respect dependencies',
        consequence: 'dp[j] accessed before it is computed — uses garbage value',
        detection  : 'Every transition dp[i] = f(dp[j]) must have j already computed when i is processed.',
        fix        : 'For interval DP: fill by increasing LENGTH. For 1D: left to right. For 2D: row by row.',
      },
      {
        id         : 'fd_knapsack_direction',
        condition  : '0/1 Knapsack iterates W increasing (allows reuse)',
        consequence: 'Same item used multiple times → unbounded knapsack instead of 0/1',
        detection  : 'Check inner loop direction: W should decrease for 0/1.',
        fix        : '0/1 Knapsack: for(W=maxW; W>=w[i]; W--). Unbounded: for(W=w[i]; W<=maxW; W++).',
      },
    ],

    greedy: [
      {
        id         : 'fg_counterexample',
        condition  : 'Counter-example exists for greedy rule',
        consequence: 'Greedy produces suboptimal answer on adversarial input',
        detection  : 'Test: coins=[1,3,4], amount=6. Or weighted intervals where long high-value loses.',
        fix        : 'Use DP — greedy is not valid for this problem.',
      },
      {
        id         : 'fg_wrong_sort',
        condition  : 'Sorted by wrong key (start time instead of end time for interval scheduling)',
        consequence: 'Greedy makes locally wrong choice → suboptimal result',
        detection  : 'Verify: what property of the sorted order makes greedy correct?',
        fix        : 'Interval scheduling: sort by END time. Job scheduling by deadline: sort by deadline.',
      },
    ],

    graph: [
      {
        id         : 'fg_wrong_algorithm',
        condition  : 'BFS used on weighted graph, or Dijkstra used with negative edges',
        consequence: 'Silent wrong answer — algorithm runs without error but returns incorrect distances',
        detection  : 'BFS: are all edge weights = 1? Dijkstra: are all weights ≥ 0?',
        fix        : 'Weighted non-neg → Dijkstra. Negative weights → Bellman-Ford. Unweighted → BFS.',
      },
      {
        id         : 'fg_no_bounds_check',
        condition  : 'Grid BFS neighbor generation without bounds check',
        consequence: 'Array out of bounds crash or wrong cell visited',
        detection  : 'Does every (r+dr, c+dc) check r≥0, r<rows, c≥0, c<cols BEFORE accessing grid?',
        fix        : 'Check bounds before pushing: if (valid(nr, nc) && !vis[nr][nc]) push.',
      },
      {
        id         : 'fg_cycle_in_dag',
        condition  : 'Topological sort on graph with cycle',
        consequence: 'Some nodes never reach indegree 0 → order.size() < V → silent wrong answer or crash',
        detection  : 'After Kahn\'s: if order.size() < V → cycle exists → no valid ordering.',
        fix        : 'Check order.size() == V after Kahn\'s. If not — report "impossible".',
      },
      {
        id         : 'fg_disconnected',
        condition  : 'BFS/DFS from single source on disconnected graph',
        consequence: 'Unreachable nodes have dist == -1 or are never visited → incomplete answer',
        detection  : 'Does problem guarantee connected graph? If not — run BFS from every unvisited node.',
        fix        : 'Outer for loop: for(int i=0; i<V; i++) if(!vis[i]) bfs(i);',
      },
    ],

    sliding_window: [
      {
        id         : 'fsw_negative_values',
        condition  : 'Array contains negative values with sliding window',
        consequence: 'Window validity is no longer monotone — shrinking window may not help',
        detection  : 'Does adding an element always make the window "more valid"? Fails with negatives.',
        fix        : 'With negatives: use prefix sum + HashMap for sum=k. Not sliding window.',
      },
      {
        id         : 'fsw_subsequence_not_subarray',
        condition  : 'Problem asks for subsequence but solution uses sliding window (contiguous)',
        consequence: 'Wrong answer — misses non-contiguous solutions',
        detection  : 'Check problem: "subarray" = contiguous. "Subsequence" = any order, non-contiguous.',
        fix        : 'Subsequence problems require DP, not sliding window.',
      },
    ],

    two_pointer: [
      {
        id         : 'ftp_not_sorted',
        condition  : 'Two pointer applied without sorting first',
        consequence: 'Pointer movement condition not monotone → may miss valid pairs',
        detection  : 'Is array sorted before applying two pointer?',
        fix        : 'Sort first. Verify: sorting does not break the problem (order sensitivity check).',
      },
      {
        id         : 'ftp_duplicate_overcounting',
        condition  : 'Duplicates not skipped after finding valid pair',
        consequence: 'Same pair counted multiple times → wrong count',
        detection  : 'Test: [2,2,2,2,2], target=4. Should find 1 unique pair, not 25.',
        fix        : 'After finding pair: while(lo<hi && a[lo]==a[lo-1]) lo++; while(...) hi--;',
      },
    ],

    backtracking: [
      {
        id         : 'fb_n_too_large',
        condition  : 'n > 20 without effective pruning',
        consequence: 'TLE — 2^20 = 10^6 states manageable but 2^25 = 33M states likely TLE',
        detection  : 'Check n constraint. Is pruning effective enough to reduce actual states visited?',
        fix        : 'Add pruning. If n > 20 with weak pruning → consider DP with memoization instead.',
      },
      {
        id         : 'fb_missing_undo',
        condition  : 'Backtracking without undoing state modification',
        consequence: 'State corrupted across branches → wrong results on later branches',
        detection  : 'Every push/add/mark before recursive call must have matching pop/remove/unmark after.',
        fix        : 'Template: modify → recurse → undo. Never skip the undo step.',
      },
    ],

    union_find: [
      {
        id         : 'fuf_directed',
        condition  : 'Union Find applied to directed graph',
        consequence: 'Union Find ignores edge direction — may incorrectly merge unreachable components',
        detection  : 'Is this a directed graph? Union Find is for undirected connectivity only.',
        fix        : 'Directed graph → use DFS/BFS for SCC or reachability. Not Union Find.',
      },
    ],
  };

  function getForFamily(family)   { return [...(FAILURES[family] ?? [])]; }
  function getForDirection(dirId) {
    const dir = DirectionBuilder.getById(dirId);
    if (!dir) return [];
    return getForFamily(dir.family);
  }
  function getAll() {
    return Object.values(FAILURES).flat();
  }

  return {
    getForFamily,
    getForDirection,
    getAll,
    FAILURES,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FailureConditions;
}