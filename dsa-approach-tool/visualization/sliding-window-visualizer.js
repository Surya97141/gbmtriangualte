// visualization/sliding-window-visualizer.js
// Responsibility: Implement and register the three sliding window visualizations.
// Each visualization reveals a specific invariant through interactive animation.
//
//   va_two_pointer_array        — reveals inv_window_validity
//   va_valid_invalid_coloring   — reveals inv_monotone_feasibility
//   va_monotone_deque_evolution — reveals inv_monotone_queue
//
// All visualizations are DOM-based, state-driven, and step-controlled.
// No external libraries. Each factory returns { step, reset, destroy }.

const SlidingWindowVisualizer = (() => {

  // ─── SHARED UTILITIES ─────────────────────────────────────────────────────

  function _el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)  e.className   = cls;
    if (text) e.textContent = text;
    return e;
  }

  function _windowSum(arr, l, r) {
    let s = 0;
    for (let i = l; i <= r; i++) s += arr[i];
    return s;
  }

  // ─── VISUALIZATION 1: Two-Pointer Array ───────────────────────────────────
  // Reveals: inv_window_validity
  // Appears: after Stage 3, property Q3 (feasibility boundary) answered yes
  // Shows: l and r pointers on array, window shaded, sum displayed, valid/invalid color

  function createTwoPointerArray(containerEl, config) {
    const arr = config.array ?? [1, 2, 3, 4, 5];
    const k   = config.k     ?? 7;

    let l = 0, r = 0, runningSum = arr[0];
    let stepHistory = [{ l: 0, r: 0, sum: arr[0] }];
    let stepIndex   = 0;

    function _buildInitialSteps() {
      const steps = [];
      let sl = 0, sum = 0;
      for (let sr = 0; sr < arr.length; sr++) {
        sum += arr[sr];
        while (sum > k && sl <= sr) {
          sum -= arr[sl];
          sl++;
          steps.push({ l: sl, r: sr, sum, action: 'shrink' });
        }
        steps.push({ l: sl, r: sr, sum, action: sr === 0 ? 'init' : 'expand' });
      }
      return steps;
    }

    const allSteps = _buildInitialSteps();
    let currentStep = 0;

    function render() {
      containerEl.innerHTML = '';

      const step   = allSteps[currentStep];
      const isValid = step.sum <= k;

      const caption = _el('p', 'vis-caption',
        `Window [${step.l}, ${step.r}]  |  sum = ${step.sum}  |  k = ${k}  |  ${isValid ? 'VALID ✓' : 'INVALID ✗'}`
      );
      caption.style.color = isValid ? '#2a9d5c' : '#d9534f';
      containerEl.appendChild(caption);

      const row = _el('div', 'vis-array-row');
      arr.forEach((val, idx) => {
        const cell = _el('div', 'vis-cell', String(val));
        const inWindow = idx >= step.l && idx <= step.r;
        if (inWindow) cell.classList.add(isValid ? 'vis-cell--valid' : 'vis-cell--invalid');
        if (idx === step.l) cell.classList.add('vis-cell--left-ptr');
        if (idx === step.r) cell.classList.add('vis-cell--right-ptr');
        row.appendChild(cell);
      });
      containerEl.appendChild(row);

      const ptrRow = _el('div', 'vis-ptr-row');
      arr.forEach((_, idx) => {
        const lbl = idx === step.l && idx === step.r ? 'l,r'
                  : idx === step.l ? 'l'
                  : idx === step.r ? 'r'
                  : '';
        ptrRow.appendChild(_el('div', 'vis-ptr-label', lbl));
      });
      containerEl.appendChild(ptrRow);

      const invariantNote = _el('p', 'vis-invariant-note',
        `Invariant: inv_window_validity — the window [l,r] must satisfy sum ≤ k at every step.`
      );
      containerEl.appendChild(invariantNote);

      const controls = _el('div', 'vis-controls');
      const prevBtn  = _el('button', 'vis-btn', '← Prev');
      const nextBtn  = _el('button', 'vis-btn', 'Next →');
      prevBtn.disabled = currentStep === 0;
      nextBtn.disabled = currentStep === allSteps.length - 1;
      prevBtn.onclick  = () => { if (currentStep > 0) { currentStep--; render(); } };
      nextBtn.onclick  = () => { if (currentStep < allSteps.length - 1) { currentStep++; render(); } };
      controls.appendChild(prevBtn);
      controls.appendChild(nextBtn);
      containerEl.appendChild(controls);
    }

    render();

    return {
      step:    () => { if (currentStep < allSteps.length - 1) { currentStep++; render(); } },
      reset:   () => { currentStep = 0; render(); },
      destroy: () => { containerEl.innerHTML = ''; },
    };
  }

  // ─── VISUALIZATION 2: Valid/Invalid Window Coloring ───────────────────────
  // Reveals: inv_monotone_feasibility
  // Appears: after Stage 3.5 (reframe check), when inv_monotone_feasibility is active
  // Shows: grid of all (l, r) pairs colored by validity; solver traces greedy path

  function createValidInvalidColoring(containerEl, config) {
    const arr = config.array ?? [1, 2, 3, 4, 5];
    const k   = config.k     ?? 7;
    const n   = arr.length;

    // Precompute prefix sums
    const prefix = [0];
    for (let i = 0; i < n; i++) prefix.push(prefix[i] + arr[i]);
    const rangeSum = (l, r) => prefix[r + 1] - prefix[l];

    function render() {
      containerEl.innerHTML = '';

      const caption = _el('p', 'vis-caption',
        `All windows [l, r] for array [${arr.join(', ')}], k = ${k}. Green = valid (sum ≤ k), Red = invalid.`
      );
      containerEl.appendChild(caption);

      const table = document.createElement('table');
      table.className = 'vis-grid-table';

      // Header row
      const headerRow = document.createElement('tr');
      headerRow.appendChild(_el('th', '', 'l \\ r'));
      for (let r = 0; r < n; r++) headerRow.appendChild(_el('th', '', String(r)));
      table.appendChild(headerRow);

      for (let l = 0; l < n; l++) {
        const row = document.createElement('tr');
        row.appendChild(_el('td', 'vis-grid-label', String(l)));
        for (let r = 0; r < n; r++) {
          const cell = document.createElement('td');
          cell.className = 'vis-grid-cell';
          if (r < l) {
            cell.textContent = '—';
            cell.classList.add('vis-grid-cell--na');
          } else {
            const s = rangeSum(l, r);
            cell.textContent = String(s);
            cell.classList.add(s <= k ? 'vis-grid-cell--valid' : 'vis-grid-cell--invalid');
            cell.title = `[${l}, ${r}]: sum=${s}`;
          }
          row.appendChild(cell);
        }
        table.appendChild(row);
      }
      containerEl.appendChild(table);

      const invariantNote = _el('p', 'vis-invariant-note',
        `Invariant: inv_monotone_feasibility — the valid region (green) forms a monotone boundary. Once a window is invalid moving right, all wider windows are also invalid.`
      );
      containerEl.appendChild(invariantNote);
    }

    render();

    return {
      step:    () => {},
      reset:   render,
      destroy: () => { containerEl.innerHTML = ''; },
    };
  }

  // ─── VISUALIZATION 3: Monotone Deque Evolution ────────────────────────────
  // Reveals: inv_monotone_queue
  // Appears: Stage 5, when sa_monotone_deque is a confirmed candidate
  // Shows: deque state step by step — back-pops, pushes, front evictions

  function createMonotoneDequeEvolution(containerEl, config) {
    const arr = config.array ?? [3, 1, 2, 5, 1, 2];
    const k   = config.k     ?? 3;  // fixed window size
    const n   = arr.length;

    // Build all steps
    const steps = [];
    const deque = [];
    for (let r = 0; r < n; r++) {
      const l      = Math.max(0, r - k + 1);
      const actions = [];

      // Back-pop dominated elements
      while (deque.length > 0 && arr[deque[deque.length - 1]] <= arr[r]) {
        actions.push({ type: 'back_pop', index: deque.pop() });
      }
      deque.push(r);
      actions.push({ type: 'push', index: r });

      // Front eviction
      while (deque[0] < l) {
        actions.push({ type: 'front_evict', index: deque.shift() });
      }

      steps.push({
        r,
        l,
        deque:   [...deque],
        max:     arr[deque[0]],
        maxIdx:  deque[0],
        actions,
      });
    }

    let currentStep = 0;

    function render() {
      containerEl.innerHTML = '';
      const step = steps[currentStep];

      const caption = _el('p', 'vis-caption',
        `r = ${step.r}, l = ${step.l}  |  Window [${step.l}, ${step.r}]  |  max = ${step.max} (at index ${step.maxIdx})`
      );
      containerEl.appendChild(caption);

      // Array row
      const row = _el('div', 'vis-array-row');
      arr.forEach((val, idx) => {
        const cell = _el('div', 'vis-cell', String(val));
        const inWindow = idx >= step.l && idx <= step.r;
        if (inWindow)      cell.classList.add('vis-cell--valid');
        if (idx === step.r) cell.classList.add('vis-cell--right-ptr');
        if (idx === step.l) cell.classList.add('vis-cell--left-ptr');
        if (idx === step.maxIdx) cell.classList.add('vis-cell--max');
        row.appendChild(cell);
      });
      containerEl.appendChild(row);

      // Deque state
      const dequeLabel = _el('p', 'vis-deque-label', 'Deque (front → back, indices):');
      containerEl.appendChild(dequeLabel);
      const dequeRow = _el('div', 'vis-array-row');
      if (step.deque.length === 0) {
        dequeRow.appendChild(_el('div', 'vis-cell vis-cell--empty', 'empty'));
      } else {
        step.deque.forEach((idx, pos) => {
          const cell = _el('div', 'vis-cell', `[${idx}]=${arr[idx]}`);
          if (pos === 0) cell.classList.add('vis-cell--deque-front');
          dequeRow.appendChild(cell);
        });
      }
      containerEl.appendChild(dequeRow);

      // Actions this step
      const actionLog = _el('div', 'vis-action-log');
      step.actions.forEach(a => {
        const line = _el('p', `vis-action vis-action--${a.type}`,
          a.type === 'back_pop'     ? `Back-pop index ${a.index} (val=${arr[a.index]}) — dominated by arr[${step.r}]=${arr[step.r]}`
        : a.type === 'push'        ? `Push index ${a.index} (val=${arr[a.index]}) onto back`
        : a.type === 'front_evict' ? `Front-evict index ${a.index} — out of window [${step.l},${step.r}]`
        : ''
        );
        actionLog.appendChild(line);
      });
      containerEl.appendChild(actionLog);

      const invariantNote = _el('p', 'vis-invariant-note',
        `Invariant: inv_monotone_queue — deque front is always argmax of current window. Two simultaneous operations: back-pop (monotone order) + front-evict (window range).`
      );
      containerEl.appendChild(invariantNote);

      const controls = _el('div', 'vis-controls');
      const prevBtn  = _el('button', 'vis-btn', '← Prev');
      const nextBtn  = _el('button', 'vis-btn', 'Next →');
      prevBtn.disabled = currentStep === 0;
      nextBtn.disabled = currentStep === steps.length - 1;
      prevBtn.onclick  = () => { if (currentStep > 0) { currentStep--; render(); } };
      nextBtn.onclick  = () => { if (currentStep < steps.length - 1) { currentStep++; render(); } };
      controls.appendChild(prevBtn);
      controls.appendChild(nextBtn);
      containerEl.appendChild(controls);
    }

    render();

    return {
      step:    () => { if (currentStep < steps.length - 1) { currentStep++; render(); } },
      reset:   () => { currentStep = 0; render(); },
      destroy: () => { containerEl.innerHTML = ''; },
    };
  }

  // ─── REGISTRATION SPECS ───────────────────────────────────────────────────

  const specs = [
    {
      id:               'va_two_pointer_array',
      label:            'Two-Pointer Array',
      revealsInvariant: 'inv_window_validity',
      appearsAfterStage:'stage3',
      factory:          createTwoPointerArray,
    },
    {
      id:               'va_valid_invalid_coloring',
      label:            'Valid/Invalid Window Grid',
      revealsInvariant: 'inv_monotone_feasibility',
      appearsAfterStage:'stage3_5',
      factory:          createValidInvalidColoring,
    },
    {
      id:               'va_monotone_deque_evolution',
      label:            'Monotone Deque Evolution',
      revealsInvariant: 'inv_monotone_queue',
      appearsAfterStage:'stage5',
      factory:          createMonotoneDequeEvolution,
    },
  ];

  return {
    specs,
    createTwoPointerArray,
    createValidInvalidColoring,
    createMonotoneDequeEvolution,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = SlidingWindowVisualizer;
