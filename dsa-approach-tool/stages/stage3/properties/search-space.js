// stages/stage3/properties/search-space.js
// 3G — What shape is the search space?
// Used by: stage3.js

const SearchSpace = (() => {

  const PROPERTY = {
    id       : 'searchSpace',
    label    : '3G — Search space shape',
    question : 'When you imagine "searching for the answer" — what does the search space look like?',
    why      : 'The shape of the search space directly maps to which traversal or search algorithm applies. A continuous value range → Binary Search. A tree of decisions → Backtracking. A graph of states → BFS/DFS. An interval structure → Sweep Line.',
    answers  : [
      {
        id      : 'value_range',
        label   : 'Continuous value range',
        sublabel: 'Answer is a number in a range — search for the right value',
        color   : 'blue',
        opens   : [
          'Binary Search on Answer',
          'Ternary Search (for unimodal functions)',
        ],
        eliminates: [],
        followUp: 'Define lo = minimum possible answer, hi = maximum possible answer. Write isFeasible(mid).',
      },
      {
        id      : 'decision_tree',
        label   : 'Tree of decisions',
        sublabel: 'At each step choose among options — choices branch into a tree',
        color   : 'yellow',
        opens   : [
          'Backtracking with pruning',
          'DFS on decision tree',
          'Branch and Bound',
        ],
        eliminates: [
          'Binary Search',
          'Greedy (need to explore multiple paths)',
        ],
        followUp: 'Estimate tree size: branching_factor ^ max_depth. Must be feasible or pruning must reduce it significantly.',
      },
      {
        id      : 'graph_states',
        label   : 'Graph of states',
        sublabel: 'Each configuration is a node — transitions are edges',
        color   : 'pur',
        opens   : [
          'BFS (shortest path / minimum steps)',
          'DFS (reachability)',
          'Dijkstra (minimum cost path)',
          'A* (heuristic shortest path)',
        ],
        eliminates: [],
        followUp: 'Define: what is a state? What are valid transitions? How large is the state space?',
      },
      {
        id      : 'intervals',
        label   : 'Interval / range structure',
        sublabel: 'Search space consists of overlapping or nested ranges',
        color   : 'green',
        opens   : [
          'Sweep Line',
          'Sorting + Greedy on intervals',
          'Segment Tree (range queries)',
          'Two Pointer on sorted intervals',
        ],
        eliminates: [],
        followUp: 'Sort by start or end time. Process events in order.',
      },
      {
        id      : 'unsure',
        label   : 'Unsure — cannot visualize search space',
        sublabel: 'Shape of search is not clear',
        color   : 'gray',
        opens   : [],
        eliminates: [],
        followUp: 'Ask: if you had to enumerate all possible answers by hand — what structure would you traverse? That is your search space.',
      },
    ],
  };

  const TEST_CASES = [
    {
      scenario  : 'Minimum speed to finish tasks in H hours',
      answer    : 'value_range',
      reasoning : 'Answer is a speed value in [1, max_pile]. Binary search on this range.',
    },
    {
      scenario  : 'All valid parenthesizations of a string',
      answer    : 'decision_tree',
      reasoning : 'At each position choose open or close bracket. Decisions branch into tree. Backtracking.',
    },
    {
      scenario  : 'Minimum moves to solve sliding puzzle',
      answer    : 'graph_states',
      reasoning : 'Each board configuration is a state node. Moves are edges. BFS for minimum moves.',
    },
    {
      scenario  : 'Maximum non-overlapping intervals',
      answer    : 'intervals',
      reasoning : 'Sort intervals by end time, greedily pick non-overlapping. Interval structure.',
    },
    {
      scenario  : 'Kth largest element in array',
      answer    : 'value_range',
      reasoning : 'Binary search on value: how many elements ≥ X? Find X where count = k.',
    },
  ];

  const VERIFICATION = {
    prompt: 'Search space identification:',
    steps : [
      '1. If you had to enumerate all possible answers by brute force — what would you iterate over?',
      '2. Is it a range of numbers? → Binary Search',
      '3. Is it a tree of choices (choose A or B at each step)? → Backtracking',
      '4. Is it a set of configurations each reachable from others? → BFS/DFS',
      '5. Is it overlapping time intervals or ranges? → Sweep Line / Greedy',
    ],
  };

  function getProperty()     { return { ...PROPERTY }; }
  function getTestCases()    { return [...TEST_CASES]; }
  function getVerification() { return { ...VERIFICATION }; }
  function getAnswerById(id) { return PROPERTY.answers.find(a => a.id === id) ?? null; }

  return { getProperty, getTestCases, getVerification, getAnswerById };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchSpace;
}