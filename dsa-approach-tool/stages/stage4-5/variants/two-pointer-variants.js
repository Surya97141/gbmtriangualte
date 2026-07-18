// stages/stage4-5/variants/two-pointer-variants.js
// Two Pointer approach variants
// Used by: stage4-5.js

const TwoPointerVariants = (() => {

  const VARIANTS = [
    {
      id          : 'tp_opposite_ends',
      label       : 'Two Pointer -- Opposite Ends',
      tagline     : 'One pointer at each end of a sorted array, moving inward',
      complexity  : 'O(n)',
      when        : [
        'Array is sorted (or can be sorted without breaking the problem)',
        'Looking for a pair/triple matching a target sum or condition',
        'Need to check pairs from both extremes toward the middle',
      ],
      template    : `int left = 0, right = n - 1;
while (left < right) {
  int sum = a[left] + a[right];
  if (sum == target) { /* found pair */ break; }
  else if (sum < target) left++;
  else right--;
}`,
      checkQuestion: 'Is the array sorted? Does moving one pointer only ever move toward the target in one direction?',
      watchOut    : [
        'Array MUST be sorted first -- this silently gives wrong answers otherwise',
        'For "closest to target" (not exact match), track best-so-far instead of breaking on first match',
        'Watch for duplicate values needing separate skip logic if counting distinct pairs',
      ],
      examples    : [
        'Two Sum II -- sorted array input',
        '3Sum / 4Sum (fix one element, two-pointer the rest)',
        'Container With Most Water',
      ],
    },
    {
      id          : 'tp_fast_slow',
      label       : 'Two Pointer -- Fast and Slow',
      tagline     : 'Two pointers moving at different speeds through the same structure',
      complexity  : 'O(n)',
      when        : [
        'Detecting a cycle in a linked list or sequence',
        'Finding the middle of a structure in one pass',
        'Removing duplicates in-place from a sorted array',
      ],
      template    : `int slow = 0;
for (int fast = 0; fast < n; fast++) {
  if (a[fast] != a[slow]) {
    slow++;
    a[slow] = a[fast];
  }
}
// slow+1 is the new length after removing duplicates`,
      checkQuestion: 'Do you need to detect a cycle, find a midpoint, or compact an array in-place?',
      watchOut    : [
        'Fast/slow (Floyd) cycle detection needs fast to move 2 steps, slow 1 step per iteration',
        'In-place compaction: slow pointer marks the write position, fast pointer scans ahead',
      ],
      examples    : [
        'Remove Duplicates from Sorted Array',
        'Linked List Cycle Detection (Floyd algorithm)',
        'Middle of the Linked List',
      ],
    },
    {
      id          : 'tp_partition',
      label       : 'Two Pointer -- Partition (Dutch Flag style)',
      tagline     : 'Partition an array into sections in a single pass using multiple pointers',
      complexity  : 'O(n)',
      when        : [
        'Need to partition array into 2 or 3 groups (e.g. sort 0s/1s/2s)',
        'In-place rearrangement without extra memory',
        'Quicksort-style partitioning around a pivot',
      ],
      template    : `int low = 0, mid = 0, high = n - 1;
while (mid <= high) {
  if (a[mid] == 0) { swap(a[low++], a[mid++]); }
  else if (a[mid] == 1) { mid++; }
  else { swap(a[mid], a[high--]); }
}`,
      checkQuestion: 'Do you need to group elements into distinct categories in-place, in one pass?',
      watchOut    : [
        'When swapping with high, do NOT advance mid -- the swapped-in element still needs checking',
        'Classic bug: advancing all three pointers uniformly regardless of the swap case',
      ],
      examples    : [
        'Sort Colors (Dutch National Flag)',
        'Partition array around a pivot (quicksort partition step)',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isTPDirection = directions.some(d =>
      (d.family ?? '').includes('two_pointer') ||
      (d.id     ?? '').includes('two_pointer')
    );
    if (!isTPDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TwoPointerVariants;
}
