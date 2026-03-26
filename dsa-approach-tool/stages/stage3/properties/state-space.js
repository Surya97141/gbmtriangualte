// stages/stage3/properties/state-space.js
// 3E — What does the state space look like?
// Used by: stage3.js

const StateSpace = (() => {

  const PROPERTY = {
    id       : 'stateSpace',
    label    : '3E — State space characterization',
    question : 'Can you define a "state" that fully captures what you need to know at any point in the algorithm?',
    why      : 'The shape and size of the state space determines which algorithm is feasible. Small polynomial state → DP. Exponential state → Bitmask DP (n≤20) or Backtracking. Path-dependent state → Backtracking with pruning. Graph-shaped state space → BFS/DFS on states.',
    answers  : [
      {
        id      : 'small',
        label   : 'Yes — state is small and polynomial',
        sublabel: 'State fits in O(n), O(n²), or O(n×k) for reasonable k',
        color   : 'blue',
        opens   : [
          'Dynamic Programming',
          '1D DP — state is single index',
          '2D DP — state is pair of indices',
          'DP with extra dimension for constraint (e.g. remaining budget)',
        ],
        eliminates: [
          'Backtracking (state space too structured for exhaustive search)',
        ],
        followUp: 'Go to DP sub-classifier (Stage 3H) to determine exact DP type.',
      },
      {
        id      : 'exponential',
        label   : 'Yes — but state space is exponential',
        sublabel: 'Need to track subset of elements — state is a bitmask',
        color   : 'yellow',
        opens   : [
          'Bitmask DP (only if n ≤ 20)',
          'State Compression',
          'Meet in the Middle (if n ≤ 40)',
        ],
        eliminates: [
          'Standard DP',
          'Bitmask DP if n > 20 (2^25 = 33M states is borderline, 2^30 is TLE)',
        ],
        followUp: 'Verify n ≤ 20 from Stage 0 before proceeding with Bitmask DP.',
      },
      {
        id      : 'path_needed',
        label   : 'No — need to track full path of decisions',
        sublabel: 'The algorithm needs to remember every choice made so far',
        color   : 'red',
        opens   : [
          'Backtracking',
          'DFS with path tracking',
          'Recursion with undo (backtrack step)',
        ],
        eliminates: [
          'DP (cannot compress path into fixed-size state)',
          'Greedy (need to undo choices)',
        ],
        followUp: 'Estimate branching factor and depth. Total states ≈ branching^depth. Must be feasible.',
      },
      {
        id      : 'unsure',
        label   : 'Unsure — cannot define state clearly',
        sublabel: 'State definition is unclear or seems too large',
        color   : 'gray',
        opens   : [],
        eliminates: [],
        followUp: 'Try: what information do you need at step i to compute the answer without looking back at steps 0..i-1? That is your state.',
      },
    ],
  };

  const TEST_CASES = [
    {
      scenario  : 'Minimum cost to reach end of array',
      answer    : 'small',
      reasoning : 'State = current index. dp[i] = min cost to reach index i. O(n) state space.',
    },
    {
      scenario  : 'Travelling Salesman Problem',
      answer    : 'exponential',
      reasoning : 'State = (current city, set of visited cities). Set is a bitmask. O(2^n × n) — only for n ≤ 20.',
    },
    {
      scenario  : 'All permutations of an array',
      answer    : 'path_needed',
      reasoning : 'Must track which elements chosen so far in which order — full path needed. Backtracking.',
    },
    {
      scenario  : 'Longest palindromic subsequence',
      answer    : 'small',
      reasoning : 'State = (left index, right index). dp[i][j] = LPS of s[i..j]. O(n²) state.',
    },
    {
      scenario  : 'Minimum cost to assign tasks to workers (each task once)',
      answer    : 'exponential',
      reasoning : 'State = (current worker, set of assigned tasks). Bitmask over tasks — n ≤ 20.',
    },
  ];

  const VERIFICATION = {
    prompt: 'State definition test:',
    steps : [
      '1. Write: "state = (____)" — fill in all variables needed',
      '2. At any point in computation, given only the state — can you determine the optimal next step?',
      '3. Count distinct states: how many unique tuples can the state variables take?',
      '4. If states ≤ 10^7 → DP is feasible',
      '5. If states ≤ 2^20 × 20 = 20M → Bitmask DP feasible',
      '6. If states are exponential and n > 20 → need Backtracking or pruning',
    ],
  };

  function getProperty()     { return { ...PROPERTY }; }
  function getTestCases()    { return [...TEST_CASES]; }
  function getVerification() { return { ...VERIFICATION }; }
  function getAnswerById(id) { return PROPERTY.answers.find(a => a.id === id) ?? null; }
  function isDPState(id)     { return id === 'small';       }
  function isBitmask(id)     { return id === 'exponential'; }
  function isBacktrack(id)   { return id === 'path_needed'; }

  return {
    getProperty,
    getTestCases,
    getVerification,
    getAnswerById,
    isDPState,
    isBitmask,
    isBacktrack,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateSpace;
}