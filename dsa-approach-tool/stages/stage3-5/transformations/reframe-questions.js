// stages/stage3-5/transformations/reframe-questions.js
// 8 forced perspective shifts applied before committing to any direction
// Used by: stage3-5.js

const ReframeQuestions = (() => {

  const QUESTIONS = [
    {
      id        : 'rq_strip_story',
      question  : 'If you remove the problem story and keep only the mathematical structure — what does it look like?',
      purpose   : 'Story can mislead. The math is what matters.',
      example   : '"Distribute cookies to children" → Assign values from set A to indices in set B → Assignment problem',
      transformHint: null,
    },
    {
      id        : 'rq_element_as_node',
      question  : 'What if each element is a node — what would the edges be?',
      purpose   : 'Reveals hidden graph structure in array or string problems.',
      example   : 'Word ladder — each word is a node, edge if words differ by one character → BFS shortest path',
      transformHint: 'tr_element_to_node',
    },
    {
      id        : 'rq_state_as_position',
      question  : 'What if each possible state is a position in a graph — what would transitions be?',
      purpose   : 'Reveals BFS-on-states structure.',
      example   : 'Minimum moves to solve puzzle — each board configuration is a node, moves are edges → BFS',
      transformHint: 'tr_state_to_position',
    },
    {
      id        : 'rq_search_for_answer',
      question  : 'Instead of computing the answer directly — what if you binary searched for it?',
      purpose   : 'Reveals Binary Search on Answer when direct optimization is hard.',
      example   : 'Minimum capacity to ship all packages → binary search on capacity, check feasibility greedily',
      transformHint: 'tr_optimization_to_bsearch',
    },
    {
      id        : 'rq_complement',
      question  : 'Is counting or finding the complement (invalid cases) easier than the valid cases?',
      purpose   : 'Complement counting — Total minus Invalid.',
      example   : 'Strings with at least one vowel → Total strings minus strings with no vowels',
      transformHint: 'tr_counting_to_complement',
    },
    {
      id        : 'rq_fix_dimension',
      question  : 'Can you fix one dimension and solve a simpler problem on the remaining dimensions?',
      purpose   : 'Reveals 2D → 1D dimensional reduction.',
      example   : 'Maximum sum submatrix → fix top and bottom rows, compress columns, apply Kadane on 1D',
      transformHint: 'tr_2d_to_1d',
    },
    {
      id        : 'rq_known_pattern',
      question  : 'Does this problem, restated mathematically, match a known canonical problem?',
      purpose   : 'Direct reduction to solved problem.',
      example   : 'Longest chain of words where each word is previous + one character → LIS on word lengths',
      transformHint: 'tr_sequence_to_dag',
    },
    {
      id        : 'rq_offline_possible',
      question  : 'Can all queries be sorted and processed together offline rather than one at a time?',
      purpose   : 'Reveals offline algorithm opportunity.',
      example   : 'Range queries sorted by right endpoint → process left to right, answer queries when right endpoint reached',
      transformHint: null,
    },
  ];

  function getAll()       { return [...QUESTIONS]; }
  function getById(id)    { return QUESTIONS.find(q => q.id === id) ?? null; }
  function getTotal()     { return QUESTIONS.length; }

  function getTransformHint(questionId, answeredYes) {
    if (!answeredYes) return null;
    const q = getById(questionId);
    return q?.transformHint ?? null;
  }

  function buildAnswerMap(savedAnswers = {}) {
    return QUESTIONS.map(q => ({
      ...q,
      answer: savedAnswers[q.id] ?? null,
    }));
  }

  return {
    getAll,
    getById,
    getTotal,
    getTransformHint,
    buildAnswerMap,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReframeQuestions;
}