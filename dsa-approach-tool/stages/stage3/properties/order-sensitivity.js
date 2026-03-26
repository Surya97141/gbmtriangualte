// stages/stage3/properties/order-sensitivity.js
// 3A — Can you sort freely without breaking the problem?
// Used by: stage3.js

const OrderSensitivity = (() => {

  // ─── PROPERTY DEFINITION ───────────────────────────────────────────────────

  const PROPERTY = {
    id         : 'orderSensitivity',
    label      : '3A — Order sensitivity',
    question   : 'Does the relative order of elements matter for the answer?',
    why        : 'If order does not matter — you can sort freely. Sorting opens Two Pointer, Greedy, and Binary Search. If order matters — you are locked into the original sequence and must use approaches that respect position.',
    answers    : [
      {
        id      : 'no',
        label   : 'No — order does not matter',
        sublabel: 'Can sort freely without breaking the problem',
        color   : 'green',
        opens   : [
          'Sorting-based approaches',
          'Two Pointer on sorted array',
          'Greedy (pick elements in optimal order)',
          'Binary Search after sorting',
        ],
        eliminates: [
          'Approaches that depend on original position',
        ],
        followUp: 'Confirm: does your answer change if you shuffle the input? If no — order truly does not matter.',
      },
      {
        id      : 'yes',
        label   : 'Yes — original order is essential',
        sublabel: 'Position i relative to position j matters for the answer',
        color   : 'red',
        opens   : [
          'DP on sequence (respects position)',
          'Sliding Window (uses positional structure)',
          'Prefix Sum (uses positional structure)',
          'Monotonic Stack (left-to-right sweep)',
        ],
        eliminates: [
          'Sorting as first step',
          'Greedy on sorted order',
        ],
        followUp: 'Confirm: if you sort the input, does the answer change? If yes — order matters.',
      },
      {
        id      : 'partial',
        label   : 'Partial — some structure can be sorted, some cannot',
        sublabel: 'e.g. sort one array but not the other, or sort within groups',
        color   : 'yellow',
        opens   : [
          'Coordinate compression (sort values, preserve relative order)',
          'Sort one component, process other in original order',
          'Offline query sorting (sort queries, process input in order)',
        ],
        eliminates: [],
        followUp: 'Identify exactly which part can be sorted and which must stay fixed. Apply sorting only to the free part.',
      },
      {
        id      : 'unsure',
        label   : 'Unsure',
        sublabel: 'Cannot determine without more analysis',
        color   : 'gray',
        opens   : [],
        eliminates: [],
        followUp: 'Try this: pick a small example and shuffle the input. Does the answer change? That answers whether order matters.',
      },
    ],
  };

  // ─── TEST CASES ────────────────────────────────────────────────────────────
  // Concrete examples to help user determine the answer

  const TEST_CASES = [
    {
      scenario  : 'Find the maximum sum subarray',
      answer    : 'yes',
      reasoning : 'The subarray must be contiguous — position matters. [3,-2,5] has different max subarray than [5,3,-2].',
    },
    {
      scenario  : 'Find two numbers that sum to target',
      answer    : 'no',
      reasoning : 'You just need two values that sum correctly — sort then two pointer works fine.',
    },
    {
      scenario  : 'Longest increasing subsequence',
      answer    : 'yes',
      reasoning : 'Subsequence respects original order. [1,3,2,4] has LIS 3 but sorted [1,2,3,4] has LIS 4 — completely different.',
    },
    {
      scenario  : 'Merge overlapping intervals',
      answer    : 'no',
      reasoning : 'Sort by start time first — the original order of intervals in input does not matter for the answer.',
    },
    {
      scenario  : 'Minimum window substring',
      answer    : 'yes',
      reasoning : 'The window must be a contiguous substring — character positions matter.',
    },
    {
      scenario  : 'Count pairs with sum less than k',
      answer    : 'no',
      reasoning : 'Sort first, then two pointer counts pairs in O(n). Original order is irrelevant.',
    },
  ];

  // ─── VERIFICATION PROMPT ───────────────────────────────────────────────────

  const VERIFICATION = {
    prompt  : 'Quick verification test:',
    steps   : [
      'Take your problem with a small input: [3, 1, 4, 1, 5]',
      'Now shuffle it: [5, 1, 3, 4, 1]',
      'Does the answer change?',
      'If YES → order matters → pick "Yes"',
      'If NO  → order does not matter → pick "No"',
    ],
    warning : 'Be careful with problems that ask for "subarray" or "substring" — these are always contiguous and almost always order-sensitive.',
  };

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function getProperty()     { return { ...PROPERTY }; }
  function getTestCases()    { return [...TEST_CASES]; }
  function getVerification() { return { ...VERIFICATION }; }

  function getAnswerById(id) {
    return PROPERTY.answers.find(a => a.id === id) ?? null;
  }

  // Get what this answer opens and eliminates as a combined summary
  function getImpact(answerId) {
    const answer = getAnswerById(answerId);
    if (!answer) return null;
    return {
      opens    : answer.opens,
      eliminates: answer.eliminates,
      followUp : answer.followUp,
    };
  }

  // Given answer — does it suggest sorting is safe?
  function sortingIsSafe(answerId) {
    return answerId === 'no';
  }

  return {
    getProperty,
    getTestCases,
    getVerification,
    getAnswerById,
    getImpact,
    sortingIsSafe,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderSensitivity;
}