// stages/stage6/edge-cases/interval-cases.js
// Edge cases specific to interval/range inputs
// Used by: stage6.js

const IntervalCases = (() => {

  const CASES = [
    {
      id           : 'ic_empty_list',
      label        : 'Empty interval list',
      priority     : 'critical',
      whyItMatters : 'Accessing index 0 of empty list crashes. Sort of empty list is no-op but merge logic should return empty.',
      checkQuestion: 'Does your solution return correct answer (0 or empty) for no intervals?',
      commonFailure: 'intervals[0][1] access when intervals is empty. Merge returns nothing instead of empty list.',
      fix          : 'if (intervals.empty()) return {}; — handle before sort and merge logic.',
      testInput    : 'intervals = []',
      expected     : 'Return [] (empty), not crash',
    },
    {
      id           : 'ic_single_interval',
      label        : 'Single interval only',
      priority     : 'critical',
      whyItMatters : 'Merge logic compares with previous — no previous exists. Insert/merge should just return the single interval unchanged.',
      checkQuestion: 'Does your merge solution handle one interval without comparing to a previous?',
      commonFailure: 'result.back() access before result is populated when only one interval.',
      fix          : 'Initialize result with first interval. Loop starts from index 1.',
      testInput    : 'intervals = [[1, 5]]',
      expected     : 'Return [[1, 5]] unchanged',
    },
    {
      id           : 'ic_all_overlapping',
      label        : 'All intervals overlap with each other',
      priority     : 'high',
      whyItMatters : 'Should reduce to single merged interval. Common bug: end time not updated to maximum when new interval extends past current end.',
      checkQuestion: 'Does your solution correctly merge all intervals into one when they all overlap?',
      commonFailure: 'result.back()[1] = max(result.back()[1], intervals[i][1]) — forgetting the max causes premature interval close.',
      fix          : 'Always take max of current end with new end: merged_end = max(merged_end, interval.end).',
      testInput    : 'intervals = [[1,10],[2,8],[3,15],[5,12]]',
      expected     : '[[1, 15]] — one merged interval',
    },
    {
      id           : 'ic_touching',
      label        : 'Two intervals sharing exactly one endpoint [1,3] and [3,5]',
      priority     : 'high',
      whyItMatters : 'Definition of overlap varies by problem: [1,3] and [3,5] share point 3. Some problems treat this as overlapping (open/closed interval ambiguity).',
      checkQuestion: 'Does your solution treat touching intervals as overlapping per the problem statement?',
      commonFailure: 'Using > vs >= in overlap check: intervals[i][0] > result.back()[1] vs >=.',
      fix          : 'Check problem statement explicitly: if [1,3] and [3,5] should merge → use >=. If not → use >.',
      testInput    : 'intervals = [[1,3],[3,5]]',
      expected     : 'Problem-dependent: [[1,5]] or [[1,3],[3,5]]',
    },
    {
      id           : 'ic_nested',
      label        : 'One interval completely contains another [1,10] and [3,5]',
      priority     : 'high',
      whyItMatters : 'Nested intervals must not create two separate outputs. The smaller interval disappears inside the larger one.',
      checkQuestion: 'Does your solution handle fully nested intervals correctly?',
      commonFailure: 'Sorting by start, not updating end to max: [1,10] then [3,5] → end updated to max(10,5)=10 ✓. If not using max: outputs [1,5] (wrong).',
      fix          : 'Critical: use max(current_end, new_end) not new_end directly.',
      testInput    : 'intervals = [[1,10],[3,5]]',
      expected     : '[[1,10]] — nested interval absorbed',
    },
    {
      id           : 'ic_sorted_non_overlapping',
      label        : 'Already sorted, no overlaps',
      priority     : 'medium',
      whyItMatters : 'Pre-sorted non-overlapping input should return unchanged. Tests that merge does not incorrectly combine non-overlapping intervals.',
      checkQuestion: 'Does your solution return all intervals unchanged when none overlap?',
      commonFailure: 'Over-merging: incorrect overlap condition merges [1,2] and [4,5] because of wrong comparison.',
      fix          : 'Verify: intervals[i][0] > result.back()[1] means no overlap. Add the current interval to result.',
      testInput    : 'intervals = [[1,2],[4,5],[7,8]]',
      expected     : '[[1,2],[4,5],[7,8]] unchanged',
    },
    {
      id           : 'ic_point_interval',
      label        : 'Point interval — start equals end [x, x]',
      priority     : 'medium',
      whyItMatters : 'Zero-length intervals have 0 duration. Sorting and merging should handle them. They overlap with any interval containing x.',
      checkQuestion: 'Does your solution handle zero-length point intervals?',
      commonFailure: 'Length calculation: end - start = 0 causes division by zero in some formulations.',
      fix          : 'Treat point interval [x,x] as valid interval with length 0. It merges with any interval [a,b] where a ≤ x ≤ b.',
      testInput    : 'intervals = [[1,1],[2,5]]',
      expected     : '[[1,1],[2,5]] — point doesn\'t merge with non-touching',
    },
    {
      id           : 'ic_insert_at_boundaries',
      label        : 'Insert interval at start, end, or overlapping all',
      priority     : 'medium',
      whyItMatters : 'For insert-interval problems: inserting before all, after all, and spanning all existing intervals are three distinct boundary cases.',
      checkQuestion: 'Does your insert-interval solution handle insertions at all boundary positions?',
      commonFailure: 'Off-by-one when inserting at position 0. Missing the case where new interval spans and merges all existing.',
      fix          : 'Test: insert [0,100] into [[1,2],[4,5],[7,8]] → should give [[0,100]].',
      testInput    : 'intervals=[[1,2],[4,5]], newInterval=[0,100]',
      expected     : '[[0,100]] — spans and merges all',
    },
  ];

  function getAll()         { return [...CASES]; }
  function getById(id)      { return CASES.find(c => c.id === id) ?? null; }
  function getCritical()    { return CASES.filter(c => c.priority === 'critical'); }
  function getByPriority(p) { return CASES.filter(c => c.priority === p); }

  return { getAll, getById, getCritical, getByPriority };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntervalCases;
}