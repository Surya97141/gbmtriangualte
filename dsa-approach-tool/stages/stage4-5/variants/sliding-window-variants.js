// stages/stage4-5/variants/sliding-window-variants.js
// Sliding Window approach variants
// Used by: stage4-5.js

const SlidingWindowVariants = (() => {

  const VARIANTS = [
    {
      id          : 'sw_fixed_size',
      label       : 'Sliding Window -- Fixed Size',
      tagline     : 'Window of exactly size k slides across the array',
      complexity  : 'O(n)',
      when        : [
        'Need max/min/sum over every window of a fixed size k',
        'Window size is given explicitly in the problem',
      ],
      template    : `int windowSum = 0;
for (int i = 0; i < k; i++) windowSum += a[i];
int best = windowSum;
for (int i = k; i < n; i++) {
  windowSum += a[i] - a[i - k];
  best = max(best, windowSum);
}`,
      checkQuestion: 'Is the window size fixed and given in the problem?',
      watchOut    : [
        'Off-by-one on the initial window fill loop (0 to k-1, not 0 to k)',
        'For max/min (not sum), a fixed window still needs a monotonic deque -- plain sum tracking does not work',
      ],
      examples    : [
        'Maximum Average Subarray of size k',
        'Sliding Window Maximum (needs a monotonic deque, see Deque pattern)',
      ],
    },
    {
      id          : 'sw_variable_shrink',
      label       : 'Sliding Window -- Variable, Shrink on Violation',
      tagline     : 'Grow the window, shrink from the left once a condition breaks',
      complexity  : 'O(n)',
      when        : [
        'Need the longest/shortest subarray satisfying a condition',
        'Condition can be checked incrementally as elements enter/leave the window',
      ],
      template    : `int left = 0, best = 0;
unordered_map<int,int> count;
for (int right = 0; right < n; right++) {
  count[a[right]]++;
  while (/* window invalid */ count[a[right]] > 1) {
    count[a[left]]--;
    left++;
  }
  best = max(best, right - left + 1);
}`,
      checkQuestion: 'Does the validity of the window depend only on what is currently inside it?',
      watchOut    : [
        'Shrink condition must be a while loop, not an if -- may need to shrink more than once per step',
        'Forgetting to update the tracking structure (map/count) when shrinking from the left',
      ],
      examples    : [
        'Longest Substring Without Repeating Characters',
        'Longest Substring with At Most K Distinct Characters',
      ],
    },
    {
      id          : 'sw_variable_grow_to_target',
      label       : 'Sliding Window -- Shrink to Find Minimum',
      tagline     : 'Grow until valid, then shrink as much as possible while staying valid',
      complexity  : 'O(n)',
      when        : [
        'Need the SMALLEST window satisfying a condition (not the largest)',
        'Condition becomes true and needs the tightest possible window after that',
      ],
      template    : `int left = 0, best = INT_MAX, curSum = 0;
for (int right = 0; right < n; right++) {
  curSum += a[right];
  while (curSum >= target) {
    best = min(best, right - left + 1);
    curSum -= a[left];
    left++;
  }
}`,
      checkQuestion: 'Are you minimizing the window size once a condition is first satisfied?',
      watchOut    : [
        'This is the mirror image of sw_variable_shrink -- shrink WHILE valid here, shrink UNTIL valid there',
        'Requires all values to be non-negative for the growing-sum logic to behave monotonically',
      ],
      examples    : [
        'Minimum Size Subarray Sum >= target',
        'Smallest window containing all characters of a pattern',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isSWDirection = directions.some(d =>
      (d.family ?? '').includes('sliding_window') ||
      (d.id     ?? '').includes('sliding_window')
    );
    if (!isSWDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SlidingWindowVariants;
}
