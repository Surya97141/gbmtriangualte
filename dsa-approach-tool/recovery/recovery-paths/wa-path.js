// recovery/recovery-paths/wa-path.js
// Wrong Answer recovery path — guides user through systematic WA diagnosis
// Used by: recovery.js

const WAPath = (() => {

  const META = {
    id     : 'wa_path',
    label  : 'Wrong Answer',
    trigger: 'My solution runs but gives wrong output',
    icon   : '✗',
    color  : 'fail',
  };

  // ─── DIAGNOSTIC STEPS ─────────────────────────────────────────────────

  const STEPS = [
    {
      id      : 'wa_s1',
      order   : 1,
      title   : 'Which test case is failing?',
      desc    : 'Before changing code — identify exactly which input gives wrong output. The failing case tells you everything.',
      actions : [
        {
          id    : 'wa_s1_provided',
          label : 'A provided test case fails',
          next  : 'wa_s2_provided',
        },
        {
          id    : 'wa_s1_hidden',
          label : 'Only hidden test cases fail',
          next  : 'wa_s2_hidden',
        },
        {
          id    : 'wa_s1_all',
          label : 'Most / all test cases fail',
          next  : 'wa_s2_all',
        },
      ],
    },

    // Branch A — provided test case fails
    {
      id      : 'wa_s2_provided',
      order   : 2,
      title   : 'Trace the failing case by hand',
      desc    : 'Run your algorithm step-by-step on the failing input. Write each state on paper. Do not look at code — execute the algorithm as you understand it.',
      actions : [
        {
          id    : 'wa_s2a_logic_wrong',
          label : 'Hand trace gives different answer than code',
          next  : 'wa_s3_debug',
          hint  : 'Your understanding of the algorithm is correct but implementation is wrong',
        },
        {
          id    : 'wa_s2a_both_wrong',
          label : 'Hand trace gives same wrong answer as code',
          next  : 'wa_s3_logic',
          hint  : 'The algorithm itself is wrong — implementation is faithfully wrong',
        },
      ],
    },

    // Branch B — only hidden tests fail
    {
      id      : 'wa_s2_hidden',
      order   : 2,
      title   : 'The failing case is an edge case you did not test',
      desc    : 'Hidden tests are almost always edge cases. Work through this checklist systematically.',
      checklist: [
        { id: 'hc_n1',       text: 'n = 1 (single element)'                },
        { id: 'hc_n2',       text: 'n = 2 (minimal non-trivial)'           },
        { id: 'hc_empty',    text: 'Empty input (n = 0 or empty string)'   },
        { id: 'hc_negative', text: 'All elements negative'                 },
        { id: 'hc_zeros',    text: 'All elements zero'                     },
        { id: 'hc_max',      text: 'n = MAX constraint'                    },
        { id: 'hc_overflow', text: 'Values near INT_MAX (overflow check)'  },
        { id: 'hc_same',     text: 'All elements identical'                },
        { id: 'hc_sorted',   text: 'Already sorted input'                  },
        { id: 'hc_reverse',  text: 'Reverse sorted input'                  },
        { id: 'hc_answer0',  text: 'Answer is 0 or empty'                 },
      ],
      actions : [
        {
          id  : 'wa_s2b_found',
          label: 'Found the failing edge case',
          next : 'wa_s3_edge_fix',
        },
        {
          id   : 'wa_s2b_notfound',
          label: 'No edge case found — passes all above',
          next : 'wa_s3_logic',
        },
      ],
    },

    // Branch C — all tests fail
    {
      id      : 'wa_s2_all',
      order   : 2,
      title   : 'Almost certainly a fundamental misread',
      desc    : 'If almost everything fails, the problem is not subtle. Check these first.',
      checklist: [
        { id: 'all_c1', text: 'Re-read the problem statement — did you misread what the output should be?' },
        { id: 'all_c2', text: 'Check 0-indexed vs 1-indexed — is your loop off by one?' },
        { id: 'all_c3', text: 'Check the output format — are you printing wrong thing?' },
        { id: 'all_c4', text: 'Check input reading — are you reading correctly for multiple test cases?' },
      ],
      actions : [
        {
          id   : 'wa_s2c_found',
          label: 'Found the issue above',
          next : 'wa_s3_fix_found',
        },
        {
          id   : 'wa_s2c_notfound',
          label: 'Nothing above is the issue',
          next : 'wa_s3_logic',
        },
      ],
    },

    // Debug — code does not match mental model
    {
      id      : 'wa_s3_debug',
      order   : 3,
      title   : 'Add print statements at each decision point',
      desc    : 'Your mental model is correct. The code is wrong. Find where they diverge.',
      technique: {
        title: 'Binary search the bug',
        steps: [
          'Add print at midpoint of algorithm. Is state correct here?',
          'If correct at midpoint → bug is in second half. If wrong → bug is in first half.',
          'Repeat: add print at new midpoint. Narrow down the exact line.',
          'Once found: compare code expression against your mental model precisely.',
        ],
      },
      commonBugs: [
        { bug: 'Off-by-one in loop bounds',                       fix: 'Check: < vs <=, starting at 0 vs 1' },
        { bug: 'Wrong index used (i vs j vs k)',                  fix: 'Name loop variables descriptively' },
        { bug: 'Assignment vs comparison (= vs ==)',              fix: 'Most IDEs warn — check warnings' },
        { bug: 'Mutation of input inside loop',                   fix: 'Work on a copy or reindex carefully' },
        { bug: 'Integer overflow: int * int',                    fix: 'Cast to long long before multiply' },
        { bug: 'Wrong variable updated (inner vs outer)',         fix: 'Trace which variable changes each iteration' },
      ],
      actions: [
        { id: 'wa_s3_debug_fixed', label: 'Found and fixed the bug', next: 'wa_done' },
        { id: 'wa_s3_debug_stuck', label: 'Still cannot find it',    next: 'wa_s4_fresh_read' },
      ],
    },

    // Logic wrong — algorithm itself is wrong
    {
      id      : 'wa_s3_logic',
      order   : 3,
      title   : 'The algorithm itself is wrong — return to Stage 3',
      desc    : 'The implementation is faithfully executing a wrong algorithm. This requires going back to structural analysis.',
      diagnosis: [
        {
          question: 'Did you verify greedy correctness?',
          action  : 'Find a counter-example: 3-5 elements where greedy and optimal diverge',
          goTo    : 'stage5',
        },
        {
          question: 'Is your DP state complete?',
          action  : 'Ask: given only the state variable(s), can I determine the optimal next step?',
          goTo    : 'stage5',
        },
        {
          question: 'Did you check all structural properties in Stage 3?',
          action  : 'Return to Stage 3 and re-answer property questions — especially subproblem overlap and order sensitivity',
          goTo    : 'stage3',
        },
        {
          question: 'Was there a transformation that would simplify this?',
          action  : 'Return to Stage 3.5 and run reframe questions again',
          goTo    : 'stage3_5',
        },
      ],
      actions: [
        { id: 'wa_s3_logic_back3',  label: 'Return to Stage 3 — re-analyze structure', goTo: 'stage3'   },
        { id: 'wa_s3_logic_back35', label: 'Return to Stage 3.5 — try reframing',       goTo: 'stage3_5' },
        { id: 'wa_s3_logic_back5',  label: 'Return to Stage 5 — verify approach',        goTo: 'stage5'   },
      ],
    },

    // Edge case fix
    {
      id      : 'wa_s3_edge_fix',
      order   : 3,
      title   : 'Handle the edge case explicitly',
      desc    : 'Most edge cases are handled by a 2-3 line guard at the top of the function. Add it, re-test, submit.',
      template: `// Common edge case guards
if (n == 0 || input.empty()) return base_case;
if (n == 1) return single_element_answer;

// For all-negative arrays:
int result = a[0]; // NOT 0

// For overflow:
long long result = (long long)a * b; // cast before multiply`,
      actions: [
        { id: 'wa_s3_edge_fixed', label: 'Edge case handled — re-submitting', next: 'wa_done' },
        { id: 'wa_s3_edge_more',  label: 'Fixed but still failing',           next: 'wa_s2_hidden' },
      ],
    },

    // Fix found in all-fail branch
    {
      id    : 'wa_s3_fix_found',
      order : 3,
      title : 'Fix the fundamental issue',
      desc  : 'Re-read the problem, fix the specific issue you identified, and re-run all provided examples before submitting.',
      actions: [
        { id: 'wa_done_fix', label: 'Fixed — ready to submit', next: 'wa_done' },
      ],
    },

    // Fresh read
    {
      id    : 'wa_s4_fresh_read',
      order : 4,
      title : 'Fresh read — step away for 10 minutes',
      desc  : 'You cannot find a bug you are mentally blind to. Close the editor. Walk away. Return and read the problem statement from scratch as if you never saw it.',
      insight: 'The most common cause of "cannot find the bug" is a wrong assumption that has become invisible through repeated reading. A fresh read breaks the pattern.',
      actions: [
        { id: 'wa_fresh_found', label: 'Found it after fresh read', next: 'wa_done'       },
        { id: 'wa_fresh_stuck', label: 'Still stuck',               next: 'wa_s3_logic'   },
      ],
    },

    // Done
    {
      id    : 'wa_done',
      order : 99,
      title : 'Ready to resubmit',
      desc  : 'Before submitting: run all provided test cases again. Then run your Stage 6 edge cases. Then submit.',
      actions: [
        { id: 'wa_done_submit', label: 'Resubmit', isTerminal: true },
      ],
    },
  ];

  // ─── PUBLIC API ────────────────────────────────────────────────────────

  function getMeta()         { return { ...META };   }
  function getSteps()        { return [...STEPS];    }
  function getStepById(id)   { return STEPS.find(s => s.id === id) ?? STEPS[0]; }
  function getFirstStep()    { return STEPS[0]; }

  return { getMeta, getSteps, getStepById, getFirstStep };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WAPath;
}