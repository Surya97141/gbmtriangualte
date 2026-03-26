// stages/stage0/stage0.js
// Complexity Budget stage — user enters N, Q, time limit, memory limit
// Renders feasibility table, eliminated classes, memory report
// Module contract: render(state), onMount(state), cleanup()

const Stage0 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state        = null;
  let _inputs       = {};
  let _debounceTimer = null;

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage0 ?? {};

    const wrapper = DomUtils.div({ class: 'stage stage0' }, [
      _buildIntro(),
      _buildInputs(saved),
      _buildFeasibilitySection(saved),
      _buildMemorySection(saved),
      _buildEliminationSection(saved),
      _buildInsightSection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Rule: Calculate ACTUAL operation count — not just Big-O notation.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'Enter your constraints. Infeasible complexity classes are eliminated immediately.'
      ),
    ]);
  }

  // ─── INPUTS ────────────────────────────────────────────────────────────────

  function _buildInputs(saved) {
    const section = DomUtils.div({ class: 'stage0__inputs' });

    // N input
    const nField = _buildInputField({
      id         : 's0-n',
      label      : 'N — primary input size',
      placeholder: 'e.g. 100000',
      hint       : 'The main constraint. If array length = 10⁵, enter 100000',
      value      : saved.n ?? '',
      onInput    : (val) => _onInputChange('n', val),
    });

    // Q input
    const qField = _buildInputField({
      id         : 's0-q',
      label      : 'Q — number of queries (if any)',
      placeholder: 'e.g. 100000  or  leave blank',
      hint       : 'If problem has Q separate queries on top of N elements',
      value      : saved.q ?? '',
      onInput    : (val) => _onInputChange('q', val),
    });

    // Time limit
    const timeField = _buildSelectField({
      id      : 's0-time',
      label   : 'Time limit',
      options : [
        { value: '0.5', label: '0.5 s — very strict' },
        { value: '1',   label: '1 s — standard'      },
        { value: '2',   label: '2 s — relaxed'        },
        { value: '5',   label: '5 s — generous'       },
      ],
      value   : String(saved.timeLimit ?? 1),
      onChange: (val) => _onInputChange('timeLimit', parseFloat(val)),
    });

    // Memory limit
    const memField = _buildSelectField({
      id      : 's0-mem',
      label   : 'Memory limit',
      options : [
        { value: '16',  label: '16 MB'  },
        { value: '32',  label: '32 MB'  },
        { value: '64',  label: '64 MB'  },
        { value: '128', label: '128 MB' },
        { value: '256', label: '256 MB — standard' },
        { value: '512', label: '512 MB' },
      ],
      value   : String(saved.memLimit ?? 256),
      onChange: (val) => _onInputChange('memLimit', parseInt(val)),
    });

    // Query type flags
    const flagsSection = _buildConstraintFlags(saved);

    DomUtils.append(section, [
      DomUtils.div({ class: 'stage0__input-grid' }, [
        nField, qField, timeField, memField,
      ]),
      flagsSection,
    ]);

    return section;
  }

  function _buildInputField({ id, label, placeholder, hint, value, onInput }) {
    const field = DomUtils.div({ class: 'input-field' }, [
      DomUtils.label({ class: 'input-field__label', for: id }, label),
      DomUtils.input({
        id,
        class      : 'input-field__input',
        type       : 'text',
        placeholder,
        value      : value ?? '',
      }),
      DomUtils.div({ class: 'input-field__hint' }, hint),
    ]);

    const input = field.querySelector(`#${id}`);
    input.addEventListener('input', () => {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => onInput(input.value.trim()), 400);
    });

    _inputs[id] = input;
    return field;
  }

  function _buildSelectField({ id, label, options, value, onChange }) {
    const select = DomUtils.el('select', {
      id,
      class: 'input-field__select',
    });

    options.forEach(opt => {
      const option = DomUtils.el('option', { value: opt.value }, opt.label);
      if (opt.value === value) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', () => onChange(select.value));
    _inputs[id] = select;

    return DomUtils.div({ class: 'input-field' }, [
      DomUtils.label({ class: 'input-field__label', for: id }, label),
      select,
    ]);
  }

  function _buildConstraintFlags(saved) {
    const flags = [
      { id: 'flag-updates-queries', label: 'Has both updates AND queries',   key: 'hasUpdatesAndQueries' },
      { id: 'flag-online',          label: 'Queries must be answered online', key: 'onlineQueries'        },
      { id: 'flag-negative-edges',  label: 'Graph has negative edge weights', key: 'negativeEdges'        },
      { id: 'flag-single-query',    label: 'Only one query (q = 1)',          key: 'singleQuery'          },
    ];

    const container = DomUtils.div({ class: 'stage0__flags' }, [
      DomUtils.div({ class: 'stage0__flags-title' },
        'Additional constraints (check all that apply)'
      ),
    ]);

    const flagsEl = DomUtils.div({ class: 'stage0__flags-grid' });

    flags.forEach(flag => {
      const checkbox = DomUtils.input({
        id    : flag.id,
        type  : 'checkbox',
        class : 'flag-checkbox',
      });

      if (saved[flag.key]) checkbox.checked = true;

      checkbox.addEventListener('change', () => {
        _onFlagChange(flag.key, checkbox.checked);
      });

      const flagEl = DomUtils.div({ class: 'flag-item' }, [
        checkbox,
        DomUtils.label({ class: 'flag-item__label', for: flag.id }, flag.label),
      ]);

      flagsEl.appendChild(flagEl);
      _inputs[flag.id] = checkbox;
    });

    container.appendChild(flagsEl);
    return container;
  }

  // ─── FEASIBILITY TABLE ─────────────────────────────────────────────────────

  function _buildFeasibilitySection(saved) {
    const section = DomUtils.div({
      class: 'stage0__section',
      id   : 'feasibility-section',
    });

    const title = DomUtils.div({ class: 'stage0__section-title' },
      'Feasibility at your N'
    );

    const tableWrap = DomUtils.div({
      class: 'stage0__table-wrap',
      id   : 'feasibility-table',
    });

    if (saved.n && saved.feasibility?.length) {
      DomUtils.append(tableWrap, _renderFeasibilityTable(saved.feasibility));
    } else {
      DomUtils.append(tableWrap, _renderTablePlaceholder());
    }

    DomUtils.append(section, [title, tableWrap]);
    return section;
  }

  function _renderFeasibilityTable(report) {
    const table = DomUtils.el('table', { class: 'feasibility-table' });

    // Header
    const thead = DomUtils.el('thead');
    thead.innerHTML = `
      <tr>
        <th>Complexity</th>
        <th>Operations</th>
        <th>Est. Time</th>
        <th>Status</th>
      </tr>`;
    table.appendChild(thead);

    // Body
    const tbody = DomUtils.el('tbody');
    report.forEach(row => {
      const tr = DomUtils.el('tr', {
        class: `feasibility-row feasibility-row--${row.status}`,
      });
      tr.innerHTML = `
        <td class="fc-label">${row.label}</td>
        <td class="fc-ops">${row.opsDisplay}</td>
        <td class="fc-time">${row.estimatedTime}</td>
        <td class="fc-status">
          <span class="status-dot status-dot--${row.status}"></span>
          ${row.status === 'green'
            ? 'Safe'
            : row.status === 'yellow'
              ? 'Borderline'
              : 'TLE'}
        </td>`;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
  }

  function _renderTablePlaceholder() {
    return DomUtils.div({ class: 'table-placeholder' },
      'Enter N above to see feasibility table'
    );
  }

  // ─── MEMORY SECTION ────────────────────────────────────────────────────────

  function _buildMemorySection(saved) {
    const section = DomUtils.div({
      class: 'stage0__section',
      id   : 'memory-section',
    });

    const title = DomUtils.div({ class: 'stage0__section-title' },
      'Memory at your N'
    );

    const memWrap = DomUtils.div({
      class: 'stage0__mem-wrap',
      id   : 'memory-table',
    });

    if (saved.n && saved.memReport?.length) {
      DomUtils.append(memWrap, _renderMemoryTable(saved.memReport));
    } else {
      DomUtils.append(memWrap,
        DomUtils.div({ class: 'table-placeholder' },
          'Enter N above to see memory report'
        )
      );
    }

    DomUtils.append(section, [title, memWrap]);
    return section;
  }

  function _renderMemoryTable(report) {
    const wrap = DomUtils.div({ class: 'memory-table' });

    report.forEach(row => {
      const item = DomUtils.div({
        class: `mem-item mem-item--${row.status}`,
      }, [
        DomUtils.span({ class: 'mem-item__name'    }, row.name),
        DomUtils.span({ class: 'mem-item__size'    }, row.display),
        DomUtils.span({
          class: `mem-item__verdict mem-item__verdict--${row.status}`,
        }, row.fits ? 'fits' : 'exceeds limit'),
      ]);
      wrap.appendChild(item);
    });

    return wrap;
  }

  // ─── ELIMINATION SECTION ───────────────────────────────────────────────────

  function _buildEliminationSection(saved) {
    const section = DomUtils.div({
      class: 'stage0__section',
      id   : 'elimination-section',
    });

    const title = DomUtils.div({ class: 'stage0__section-title' },
      'Eliminated approaches'
    );

    const elimWrap = DomUtils.div({
      class: 'stage0__elim-wrap',
      id   : 'elimination-list',
    });

    if (saved.eliminated?.length) {
      _renderEliminationList(elimWrap, saved.eliminated, saved);
    } else {
      DomUtils.append(elimWrap,
        DomUtils.div({ class: 'elim-empty' },
          'Nothing eliminated yet — enter N and constraints above'
        )
      );
    }

    DomUtils.append(section, [title, elimWrap]);
    return section;
  }

  function _renderEliminationList(container, eliminated, saved) {
    DomUtils.clearContent(container);

    // Complexity-based eliminations
    eliminated.forEach(classId => {
      const cls = ComplexityTable.getAllClasses().find(c => c.id === classId);
      if (!cls) return;
      container.appendChild(
        DomUtils.div({ class: 'elim-item elim-item--complexity' }, [
          DomUtils.span({ class: 'elim-item__badge' }, cls.label),
          DomUtils.span({ class: 'elim-item__reason' },
            `Too slow at n=${saved.n} — ${
              MathUtils.formatOps(MathUtils.computeOps(saved.n, classId))
            } ops`
          ),
        ])
      );
    });

    // Constraint-based eliminations
    const flags = {
      hasUpdatesAndQueries: saved.hasUpdatesAndQueries,
      onlineQueries       : saved.onlineQueries,
      negativeEdges       : saved.negativeEdges,
      singleQuery         : saved.singleQuery,
      smallN              : saved.n < 10,
      largeGraph          : saved.n > 4000,
    };

    const rules = ComplexityTable.getEliminationRules(flags);
    rules.forEach(rule => {
      rule.eliminates.forEach(target => {
        container.appendChild(
          DomUtils.div({ class: 'elim-item elim-item--rule' }, [
            DomUtils.span({ class: 'elim-item__badge elim-item__badge--rule' },
              target
            ),
            DomUtils.span({ class: 'elim-item__reason' }, rule.reason),
          ])
        );
      });
    });
  }

  // ─── INSIGHT SECTION ───────────────────────────────────────────────────────

  function _buildInsightSection(saved) {
    const section = DomUtils.div({
      class: 'stage0__section stage0__insights',
      id   : 'insight-section',
    });

    if (!saved.n) return section;

    const bucket  = ComplexityTable.getBucket(saved.n);
    const insight = ComplexityTable.getInsight(bucket.nBucket);
    const watchOut = ComplexityTable.getWatchOut(bucket.nBucket);

    if (insight) {
      section.appendChild(
        DomUtils.div({ class: 'insight-card insight-card--key' }, [
          DomUtils.div({ class: 'insight-card__icon' }, '💡'),
          DomUtils.div({ class: 'insight-card__text' }, insight),
        ])
      );
    }

    if (watchOut) {
      section.appendChild(
        DomUtils.div({ class: 'insight-card insight-card--warn' }, [
          DomUtils.div({ class: 'insight-card__icon' }, '⚠'),
          DomUtils.div({ class: 'insight-card__text' }, watchOut),
        ])
      );
    }

    return section;
  }

  // ─── INPUT CHANGE HANDLERS ─────────────────────────────────────────────────

  function _onInputChange(key, rawVal) {
    const saved = State.getAnswer('stage0') ?? {};

    let parsed;
    if (key === 'n' || key === 'q') {
      parsed = _parseN(rawVal);
    } else {
      parsed = rawVal;
    }

    // Update state with new value
    State.setAnswer('stage0', { [key]: parsed });

    // Recompute if N is valid
    const n = key === 'n' ? parsed : saved.n;
    if (n && n > 0) {
      _recompute(n, {
        q        : key === 'q'         ? parsed  : saved.q,
        timeLimit: key === 'timeLimit' ? parsed  : (saved.timeLimit ?? 1),
        memLimit : key === 'memLimit'  ? parsed  : (saved.memLimit  ?? 256),
      });
    }
  }

  function _onFlagChange(flagKey, value) {
    State.setAnswer('stage0', { [flagKey]: value });

    // Recompute elimination rules
    const saved = State.getAnswer('stage0') ?? {};
    if (saved.n) {
      _recomputeEliminations(saved);
    }
  }

  // ─── RECOMPUTE ─────────────────────────────────────────────────────────────

  function _recompute(n, opts = {}) {
    const timeLimit = opts.timeLimit ?? 1;
    const memLimit  = opts.memLimit  ?? 256;
    const q         = opts.q || 1;

    // Feasibility report
    const feasibility = MathUtils.buildFeasibilityReport(n, q, timeLimit, memLimit);
    const eliminated  = feasibility
      .filter(r => r.status === 'red')
      .map(r => r.complexityId);

    // Memory report
    const memReport = MathUtils.buildMemoryReport(n, memLimit);

    // Save to state
    State.setAnswer('stage0', {
      n, feasibility, eliminated, memReport, memChecked: true,
    });

    // Update DOM regions
    Renderer.updateRegion('feasibility-table',
      _renderFeasibilityTable(feasibility)
    );
    Renderer.updateRegion('memory-table',
      _renderMemoryTable(memReport)
    );

    _recomputeEliminations(State.getAnswer('stage0'));
    _recomputeInsights(n);

    // Check if stage can be marked complete
    _checkComplete();
  }

  function _recomputeEliminations(saved) {
    const elimWrap = document.getElementById('elimination-list');
    if (!elimWrap) return;

    if (saved.eliminated?.length > 0) {
      _renderEliminationList(elimWrap, saved.eliminated, saved);
    } else {
      DomUtils.setHtml(elimWrap,
        '<div class="elim-empty">No approaches eliminated yet</div>'
      );
    }
  }

  function _recomputeInsights(n) {
    const bucket   = ComplexityTable.getBucket(n);
    const insight  = ComplexityTable.getInsight(bucket.nBucket);
    const watchOut = ComplexityTable.getWatchOut(bucket.nBucket);
    const section  = document.getElementById('insight-section');
    if (!section) return;

    DomUtils.clearContent(section);

    if (insight) {
      section.appendChild(
        DomUtils.div({ class: 'insight-card insight-card--key' }, [
          DomUtils.div({ class: 'insight-card__icon' }, '💡'),
          DomUtils.div({ class: 'insight-card__text' }, insight),
        ])
      );
    }
    if (watchOut) {
      section.appendChild(
        DomUtils.div({ class: 'insight-card insight-card--warn' }, [
          DomUtils.div({ class: 'insight-card__icon' }, '⚠'),
          DomUtils.div({ class: 'insight-card__text' }, watchOut),
        ])
      );
    }
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const saved = State.getAnswer('stage0');
    const valid = saved?.n && saved.n > 0;

    if (valid) {
      Renderer.setNextEnabled(true);
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage0',
          answers: saved,
        },
      }));
    } else {
      Renderer.setNextEnabled(false);
    }
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  // Parse N from input — supports shorthand: 1e5, 10^5, 100k, 100000
  function _parseN(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toLowerCase().replace(/,/g, '');

    // Shorthand: 100k → 100000
    if (s.endsWith('k')) return Math.round(parseFloat(s) * 1_000);
    if (s.endsWith('m')) return Math.round(parseFloat(s) * 1_000_000);

    // Scientific: 1e5
    if (s.includes('e')) return Math.round(parseFloat(s));

    // Power: 10^5
    if (s.includes('^')) {
      const [base, exp] = s.split('^').map(Number);
      return Math.round(Math.pow(base, exp));
    }

    const n = parseInt(s);
    return isNaN(n) ? null : n;
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    // If returning to stage0 with saved N — enable next immediately
    if (state.answers?.stage0?.n) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    clearTimeout(_debounceTimer);
    _inputs       = {};
    _debounceTimer = null;
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage0;
}