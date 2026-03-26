// recovery/recovery-paths/reframe-path.js
// Reframe path — for when approach seems right but keeps failing
// "Something feels off but I cannot pin it down"
// Used by: recovery.js

const ReframePath = (() => {

  const META = {
    id     : 'reframe_path',
    label  : 'Reframe / Rethink',
    trigger: 'My approach seems right but keeps giving wrong answers in new ways',
    icon   : '↺',
    color  : 'violet',
  };

  const STEPS = [
    {
      id     : 'rf_s1',
      order  : 1,
      title  : 'What is the symptom?',
      desc   : 'The failure pattern reveals whether the problem is the algorithm or the implementation.',
      actions: [
        {
          id   : 'rf_s1_new_wa',
          label: 'Fix one WA, a new WA appears on a different case',
          next : 'rf_s2_patchwork',
        },
        {
          id   : 'rf_s1_special',
          label: 'Works generally but fails on specific structures (trees, cycles, etc)',
          next : 'rf_s2_special',
        },
        {
          id   : 'rf_s1_off_by',
          label: 'Off by exactly 1 on most cases',
          next : 'rf_s2_offby',
        },
        {
          id   : 'rf_s1_greedy',
          label: 'Greedy works on most cases but fails on adversarial input',
          next : 'rf_s2_greedy',
        },
      ],
    },

    // Patchwork fixes
    {
      id      : 'rf_s2_patchwork',
      order   : 2,
      title   : 'Patchwork fixes = wrong algorithm',
      desc    : 'Fixing one case breaking another is the clearest signal that the algorithm is fundamentally wrong. Stop patching.',
      insight : 'A correct algorithm handles all cases uniformly. If you need case-specific patches, you are implementing the wrong algorithm.',
      action  : 'Revert all patches. Return to the last version that passed consistently. Then re-examine the algorithm from scratch.',
      questions: [
        'Did you verify the algorithm on paper (not code) first?',
        'Did you find a formal reason the algorithm is correct (exchange argument / stays ahead / monotonicity proof)?',
        'Is there a disguise — does this problem reduce to a simpler known problem?',
      ],
      actions: [
        { id: 'rf_s2_pw_back3',   label: 'Return to Stage 3 — re-analyze from scratch',    goTo: 'stage3'   },
        { id: 'rf_s2_pw_back35',  label: 'Return to Stage 3.5 — check for disguise',        goTo: 'stage3_5' },
        { id: 'rf_s2_pw_back5',   label: 'Return to Stage 5 — verify correctness formally', goTo: 'stage5'   },
      ],
    },

    // Special structure failures
    {
      id      : 'rf_s2_special',
      order   : 2,
      title   : 'Fails on special structure — missing case in algorithm',
      desc    : 'Failing on trees with one child, graphs with self-loops, or empty intervals are almost always missing cases, not wrong algorithm.',
      checklist: [
        { id: 'sp_c1', text: 'Single node tree — does your root access crash? (root.left when root has no left)' },
        { id: 'sp_c2', text: 'Linear chain / skewed tree — does recursion depth overflow stack?' },
        { id: 'sp_c3', text: 'Disconnected graph — does BFS miss unreachable nodes?' },
        { id: 'sp_c4', text: 'Self-loop — does your cycle detection handle node pointing to itself?' },
        { id: 'sp_c5', text: 'Empty interval list — does merge logic crash on first interval access?' },
        { id: 'sp_c6', text: 'Fully overlapping intervals — does your end time update use max()?' },
      ],
      actions: [
        { id: 'rf_s2_sp_found', label: 'Found the missing case — adding explicit handling', next: 'rf_done' },
        { id: 'rf_s2_sp_none',  label: 'Not a missing case issue',                          next: 'rf_s2_patchwork' },
      ],
    },

    // Off by one
    {
      id      : 'rf_s2_offby',
      order   : 2,
      title   : 'Off by exactly 1 — almost always loop bounds or base case',
      desc    : 'Off-by-one is the most common bug in competitive programming. Work through this checklist.',
      checklist: [
        { id: 'ob_c1', text: '< vs <=: should loop run for i < n or i <= n?' },
        { id: 'ob_c2', text: 'Starting index: should loop start at 0 or 1?' },
        { id: 'ob_c3', text: 'Base case: is dp[0] or dp[1] the correct base?' },
        { id: 'ob_c4', text: 'Array size: did you allocate n+1 elements when needed for 1-indexed?' },
        { id: 'ob_c5', text: 'Range end: is subarray [l, r] inclusive or [l, r)?' },
        { id: 'ob_c6', text: 'Binary search boundary: should hi start at n-1 or n?' },
      ],
      actions: [
        { id: 'rf_s2_ob_found', label: 'Found the off-by-one', next: 'rf_done' },
        { id: 'rf_s2_ob_none',  label: 'Not an off-by-one',    next: 'rf_s2_patchwork' },
      ],
    },

    // Greedy fails adversarially
    {
      id      : 'rf_s2_greedy',
      order   : 2,
      title   : 'Greedy correctness failure — this is the most dangerous failure mode',
      desc    : 'Greedy gives right answers on random input but fails on adversarial input. This means greedy is wrong for this problem.',
      diagnosis: [
        {
          test   : 'Coin change test: coins=[1,3,4], amount=6',
          result : 'Greedy (pick largest): 4+1+1=3 coins. Optimal: 3+3=2 coins.',
          verdict: 'If your greedy fails on structured inputs like this — it needs DP',
        },
        {
          test   : 'Weighted interval test: one high-value long interval vs many short intervals',
          result : 'Greedy by count: picks many short ones. Greedy by value: may pick the long one. Which is correct?',
          verdict: 'Weighted interval scheduling always needs DP — greedy only works for count',
        },
      ],
      actions: [
        { id: 'rf_s2_gr_dp',    label: 'Counter-example found — switching to DP', goTo: 'stage3'   },
        { id: 'rf_s2_gr_sort',  label: 'Greedy is right but sorting key is wrong', next: 'rf_s3_sort' },
        { id: 'rf_s2_gr_prove', label: 'Need to formally prove greedy is correct', goTo: 'stage5'   },
      ],
    },

    // Wrong sort key
    {
      id      : 'rf_s3_sort',
      order   : 3,
      title   : 'Wrong sort key — most common greedy bug',
      desc    : 'The greedy algorithm is conceptually right but sorts by the wrong criterion.',
      examples: [
        { wrong: 'Sort intervals by start time', correct: 'Sort by end time (activity selection)' },
        { wrong: 'Sort jobs by processing time', correct: 'Sort by deadline (scheduling)' },
        { wrong: 'Sort by value',                correct: 'Sort by value/weight ratio (fractional knapsack)' },
        { wrong: 'Sort by weight',               correct: 'Sort by deadline then weight (weighted job scheduling)' },
      ],
      actions: [
        { id: 'rf_s3_sort_fixed', label: 'Found and fixed sort key', next: 'rf_done' },
        { id: 'rf_s3_sort_none',  label: 'Sort key is correct',      next: 'rf_s2_greedy' },
      ],
    },

    // Done
    {
      id    : 'rf_done',
      order : 99,
      title : 'Issue identified and addressed',
      desc  : 'Run all provided test cases + your Stage 6 edge cases before resubmitting.',
      actions: [
        { id: 'rf_done_submit', label: 'Ready to resubmit', isTerminal: true },
      ],
    },
  ];

  function getMeta()       { return { ...META };  }
  function getSteps()      { return [...STEPS];   }
  function getStepById(id) { return STEPS.find(s => s.id === id) ?? STEPS[0]; }
  function getFirstStep()  { return STEPS[0]; }

  return { getMeta, getSteps, getStepById, getFirstStep };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReframePath;
}