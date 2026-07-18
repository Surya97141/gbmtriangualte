// stages/stage4-5/variants/greedy-variants.js
// Greedy approach variants
// Used by: stage4-5.js

const GreedyVariants = (() => {

  const VARIANTS = [
    {
      id          : 'g_interval_scheduling',
      label       : 'Greedy -- Interval Scheduling',
      tagline     : 'Sort by end time, pick if it starts after the last pick ends',
      complexity  : 'O(n log n)',
      when        : [
        'Choosing a maximum set of non-overlapping intervals',
        'Meeting/job scheduling, activity selection',
      ],
      template    : `sort(intervals.begin(), intervals.end(),
     [](auto&a, auto&b){ return a.end < b.end; });
int count = 0, lastEnd = INT_MIN;
for (auto& iv : intervals) {
  if (iv.start >= lastEnd) { count++; lastEnd = iv.end; }
}`,
      checkQuestion: 'Can you prove picking the earliest-ending option first never hurts later choices?',
      watchOut    : [
        'Sorting by START time instead of END time is the most common mistake here',
        'This only works for COUNTING intervals, not weighted intervals -- weighted needs DP',
      ],
      examples    : [
        'Non-overlapping Intervals',
        'Maximum number of meetings in one room',
      ],
    },
    {
      id          : 'g_exchange_argument',
      label       : 'Greedy -- Exchange Argument (custom sort rule)',
      tagline     : 'Derive a custom comparator by imagining swapping two adjacent choices',
      complexity  : 'O(n log n)',
      when        : [
        'Order of items matters and a comparison-based rule determines the optimal order',
        'Two adjacent items can be swapped and you can reason about which order is always at least as good',
      ],
      template    : `// Example: minimize sum of waiting times by processing shortest jobs first
sort(jobs.begin(), jobs.end(),
     [](auto&a, auto&b){ return a.duration < b.duration; });`,
      checkQuestion: 'If you swap two adjacent elements in your proposed order, can you show it never improves the answer?',
      watchOut    : [
        'This needs an actual exchange-argument proof, not just intuition -- try to construct a counterexample before trusting it',
        'Custom comparator problems often hide a mathematical inequality rearrangement (e.g. comparing a+b vs b+a as strings)',
      ],
      examples    : [
        'Minimize waiting time / job sequencing',
        'Largest number formed by concatenating array elements (custom string comparator)',
      ],
    },
    {
      id          : 'g_priority_queue',
      label       : 'Greedy -- Priority Queue Driven',
      tagline     : 'Always take the currently-best available option from a heap',
      complexity  : 'O(n log n)',
      when        : [
        'Repeatedly need the current min/max as choices get consumed and new ones appear',
        'Task scheduling, merging, or Huffman-coding-style problems',
      ],
      template    : `priority_queue<int> pq(a.begin(), a.end());
while (pq.size() > 1) {
  int x = pq.top(); pq.pop();
  int y = pq.top(); pq.pop();
  // combine x and y, push result back
  pq.push(combine(x, y));
}`,
      checkQuestion: 'Does the "best current choice" change as you make more choices, requiring a live-updated structure?',
      watchOut    : [
        'Using a sorted array instead of a heap here is O(n^2) overall due to repeated re-sorting -- heap keeps it O(n log n)',
        'Watch for min-heap vs max-heap mixups (many languages default to min-heap)',
      ],
      examples    : [
        'Task Scheduler with cooldown',
        'Huffman encoding / minimum cost to combine piles',
      ],
    },
    {
      id          : 'g_two_pointer_greedy',
      label       : 'Greedy -- Two Pointer Assignment',
      tagline     : 'Sort both sides, greedily match smallest-to-smallest or best-fit',
      complexity  : 'O(n log n)',
      when        : [
        'Two groups need to be matched/paired to satisfy some constraint optimally',
        'Assigning items to slots where a greedy match is provably optimal',
      ],
      template    : `sort(a.begin(), a.end());
sort(b.begin(), b.end());
int i = 0, j = 0, matched = 0;
while (i < a.size() && j < b.size()) {
  if (a[i] <= b[j]) { matched++; i++; j++; }
  else j++;
}`,
      checkQuestion: 'Does sorting both sequences and matching in order provably maximize/minimize the target?',
      watchOut    : [
        'Verify the matching direction -- sometimes you match smallest-with-largest instead of smallest-with-smallest',
      ],
      examples    : [
        'Assign Cookies (children and cookie sizes)',
        'Boats to Save People (two-pointer greedy pairing)',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isGreedyDirection = directions.some(d =>
      (d.family ?? '').includes('greedy') ||
      (d.id     ?? '').includes('greedy')
    );
    if (!isGreedyDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GreedyVariants;
}
