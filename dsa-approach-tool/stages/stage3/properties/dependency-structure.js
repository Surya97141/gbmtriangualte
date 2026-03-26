// stages/stage3/properties/dependency-structure.js
// 3F — Do subproblems depend on each other in a circular way or one-directional?
// Used by: stage3.js

const DependencyStructure = (() => {

  const PROPERTY = {
    id       : 'dependencyStructure',
    label    : '3F — Dependency structure',
    question : 'Do subproblems depend on each other in a circular way, or do dependencies flow in one direction only?',
    why      : 'Standard DP requires a DAG of dependencies — each subproblem depends only on previously computed ones. If dependencies are circular, standard DP breaks and you need a different formulation.',
    answers  : [
      {
        id      : 'dag',
        label   : 'One-directional — DAG of dependencies',
        sublabel: 'Subproblem i depends on smaller subproblems — no cycles',
        color   : 'green',
        opens   : [
          'Standard DP with memoization',
          'Bottom-up tabulation in topological order',
          'Tree DP (tree is a DAG)',
        ],
        eliminates: [],
        followUp: 'Identify the topological order — fill DP table in that order.',
      },
      {
        id      : 'circular',
        label   : 'Circular — dependencies form cycles',
        sublabel: 'Subproblem A depends on B which depends on A',
        color   : 'red',
        opens   : [
          'System of equations',
          'Different state formulation (break the cycle)',
          'Strongly Connected Components (then DP on condensation DAG)',
          'Linear programming (for certain circular structures)',
        ],
        eliminates: [
          'Standard DP',
          'Simple memoization',
        ],
        followUp: 'Try to reformulate the state to break the circular dependency. If not possible — problem may not have DP structure.',
      },
      {
        id      : 'unsure',
        label   : 'Unsure — need to draw dependency graph',
        sublabel: 'Dependency direction is not clear',
        color   : 'gray',
        opens   : [],
        eliminates: [],
        followUp: 'Draw 3-4 small subproblems and their dependencies explicitly. Is there any cycle?',
      },
    ],
  };

  const TEST_CASES = [
    {
      scenario  : 'Fibonacci — f(n) depends on f(n-1) and f(n-2)',
      answer    : 'dag',
      reasoning : 'f(5)→f(4)→f(3)→f(2)→f(1). Strictly decreasing — DAG. Standard DP works.',
    },
    {
      scenario  : 'Game theory — player A optimal depends on player B optimal which depends on A',
      answer    : 'circular',
      reasoning : 'A\'s best response depends on B\'s strategy which depends on A\'s strategy. Circular — needs game theory formulation.',
    },
    {
      scenario  : 'Longest path in DAG',
      answer    : 'dag',
      reasoning : 'Process nodes in topological order. Each node\'s answer depends only on predecessors — no cycles.',
    },
    {
      scenario  : 'Edit distance — dp[i][j] depends on dp[i-1][j], dp[i][j-1], dp[i-1][j-1]',
      answer    : 'dag',
      reasoning : 'All dependencies are on strictly smaller (i,j) pairs. Fill row by row — DAG.',
    },
  ];

  const VERIFICATION = {
    prompt: 'Dependency graph test:',
    steps : [
      '1. Write out 3-4 subproblems explicitly',
      '2. Draw an arrow from A to B if A\'s computation requires B\'s answer',
      '3. Is there any cycle in this graph?',
      '4. If no cycles → DAG → standard DP works',
      '5. If cycles exist → circular dependencies → DP will not converge',
    ],
  };

  function getProperty()     { return { ...PROPERTY }; }
  function getTestCases()    { return [...TEST_CASES]; }
  function getVerification() { return { ...VERIFICATION }; }
  function getAnswerById(id) { return PROPERTY.answers.find(a => a.id === id) ?? null; }
  function isDAG(id)         { return id === 'dag';      }
  function isCircular(id)    { return id === 'circular'; }

  return {
    getProperty,
    getTestCases,
    getVerification,
    getAnswerById,
    isDAG,
    isCircular,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DependencyStructure;
}