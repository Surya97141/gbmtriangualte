// recovery/recovery-paths/logic-unclear-path.js
// Stuck / logic unclear recovery path — for mid-problem mental blocks
// Used by: recovery.js

const LogicUnclearPath = (() => {

  const META = {
    id     : 'logic_unclear_path',
    label  : 'Stuck / Logic Unclear',
    trigger: 'I cannot figure out how to approach this',
    icon   : '?',
    color  : 'blue',
  };

  const STEPS = [
    {
      id     : 'lu_s1',
      order  : 1,
      title  : 'Where exactly are you stuck?',
      desc   : 'Being specific about the blockage is half the solution.',
      actions: [
        { id: 'lu_s1_no_approach', label: 'No idea what algorithm/approach to use', next: 'lu_s2_approach' },
        { id: 'lu_s1_started',     label: 'Started an approach but hit a wall',     next: 'lu_s2_wall' },
        { id: 'lu_s1_recurrence',  label: 'Cannot define the DP recurrence',        next: 'lu_s2_dp' },
        { id: 'lu_s1_graph',       label: 'Know it\'s a graph but not which algo',  next: 'lu_s2_graph' },
      ],
    },

    // No idea what approach
    {
      id      : 'lu_s2_approach',
      order   : 2,
      title   : 'Work through the 5 forcing questions',
      desc    : 'Answer these in order. Each answer eliminates entire families of approaches.',
      questions: [
        {
          q     : '1. If you shuffle the input — does the answer change?',
          yes   : 'Order matters → cannot sort → eliminates Two Pointer, sorting-based Greedy',
          no    : 'Can sort → opens Two Pointer, Greedy by key, Binary Search after sort',
        },
        {
          q     : '2. If you knew the answer for a smaller input — does it directly help?',
          yes   : 'Overlapping subproblems → DP or memoization',
          no    : 'Each step is independent → Greedy or direct scan',
        },
        {
          q     : '3. Is there a value X such that: X works → X+1 also works?',
          yes   : 'Monotone feasibility → Binary Search on Answer',
          no    : 'Not monotone → eliminates Binary Search on Answer',
        },
        {
          q     : '4. Do elements have relationships (connected if, prerequisite of, adjacent to)?',
          yes   : 'Hidden graph → BFS/DFS/Topo/Union Find depending on goal',
          no    : 'No graph structure',
        },
        {
          q     : '5. Do you need a contiguous subarray/substring?',
          yes   : 'Sliding Window (non-neg values) or Prefix Sum + HashMap',
          no    : 'Not a window problem',
        },
      ],
      actions: [
        { id: 'lu_s2_approach_found', label: 'Got a direction from the questions', next: 'lu_s3_verify' },
        { id: 'lu_s2_approach_none',  label: 'Still no direction',                 next: 'lu_s2_small_cases' },
      ],
    },

    // Hit a wall mid-approach
    {
      id      : 'lu_s2_wall',
      order   : 2,
      title   : 'Define what you KNOW works vs where it breaks',
      desc    : 'Do not throw away working progress. Isolate the exact failure point.',
      steps   : [
        'Write down what your partial approach correctly handles',
        'Write down the specific case / subproblem where it fails',
        'Ask: is this a fixable bug in the approach, or does the approach need to change?',
        'If fixable: add that specific handling without changing the core',
        'If approach needs change: use what you learned to inform the new attempt',
      ],
      actions: [
        { id: 'lu_s2_wall_fixable',  label: 'It\'s fixable — partial approach is right', next: 'lu_s3_verify' },
        { id: 'lu_s2_wall_change',   label: 'Approach needs to change',                  next: 'lu_s2_approach' },
      ],
    },

    // Cannot define DP recurrence
    {
      id      : 'lu_s2_dp',
      order   : 2,
      title   : 'DP recurrence definition protocol',
      desc    : 'The recurrence always follows from a precise state definition. State definition comes first.',
      protocol: [
        {
          step : 1,
          title: 'State what dp[i] represents in ONE sentence',
          note : '"dp[i] = maximum sum of subarray ENDING AT index i" — precise meaning, not vague',
        },
        {
          step : 2,
          title: 'For dp[i], ask: what was the last decision made?',
          note : 'The recurrence comes from considering all possible last decisions',
        },
        {
          step : 3,
          title: 'Try the simplest transition: dp[i] = f(dp[i-1])',
          note : 'If dp[i] only depends on dp[i-1], recurrence is simple',
        },
        {
          step : 4,
          title: 'If transition needs dp[j] for all j < i, it\'s O(n²) DP',
          note : 'LIS-type: dp[i] = max over all j < i where a[j] < a[i]',
        },
        {
          step : 5,
          title: 'Verify: can you compute dp[0], dp[1], dp[2] manually with your recurrence?',
          note : 'If manual trace fails — state definition is wrong, not recurrence',
        },
      ],
      actions: [
        { id: 'lu_s2_dp_found', label: 'Got the recurrence', next: 'lu_s3_verify' },
        { id: 'lu_s2_dp_still', label: 'Still stuck on DP',  next: 'lu_s2_small_cases' },
      ],
    },

    // Graph — which algorithm
    {
      id      : 'lu_s2_graph',
      order   : 2,
      title   : 'Graph algorithm selection — 3 questions',
      desc    : 'Answer in order — the algorithm follows from structure.',
      questions: [
        {
          q   : '1. What is the goal?',
          opts: [
            'Shortest path → BFS (unweighted) or Dijkstra (weighted, non-neg) or Bellman-Ford (neg)',
            'Valid ordering → Topological sort (Kahn\'s)',
            'Grouping connected things → BFS/DFS for components, Union Find for dynamic',
            'Find cycles → DFS 3-color (directed) or DFS+parent (undirected)',
            'Minimum spanning tree → Kruskal (sparse) or Prim (dense)',
          ],
        },
        {
          q   : '2. Are edges weighted?',
          opts: [
            'No → BFS for paths (O(V+E))',
            'Yes, non-negative → Dijkstra (O((V+E) log V))',
            'Yes, possibly negative → Bellman-Ford (O(V×E))',
            'All-pairs needed → Floyd-Warshall (O(V³), V ≤ 500)',
          ],
        },
        {
          q   : '3. Is graph directed?',
          opts: [
            'Directed → SCC with Tarjan, Topological sort with Kahn\'s',
            'Undirected → Connected components, Bipartite check, MST',
          ],
        },
      ],
      actions: [
        { id: 'lu_s2_graph_found', label: 'Found the right algorithm', next: 'lu_s3_verify' },
        { id: 'lu_s2_graph_back',  label: 'Need deeper analysis',       goTo: 'stage3' },
      ],
    },

    // Small cases technique
    {
      id      : 'lu_s2_small_cases',
      order   : 2,
      title   : 'Build small cases manually — the pattern will emerge',
      desc    : 'When completely stuck, the answer always comes from building small cases.',
      technique: {
        title : 'Small cases protocol',
        steps : [
          'Solve n=1 by hand. Write the answer.',
          'Solve n=2 by hand. Write the answer.',
          'Solve n=3 by hand. Write the answer.',
          'Solve n=4 by hand. Write the answer.',
          'Now: how did you compute n=4 from n=3? That IS the recurrence.',
          'If you needed n=3 AND n=2 to compute n=4 — the state is (n-1, n-2).',
          'Write this down as a formula. That is your dp transition.',
        ],
      },
      note    : 'This technique works for 90% of stuck situations. The pattern is always there — you just need to see it on small cases.',
      actions : [
        { id: 'lu_s2_small_found', label: 'Pattern found from small cases', next: 'lu_s3_verify'  },
        { id: 'lu_s2_small_none',  label: 'Still no pattern visible',       next: 'lu_s3_reframe' },
      ],
    },

    // Verify direction
    {
      id      : 'lu_s3_verify',
      order   : 3,
      title   : 'Quick-verify before full implementation',
      desc    : 'Before writing full code — verify on 2-3 test cases that your approach gives correct answers.',
      actions : [
        { id: 'lu_s3_verify_pass', label: 'Approach verified — ready to code',        isTerminal: true },
        { id: 'lu_s3_verify_fail', label: 'Verification failed — approach is wrong',  next: 'lu_s2_approach' },
      ],
    },

    // Reframe
    {
      id      : 'lu_s3_reframe',
      order   : 3,
      title   : 'This problem may be in disguise — try reframing',
      desc    : 'Some problems look like one thing but reduce to another. Run through these reframes.',
      reframes: [
        'What if each element is a NODE — what would edges be? (Hidden graph)',
        'What if you BINARY SEARCHED for the answer instead of computing it?',
        'What if you counted the COMPLEMENT (invalid cases) and subtracted?',
        'What if you FIXED one dimension and solved a simpler problem?',
        'What if this is actually a KNOWN CANONICAL problem in disguise? (LIS, LCS, Edit Distance)',
      ],
      actions: [
        { id: 'lu_s3_reframe_found', label: 'Reframe revealed the approach',    goTo: 'stage3_5' },
        { id: 'lu_s3_reframe_none',  label: 'No reframe worked — need full re-analysis', goTo: 'stage3' },
      ],
    },
  ];

  function getMeta()       { return { ...META };  }
  function getSteps()      { return [...STEPS];   }
  function getStepById(id) { return STEPS.find(s => s.id === id) ?? STEPS[0]; }
  function getFirstStep()  { return STEPS[0]; }

  return { getMeta, getSteps, getStepById, getFirstStep };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LogicUnclearPath;
}