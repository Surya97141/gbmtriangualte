// recovery/misconception-recovery.js
// Responsibility: Implement the four sliding window recovery routes.
// Each route is a structured diagnostic flow with 2-4 questions and a defined
// exit condition. Routes activate when a misconception reaches "likely" or higher.
//
// Each route exposes: { id, label, activate(ir, onExit) }
// activate() drives the diagnostic sequence and calls onExit(resolved: bool) when done.

const MisconceptionRecovery = (() => {

  // ─── ROUTE: CONSTRAINT MONOTONICITY CHECK ─────────────────────────────────

  const rr_constraint_monotonicity_check = {
    id:    'rr_constraint_monotonicity_check',
    label: 'Constraint monotonicity check',
    entry_stage: 'stage3',

    questions: [
      {
        id:      'q1',
        text:    'If I add one more element to the right of a currently VALID window, can the window ever become MORE valid (e.g., because the new element reduces the sum in a negative-element scenario)?',
        options: [
          { value: 'no',  label: 'No — adding an element can only keep it valid or make it invalid' },
          { value: 'yes', label: 'Yes — the new element could make the constraint easier to satisfy' },
        ],
      },
      {
        id:      'q2',
        text:    'If the window [l, r] is INVALID, is advancing l by one position (shrinking from the left) guaranteed to eventually restore validity?',
        options: [
          { value: 'yes',    label: 'Yes — shrinking always helps' },
          { value: 'no',     label: 'No — shrinking may not help'  },
          { value: 'unsure', label: 'Unsure'                       },
        ],
      },
      {
        id:      'q3',
        text:    'What type of constraint does this problem use?',
        options: [
          { value: 'sum_positive',    label: 'Sum — all elements are positive'           },
          { value: 'sum_mixed',       label: 'Sum — elements can be negative'            },
          { value: 'count_distinct',  label: 'Count of distinct elements (at most k)'   },
          { value: 'exactly_k',       label: 'Exactly k distinct / exactly k occurrences'},
        ],
      },
    ],

    activate(ir, onExit) {
      return {
        questions: rr_constraint_monotonicity_check.questions,
        evaluate(answers) {
          const q1 = answers.q1;
          const q2 = answers.q2;
          const q3 = answers.q3;

          if (q1 === 'yes' || q2 === 'no' || q3 === 'sum_mixed' || q3 === 'exactly_k') {
            onExit(false);  // Not monotone — sliding window does not directly apply
            return {
              resolved:  false,
              message:   'Constraint is not monotone. Sliding window in its standard form does not apply. Consider: prefix sums + hash map, or the at-most-k subtraction trick for count constraints.',
            };
          }

          onExit(true);
          return {
            resolved: true,
            message:  'Constraint is monotone. Sliding window applies. Proceed.',
          };
        },
      };
    },
  };

  // ─── ROUTE: COMPLEXITY DOWNGRADE ──────────────────────────────────────────

  const rr_complexity_downgrade = {
    id:    'rr_complexity_downgrade',
    label: 'Complexity downgrade — check if O(n) two-pointer suffices',
    entry_stage: 'stage5',

    questions: [
      {
        id:      'q1',
        text:    'After advancing r by one position, can you update the window aggregate (sum, count, etc.) in O(1) using only arr[r] and the current aggregate?',
        options: [
          { value: 'yes', label: 'Yes — O(1) incremental update' },
          { value: 'no',  label: 'No — need to query a range structure' },
        ],
      },
      {
        id:      'q2',
        text:    'After advancing l by one position, can you update the aggregate in O(1) using only arr[l-1] and the current aggregate?',
        options: [
          { value: 'yes', label: 'Yes — O(1) incremental update' },
          { value: 'no',  label: 'No — need to re-query' },
        ],
      },
      {
        id:      'q3',
        text:    'Do you need the per-step MAXIMUM or MINIMUM of elements inside the window (not just the sum or count)?',
        options: [
          { value: 'no',  label: 'No — only sum, count, or similar aggregate' },
          { value: 'yes', label: 'Yes — need max or min inside the window at each step' },
        ],
      },
    ],

    activate(ir, onExit) {
      return {
        questions: rr_complexity_downgrade.questions,
        evaluate(answers) {
          if (answers.q1 === 'yes' && answers.q2 === 'yes' && answers.q3 === 'no') {
            onExit(true);
            return {
              resolved: true,
              message:  'O(1) incremental updates confirm O(n) two-pointer is sufficient. Replace the range structure with a running variable.',
            };
          }
          if (answers.q3 === 'yes') {
            onExit(true);
            return {
              resolved: true,
              message:  'Per-step max/min requires a monotone deque (O(n)), not a segment tree (O(n log n)). Use sa_monotone_deque.',
            };
          }
          onExit(false);
          return {
            resolved: false,
            message:  'Range query structure may be genuinely needed. Verify the constraint type.',
          };
        },
      };
    },
  };

  // ─── ROUTE: CONSTRAINT REREAD ─────────────────────────────────────────────

  const rr_constraint_reread = {
    id:    'rr_constraint_reread',
    label: 'Constraint re-read — fixed vs variable window',
    entry_stage: 'stage1',

    questions: [
      {
        id:      'q1',
        text:    'Copy the constraint from the problem statement. Does it specify the window SIZE (e.g., "exactly k elements") or the window CONTENT (e.g., "sum at most k", "at most k distinct")?',
        options: [
          { value: 'size',    label: 'Size — the window must have exactly k elements'                          },
          { value: 'content', label: 'Content — the window can be any size, but its content must satisfy k'   },
        ],
      },
      {
        id:      'q2',
        text:    'Can a subarray shorter than k elements satisfy the constraint?',
        options: [
          { value: 'yes', label: 'Yes — shorter subarrays are valid if they satisfy the content constraint' },
          { value: 'no',  label: 'No — the subarray must be exactly k elements long' },
        ],
      },
    ],

    activate(ir, onExit) {
      return {
        questions: rr_constraint_reread.questions,
        evaluate(answers) {
          if (answers.q1 === 'size' && answers.q2 === 'no') {
            onExit(true);
            return {
              resolved: true,
              message:  'Fixed window confirmed. Use sa_sliding_window_fixed.',
            };
          }
          onExit(true);
          return {
            resolved: true,
            message:  'Variable window confirmed — k is a content threshold, not a size. Use sa_sliding_window_variable.',
          };
        },
      };
    },
  };

  // ─── ROUTE: DEQUE DUAL INVARIANT ──────────────────────────────────────────

  const rr_deque_dual_invariant = {
    id:    'rr_deque_dual_invariant',
    label: 'Monotone deque — dual invariant check',
    entry_stage: 'stage5',

    questions: [
      {
        id:      'q1',
        text:    'List the two separate invariants the deque must maintain. Which operation maintains MONOTONE ORDER (back-popping)?',
        options: [
          { value: 'correct', label: 'Pop from the back while arr[D.back()] <= arr[r], then push r' },
          { value: 'wrong',   label: 'My deque does not use back-popping' },
        ],
      },
      {
        id:      'q2',
        text:    'Which operation maintains WINDOW RANGE (front eviction)?',
        options: [
          { value: 'correct', label: 'Pop from the front while D.front() < l (index is out of window)' },
          { value: 'wrong',   label: 'My deque does not check the front index against l' },
        ],
      },
      {
        id:      'q3',
        text:    'Are BOTH operations performed on every step — before reading D.front() as the answer?',
        options: [
          { value: 'yes', label: 'Yes — both back-pop and front-pop execute before D.front() is read' },
          { value: 'no',  label: 'No — one of them is missing or conditional' },
        ],
      },
    ],

    activate(ir, onExit) {
      return {
        questions: rr_deque_dual_invariant.questions,
        evaluate(answers) {
          if (answers.q1 === 'correct' && answers.q2 === 'correct' && answers.q3 === 'yes') {
            onExit(true);
            return {
              resolved: true,
              message:  'Both deque invariants are correctly maintained. Proceed to implementation.',
            };
          }
          onExit(false);
          return {
            resolved: false,
            message:  'One or both invariants are not correctly maintained. Review: (1) back-pop on push, (2) front-pop on window shrink. Both must execute before reading D.front().',
          };
        },
      };
    },
  };

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return {
    rr_constraint_monotonicity_check,
    rr_complexity_downgrade,
    rr_constraint_reread,
    rr_deque_dual_invariant,

    all() {
      return [
        rr_constraint_monotonicity_check,
        rr_complexity_downgrade,
        rr_constraint_reread,
        rr_deque_dual_invariant,
      ];
    },
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = MisconceptionRecovery;
