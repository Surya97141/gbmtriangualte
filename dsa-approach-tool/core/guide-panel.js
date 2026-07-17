// core/guide-panel.js
// On-demand "what does each stage do" briefing — opened from the topbar
// Guide button. Static reference content, no dependency on session state.
// Module contract: show(), hide()

const GuidePanel = (() => {

  // ─── CONTENT ───────────────────────────────────────────────────────────────

  const STAGES = [
    {
      id: '0', name: 'Complexity Budget', tag: 'required',
      purpose: 'Establishes the feasible complexity ceiling before anything else is asked, so every later stage can rule out approaches that would simply run out of time.',
      fields: [
        { label: 'You provide', body: 'N (accepts shorthand like 1e5, 10^5, 100k), Q if there are queries, time limit (0.5–5s), memory limit (16–512MB), and flags for updates+queries / online queries / negative edges / single query.' },
        { label: 'It computes', body: 'A per-complexity-class feasibility table (green/amber/red) from actual operation counts at your N and time limit, plus a memory footprint check — both live as you type.' },
      ],
      gate: 'Any N &gt; 0 entered. Eliminated classes feed Stage 3\'s direction filter and Stage 4.5\'s variant recheck.',
    },
    {
      id: '1', name: 'Input Anatomy', tag: 'required',
      purpose: 'Names the shape of what you\'re actually given — the shape is what makes a data structure legal or illegal, before any thinking about algorithms starts.',
      fields: [
        { label: 'Input type', body: 'Single/two arrays, single/two/multiple strings, matrix/grid, graph (edge list / adjacency / implicit), explicit tree, intervals, single/multiple numbers — each with what it opens and a watch-out.' },
        { label: 'Secondary signals', body: 'Sorted, small range, duplicates, distinct, non-negative/negative, weighted, directed, rooted, large values, modulo, binary, geometry, parent-array, next-state.' },
        { label: 'Query type', body: 'None · one · offline · online · updates + queries.' },
      ],
      gate: 'At least one input type + a query type. Decides whether Stage 2.5 is skipped, whether Stage 3\'s graph deep-dive appears, and which edge-case library loads in Stage 6.',
    },
    {
      id: '2', name: 'Output Anatomy', tag: 'required',
      purpose: 'Pins down what a valid answer actually looks like — an index, a subsequence, and a count imply completely different code shapes.',
      fields: [
        { label: 'Output form', body: 'Single value · index/position · subarray/substring · subsequence · full array/permutation · ...' },
        { label: 'Optimization type', body: 'None · maximize · minimize · max-min · min-max · count.' },
        { label: 'Solution depth', body: 'Value only · reconstruct the path · count the ways.' },
      ],
      gate: 'One card chosen in each of the three groups.',
    },
    {
      id: '2.5', name: 'Problem Decomposition', tag: 'skippable',
      purpose: 'Catches multi-part problems before they get force-fit into one approach — the most common source of wrong architecture.',
      skipWhen: 'Input is a single array/string/number with no query layer.',
      fields: [
        { label: 'Pick one pattern', body: 'Preprocessing + main solve · generate-candidates + select-best · structure-build + query-answering · two independent phases · meet-in-the-middle · solve-one + aggregate · single unified problem (negative case).' },
        { label: 'Also here', body: '8 forced-perspective reframe questions and 6 hidden-structure quick checks — both supplementary, feeding the confidence score rather than gating.' },
      ],
      gate: 'A pattern selected.',
    },
    {
      id: '3', name: 'Structural Properties', tag: 'required', tagLabel: 'Required · the core',
      purpose: 'The seven-question core of the whole tool — no single answer determines the direction, the combination does.',
      fields: [
        { label: 'The seven properties', body: 'Order Sensitivity · Subproblem Overlap · Feasibility Boundary · Local vs Global Optimality · State Space · Dependency Structure · Search Space Shape — each with a "why this matters" line and opens/eliminates tags.' },
        { label: 'DP Sub-Classifier', body: 'Shown when Subproblem Overlap = direct — narrows to a specific DP variant instead of leaving "DP" vague.' },
        { label: 'Graph Deep-Dive', body: 'Shown when a graph input was picked in Stage 1 — directed/weighted/negative? then a goal picker that resolves to Dijkstra, Bellman-Ford, BFS, or Floyd-Warshall.' },
        { label: 'Produces', body: 'The candidate-direction list (Greedy, Binary Search on Answer, DP, Backtracking, Divide & Conquer, Graph, Two Pointer/Sliding Window), filtered against whatever Stage 0 eliminated.' },
      ],
      gate: '≥5 of 7 properties answered, plus DP subtype / graph goal if applicable.',
    },
    {
      id: '3.5', name: 'Reframing Check', tag: 'skippable',
      purpose: 'Is this problem disguised as something else? The last chance to catch a wrong direction before constraint analysis locks it in.',
      skipWhen: 'All 7 Stage 3 properties were answered with certainty — none "unsure."',
      fields: [
        { label: 'Disguise checks', body: '"Looks like complex interval logic → actually sort+greedy," "looks like array DP → actually hidden graph," "looks like direct optimization → actually binary search on the answer," and more — each with a concrete test.' },
        { label: 'Forced perspective + transform', body: '8 reframe questions (own set) tied to a transformation catalog. Apply a suggested transform with a verification checklist, or declare "no transformation needed."' },
      ],
      gate: 'At least half the reframe questions answered and a transformation decision made (including "none").',
    },
    {
      id: '4', name: 'Constraint Interaction', tag: 'required',
      purpose: 'N alone doesn\'t set the complexity — N×Q, N×K, N×W do, and six quiet upgrades turn O(n²) into O(n) or O(n log n).',
      fields: [
        { label: 'Constraint interactions', body: 'Expandable cards for N+Q queries, N+K window, N+W weight, V+E graph density, with condition flags (has-updates, offline, online, single-query).' },
        { label: 'Hidden structure checks', body: 'Prefix Sum · Two Pointer · Monotonic Stack · Sliding Window · Binary Search · BIT/Segment Tree.' },
      ],
      gate: 'At least one interaction selected, or half the hidden-structure checks answered.',
    },
    {
      id: '4.5', name: 'Approach Variant', tag: 'skippable',
      purpose: '"Dynamic Programming" isn\'t a plan. Which specific variant — and does it survive a live complexity check at your N?',
      skipWhen: 'No candidate directions exist yet.',
      fields: [
        { label: 'Variant cards', body: 'One set per active direction family (binary search, DP, graph) — complexity, when-to-use, watch-outs.' },
        { label: 'Live feasibility recheck', body: 'Graded safe / borderline / TLE against Stage 0\'s N and time limit. Borderline needs an explicit override; TLE blocks completion.' },
      ],
      gate: 'A safe-graded variant, or borderline plus an explicit override.',
    },
    {
      id: '5', name: 'Verification Challenges', tag: 'required',
      purpose: 'Verify before coding — structural analysis on its own is not proof.',
      fields: [
        { label: 'Active verifiers', body: 'Greedy → counter-example test. Binary Search → monotonicity verification. DP → four-check state verifier. Graph → property verifier. Keyword Cross-Check always appears. If nothing direction-specific applies, all four show.' },
      ],
      gate: 'At least half the active verifiers marked complete.',
    },
    {
      id: '6', name: 'Edge Case Generator', tag: 'required',
      purpose: 'Not a generic checklist — cases are pulled from the input type you actually declared in Stage 1.',
      fields: [
        { label: 'Case libraries', body: 'Universal cases always included, plus array/string/tree/graph/interval/numeric based on your input types.' },
        { label: 'Per case', body: 'Why it matters, the check question, the common failure mode, a test input + expected output, a hint/fix, and "mark as reviewed." Tiered Critical → High → Medium.' },
      ],
      gate: 'Every Critical case reviewed, or half of all cases reviewed.',
    },
    {
      id: '6.5', name: 'Confidence Score', tag: 'required', tagLabel: 'Required · gate',
      purpose: 'A single 0–100 number computed from what you actually did — not just visited — across every prior stage.',
      fields: [
        { label: 'Breakdown', body: 'Mini progress bars per stage-group, a suggestions list of the highest-value remaining actions, and the single weakest stage named outright.' },
        { label: 'Three bands', body: 'High 85–100 (green Proceed) · Medium 65–84 (yellow Proceed + ghost "accept the risk") · Low 0–64 (red "Return and improve," routed to the weakest stage).' },
      ],
      gate: 'Click whichever band button is offered.',
    },
    {
      id: '7', name: 'Final Output', tag: 'required', tagLabel: 'Required · the deliverable',
      purpose: 'Turns everything gathered into one committed direction, with explicit failure modes and a genuine first move.',
      fields: [
        { label: 'Directions', body: 'Family, why the structure implies it, what to verify before coding, a code-shape skeleton, risk badges, "Select this direction."' },
        { label: 'Failure Conditions', body: 'The exact silent-failure mode — e.g. "off-by-one in loop bounds → wrong answer on the last element → test n=1, n=2 explicitly."' },
        { label: 'First Actions', body: 'Three ordered steps for when the editor opens. Step one: write and verify your test cases before touching the algorithm.' },
        { label: 'Tradeoffs', body: 'Side-by-side complexity/difficulty/WA-risk/TLE-risk table when multiple directions survived.' },
      ],
      gate: 'One direction explicitly selected.',
    },
    {
      id: '8', name: 'Code Translation', tag: 'required',
      purpose: 'Translates the committed mental model into an actual language, one deliberate chunk at a time — never a single code dump.',
      fields: [
        { label: 'Walkthrough', body: 'Language picker (Python/JS/C++/Java). Numbered chunks, each with a mental-model line, the code, copy/explain actions, and "I understand this" to unlock the next.' },
        { label: 'On completion', body: 'A finish screen, feeding the sidebar\'s Pattern Unlock collapsible and the topbar\'s day-streak counter.' },
      ],
      gate: 'Every chunk marked understood.',
    },
  ];

  const RECOVERY = {
    purpose: 'A separate, always-reachable diagnostic mode for when you\'re stuck mid-solve — not part of the gated forward sequence.',
    paths: [
      { name: 'Wrong Answer', body: 'Systematically narrows which test case is actually failing before any code gets touched.' },
      { name: 'Time Limit', body: 'A protocol for finding the real bottleneck and matching the optimization to what the pattern needs.' },
      { name: 'Logic Unclear', body: 'Structured diagnostic questions plus targeted reframes.' },
      { name: 'Full Reframe', body: 'Restarts the structural read from scratch.' },
    ],
    note: 'Each path is a step chain — question → action → next step. A banner marks recovery as active; leaving it returns you to Stage 7 if you\'d reached it, or wherever you left off.',
  };

  // ─── BUILD ─────────────────────────────────────────────────────────────────

  function _buildStrip() {
    const strip = document.createElement('div');
    strip.className = 'gp-strip';
    STAGES.forEach((s, idx) => {
      const isHalf = s.tag === 'skippable';
      const node = document.createElement('a');
      node.href = `#gp-${s.id.replace('.', '_')}`;
      node.className = `gp-node ${isHalf ? 'gp-node--half' : ''}`;
      node.innerHTML = `<span class="gp-dot">${s.id}</span>`;
      strip.appendChild(node);
      if (idx < STAGES.length - 1) {
        const conn = document.createElement('div');
        conn.className = 'gp-connector';
        strip.appendChild(conn);
      }
    });
    return strip;
  }

  function _buildStageSection(s) {
    const el = document.createElement('section');
    el.className = 'gp-stage';
    el.id = `gp-${s.id.replace('.', '_')}`;

    const tagLabel = s.tagLabel ?? (s.tag === 'required' ? 'Required' : 'Conditionally skipped');

    el.innerHTML = `
      <div class="gp-stage-head">
        <span class="gp-stage-id">STAGE ${s.id}</span>
        <span class="gp-stage-name">${s.name}</span>
        <span class="gp-pill gp-pill--${s.tag}">${tagLabel}</span>
      </div>
      <p class="gp-purpose">${s.purpose}</p>
      ${s.skipWhen ? `<div class="gp-skipwhen"><b>Skip if</b> ${s.skipWhen}</div>` : ''}
      <div class="gp-fields">
        ${s.fields.map(f => `
          <div class="gp-field">
            <div class="gp-field-label">${f.label}</div>
            <div class="gp-field-body">${f.body}</div>
          </div>
        `).join('')}
      </div>
      <div class="gp-gate"><span class="gp-gate-mark">GATE</span><span class="gp-gate-text">${s.gate}</span></div>
    `;
    return el;
  }

  function _buildRecoverySection() {
    const el = document.createElement('section');
    el.className = 'gp-stage';
    el.id = 'gp-recovery';
    el.innerHTML = `
      <div class="gp-stage-head">
        <span class="gp-stage-id">PARALLEL</span>
        <span class="gp-stage-name">Recovery Mode</span>
        <span class="gp-pill gp-pill--skippable">Entered on demand</span>
      </div>
      <p class="gp-purpose">${RECOVERY.purpose}</p>
      <div class="gp-paths">
        ${RECOVERY.paths.map(p => `
          <div class="gp-path-card">
            <h4>${p.name}</h4>
            <p>${p.body}</p>
          </div>
        `).join('')}
      </div>
      <p class="gp-note">${RECOVERY.note}</p>
    `;
    return el;
  }

  // ─── SHOW / HIDE ───────────────────────────────────────────────────────────

  function show() {
    if (document.getElementById('gp-overlay')) return;

    _injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'gp-overlay';
    overlay.id = 'gp-overlay';

    const panel = document.createElement('div');
    panel.className = 'gp-panel';

    const header = document.createElement('div');
    header.className = 'gp-header';
    header.innerHTML = `
      <div>
        <div class="gp-eyebrow">Stage guide</div>
        <div class="gp-title">What each stage does</div>
      </div>
      <button class="gp-close" aria-label="Close guide">✕</button>
    `;

    const body = document.createElement('div');
    body.className = 'gp-body';
    body.appendChild(_buildStrip());

    const main = document.createElement('div');
    main.className = 'gp-main';
    STAGES.forEach(s => main.appendChild(_buildStageSection(s)));
    main.appendChild(_buildRecoverySection());
    body.appendChild(main);

    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const close = () => hide();
    header.querySelector('.gp-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', _onKeydown);

    requestAnimationFrame(() => overlay.classList.add('gp-overlay--in'));
  }

  function _onKeydown(e) {
    if (e.key === 'Escape') hide();
  }

  function hide() {
    const overlay = document.getElementById('gp-overlay');
    if (!overlay) return;
    document.removeEventListener('keydown', _onKeydown);
    overlay.classList.remove('gp-overlay--in');
    setTimeout(() => overlay.remove(), 160);
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('gp-styles')) return;
    const style = document.createElement('style');
    style.id = 'gp-styles';
    style.textContent = `

    .gp-overlay {
      position: fixed; inset: 0; z-index: 9500;
      background: rgba(20,18,14,.38);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      opacity: 0; transition: opacity .16s ease;
    }
    .gp-overlay--in { opacity: 1; }

    .gp-panel {
      --gp-bg: #f7f4ee; --gp-surface: #ffffff; --gp-surface-2: #efebe1;
      --gp-ink: #1c1a17; --gp-ink2: #4a453d; --gp-muted: #78705f;
      --gp-border: rgba(28,26,23,.12); --gp-border2: rgba(28,26,23,.20);
      --gp-accent: #2563eb; --gp-accent-ink: #1c3d94; --gp-accent-bg: rgba(37,99,235,.07); --gp-accent-b: rgba(37,99,235,.28);
      --gp-green: #1f7a5c; --gp-green-bg: rgba(31,122,92,.09); --gp-green-b: rgba(31,122,92,.28);
      --gp-amber: #a4650c; --gp-amber-bg: rgba(164,101,12,.10); --gp-amber-b: rgba(164,101,12,.30);

      width: 100%; max-width: 880px; max-height: 86vh;
      background: var(--gp-bg); color: var(--gp-ink);
      border-radius: 16px; border: 1px solid var(--gp-border);
      box-shadow: 0 24px 60px rgba(0,0,0,.28);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: 'DM Sans', system-ui, sans-serif;
      transform: translateY(6px) scale(.99); transition: transform .16s ease;
    }
    .gp-overlay--in .gp-panel { transform: translateY(0) scale(1); }

    .gp-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 24px 16px; background: var(--gp-surface); border-bottom: 1px solid var(--gp-border);
      flex-shrink: 0;
    }
    .gp-eyebrow {
      font-family: 'Space Mono', monospace; font-size: .68rem; letter-spacing: .12em; text-transform: uppercase;
      color: var(--gp-muted); margin-bottom: 4px;
    }
    .gp-title { font-size: 1.3rem; font-weight: 700; letter-spacing: -.005em; }
    .gp-close {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--gp-border2);
      background: var(--gp-surface); color: var(--gp-muted); cursor: pointer; font-size: .85rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: border-color .15s, color .15s;
    }
    .gp-close:hover { border-color: var(--gp-accent-b); color: var(--gp-accent-ink); }

    .gp-body { overflow-y: auto; padding: 20px 24px 32px; }

    .gp-strip {
      display: flex; align-items: center; overflow-x: auto; padding: 4px 2px 18px;
      margin-bottom: 8px; border-bottom: 1px solid var(--gp-border);
    }
    .gp-node { flex-shrink: 0; text-decoration: none; padding: 2px; }
    .gp-dot {
      width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-family: 'Space Mono', monospace; font-size: .62rem; font-weight: 700;
      background: var(--gp-surface); border: 1.5px solid var(--gp-border2); color: var(--gp-ink2);
      transition: border-color .15s, transform .15s;
    }
    .gp-node--half .gp-dot { width: 22px; height: 22px; font-size: .54rem; }
    .gp-node:hover .gp-dot { border-color: var(--gp-accent); transform: translateY(-1px); }
    .gp-connector { height: 1.5px; width: 18px; background: var(--gp-border2); flex-shrink: 0; }

    .gp-main { display: flex; flex-direction: column; }
    .gp-stage { padding: 24px 0; border-top: 1px solid var(--gp-border); scroll-margin-top: 12px; }
    .gp-stage:first-child { padding-top: 8px; border-top: none; }

    .gp-stage-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
    .gp-stage-id { font-family: 'Space Mono', monospace; font-size: .72rem; color: var(--gp-muted); }
    .gp-stage-name { font-size: 1.15rem; font-weight: 700; letter-spacing: -.005em; }
    .gp-pill {
      font-family: 'Space Mono', monospace; font-size: .58rem; letter-spacing: .07em; text-transform: uppercase;
      padding: 2px 8px; border-radius: 20px; border: 1px solid;
    }
    .gp-pill--required { color: var(--gp-accent-ink); border-color: var(--gp-accent-b); background: var(--gp-accent-bg); }
    .gp-pill--skippable { color: var(--gp-amber); border-color: var(--gp-amber-b); background: var(--gp-amber-bg); }

    .gp-purpose { font-style: italic; color: var(--gp-ink2); font-size: .92rem; max-width: 68ch; margin: 8px 0 14px; line-height: 1.5; }

    .gp-skipwhen {
      font-family: 'Space Mono', monospace; font-size: .68rem; color: var(--gp-muted);
      background: var(--gp-surface-2); border: 1px solid var(--gp-border); border-radius: 6px;
      padding: 6px 10px; margin-bottom: 14px; display: inline-block;
    }
    .gp-skipwhen b { color: var(--gp-ink2); text-transform: uppercase; font-size: .6rem; letter-spacing: .07em; margin-right: 5px; }

    .gp-fields { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px 22px; }
    @media (max-width: 620px) { .gp-fields { grid-template-columns: 1fr; } }
    .gp-field-label {
      font-family: 'Space Mono', monospace; font-size: .6rem; letter-spacing: .09em; text-transform: uppercase;
      color: var(--gp-muted); margin-bottom: 3px;
    }
    .gp-field-body { font-size: .84rem; color: var(--gp-ink2); line-height: 1.5; }

    .gp-gate {
      margin-top: 16px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--gp-green-b);
      background: var(--gp-green-bg); display: flex; gap: 9px; align-items: flex-start;
    }
    .gp-gate-mark { font-family: 'Space Mono', monospace; font-size: .64rem; color: var(--gp-green); font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .gp-gate-text { font-size: .82rem; color: var(--gp-ink2); }

    .gp-paths { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 14px 0; }
    .gp-path-card { border: 1px solid var(--gp-border); border-radius: 10px; padding: 12px 14px; background: var(--gp-surface); }
    .gp-path-card h4 { margin: 0 0 4px; font-size: .86rem; }
    .gp-path-card p { margin: 0; font-size: .78rem; color: var(--gp-ink2); line-height: 1.45; }
    .gp-note { font-size: .82rem; color: var(--gp-muted); line-height: 1.5; margin: 8px 0 0; }

    .gp-body::-webkit-scrollbar { width: 6px; }
    .gp-body::-webkit-scrollbar-thumb { background: var(--gp-border2); border-radius: 4px; }
    `;
    document.head.appendChild(style);
  }

  return { show, hide };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = GuidePanel;
