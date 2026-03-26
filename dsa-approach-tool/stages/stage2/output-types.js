// stages/stage2/output-types.js
// All output form definitions, optimization types, solution depth options
// Used by: stage2.js

const OutputTypes = (() => {

  // ─── OUTPUT FORMS ──────────────────────────────────────────────────────────

  const OUTPUT_FORMS = [
    {
      id          : 'single_number',
      label       : 'Single number',
      sublabel    : 'One integer or float answer',
      icon        : '42',
      examples    : [
        'Return the maximum sum',
        'Return the minimum cost',
        'Return the length of longest subsequence',
      ],
      implications: [
        'DP or Greedy — compute optimal value directly',
        'No reconstruction needed unless problem asks for it',
      ],
      watchOut    : null,
    },
    {
      id          : 'boolean',
      label       : 'Yes / No',
      sublabel    : 'True or false — existence check',
      icon        : '✓/✗',
      examples    : [
        'Can the target sum be achieved?',
        'Is there a valid path?',
        'Can all courses be completed?',
      ],
      implications: [
        'Can use early termination — stop as soon as answer found',
        'Do not need full computation — prune aggressively',
        'BFS / DFS reachability, DP feasibility check',
      ],
      watchOut    : 'Do not compute full optimal value when yes/no is enough',
    },
    {
      id          : 'count',
      label       : 'Count of solutions',
      sublabel    : 'How many valid configurations exist',
      icon        : '#',
      examples    : [
        'Count the number of subarrays with sum k',
        'Count paths from top-left to bottom-right',
        'Number of ways to make change',
      ],
      implications: [
        'DP counting variant — transitions add instead of maximize',
        'Cannot use pruning — must count ALL valid configurations',
        'Often requires modulo 10^9+7 — answer is exponentially large',
      ],
      watchOut    : 'If answer requires mod — apply mod after every addition and multiplication',
    },
    {
      id          : 'all_solutions',
      label       : 'All valid solutions',
      sublabel    : 'Return every valid configuration',
      icon        : '[...]',
      examples    : [
        'Return all subsets that sum to target',
        'Return all valid parenthesizations',
        'Return all permutations',
      ],
      implications: [
        'Backtracking — enumerate decision tree exhaustively',
        'Cannot prune based on optimality — must explore all branches',
        'Output size can be exponential — verify n is small',
      ],
      watchOut    : 'All solutions = Backtracking. If n > 20 this will TLE.',
    },
    {
      id          : 'single_element',
      label       : 'One specific element or index',
      sublabel    : 'Find the element satisfying a condition',
      icon        : 'a[i]',
      examples    : [
        'Find the k-th largest element',
        'Find the first missing positive',
        'Find the median',
      ],
      implications: [
        'QuickSelect for k-th element — O(n) average',
        'Binary Search if search space is ordered',
        'Hashing for presence checks',
      ],
      watchOut    : 'K-th element — use heap O(n log k) or QuickSelect O(n), not full sort O(n log n)',
    },
    {
      id          : 'subarray_substring',
      label       : 'A subarray or substring',
      sublabel    : 'Contiguous portion of input',
      icon        : '[l..r]',
      examples    : [
        'Return the subarray with maximum sum',
        'Return the longest substring without repeating characters',
        'Return the minimum window substring',
      ],
      implications: [
        'Sliding Window — if window validity is monotonic',
        'Prefix Sum — if subarray sum property needed',
        'Kadane — if maximum subarray sum',
      ],
      watchOut    : 'Subarray = contiguous. Subsequence = non-contiguous. Different approaches.',
    },
    {
      id          : 'subsequence',
      label       : 'A subsequence',
      sublabel    : 'Non-contiguous elements in order',
      icon        : 'a[i]...',
      examples    : [
        'Longest increasing subsequence',
        'Longest common subsequence',
        'Return any valid subsequence satisfying condition',
      ],
      implications: [
        'DP — overlapping subproblems almost always present',
        'LIS specifically has O(n log n) patience sorting solution',
        'Reconstruction needs parent tracking array',
      ],
      watchOut    : 'Subsequence allows gaps — cannot use sliding window',
    },
    {
      id          : 'arrangement',
      label       : 'An arrangement or permutation',
      sublabel    : 'Rearrange elements optimally',
      icon        : 'π(a)',
      examples    : [
        'Return the lexicographically smallest permutation',
        'Arrange tasks to minimize total completion time',
        'Return the next permutation',
      ],
      implications: [
        'Greedy construction — build left to right choosing smallest valid option',
        'Backtracking — if all arrangements needed',
        'Sorting with custom comparator',
      ],
      watchOut    : 'Lex smallest — greedy from left. All permutations — Backtracking only if n small.',
    },
    {
      id          : 'path',
      label       : 'A path through graph or tree',
      sublabel    : 'Sequence of nodes or edges',
      icon        : '◉→◉→◉',
      examples    : [
        'Shortest path from source to target',
        'Path with maximum sum in tree',
        'Return the actual route',
      ],
      implications: [
        'BFS for shortest path (unweighted)',
        'Dijkstra for shortest path (weighted)',
        'Must store parent[] or prev[] to reconstruct path',
        'DFS for path existence',
      ],
      watchOut    : 'If path must be returned — store parent pointers during traversal',
    },
    {
      id          : 'kth_element',
      label       : 'K-th smallest or largest',
      sublabel    : 'Order statistic query',
      icon        : 'k-th',
      examples    : [
        'K-th largest element in array',
        'K-th smallest in matrix',
        'Median of two sorted arrays',
      ],
      implications: [
        'Min-heap of size k — O(n log k)',
        'QuickSelect — O(n) average',
        'Binary Search on answer — O(n log(max_val))',
      ],
      watchOut    : 'Never sort fully when only k-th element needed — heap or QuickSelect is faster',
    },
    {
      id          : 'matrix_result',
      label       : 'A matrix or 2D grid result',
      sublabel    : 'Output is a transformed grid',
      icon        : '⊞→⊞',
      examples    : [
        'Return the rotated matrix',
        'Return the distance matrix (BFS from multiple sources)',
        'Return the spiral order',
      ],
      implications: [
        'Multi-source BFS for distance matrix',
        'In-place transformation for rotation',
        'Simulation for spiral',
      ],
      watchOut    : 'Multi-source BFS — add all sources to queue initially, not one at a time',
    },
    {
      id          : 'string_result',
      label       : 'A string result',
      sublabel    : 'Constructed or transformed string',
      icon        : '"..."',
      examples    : [
        'Return the longest palindromic substring',
        'Return the decoded string',
        'Return the smallest string after operations',
      ],
      implications: [
        'Build result character by character — greedy or DP',
        'Stack for nested decode/encode problems',
        'Two pointer for palindrome expansion',
      ],
      watchOut    : 'String concatenation in loop is O(n²) — use StringBuilder or array',
    },
  ];

  // ─── OPTIMIZATION TYPES ────────────────────────────────────────────────────

  const OPTIMIZATION_TYPES = [
    {
      id          : 'none',
      label       : 'No optimization',
      sublabel    : 'Just compute or check',
      implication : 'Direct computation, simulation, or existence check',
      opens       : [],
      eliminates  : [],
    },
    {
      id          : 'maximize',
      label       : 'Maximize',
      sublabel    : 'Find the largest valid value',
      implication : 'DP (take max over transitions) or Greedy (if locally optimal)',
      opens       : ['DP', 'Greedy'],
      eliminates  : [],
      checkQuestion: 'Can a locally optimal choice lead to globally max? If yes — Greedy. If no — DP.',
    },
    {
      id          : 'minimize',
      label       : 'Minimize',
      sublabel    : 'Find the smallest valid value',
      implication : 'DP (take min over transitions) or Greedy (if locally optimal)',
      opens       : ['DP', 'Greedy'],
      eliminates  : [],
      checkQuestion: 'Same as maximize — check if greedy choice is safe.',
    },
    {
      id          : 'max_min',
      label       : 'Maximize the minimum',
      sublabel    : 'Make the worst case as good as possible',
      implication : 'Binary Search on Answer — monotonic feasibility. If min X achievable, min X-1 also.',
      opens       : ['Binary Search on Answer'],
      eliminates  : ['Direct DP without binary search'],
      checkQuestion: 'Given answer X — is there a way to verify feasibility in O(n) or O(n log n)?',
      keyInsight  : 'Almost always Binary Search on Answer. The feasibility check is the real problem.',
    },
    {
      id          : 'min_max',
      label       : 'Minimize the maximum',
      sublabel    : 'Make the best case as small as possible',
      implication : 'Binary Search on Answer — monotonic feasibility. Mirror of maximize minimum.',
      opens       : ['Binary Search on Answer'],
      eliminates  : [],
      checkQuestion: 'Given max value X — can you partition/assign such that no group exceeds X?',
      keyInsight  : 'Same structure as maximize minimum. Binary search on X, feasibility check via greedy.',
    },
    {
      id          : 'count',
      label       : 'Count',
      sublabel    : 'How many valid solutions exist',
      implication : 'DP counting variant. Add instead of maximize in transitions.',
      opens       : ['DP counting', 'Combinatorics'],
      eliminates  : ['Backtracking for large n'],
      checkQuestion: 'Does the answer require modulo? If yes — apply mod at every step.',
    },
    {
      id          : 'lex_smallest',
      label       : 'Lexicographically smallest',
      sublabel    : 'Smallest in dictionary order',
      implication : 'Greedy — at each position choose smallest valid option. Cannot use standard DP.',
      opens       : ['Greedy construction', 'Monotonic Stack'],
      eliminates  : ['Standard DP'],
      checkQuestion: 'At each position — what is the smallest character/value you can place while keeping solution valid?',
    },
    {
      id          : 'lex_largest',
      label       : 'Lexicographically largest',
      sublabel    : 'Largest in dictionary order',
      implication : 'Greedy — at each position choose largest valid option.',
      opens       : ['Greedy construction'],
      eliminates  : [],
      checkQuestion: 'Mirror of lex smallest — choose largest valid at each step.',
    },
  ];

  // ─── SOLUTION DEPTH OPTIONS ────────────────────────────────────────────────

  const SOLUTION_DEPTHS = [
    {
      id          : 'value_only',
      label       : 'Value only',
      sublabel    : 'Just the answer — no reconstruction',
      implication : 'Can use space-optimized DP — rolling array, no parent tracking needed',
      example     : 'Return 7 (the maximum sum)',
    },
    {
      id          : 'reconstruct_path',
      label       : 'Reconstruct the actual solution',
      sublabel    : 'Return indices, elements, or path',
      implication : 'Must store parent[] or choice[] array alongside dp[]. Cannot use rolling array.',
      example     : 'Return [2, 3, 5] (the actual subsequence)',
      watchOut    : 'Space optimization (rolling array) is no longer possible — need full dp table',
    },
    {
      id          : 'count_ways',
      label       : 'Count the ways',
      sublabel    : 'Number of valid solutions',
      implication : 'DP counting variant — transitions use addition. Often mod 10^9+7.',
      example     : 'Return 3 (there are 3 valid paths)',
    },
    {
      id          : 'all_solutions',
      label       : 'All solutions explicitly',
      sublabel    : 'Return every valid configuration',
      implication : 'Backtracking — cannot prune on optimality. n must be small.',
      example     : 'Return [[1,2],[1,3],[2,3]] (all valid subsets)',
      watchOut    : 'Output size can be 2^n — only feasible for n ≤ 20',
    },
  ];

  // ─── OUTPUT INTERACTION RULES ──────────────────────────────────────────────
  // How output form + optimization + depth interact to constrain approaches

  const INTERACTION_RULES = [
    {
      id         : 'ir_count_mod',
      condition  : (form, optType) =>
        optType === 'count',
      rule       : 'Apply modulo 10^9+7 at every addition step — answer is exponentially large',
      severity   : 'warning',
    },
    {
      id         : 'ir_all_solutions_n',
      condition  : (form, optType) =>
        form === 'all_solutions',
      rule       : 'All solutions requires Backtracking — only feasible for n ≤ 20',
      severity   : 'warning',
    },
    {
      id         : 'ir_lex_no_dp',
      condition  : (form, optType) =>
        optType === 'lex_smallest' || optType === 'lex_largest',
      rule       : 'Lexicographic optimization cannot use standard DP — use Greedy construction',
      severity   : 'warning',
    },
    {
      id         : 'ir_reconstruct_no_rolling',
      condition  : (form, optType, depth) =>
        depth === 'reconstruct_path',
      rule       : 'Reconstruction needed — cannot use rolling array space optimization. Must keep full DP table.',
      severity   : 'info',
    },
    {
      id         : 'ir_max_min_bsearch',
      condition  : (form, optType) =>
        optType === 'max_min' || optType === 'min_max',
      rule       : 'Maximize minimum / Minimize maximum almost always requires Binary Search on Answer',
      severity   : 'insight',
    },
    {
      id         : 'ir_boolean_early_exit',
      condition  : (form) =>
        form === 'boolean',
      rule       : 'Yes/No output — use early termination. Do not compute full optimal value.',
      severity   : 'info',
    },
    {
      id         : 'ir_kth_no_sort',
      condition  : (form) =>
        form === 'kth_element',
      rule       : 'K-th element — never sort fully. Use heap O(n log k) or QuickSelect O(n).',
      severity   : 'warning',
    },
  ];

  // ─── QUICK PATTERN MATCHER ─────────────────────────────────────────────────
  // Given output form + optimization — return primary candidate approach families

  const QUICK_PATTERNS = [
    {
      outputForm  : 'single_number',
      optType     : 'maximize',
      families    : ['DP', 'Greedy'],
      note        : 'Try greedy first — if counter-example found, use DP',
    },
    {
      outputForm  : 'single_number',
      optType     : 'minimize',
      families    : ['DP', 'Greedy'],
      note        : 'Same as maximize — check greedy validity',
    },
    {
      outputForm  : 'single_number',
      optType     : 'max_min',
      families    : ['Binary Search on Answer'],
      note        : 'Write feasibility check then binary search',
    },
    {
      outputForm  : 'single_number',
      optType     : 'min_max',
      families    : ['Binary Search on Answer'],
      note        : 'Mirror of maximize minimum',
    },
    {
      outputForm  : 'boolean',
      optType     : 'none',
      families    : ['BFS/DFS', 'DP feasibility', 'Greedy'],
      note        : 'Early termination available — exploit it',
    },
    {
      outputForm  : 'count',
      optType     : 'count',
      families    : ['DP counting', 'Combinatorics'],
      note        : 'Add instead of max in DP transitions. Apply mod.',
    },
    {
      outputForm  : 'all_solutions',
      optType     : 'none',
      families    : ['Backtracking'],
      note        : 'Only if n ≤ 20. Enumerate decision tree.',
    },
    {
      outputForm  : 'subarray_substring',
      optType     : 'maximize',
      families    : ['Sliding Window', 'Kadane', 'Prefix Sum'],
      note        : 'Sliding window if validity monotonic. Kadane for max sum.',
    },
    {
      outputForm  : 'subsequence',
      optType     : 'maximize',
      families    : ['DP'],
      note        : 'Almost always 1D or 2D DP. LIS has O(n log n) solution.',
    },
    {
      outputForm  : 'path',
      optType     : 'minimize',
      families    : ['BFS (unweighted)', 'Dijkstra (weighted)'],
      note        : 'Store parent pointers for reconstruction.',
    },
    {
      outputForm  : 'arrangement',
      optType     : 'lex_smallest',
      families    : ['Greedy', 'Monotonic Stack'],
      note        : 'Build left to right — smallest valid at each step.',
    },
    {
      outputForm  : 'kth_element',
      optType     : 'none',
      families    : ['Heap', 'QuickSelect', 'Binary Search on Answer'],
      note        : 'Heap O(n log k). QuickSelect O(n) avg. Never full sort.',
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getAllForms()          { return [...OUTPUT_FORMS]; }
  function getFormById(id)        { return OUTPUT_FORMS.find(f => f.id === id) ?? null; }
  function getAllOptTypes()        { return [...OPTIMIZATION_TYPES]; }
  function getOptTypeById(id)     { return OPTIMIZATION_TYPES.find(o => o.id === id) ?? null; }
  function getAllDepths()          { return [...SOLUTION_DEPTHS]; }
  function getDepthById(id)       { return SOLUTION_DEPTHS.find(d => d.id === id) ?? null; }

  // Get active interaction rules given selections
  function getActiveRules(formId, optTypeId, depthId) {
    return INTERACTION_RULES.filter(r => {
      try { return r.condition(formId, optTypeId, depthId); }
      catch { return false; }
    });
  }

  // Get quick pattern match
  function getQuickPattern(formId, optTypeId) {
    return QUICK_PATTERNS.find(p =>
      p.outputForm === formId && p.optType === optTypeId
    ) ?? null;
  }

  // Get all candidate families from output analysis
  function getCandidateFamilies(formId, optTypeId) {
    const pattern = getQuickPattern(formId, optTypeId);
    if (pattern) return pattern.families;

    // Fallback — derive from form and optType independently
    const form   = getFormById(formId);
    const optType = getOptTypeById(optTypeId);
    const families = new Set();

    if (form?.implications) {
      form.implications.forEach(impl => {
        if (impl.includes('DP'))          families.add('DP');
        if (impl.includes('Greedy'))      families.add('Greedy');
        if (impl.includes('BFS'))         families.add('BFS/DFS');
        if (impl.includes('Backtracking'))families.add('Backtracking');
        if (impl.includes('Binary Search'))families.add('Binary Search');
      });
    }

    if (optType?.opens) {
      optType.opens.forEach(o => families.add(o));
    }

    return [...families];
  }

  // Build output summary for Stage 7
  function buildSummary(formId, optTypeId, depthId) {
    const form    = getFormById(formId);
    const optType = getOptTypeById(optTypeId);
    const depth   = getDepthById(depthId);
    const rules   = getActiveRules(formId, optTypeId, depthId);
    const families = getCandidateFamilies(formId, optTypeId);

    return {
      form,
      optType,
      depth,
      activeRules     : rules,
      candidateFamilies: families,
      warnings        : rules.filter(r => r.severity === 'warning'),
      insights        : rules.filter(r => r.severity === 'insight'),
    };
  }

  return {
    getAllForms,
    getFormById,
    getAllOptTypes,
    getOptTypeById,
    getAllDepths,
    getDepthById,
    getActiveRules,
    getQuickPattern,
    getCandidateFamilies,
    buildSummary,
  };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OutputTypes;
}