// stages/stage4-5/variants/data-structure-variants.js
// Plain data structure approach variants (Stack, Queue, Deque, Heap, Hashing, Bit Manip)
// Used by: stage4-5.js

const DataStructureVariants = (() => {

  const VARIANTS = [
    {
      id          : 'ds_monotonic_stack',
      label       : 'Monotonic Stack',
      tagline     : 'Keep a stack in increasing/decreasing order, discard what can never win again',
      complexity  : 'O(n)',
      when        : [
        'Need "next greater/smaller element" for every position',
        'Matching brackets or undo-order (LIFO) problems',
      ],
      template    : `stack<int> st; // holds indices
vector<int> result(n, -1);
for (int i = 0; i < n; i++) {
  while (!st.empty() && a[st.top()] < a[i]) {
    result[st.top()] = a[i];
    st.pop();
  }
  st.push(i);
}`,
      checkQuestion: 'Do you need "next greater/smaller" for every element, in one linear pass?',
      watchOut    : [
        'The stack must stay monotonic -- popping items that violate the order is the entire trick',
        'Deep recursion for stack-like problems can overflow -- use an explicit stack instead',
      ],
      examples    : [
        'Next Greater Element',
        'Daily Temperatures',
        'Largest Rectangle in Histogram',
      ],
    },
    {
      id          : 'ds_queue_bfs_support',
      label       : 'Queue (FIFO processing)',
      tagline     : 'First-in-first-out order, needed for level-by-level processing',
      complexity  : 'O(n)',
      when        : [
        'Order of arrival must be preserved in processing order',
        'Supporting structure for BFS-style level order traversal',
      ],
      template    : `queue<int> q;
q.push(start);
while (!q.empty()) {
  int u = q.front(); q.pop();
  // process u, push unvisited neighbors
}`,
      checkQuestion: 'Must the oldest unprocessed item always be handled next?',
      watchOut    : [
        'Using a list with pop-from-front in some languages is O(n) per pop -- use a real queue/deque structure',
        'Confusable with: if this queue is purely in service of a graph traversal, that IS the BFS direction (see Graph family), not a standalone Data Structure pick',
      ],
      examples    : [
        'Level order tree traversal',
        'Any BFS-based problem (see Graph family for the full BFS variant)',
      ],
    },
    {
      id          : 'ds_monotonic_deque',
      label       : 'Monotonic Deque',
      tagline     : 'A deque kept in sorted order to answer sliding-window min/max in O(1) amortized',
      complexity  : 'O(n)',
      when        : [
        'Need min/max of every sliding window of a given size',
      ],
      template    : `deque<int> dq; // holds indices, values decreasing
vector<int> result;
for (int i = 0; i < n; i++) {
  while (!dq.empty() && dq.front() <= i - k) dq.pop_front();
  while (!dq.empty() && a[dq.back()] < a[i]) dq.pop_back();
  dq.push_back(i);
  if (i >= k - 1) result.push_back(a[dq.front()]);
}`,
      checkQuestion: 'Do you need sliding-window min/max, not just a single fixed-window sum?',
      watchOut    : [
        'Check and pop expired indices (out of window range) BEFORE reading the front as the answer',
        'Mixing up min-deque and max-deque comparison direction is the most common bug',
        'Confusable with: this is specifically Sliding Window\'s own internal machinery for the min/max variant — if the window condition is about a sum or count instead, see the Sliding Window family directly',
      ],
      examples    : [
        'Sliding Window Maximum',
        'Shortest Subarray with Sum at Least K',
      ],
    },
    {
      id          : 'ds_heap_priority_queue',
      label       : 'Heap / Priority Queue',
      tagline     : 'Always retrieve the current min/max in O(log n) as items are added/removed',
      complexity  : 'O(log n) per operation',
      when        : [
        'Need the k-th largest/smallest repeatedly as the set changes',
        'Merging multiple sorted sequences',
      ],
      template    : `priority_queue<int, vector<int>, greater<int>> minHeap;
for (int x : nums) {
  minHeap.push(x);
  if (minHeap.size() > k) minHeap.pop();
}
// minHeap.top() is now the kth largest`,
      checkQuestion: 'Does the set of candidates change over time, needing a live-updated min/max?',
      watchOut    : [
        'If you only need the extreme ONCE, a single sort is simpler -- reach for a heap when the set changes repeatedly',
        'Default priority_queue is a MAX-heap in C++ -- use greater<int> explicitly for a min-heap',
      ],
      examples    : [
        'Kth Largest Element in a Stream',
        'Merge K Sorted Lists',
        'Top K Frequent Elements',
      ],
    },
    {
      id          : 'ds_hashing',
      label       : 'Hashing (map/set)',
      tagline     : 'O(1) average existence/frequency checks instead of scanning',
      complexity  : 'O(1) average per operation',
      when        : [
        'Need fast existence checks, frequency counts, or grouping',
      ],
      template    : `unordered_map<int,int> seen;
for (int i = 0; i < n; i++) {
  int complement = target - a[i];
  if (seen.count(complement)) { /* found pair (seen[complement], i) */ }
  seen[a[i]] = i;
}`,
      checkQuestion: 'Do you need existence/frequency lookups, without needing sorted order?',
      watchOut    : [
        'Hash map lookups are O(1) AVERAGE, not worst case -- pathological collisions are rare but possible',
        'If you also need ordering or "closest value" queries, sorting + binary search may serve better',
      ],
      examples    : [
        'Two Sum',
        'Group Anagrams',
        'Longest Consecutive Sequence',
      ],
    },
    {
      id          : 'ds_bit_manipulation',
      label       : 'Bit Manipulation',
      tagline     : 'Exploit binary representation directly for subset/toggle/XOR tricks',
      complexity  : 'O(1) to O(log value)',
      when        : [
        'Problem involves XOR, counting set bits, subsets, or powers of two',
      ],
      template    : `int countSetBits(int n) {
  int count = 0;
  while (n) { n &= (n - 1); count++; } // clears lowest set bit
  return count;
}
int singleNumber(vector<int>& nums) {
  int result = 0;
  for (int x : nums) result ^= x; // pairs cancel, single remains
  return result;
}`,
      checkQuestion: 'Does the problem talk about XOR, subsets, powers of two, or bit counts explicitly?',
      watchOut    : [
        'Off-by-one on bit shifts (1 << i, not 1 << (i+1)) is a very common slip',
        'This overlaps with Bitmask DP when tracking a SET as DP state, not just doing a one-off bit trick -- see DP family for that case',
      ],
      examples    : [
        'Single Number (XOR cancellation)',
        'Counting Bits',
        'Power of Two check in O(1)',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isDSDirection = directions.some(d =>
      (d.family ?? '').includes('data_structure') ||
      (d.id     ?? '').includes('data_structure')
    );
    if (!isDSDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStructureVariants;
}
