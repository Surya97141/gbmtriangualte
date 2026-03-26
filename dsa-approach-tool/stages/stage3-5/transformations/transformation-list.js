// stages/stage3-5/transformations/transformation-list.js
// All 15 transformation patterns
// Used by: stage3-5.js

const TransformationList = (() => {

  const TRANSFORMATIONS = [
    {
      id          : 'tr_element_to_node',
      label       : 'Element → Node',
      tagline     : 'Each element becomes a graph node',
      category    : 'graph',
      recognize   : [
        'Elements have relationships defined by a rule',
        'Problem says "connected if" or "related when"',
        'Word ladder — words differ by one character',
        'Prerequisite chains between items',
      ],
      beforeAfter : {
        before: 'Array of elements with pairwise relationships',
        after : 'Graph where nodes are elements, edges are relationships',
      },
      verifySteps : [
        'Define: what makes two elements "adjacent"?',
        'Check: does this graph have the properties needed?',
        'Map: does every path in the graph correspond to a valid solution?',
        'Map back: can every graph solution be converted to an array answer?',
      ],
      opens       : ['BFS shortest path', 'DFS reachability', 'SCC', 'Topological sort'],
      examples    : [
        {
          problem    : 'Word Ladder — minimum transformations from start to end',
          before     : 'Two arrays of words',
          after      : 'Graph where each word is a node, edge if words differ by 1 char',
          algorithm  : 'BFS — shortest path in unweighted graph',
          complexity : 'O(N × L²)',
        },
        {
          problem    : 'Course Schedule — can all courses be taken?',
          before     : 'List of [course, prerequisite] pairs',
          after      : 'Directed graph, edge from prerequisite to course',
          algorithm  : 'Topological sort — cycle = impossible',
          complexity : 'O(V + E)',
        },
      ],
      watchOut    : 'Edge definition must be symmetric for undirected graph. Asymmetric → directed.',
    },
    {
      id          : 'tr_state_to_position',
      label       : 'State → Position in graph',
      tagline     : 'Each configuration becomes a node, moves become edges',
      category    : 'graph',
      recognize   : [
        'Problem involves reaching a goal configuration from a start',
        '"Minimum moves to solve puzzle"',
        'State has finite distinct configurations',
        'Sliding puzzle, game states',
      ],
      beforeAfter : {
        before: 'Problem about transforming configurations',
        after : 'Graph where each state is a node, valid moves are edges',
      },
      verifySteps : [
        'Define state completely — what uniquely describes a configuration?',
        'Count distinct states — must be manageable (≤ 10^6 for BFS)',
        'Define transitions — what moves produce new states?',
        'Verify goal state is reachable from start state',
      ],
      opens       : ['BFS (minimum moves)', 'Bidirectional BFS', 'A*'],
      examples    : [
        {
          problem    : 'Sliding Puzzle — minimum moves to solve',
          before     : 'Board configurations',
          after      : 'Graph of all reachable board states',
          algorithm  : 'BFS — each state is a node',
          complexity : 'O(states × branching factor)',
        },
        {
          problem    : 'Open the Lock — minimum turns to reach target',
          before     : 'Lock combination as 4-digit state',
          after      : 'Graph where each combination is node, turning one digit is edge',
          algorithm  : 'BFS from start state to target state',
          complexity : 'O(10^4) states',
        },
      ],
      watchOut    : 'State space explosion — 10^6 states feasible, 10^8 needs bidirectional BFS or A*',
    },
    {
      id          : 'tr_optimization_to_bsearch',
      label       : 'Optimization → Binary Search on Answer',
      tagline     : 'Instead of finding optimal directly, binary search for it',
      category    : 'binary_search',
      recognize   : [
        'Minimize maximum or maximize minimum',
        'Answer is a value in a continuous range',
        'Feasibility check is easier than direct optimization',
        '"Is it possible to achieve X?" is easier than "what is optimal X?"',
      ],
      beforeAfter : {
        before: 'Find the optimal value directly',
        after : 'Binary search on answer space, verify feasibility at each midpoint',
      },
      verifySteps : [
        'Define: what range can the answer take? [lo, hi]',
        'Write isFeasible(X) — can we achieve X or better?',
        'Verify monotonicity: if X is feasible, is X+1 also feasible?',
        'Verify isFeasible runs in O(n) or O(n log n)',
      ],
      opens       : ['Binary Search on Answer', 'Parametric search'],
      examples    : [
        {
          problem    : 'Minimize maximum sum when splitting array into k parts',
          before     : 'Try all possible splits — exponential',
          after      : 'Binary search on max sum X, greedily check if k parts possible',
          algorithm  : 'Binary search × greedy check',
          complexity : 'O(n log(sum))',
        },
        {
          problem    : 'Koko Eating Bananas — minimum speed',
          before     : 'Try all speeds',
          after      : 'Binary search on speed, check if total hours ≤ H',
          algorithm  : 'Binary search × O(n) check',
          complexity : 'O(n log(max_pile))',
        },
      ],
      watchOut    : 'isFeasible must be monotone — verify with 2 concrete examples before coding',
    },
    {
      id          : 'tr_sequence_to_dag',
      label       : 'Sequence → DAG',
      tagline     : 'Element ordering constraints define a directed acyclic graph',
      category    : 'graph',
      recognize   : [
        'Elements must appear in certain relative orders',
        'Dependencies between elements — A must come before B',
        'LIS-type problems reduced to longest path in DAG',
      ],
      beforeAfter : {
        before: 'Array with ordering constraints between elements',
        after : 'DAG where edge i→j means i must come before j',
      },
      verifySteps : [
        'Define edge condition: when does element i require element j after it?',
        'Verify no cycles — circular constraints make problem impossible',
        'Map problem to DAG operation (longest path, topological count, etc)',
      ],
      opens       : ['Topological sort', 'Longest path in DAG (DP)', 'Count paths in DAG'],
      examples    : [
        {
          problem    : 'Longest Increasing Subsequence',
          before     : 'Array, find longest subsequence where elements increase',
          after      : 'DAG where edge i→j if i<j and a[i]<a[j]. Find longest path.',
          algorithm  : 'DP in topological order',
          complexity : 'O(n²) DP, O(n log n) with patience sorting',
        },
        {
          problem    : 'Alien Dictionary — find valid character ordering',
          before     : 'Sorted list of words in alien language',
          after      : 'DAG where edge c1→c2 means c1 comes before c2',
          algorithm  : 'Topological sort',
          complexity : 'O(total characters)',
        },
      ],
      watchOut    : 'Circular dependencies mean no valid ordering exists — must detect and report',
    },
    {
      id          : 'tr_2d_to_1d',
      label       : '2D → 1D reduction',
      tagline     : 'Fix one dimension and solve a simpler 1D problem',
      category    : 'dimensional',
      recognize   : [
        'Problem is on a 2D matrix but solution involves subarrays',
        'Maximum sum submatrix',
        'Fix top and bottom row, compress columns to 1D',
      ],
      beforeAfter : {
        before: '2D problem over rows and columns',
        after : '1D problem on compressed column values for each pair of rows',
      },
      verifySteps : [
        'Can we compress the 2D problem to 1D by fixing two boundaries?',
        'What is the 1D subproblem after compression?',
        'Is O(n²m) better than O(n²m²) brute force?',
      ],
      opens       : ['Kadane on compressed array', 'Prefix sum on columns'],
      examples    : [
        {
          problem    : 'Maximum Sum Submatrix',
          before     : 'O(n²m²) brute force',
          after      : 'Fix top row r1, bottom row r2. Compress columns. Apply Kadane.',
          algorithm  : 'O(n²) pairs × O(m) Kadane',
          complexity : 'O(n²m)',
        },
      ],
      watchOut    : 'Only works when boundary pairs are O(n²) and 1D subproblem is O(m)',
    },
    {
      id          : 'tr_counting_to_complement',
      label       : 'Counting → Complement',
      tagline     : 'Count invalid cases and subtract from total',
      category    : 'counting',
      recognize   : [
        '"At least one" condition',
        'Valid = Total - Invalid',
        'Counting "at least one X" is hard, counting "none" is easy',
      ],
      beforeAfter : {
        before: 'Count valid configurations with "at least one X"',
        after : 'Total configurations - configurations with NO X',
      },
      verifySteps : [
        'Can you easily count the total number of configurations?',
        'Is counting configurations with ZERO X easier than AT LEAST ONE X?',
        'Verify: valid + invalid = total (complete partition)',
      ],
      opens       : ['Inclusion-Exclusion', 'Complementary counting DP'],
      examples    : [
        {
          problem    : 'Subarrays with at least K distinct values',
          before     : 'Count subarrays with ≥K distinct — hard to count directly',
          after      : 'f(K) - f(K+1) where f(x) = subarrays with at most x distinct',
          algorithm  : 'Two sliding window passes',
          complexity : 'O(n)',
        },
      ],
      watchOut    : 'Complement works cleanly only when Total is easy to compute and partition is exact',
    },
    {
      id          : 'tr_circular_to_linear',
      label       : 'Circular → Linear (doubling trick)',
      tagline     : 'Duplicate the array to handle circular wraparound',
      category    : 'structural',
      recognize   : [
        'Array is circular — last element connects to first',
        'Maximum subarray in circular array',
        '"Can start anywhere in the cycle"',
      ],
      beforeAfter : {
        before: 'Circular array problem',
        after : 'Linear array of length 2n by duplicating original array',
      },
      verifySteps : [
        'Duplicate array: a[] + a[] gives length 2n',
        'Apply sliding window or subarray algorithm on 2n array',
        'Constrain window/subarray length to ≤ n',
      ],
      opens       : ['Sliding window on doubled array', 'Deque-based max on window ≤ n'],
      examples    : [
        {
          problem    : 'Maximum sum subarray in circular array',
          before     : 'Kadane fails for circular wrap',
          after      : 'Case 1: regular Kadane. Case 2: total_sum - min_subarray_sum.',
          algorithm  : 'Two Kadane passes',
          complexity : 'O(n)',
        },
      ],
      watchOut    : 'Doubling trick requires constraining window to length ≤ n — easy to miss',
    },
    {
      id          : 'tr_range_to_difference_array',
      label       : 'Range updates → Difference array',
      tagline     : 'Convert range increment operations to point operations',
      category    : 'prefix',
      recognize   : [
        'Multiple range update operations then query final values',
        '"Add X to all elements in range [l, r]" Q times',
        'Booking problems — count overlapping reservations',
      ],
      beforeAfter : {
        before: 'Q range updates on array — O(Q×N) naive',
        after : 'O(1) range update with difference array, O(N) prefix sum to reconstruct',
      },
      verifySteps : [
        'diff[l] += val, diff[r+1] -= val for each range update [l, r]',
        'Final array = prefix sum of diff array',
        'Total: O(Q) updates + O(N) reconstruction',
      ],
      opens       : ['Difference array', 'Lazy propagation segment tree'],
      examples    : [
        {
          problem    : 'Corporate Flight Bookings',
          before     : 'Add to flights i through j — O(N×Q)',
          after      : 'diff[i]++, diff[j+1]--. Prefix sum gives totals.',
          algorithm  : 'Difference array',
          complexity : 'O(Q + N)',
        },
      ],
      watchOut    : 'Difference array works for additive operations only',
    },
    {
      id          : 'tr_matrix_exponentiation',
      label       : 'Linear recurrence → Matrix exponentiation',
      tagline     : 'Compute f(n) in O(k³ log n) for linear recurrence',
      category    : 'math',
      recognize   : [
        'f(n) = c1×f(n-1) + c2×f(n-2) + ...',
        'n is very large (up to 10^18) making O(n) DP TLE',
        'Fibonacci but n ≤ 10^18',
      ],
      beforeAfter : {
        before: 'O(n) DP — TLE for n ≤ 10^18',
        after : 'Represent as matrix multiplication, apply fast matrix exponentiation',
      },
      verifySteps : [
        'Express recurrence as v(n) = M × v(n-1)',
        'v(n) = M^(n-1) × v(1)',
        'Matrix size k×k — k must be small (k ≤ 10)',
      ],
      opens       : ['Matrix exponentiation', 'Fast power with matrix'],
      examples    : [
        {
          problem    : 'Fibonacci of very large n (n ≤ 10^18)',
          before     : 'dp[i] = dp[i-1] + dp[i-2] — O(n), TLE',
          after      : '[[f(n+1)],[f(n)]] = [[1,1],[1,0]]^n × [[1],[0]]',
          algorithm  : 'Matrix exponentiation',
          complexity : 'O(log n)',
        },
      ],
      watchOut    : 'Matrix size k must be small — k=50 makes each multiply 125K ops',
    },
    {
      id          : 'tr_coordinate_compression',
      label       : 'Large values → Coordinate compression',
      tagline     : 'Map large sparse values to small dense indices',
      category    : 'structural',
      recognize   : [
        'Values up to 10^9 but only N ≤ 10^5 distinct values appear',
        'Segment tree or BIT needed but value range too large',
        'Relative order matters but absolute values do not',
      ],
      beforeAfter : {
        before: 'Operations on value range [0, 10^9] — impossible to index',
        after : 'Compress N distinct values to [0, N), apply data structure',
      },
      verifySteps : [
        'Collect all values that will appear (from input)',
        'Sort and deduplicate',
        'Map each value to its rank via binary search',
        'Apply BIT/Segment Tree on [0, N)',
      ],
      opens       : ['BIT on compressed values', 'Segment Tree on compressed coords'],
      examples    : [
        {
          problem    : 'Count inversions',
          before     : 'Values up to 10^9 — cannot use BIT of size 10^9',
          after      : 'Compress values to [0, N). BIT tracks count seen so far.',
          algorithm  : 'Coordinate compression + BIT',
          complexity : 'O(n log n)',
        },
      ],
      watchOut    : 'After compression all operations must use compressed indices',
    },
    {
      id          : 'tr_xor_tricks',
      label       : 'Subset/parity problems → XOR',
      tagline     : 'XOR properties simplify subset sum and parity problems',
      category    : 'bitwise',
      recognize   : [
        'Find the single non-repeated element',
        'Subarray XOR queries',
        '"Missing number" or "two missing numbers"',
      ],
      beforeAfter : {
        before: 'Counting/tracking occurrences — O(n) space HashMap',
        after : 'XOR cancels pairs — O(1) space',
      },
      verifySteps : [
        'Does XOR cancel correctly? a XOR a = 0, a XOR 0 = a',
        'For subarray XOR: prefix[r] XOR prefix[l-1] = XOR of range [l,r]',
      ],
      opens       : ['XOR prefix sums', 'XOR basis (GF(2))', 'Bit manipulation'],
      examples    : [
        {
          problem    : 'Single Number — find element appearing once',
          before     : 'HashMap count — O(n) space',
          after      : 'XOR all elements — pairs cancel',
          algorithm  : 'XOR fold',
          complexity : 'O(n) time O(1) space',
        },
      ],
      watchOut    : 'XOR tricks require exact cancellation — only works when elements appear even/odd times exactly',
    },
    {
      id          : 'tr_sort_two_pointer',
      label       : 'Nested loops → Sort + Two Pointer',
      tagline     : 'O(n²) pair enumeration → O(n log n)',
      category    : 'optimization',
      recognize   : [
        'Find pairs or triples satisfying a condition',
        'Two Sum, Three Sum, pairs with difference K',
        'O(n²) nested loop is too slow',
      ],
      beforeAfter : {
        before: 'Nested O(n²) loop over all pairs',
        after : 'Sort array, use two pointers from both ends',
      },
      verifySteps : [
        'Does sorting break the problem? (check order sensitivity from 3A)',
        'Is the condition monotone after sorting?',
        'Sum too small → move left pointer. Sum too large → move right pointer.',
      ],
      opens       : ['Two Pointer', 'Binary Search on sorted array'],
      examples    : [
        {
          problem    : 'Three Sum — find all triplets summing to 0',
          before     : 'O(n³) three nested loops',
          after      : 'Sort, fix one element, two pointer for remaining pair',
          algorithm  : 'O(n log n) + O(n²)',
          complexity : 'O(n²)',
        },
      ],
      watchOut    : 'Two pointer requires SORTED array AND monotone movement condition',
    },
    {
      id          : 'tr_euler_tour',
      label       : 'Tree range queries → Euler Tour + Array',
      tagline     : 'Flatten tree into array for range query algorithms',
      category    : 'tree',
      recognize   : [
        'Queries about subtrees or paths in a tree',
        '"Sum/max/min of all nodes in subtree of v"',
        'Update subtree, query single node',
      ],
      beforeAfter : {
        before: 'Tree traversal per query — O(n) per query',
        after : 'Flatten tree with Euler tour, apply range query on array',
      },
      verifySteps : [
        'DFS assigns tin[v] and tout[v] to each node',
        'Subtree of v = range [tin[v], tout[v]]',
        'Apply BIT/Segment Tree on this range',
      ],
      opens       : ['Euler Tour + BIT', 'Euler Tour + Segment Tree', 'Heavy-Light Decomposition'],
      examples    : [
        {
          problem    : 'Sum of all node values in subtree of v',
          before     : 'DFS from v — O(n) per query',
          after      : 'Euler tour + BIT range sum',
          algorithm  : 'Euler tour + BIT',
          complexity : 'O(log n) per query',
        },
      ],
      watchOut    : 'Subtree is [tin[v], tout[v]] INCLUSIVE. Off-by-one ruins everything.',
    },
    {
      id          : 'tr_implicit_to_explicit_graph',
      label       : 'Implicit → Explicit graph construction',
      tagline     : 'Build the graph explicitly when structure is hidden',
      category    : 'graph',
      recognize   : [
        'Relationship between elements defined by a rule but not given',
        'Connect all intervals that overlap',
        'Build graph once then answer multiple queries',
      ],
      beforeAfter : {
        before: 'Implicit relationships — recompute on every query',
        after : 'Build explicit graph once, answer queries efficiently',
      },
      verifySteps : [
        'Is explicit construction cheaper than repeated recomputation?',
        'How many edges will the explicit graph have?',
        'Is O(n²) edges feasible for given n?',
      ],
      opens       : ['BFS/DFS on explicit graph', 'Union Find on explicit edges'],
      examples    : [
        {
          problem    : 'Accounts Merge — group accounts sharing emails',
          before     : 'Compare all pairs of accounts',
          after      : 'Build graph: accounts sharing email connected. Union Find.',
          algorithm  : 'Union Find on email graph',
          complexity : 'O(n log n)',
        },
      ],
      watchOut    : 'Explicit graph with O(n²) edges may exceed memory for large n',
    },
  ];

  const CATEGORIES = [
    { id: 'graph',         label: 'Graph transformations',      color: 'pur'    },
    { id: 'binary_search', label: 'Binary search reductions',   color: 'green'  },
    { id: 'dimensional',   label: 'Dimensional reduction',      color: 'blue'   },
    { id: 'counting',      label: 'Counting tricks',            color: 'yellow' },
    { id: 'structural',    label: 'Structural transformations',  color: 'blue'   },
    { id: 'prefix',        label: 'Prefix/difference tricks',   color: 'green'  },
    { id: 'math',          label: 'Mathematical reductions',    color: 'red'    },
    { id: 'bitwise',       label: 'Bitwise tricks',             color: 'yellow' },
    { id: 'optimization',  label: 'Complexity optimizations',   color: 'green'  },
    { id: 'tree',          label: 'Tree transformations',       color: 'blue'   },
  ];

  function getAll()            { return [...TRANSFORMATIONS]; }
  function getById(id)         { return TRANSFORMATIONS.find(t => t.id === id) ?? null; }
  function getCategories()     { return [...CATEGORIES]; }
  function getByCategory(cat)  { return TRANSFORMATIONS.filter(t => t.category === cat); }

  function getRelevant(inputTypes, outputForm, optimizationType) {
    const relevant = [];
    if (optimizationType === 'max_min' || optimizationType === 'min_max') {
      relevant.push(getById('tr_optimization_to_bsearch'));
    }
    if (inputTypes.some(t => ['graph_edge_list','graph_adjacency','implicit_graph'].includes(t))) {
      relevant.push(getById('tr_element_to_node'));
      relevant.push(getById('tr_state_to_position'));
    }
    if (inputTypes.includes('single_array') || inputTypes.includes('single_string')) {
      relevant.push(getById('tr_sort_two_pointer'));
      relevant.push(getById('tr_coordinate_compression'));
    }
    if (inputTypes.includes('matrix_grid')) {
      relevant.push(getById('tr_2d_to_1d'));
    }
    if (inputTypes.includes('tree_explicit')) {
      relevant.push(getById('tr_euler_tour'));
      relevant.push(getById('tr_sequence_to_dag'));
    }
    const seen = new Set();
    return relevant.filter(t => {
      if (!t || seen.has(t.id)) return false;
      seen.add(t.id); return true;
    });
  }

  function buildVerificationChecklist(transformationId) {
    const t = getById(transformationId);
    if (!t) return [];
    return t.verifySteps.map((step, idx) => ({
      id     : `${transformationId}_v${idx}`,
      step   : idx + 1,
      text   : step,
      checked: false,
    }));
  }

  return {
    getAll, getById, getCategories,
    getByCategory, getRelevant,
    buildVerificationChecklist,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TransformationList;
}