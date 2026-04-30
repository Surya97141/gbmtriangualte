// stages/stage5/verifiers/dp-state-verifier.js
// 5C — DP state completeness and redundancy check
// Used by: stage5.js

const DPStateVerifier = (() => {

  const VERIFIER = {
    id      : 'dp_state_verifier',
    label   : 'DP State Verification',
    purpose : 'Ensure DP state is complete (captures all needed info) and non-redundant (no wasted dimensions)',
    when    : 'Use whenever leaning toward DP direction',
  };

  const CHECKS = [
    {
      id      : 'completeness',
      label   : 'Completeness check',
      question: 'Given ONLY the state variables — can you determine the optimal next step without looking back?',
      pass    : 'Yes — state fully captures what is needed at each step',
      fail    : 'No — need additional information not in the state',
      failFix : 'Add the missing information as a new state dimension',
      example : {
        problem  : 'Stock trading with cooldown',
        badState : 'dp[i] = max profit on day i',
        why      : 'Cannot determine next step without knowing if holding stock or in cooldown',
        goodState: 'dp[i][mode] where mode ∈ {HOLD, EMPTY, COOL}',
      },
    },
    {
      id      : 'redundancy',
      label   : 'Non-redundancy check',
      question: 'Is any state dimension derivable from other dimensions or from the loop variable?',
      pass    : 'No — every dimension provides independent information',
      fail    : 'Yes — at least one dimension can be computed from others',
      failFix : 'Remove the redundant dimension. State size drops, complexity improves.',
      example : {
        problem  : 'Subarray sum equal to k',
        badState : 'dp[i][j][sum] where sum = prefix[j] - prefix[i]',
        why      : 'sum is completely determined by i and j via prefix array',
        goodState: 'dp[i][j] — sum derivable, no need to track explicitly',
      },
    },
    {
      id      : 'dimension_count',
      label   : 'Dimension count check',
      question: 'Is the total number of states feasible? states = product of all dimension ranges',
      pass    : 'Total states ≤ 10^7 (or 2^20 for bitmask)',
      fail    : 'Total states exceed memory or time budget',
      failFix : 'Reduce state space: rolling array, coordinate compression, or different formulation',
      example : {
        problem  : 'Edit distance',
        states   : 'n × m = 10^5 × 10^5 = 10^10 — too large',
        fix      : 'Rolling row reduces from O(nm) to O(m) space',
      },
    },
    {
      id      : 'base_cases',
      label   : 'Base case check',
      question: 'Are all base cases correctly initialized before the DP loop?',
      pass    : 'All boundary conditions set: dp[0], dp[i][0], dp[0][j] etc.',
      fail    : 'Base cases missing, wrong value, or off-by-one',
      failFix : 'Trace through manually for n=1 or n=2. Check initialization.',
      example : {
        problem  : 'Longest Common Subsequence',
        badBase  : 'dp[i][0] = 1 (incorrect)',
        goodBase : 'dp[i][0] = 0 for all i (empty s2 prefix → LCS = 0)',
      },
    },
    {
      id      : 'transition_correctness',
      label   : 'Transition check',
      question: 'Does the recurrence correctly express dp[state] in terms of smaller subproblems?',
      pass    : 'Every transition leads to strictly smaller state (DAG, no cycles)',
      fail    : 'Transition references equal or larger state — infinite recursion possible',
      failFix : 'Verify: every recursive call has strictly smaller argument',
      example : {
        problem   : 'Fibonacci',
        badTrans  : 'dp[n] = dp[n+1] + dp[n-1] (accesses larger state)',
        goodTrans : 'dp[n] = dp[n-1] + dp[n-2] (both smaller)',
      },
    },
  ];

  const STATE_TEMPLATES = [
    {
      type     : 'single_index',
      template : 'dp[i] = [answer] for prefix/element ending at index i',
      fillOrder: 'i = 0, 1, 2, ..., n-1 (left to right)',
      baseCase : 'dp[0] = [base value for single element]',
    },
    {
      type     : 'two_indices',
      template : 'dp[i][j] = [answer] considering s1[0..i-1] and s2[0..j-1]',
      fillOrder: 'i = 0..n, j = 0..m (row by row)',
      baseCase : 'dp[0][j] = 0, dp[i][0] = 0 (or appropriate value)',
    },
    {
      type     : 'interval',
      template : 'dp[i][j] = [answer] for elements from index i to j',
      fillOrder: 'by increasing interval LENGTH: len=1, len=2, ..., len=n',
      baseCase : 'dp[i][i] = [single element value]',
    },
    {
      type     : 'bitmask',
      template : 'dp[mask] or dp[mask][i] = [answer] for subset represented by mask',
      fillOrder: 'mask = 0, 1, 2, ..., (1<<n)-1',
      baseCase : 'dp[start_mask][start_node] = 0',
    },
  ];

  function getVerifier()       { return { ...VERIFIER }; }
  function getChecks()         { return [...CHECKS]; }
  function getStateTemplates() { return [...STATE_TEMPLATES]; }

  function buildResult(checkResults) {
    const allPassed = checkResults.every(r => r.passed);
    const failedChecks = checkResults.filter(r => !r.passed);

    return {
      allPassed,
      failedChecks,
      verdict: allPassed
        ? { label: 'State verified ✓', color: 'green',  message: 'DP state is complete and non-redundant' }
        : { label: 'Issues found ✗',   color: 'yellow', message: `${failedChecks.length} check(s) failed — review before coding` },
      recommendations: failedChecks.map(f => {
        const check = CHECKS.find(c => c.id === f.checkId);
        return check?.failFix ?? 'Review this check carefully';
      }),
    };
  }

  return {
    getVerifier,
    getChecks,
    getStateTemplates,
    buildResult,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DPStateVerifier;
}