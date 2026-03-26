// stages/stage5/verifiers/greedy-verifier.js
// 5A — Greedy counter-example test
// Used by: stage5.js

const GreedyVerifier = (() => {

  const VERIFIER = {
    id      : 'greedy_verifier',
    label   : 'Greedy Counter-Example Test',
    purpose : 'Prove greedy is correct OR find the counter-example that breaks it',
    when    : 'Use whenever leaning toward a greedy direction',
  };

  const FRAMEWORK = {
    steps: [
      {
        step : 1,
        label: 'State the greedy rule',
        desc : 'Write your greedy choice in one clear sentence.',
        example: '"Always pick the interval with the earliest end time"',
        prompt : 'My greedy rule: at each step, I always pick ___',
      },
      {
        step : 2,
        label: 'Construct adversarial input',
        desc : 'Build a small input (3-5 elements) designed to break the greedy rule.',
        example: 'For coin change [1,3,4], try amount=6. Greedy picks 4+1+1=3 coins. Optimal is 3+3=2 coins.',
        prompt : 'Try: input where greedy and optimal might diverge',
      },
      {
        step : 3,
        label: 'Apply greedy rule',
        desc : 'Walk through greedy step by step on your adversarial input.',
        prompt : 'Greedy result: ___',
      },
      {
        step : 4,
        label: 'Apply brute force',
        desc : 'Enumerate all possibilities for the small input. Find true optimal.',
        prompt : 'Brute force optimal: ___',
      },
      {
        step : 5,
        label: 'Compare results',
        desc : 'If greedy ≠ optimal → counter-example found → use DP. If equal → try harder inputs.',
        prompt : 'Are greedy and optimal equal?',
      },
    ],
    verdict: {
      found    : { label: 'Counter-example found', color: 'red',   message: 'Greedy FAILS — use Dynamic Programming instead' },
      notFound : { label: 'No counter-example',    color: 'green', message: 'Greedy likely correct — proceed but verify formally if possible' },
    },
  };

  // Common greedy mistakes by problem type
  const COMMON_TRAPS = [
    {
      id      : 'gt_coin_change',
      label   : 'Coin change with arbitrary denominations',
      trap    : 'Greedy (pick largest coin) works for canonical coins but fails for arbitrary denominations',
      test    : 'Try coins=[1,3,4], amount=6. Greedy: 4+1+1=3. Optimal: 3+3=2.',
      verdict : 'Greedy FAILS — use DP',
    },
    {
      id      : 'gt_weighted_interval',
      label   : 'Weighted interval scheduling',
      trap    : 'Greedy by earliest end time works for MAX COUNT but fails when intervals have values',
      test    : 'Try intervals with high-value long interval vs many short intervals. Greedy picks short ones.',
      verdict : 'Greedy FAILS for weighted — use DP',
    },
    {
      id      : 'gt_knapsack_01',
      label   : '0/1 Knapsack',
      trap    : 'Greedy by value/weight ratio works for FRACTIONAL knapsack but not 0/1',
      test    : 'W=10, items=[(6,10),(5,6),(5,6)]. Greedy picks (6,10) leaving no room. Optimal picks two (5,6).',
      verdict : 'Greedy FAILS for 0/1 — use DP',
    },
    {
      id      : 'gt_shortest_path',
      label   : 'Shortest path with negative edges',
      trap    : 'Greedy (always go to nearest unvisited) fails with negative edges',
      test    : 'Graph with negative edge that creates shorter path through detour.',
      verdict : 'Greedy FAILS — use Bellman-Ford',
    },
    {
      id      : 'gt_activity_selection',
      label   : 'Activity selection by earliest start',
      trap    : 'Earliest START does not work — earliest END does',
      test    : 'Activities: [1,10],[2,3],[4,5]. Earliest start picks [1,10] blocking everything.',
      verdict : 'Sort by END time not start time',
    },
  ];

  const PROOF_TECHNIQUES = [
    {
      id   : 'exchange_argument',
      label: 'Exchange Argument',
      desc : 'Assume an optimal solution differs from greedy. Show swapping to match greedy does not worsen the solution.',
      when : 'Interval scheduling, Huffman coding, job scheduling',
    },
    {
      id   : 'greedy_stays_ahead',
      label: 'Greedy Stays Ahead',
      desc : 'Show that at every step, greedy is at least as good as any other solution up to that point.',
      when : 'Fractional knapsack, minimum spanning tree',
    },
    {
      id   : 'matroid',
      label: 'Matroid Structure',
      desc : 'If the problem has matroid structure, greedy is provably optimal.',
      when : 'Graph problems with independence system structure',
    },
  ];

  function getVerifier()        { return { ...VERIFIER }; }
  function getFramework()       { return { ...FRAMEWORK }; }
  function getCommonTraps()     { return [...COMMON_TRAPS]; }
  function getProofTechniques() { return [...PROOF_TECHNIQUES]; }

  function buildResult(greedyAnswer, optimalAnswer, greedyRule) {
    const counterExampleFound = greedyAnswer !== optimalAnswer &&
      greedyAnswer !== null && optimalAnswer !== null;

    return {
      counterExampleFound,
      greedyRule,
      greedyAnswer,
      optimalAnswer,
      verdict: counterExampleFound
        ? FRAMEWORK.verdict.found
        : FRAMEWORK.verdict.notFound,
      recommendation: counterExampleFound
        ? 'Use Dynamic Programming — greedy fails'
        : 'Greedy appears correct — verify formally before coding',
    };
  }

  return {
    getVerifier,
    getFramework,
    getCommonTraps,
    getProofTechniques,
    buildResult,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GreedyVerifier;
}