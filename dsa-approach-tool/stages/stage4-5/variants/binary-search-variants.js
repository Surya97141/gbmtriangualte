// stages/stage4-5/variants/binary-search-variants.js
// Binary search approach variants — different BS formulations
// Used by: stage4-5.js

const BinarySearchVariants = (() => {

  const VARIANTS = [
    {
      id          : 'bs_on_answer',
      label       : 'Binary Search on Answer',
      tagline     : 'Search for the optimal value in [lo, hi]',
      complexity  : 'O(log(range) × isFeasible)',
      when        : [
        'Minimize maximum or maximize minimum',
        'Answer is a value in a known range',
        'isFeasible(X) can be checked greedily in O(n)',
      ],
      template    : `int lo = MIN_ANSWER, hi = MAX_ANSWER;
while (lo < hi) {
  int mid = lo + (hi - lo) / 2;
  if (isFeasible(mid)) hi = mid;   // minimize: shrink right
  else                 lo = mid + 1;
}
return lo; // lo == hi == answer`,
      checkQuestion: 'Can you write isFeasible(X) in O(n) or O(n log n)?',
      watchOut    : [
        'isFeasible must be monotone — verify with 2 examples',
        'lo/hi boundary: lo = min possible answer, hi = max possible answer',
        'Minimize: if feasible → hi = mid. Maximize: if feasible → lo = mid.',
        'Integer overflow: use lo + (hi - lo) / 2 not (lo + hi) / 2',
      ],
      examples    : [
        'Koko eating bananas — minimize speed',
        'Split array — minimize largest sum',
        'Capacity to ship packages — minimize capacity',
      ],
    },
    {
      id          : 'bs_on_index',
      label       : 'Binary Search on Index',
      tagline     : 'Find position in sorted array satisfying condition',
      complexity  : 'O(log n)',
      when        : [
        'Array is sorted or partially sorted',
        'Find first/last index satisfying condition',
        'Search for element or insertion position',
      ],
      template    : `// Find first index where condition is true
int lo = 0, hi = n - 1, ans = -1;
while (lo <= hi) {
  int mid = lo + (hi - lo) / 2;
  if (condition(mid)) {
    ans = mid;
    hi = mid - 1;  // search left half for earlier match
  } else {
    lo = mid + 1;
  }
}
return ans;`,
      checkQuestion: 'Is the array sorted? Is the condition monotone on the array?',
      watchOut    : [
        'lower_bound finds first element ≥ x (strict increasing)',
        'upper_bound finds first element > x',
        'Condition must be monotone — false...false...true...true pattern',
        'Infinite loop risk if lo/hi updates are wrong — always ensure progress',
      ],
      examples    : [
        'Search in rotated sorted array',
        'Find peak element',
        'First bad version',
        'Find minimum in rotated sorted array',
      ],
    },
    {
      id          : 'bs_on_prefix',
      label       : 'Binary Search on Prefix Sum',
      tagline     : 'Binary search on cumulative sums for O(log n) range queries',
      complexity  : 'O(n log n) build + O(log n) query',
      when        : [
        'Find subarray with sum closest to target',
        'Find first subarray exceeding weight limit',
        'Prefix sums are sorted (all positive values)',
      ],
      template    : `// Build prefix sum array
vector<int> prefix(n+1, 0);
for (int i = 0; i < n; i++) prefix[i+1] = prefix[i] + a[i];

// Binary search on prefix for subarray sum queries
// Find first j where prefix[j] - prefix[i] >= target
int j = lower_bound(prefix.begin()+i, prefix.end(), prefix[i]+target) - prefix.begin();`,
      checkQuestion: 'Are all values non-negative? (Required for prefix sums to be sorted)',
      watchOut    : [
        'Only works when all values non-negative — prefix sum must be non-decreasing',
        'With negative values — use deque or other approach',
        'Binary search on prefix gives O(log n) per query vs O(n) linear scan',
      ],
      examples    : [
        'Minimum size subarray sum ≥ target',
        'Split array into parts each summing to threshold',
      ],
    },
    {
      id          : 'bs_rotated',
      label       : 'Binary Search on Rotated Array',
      tagline     : 'Handle the pivot point in O(log n)',
      complexity  : 'O(log n)',
      when        : [
        'Array was sorted then rotated at unknown pivot',
        'Find element in rotated sorted array',
        'Find minimum in rotated sorted array',
      ],
      template    : `// Search in rotated sorted array
int lo = 0, hi = n - 1;
while (lo <= hi) {
  int mid = lo + (hi - lo) / 2;
  if (a[mid] == target) return mid;

  // Left half is sorted
  if (a[lo] <= a[mid]) {
    if (a[lo] <= target && target < a[mid]) hi = mid - 1;
    else                                    lo = mid + 1;
  } else {
    // Right half is sorted
    if (a[mid] < target && target <= a[hi]) lo = mid + 1;
    else                                    hi = mid - 1;
  }
}
return -1;`,
      checkQuestion: 'Is the array guaranteed to have been sorted then rotated exactly once?',
      watchOut    : [
        'Rotated array has ONE sorted half at every step — identify which',
        'Duplicates make this harder — may need O(n) worst case with duplicates',
        'For finding minimum: pivot is where a[mid] > a[right]',
      ],
      examples    : [
        'Search in rotated sorted array (LeetCode 33)',
        'Find minimum in rotated sorted array (LeetCode 153)',
      ],
    },
    {
      id          : 'bs_2d',
      label       : 'Binary Search on 2D Matrix',
      tagline     : 'Treat 2D matrix as 1D sorted array',
      complexity  : 'O(log(n×m))',
      when        : [
        'Matrix where rows and columns are sorted',
        'Matrix where row i last element < row i+1 first element',
        'Effectively a 1D sorted array arranged in rows',
      ],
      template    : `// Binary search on n×m matrix as 1D array
int lo = 0, hi = n * m - 1;
while (lo <= hi) {
  int mid = lo + (hi - lo) / 2;
  int val = matrix[mid / m][mid % m];
  if      (val == target) return true;
  else if (val <  target) lo = mid + 1;
  else                    hi = mid - 1;
}
return false;`,
      checkQuestion: 'Is the last element of row i less than first element of row i+1?',
      watchOut    : [
        'This only works for "staircase" sorted matrix (row-to-row sorted)',
        'For "column-sorted AND row-sorted" matrix → use different O(n+m) approach',
        'mid / m = row index, mid % m = column index',
      ],
      examples    : [
        'Search a 2D matrix (LeetCode 74)',
        'Kth smallest in sorted matrix',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  // Get variants relevant to current directions
  function getRelevant(directions = []) {
    const isBSDirection = directions.some(d =>
      (d.family ?? '').includes('binary_search') ||
      (d.id     ?? '').includes('bsearch')
    );
    if (!isBSDirection) return [];
    return getAll();
  }

  // Get complexity after selecting a variant
  function getVariantComplexity(variantId, baseFeasibilityComplexity = 'O(n)') {
    const v = getById(variantId);
    if (!v) return null;
    if (variantId === 'bs_on_answer') {
      return `O(log(range) × ${baseFeasibilityComplexity})`;
    }
    return v.complexity;
  }

  return {
    getAll,
    getById,
    getRelevant,
    getVariantComplexity,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BinarySearchVariants;
}