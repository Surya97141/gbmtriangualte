// stages/stage2-5/decomposition-checks.js
// Problem decomposition detector — is this one problem or multiple chained?
// Used by: stage2-5.js

const DecompositionChecks = (() => {

  // ─── DECOMPOSITION PATTERNS ────────────────────────────────────────────────

  const PATTERNS = [
    {
      id          : 'dp_preprocessing',
      label       : 'Preprocessing + main solve',
      question    : 'Is there a step that transforms the input into a simpler form before the real problem begins?',
      yesSignal   : 'Sort first, then solve. Build prefix sums, then query. Compress coordinates, then process.',
      examples    : [
        'Sort intervals then greedy merge',
        'Build prefix sum array then answer range queries',
        'Coordinate compress then segment tree',
        'Precompute LCP array then string queries',
      ],
      implication : 'The preprocessing step and the main solve may need completely different approaches. Analyze each separately.',
      subproblems : ['Preprocessing step', 'Main solve on transformed input'],
    },
    {
      id          : 'dp_generate_select',
      label       : 'Generate candidates + select best',
      question    : 'Does the problem first require generating a set of candidates and then selecting the best among them?',
      yesSignal   : 'Enumerate all valid X, then pick the optimal one.',
      examples    : [
        'Find all valid parenthesizations, then pick minimum cost',
        'Generate all subsets with sum ≤ k, then find largest',
        'Compute all shortest paths, then select path satisfying extra constraint',
      ],
      implication : 'Generation step and selection step are separate. Generation may be exponential but prunable. Selection may be linear.',
      subproblems : ['Candidate generation', 'Optimal selection'],
    },
    {
      id          : 'dp_query_separable',
      label       : 'Structure build + query answering',
      question    : 'Are there Q queries on top of N elements where building a structure once answers all queries efficiently?',
      yesSignal   : 'Build once in O(n log n) or O(n). Answer each query in O(log n) or O(1).',
      examples    : [
        'Build segment tree then answer Q range max queries',
        'Build sparse table then answer Q RMQ queries in O(1)',
        'BFS from source then answer Q distance queries in O(1)',
        'Build suffix array then answer Q substring queries',
      ],
      implication : 'Total complexity = O(build) + O(Q × query). Optimize build and query separately.',
      subproblems : ['Structure construction', 'Query answering'],
    },
    {
      id          : 'dp_two_phase',
      label       : 'Two independent phases',
      question    : 'Can the problem be split into two completely independent sub-problems where one feeds into the other?',
      yesSignal   : 'Solve sub-problem A, use its result as input to sub-problem B.',
      examples    : [
        'Find connected components (Phase 1), then shortest path between specific components (Phase 2)',
        'Topological sort (Phase 1), then DP in topological order (Phase 2)',
        'Find all primes up to N (Phase 1), then factorize Q numbers using those primes (Phase 2)',
      ],
      implication : 'Each phase can be solved independently. A bug in Phase 1 corrupts Phase 2 — verify Phase 1 output first.',
      subproblems : ['Phase 1', 'Phase 2'],
    },
    {
      id          : 'dp_meet_in_middle',
      label       : 'Meet in the middle split',
      question    : 'Is n around 40 and the problem involves exploring all subsets or combinations?',
      yesSignal   : 'n ≤ 40. 2^40 is too large but 2^20 × 2^20 = 10^12/10^6 is feasible with sorting.',
      examples    : [
        'Subset sum for n=40 — split into two halves of 20',
        'Four sum variant — split pairs into two halves',
      ],
      implication : 'Classic Meet in the Middle. Split into two equal halves. Solve each half independently. Combine results.',
      subproblems : ['Left half enumeration', 'Right half enumeration', 'Merge / combine'],
    },
    {
      id          : 'dp_single_element_aggregate',
      label       : 'Solve for one + aggregate',
      question    : 'Can you solve the problem for a single element and then combine results across all elements?',
      yesSignal   : 'For each element independently compute X, then combine all X values.',
      examples    : [
        'For each node compute subtree sum, then find max',
        'For each starting position compute answer, then take minimum',
        'For each query independently compute result',
      ],
      implication : 'Check if per-element solutions are truly independent — if they share state, they are not separable.',
      subproblems : ['Per-element computation', 'Aggregation / combination'],
    },
    {
      id          : 'dp_not_decomposable',
      label       : 'Single unified problem',
      question    : 'Is this a single problem with no natural split point?',
      yesSignal   : 'All parts interact — cannot separate into independent sub-problems.',
      examples    : [
        'Longest increasing subsequence — all elements interact',
        'Edit distance — both strings must be considered together',
        'Shortest path — all edges interact',
      ],
      implication : 'Do not force decomposition. Proceed to Stage 3 structural analysis as a single problem.',
      subproblems : [],
      isNegative  : true,
    },
  ];

  // ─── REFRAMING QUESTIONS ──────────────────────────────────────────────────
  // Forced perspective shifts before committing to an approach

  const REFRAME_QUESTIONS = [
    {
      id        : 'rq_strip_story',
      question  : 'If you remove the problem story and keep only the mathematical structure — what does it look like?',
      purpose   : 'Story can mislead. The math is what matters.',
      example   : '"Distribute cookies to children" → Assign values from set A to indices in set B to minimize total cost → Assignment problem',
    },
    {
      id        : 'rq_element_as_node',
      question  : 'What if each element is a node — what would the edges be?',
      purpose   : 'Reveals hidden graph structure in array or string problems.',
      example   : 'Word ladder — each word is a node, edge if words differ by one character → BFS shortest path',
    },
    {
      id        : 'rq_state_as_position',
      question  : 'What if each possible state is a position in a graph — what would transitions be?',
      purpose   : 'Reveals BFS-on-states structure.',
      example   : 'Minimum moves to solve puzzle — each board configuration is a node, moves are edges → BFS',
    },
    {
      id        : 'rq_search_for_answer',
      question  : 'Instead of computing the answer directly — what if you binary searched for it?',
      purpose   : 'Reveals Binary Search on Answer when direct optimization is hard.',
      example   : 'Minimum capacity to ship all packages → binary search on capacity, check feasibility greedily',
    },
    {
      id        : 'rq_complement',
      question  : 'Is counting or finding the complement (invalid cases) easier than the valid cases?',
      purpose   : 'Complement counting — Total minus Invalid.',
      example   : 'Strings with at least one vowel → Total strings minus strings with no vowels',
    },
    {
      id        : 'rq_fix_dimension',
      question  : 'Can you fix one dimension and solve a simpler problem on the remaining dimensions?',
      purpose   : 'Reveals 2D → 1D dimensional reduction.',
      example   : 'Maximum sum submatrix → fix top and bottom rows, compress columns, apply Kadane on 1D',
    },
    {
      id        : 'rq_known_pattern',
      question  : 'Does this problem, restated mathematically, match a known canonical problem?',
      purpose   : 'Direct reduction to solved problem.',
      example   : 'Longest chain of words where each word is previous + one character → LIS on word lengths',
    },
    {
      id        : 'rq_offline_possible',
      question  : 'Can all queries be sorted and processed together offline rather than one at a time?',
      purpose   : 'Reveals offline algorithm opportunity.',
      example   : 'Range queries sorted by right endpoint → process left to right, answer queries when right endpoint reached',
    },
  ];

  // ─── IMPLICIT STRUCTURE QUICK CHECKS ─────────────────────────────────────

  const IMPLICIT_CHECKS = [
    {
      id       : 'ic_hidden_dag',
      check    : 'Does element A constrain or depend on element B?',
      ifYes    : 'Hidden DAG — model as directed graph, apply topological sort',
      example  : 'Task A must complete before task B → DAG → topological DP',
    },
    {
      id       : 'ic_hidden_tree',
      check    : 'Does each element point to exactly one parent?',
      ifYes    : 'Hidden tree from parent array — reconstruct, apply tree DP',
      example  : 'a[i] = parent of node i → build tree → tree DP',
    },
    {
      id       : 'ic_hidden_bipartite',
      check    : 'Can elements be split into two non-interacting groups where only cross-group relationships matter?',
      ifYes    : 'Hidden bipartite structure — check 2-colorability, apply matching',
      example  : 'Assign workers to jobs → bipartite graph → maximum matching',
    },
    {
      id       : 'ic_hidden_interval',
      check    : 'Do elements have natural start and end times or positions?',
      ifYes    : 'Hidden interval structure — sort by start, use sweep line or greedy',
      example  : 'Meeting start/end times → intervals → minimum rooms = max overlap',
    },
    {
      id       : 'ic_hidden_prefix',
      check    : 'Does the problem reduce to sums or properties over contiguous ranges?',
      ifYes    : 'Hidden prefix sum structure — build prefix array, answer in O(1)',
      example  : 'Subarray sum equals k → prefix sum + HashMap',
    },
    {
      id       : 'ic_functional_graph',
      check    : 'Does each element map to exactly one other element (out-degree 1)?',
      ifYes    : 'Functional graph — rho structure with cycles, apply cycle detection',
      example  : 'next[i] defines transitions → functional graph → cycle detection',
    },
  ];

  // ─── TRANSFORMATION CHECKLIST ─────────────────────────────────────────────
  // After proposing a transformation — verify it is valid

  const TRANSFORMATION_VERIFICATION = {
    steps: [
      {
        step   : 1,
        label  : 'Problem equivalence',
        check  : 'Are all constraints preserved in the transformed problem?',
        verify : 'Take a specific input. Does solving the transformed problem give the same answer as the original?',
      },
      {
        step   : 2,
        label  : 'Solution mapping',
        check  : 'Can you map the transformed solution back to the original solution?',
        verify : 'Is the mapping one-to-one? Can every original solution be represented in the transformed form?',
      },
      {
        step   : 3,
        label  : 'Complexity impact',
        check  : 'Does the transformation make the problem easier or harder to solve?',
        verify : 'Compare complexity of original approach vs transformed approach. Is the transformation worth it?',
      },
    ],
    example: {
      original   : 'Find Longest Increasing Subsequence',
      transformed: 'Longest path in DAG where edge i→j exists if i<j and a[i]<a[j]',
      verification: [
        'Every LIS maps to a path in DAG ✓',
        'Every path in DAG maps back to a subsequence ✓',
        'Same O(n²) complexity but structure is clearer ✓',
      ],
    },
  };

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAllPatterns() {
    return [...PATTERNS];
  }

  function getPatternById(id) {
    return PATTERNS.find(p => p.id === id) ?? null;
  }

  function getPositivePatterns() {
    return PATTERNS.filter(p => !p.isNegative);
  }

  function getReframeQuestions() {
    return [...REFRAME_QUESTIONS];
  }

  function getReframeById(id) {
    return REFRAME_QUESTIONS.find(r => r.id === id) ?? null;
  }

  function getImplicitChecks() {
    return [...IMPLICIT_CHECKS];
  }

  function getTransformationVerification() {
    return { ...TRANSFORMATION_VERIFICATION };
  }

  // Given detected pattern id — build subproblem list
  function buildSubproblems(patternId) {
    const pattern = getPatternById(patternId);
    if (!pattern || pattern.isNegative) return [];
    return pattern.subproblems.map((label, idx) => ({
      id         : `sub_${patternId}_${idx}`,
      label,
      description: '',
      analyzed   : false,
    }));
  }

  // Check if a reframe question answer suggests a transformation
  function getTransformationHint(reframeId, answeredYes) {
    if (!answeredYes) return null;

    const HINTS = {
      rq_element_as_node  : 'tr_element_to_node',
      rq_state_as_position: 'tr_state_to_position',
      rq_search_for_answer: 'tr_optimization_to_bsearch',
      rq_complement       : 'tr_counting_to_complement',
      rq_fix_dimension    : 'tr_2d_to_1d',
    };

    return HINTS[reframeId] ?? null;
  }

  // Estimate if decomposition is likely given stage0/stage1 answers
  function estimateDecompositionLikelihood(stage0Answers, stage1Answers) {
    const n         = stage0Answers?.n ?? 0;
    const q         = stage0Answers?.q ?? 0;
    const inputTypes = stage1Answers?.inputTypes ?? [];
    const queryType  = stage1Answers?.queryType ?? 'none';

    let score = 0;

    // Queries suggest preprocessing + query answering
    if (q > 1 && queryType !== 'none') score += 3;

    // Multiple input types suggest multi-part problem
    if (inputTypes.length > 1) score += 2;

    // n around 40 suggests meet in middle
    if (n >= 35 && n <= 45) score += 2;

    // Grid + queries suggests 2D prefix or segment tree
    if (inputTypes.includes('matrix_grid') && q > 1) score += 2;

    // Graph + queries suggests preprocess + query
    if (
      inputTypes.some(t => ['graph_edge_list','graph_adjacency'].includes(t)) &&
      q > 1
    ) score += 2;

    return {
      score,
      likely    : score >= 3,
      veryLikely: score >= 5,
      reason    : score >= 5
        ? 'Multiple strong signals suggest this is a multi-part problem'
        : score >= 3
          ? 'Some signals suggest possible decomposition — worth checking'
          : 'No strong decomposition signals — likely a single unified problem',
    };
  }

  return {
    getAllPatterns,
    getPatternById,
    getPositivePatterns,
    getReframeQuestions,
    getReframeById,
    getImplicitChecks,
    getTransformationVerification,
    buildSubproblems,
    getTransformationHint,
    estimateDecompositionLikelihood,
  };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DecompositionChecks;
}