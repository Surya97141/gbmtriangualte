// stages/stage3/properties/local-optimality.js
// 3D — Can you make a locally optimal choice at each step without regretting it?
// Used by: stage3.js

const LocalOptimality = (() => {

  const PROPERTY = {
    id       : 'localOptimality',
    label    : '3D — Local vs global optimality',
    question : 'At each decision point, can you make a choice that is locally best AND never need to revise it later?',
    why      : 'This is the greedy safety test. If local optimal choices always lead to a globally optimal result — Greedy works in O(n) or O(n log n). If any local choice can lead to a globally suboptimal result — Greedy fails and you need DP.',
    answers  : [
      {
        id      : 'yes',
        label   : 'Yes — local optimal = global optimal',
        sublabel: 'Provably safe to be greedy — never need to backtrack',
        color   : 'green',
        opens   : [
          'Greedy algorithm',
          'Sort then greedily pick',
          'Priority Queue (always process most promising first)',
        ],
        eliminates: [
          'DP (overkill if greedy is provably correct)',
          'Backtracking (never need to undo)',
        ],
        followUp: 'Must prove — try counter-example test in Stage 5A before coding.',
        warning : 'Greedy feels right for many problems where it is actually wrong. Always test counter-example.',
      },
      {
        id      : 'no',
        label   : 'No — local choice can hurt globally',
        sublabel: 'Taking the best now can prevent the best total',
        color   : 'red',
        opens   : [
          'Dynamic Programming',
          'Backtracking (if need all solutions)',
        ],
        eliminates: [
          'Pure Greedy',
        ],
        followUp: 'Describe the counter-example that breaks greedy. This confirms DP is needed.',
      },
      {
        id      : 'unsure',
        label   : 'Unsure — need counter-example test',
        sublabel: 'Greedy feels right but not confirmed',
        color   : 'gray',
        opens   : [],
        eliminates: [],
        followUp: 'Go directly to Stage 5A — greedy counter-example test. State the greedy rule then try to break it.',
      },
    ],
  };

  const TEST_CASES = [
    {
      scenario  : 'Interval scheduling — maximize non-overlapping intervals',
      answer    : 'yes',
      reasoning : 'Always pick the interval with earliest end time. Provably optimal — never need to reconsider.',
    },
    {
      scenario  : 'Weighted interval scheduling — maximize total value',
      answer    : 'no',
      reasoning : 'Greedy by earliest end fails — a high-value late interval may be worth skipping early ones. Needs DP.',
    },
    {
      scenario  : 'Coin change with canonical coins (1, 5, 10, 25)',
      answer    : 'yes',
      reasoning : 'Always pick largest coin ≤ remaining amount. Works for canonical coin systems.',
    },
    {
      scenario  : 'Coin change with arbitrary coins (1, 3, 4)',
      answer    : 'no',
      reasoning : 'For amount 6: greedy picks 4+1+1=3 coins. Optimal is 3+3=2 coins. Greedy FAILS.',
    },
    {
      scenario  : 'Huffman coding — minimum weighted path length',
      answer    : 'yes',
      reasoning : 'Always merge two smallest frequency nodes. Provably optimal by exchange argument.',
    },
    {
      scenario  : '0/1 Knapsack — maximize value within weight limit',
      answer    : 'no',
      reasoning : 'Greedy by value/weight ratio fails for 0/1 knapsack. Fractional knapsack is fine — 0/1 needs DP.',
    },
  ];

  const VERIFICATION = {
    prompt: 'Counter-example framework:',
    steps : [
      '1. State your greedy rule clearly in one sentence',
      '2. Construct a small adversarial case (3-5 elements)',
      '3. Apply greedy rule — what does it pick?',
      '4. Apply brute force — what is the actual optimal?',
      '5. If greedy ≠ optimal → GREEDY FAILS → use DP',
      '6. If you cannot find a counter-example after 5 tries → likely greedy (prove formally)',
    ],
  };

  function getProperty()     { return { ...PROPERTY }; }
  function getTestCases()    { return [...TEST_CASES]; }
  function getVerification() { return { ...VERIFICATION }; }
  function getAnswerById(id) { return PROPERTY.answers.find(a => a.id === id) ?? null; }
  function greedySafe(id)    { return id === 'yes'; }
  function needsDP(id)       { return id === 'no';  }

  return {
    getProperty,
    getTestCases,
    getVerification,
    getAnswerById,
    greedySafe,
    needsDP,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalOptimality;
}