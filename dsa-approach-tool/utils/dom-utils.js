// utils/dom-utils.js
// DOM creation helpers, show/hide/toggle, multi-select component
// Used by: renderer.js and all stage HTML templates

const DomUtils = {

  // ─── ELEMENT CREATION ──────────────────────────────────────────────────────

  // Create element with optional attrs and children
  // e.g. el('div', { class: 'card', id: 'main' }, [el('span', {}, 'hello')])
  el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);

    Object.entries(attrs).forEach(([key, val]) => {
      if (key === 'class')      element.className = val;
      else if (key === 'style') Object.assign(element.style, val);
      else if (key === 'data')  Object.entries(val).forEach(([k, v]) => element.dataset[k] = v);
      else if (key.startsWith('on')) {
        element.addEventListener(key.slice(2).toLowerCase(), val);
      }
      else element.setAttribute(key, val);
    });

    const kids = Array.isArray(children) ? children : [children];
    kids.forEach(child => {
      if (child === null || child === undefined) return;
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(String(child)));
      } else {
        element.appendChild(child);
      }
    });

    return element;
  },

  // Shorthand creators
  div(attrs, children)  { return this.el('div',    attrs, children); },
  span(attrs, children) { return this.el('span',   attrs, children); },
  p(attrs, children)    { return this.el('p',      attrs, children); },
  h1(attrs, children)   { return this.el('h1',     attrs, children); },
  h2(attrs, children)   { return this.el('h2',     attrs, children); },
  h3(attrs, children)   { return this.el('h3',     attrs, children); },
  btn(attrs, children)  { return this.el('button', attrs, children); },
  input(attrs)          { return this.el('input',  attrs, []); },
  label(attrs, children){ return this.el('label',  attrs, children); },
  ul(attrs, children)   { return this.el('ul',     attrs, children); },
  li(attrs, children)   { return this.el('li',     attrs, children); },

  // ─── QUERY HELPERS ─────────────────────────────────────────────────────────

  qs(selector, root = document)  { return root.querySelector(selector); },
  qsa(selector, root = document) { return [...root.querySelectorAll(selector)]; },
  id(idStr)                      { return document.getElementById(idStr); },

  // ─── VISIBILITY ────────────────────────────────────────────────────────────

  show(el) {
    if (!el) return;
    el.style.display = '';
    el.removeAttribute('hidden');
  },

  hide(el) {
    if (!el) return;
    el.style.display = 'none';
  },

  toggle(el, forceState) {
    if (!el) return;
    const isHidden = el.style.display === 'none' || el.hasAttribute('hidden');
    const shouldShow = forceState !== undefined ? forceState : isHidden;
    shouldShow ? this.show(el) : this.hide(el);
  },

  // Show one element, hide all others in a group
  showOnly(targetEl, groupEls) {
    groupEls.forEach(el => el === targetEl ? this.show(el) : this.hide(el));
  },

  // ─── CLASS HELPERS ─────────────────────────────────────────────────────────

  addClass(el, ...classes)    { if (el) el.classList.add(...classes); },
  removeClass(el, ...classes) { if (el) el.classList.remove(...classes); },
  toggleClass(el, cls, force) { if (el) el.classList.toggle(cls, force); },
  hasClass(el, cls)           { return el ? el.classList.contains(cls) : false; },

  // Swap class — remove oldCls, add newCls
  swapClass(el, oldCls, newCls) {
    if (!el) return;
    el.classList.remove(oldCls);
    el.classList.add(newCls);
  },

  // ─── CONTENT ───────────────────────────────────────────────────────────────

  setText(el, text) {
    if (el) el.textContent = text;
  },

  setHtml(el, html) {
    if (el) el.innerHTML = html;
  },

  clearContent(el) {
    if (el) el.innerHTML = '';
  },

  // Append children to parent — accepts single node or array
  append(parent, children) {
    if (!parent) return;
    const kids = Array.isArray(children) ? children : [children];
    kids.forEach(child => {
      if (child) parent.appendChild(child);
    });
  },

  // Replace all children of parent with new children
  replaceChildren(parent, children) {
    this.clearContent(parent);
    this.append(parent, children);
  },

  // ─── SCROLL ────────────────────────────────────────────────────────────────

  scrollToTop(el) {
    if (el) el.scrollTop = 0;
  },

  scrollIntoView(el, behavior = 'smooth') {
    if (el) el.scrollIntoView({ behavior, block: 'start' });
  },

  // ─── ANIMATION HELPERS ─────────────────────────────────────────────────────

  // Fade in element
  fadeIn(el, durationMs = 200) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.display = '';
    el.style.transition = `opacity ${durationMs}ms ease`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.opacity = '1'; });
    });
  },

  // Slide in from top with opacity
  slideIn(el, durationMs = 220) {
    if (!el) return;
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(-8px)';
    el.style.transition = `opacity ${durationMs}ms ease, transform ${durationMs}ms ease`;
    el.style.display    = '';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  },

  // Flash highlight on element — e.g. when value updates
  flash(el, cls = 'flash-highlight', durationMs = 600) {
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), durationMs);
  },

  // ─── MULTI-SELECT COMPONENT ────────────────────────────────────────────────
  // Used by Stage 1 (input type), Stage 2 (output type), Stage 3 (properties)

  /*
    Creates a chip-based multi-select component.

    config = {
      id        : string         — unique id for this component
      options   : [              — array of option objects
        {
          id      : string,
          label   : string,
          sublabel: string (optional),
          icon    : string (optional emoji or symbol),
          exclusive: bool (optional — if true, selecting this deselects all others)
        }
      ],
      maxSelect : number|null    — max chips selectable (null = unlimited)
      minSelect : number         — min required before proceeding (default 1)
      onChange  : fn(selectedIds) — callback on selection change
    }

    Returns: { el, getSelected, setSelected, reset }
  */
  createMultiSelect(config) {
    const {
      id,
      options = [],
      maxSelect = null,
      minSelect = 1,
      onChange = () => {},
    } = config;

    const selected = new Set();
    const chipEls  = new Map();

    const container = this.div({ class: 'multi-select', id });

    options.forEach(opt => {
      const chip = this.div(
        {
          class: 'chip',
          data : { id: opt.id, exclusive: opt.exclusive ? 'true' : 'false' },
        },
        [
          opt.icon  ? this.span({ class: 'chip-icon' }, opt.icon) : null,
          this.span({ class: 'chip-label' }, opt.label),
          opt.sublabel
            ? this.span({ class: 'chip-sublabel' }, opt.sublabel)
            : null,
        ].filter(Boolean)
      );

      chip.addEventListener('click', () => {
        this._handleChipClick(opt, selected, chipEls, maxSelect, onChange);
      });

      chipEls.set(opt.id, chip);
      container.appendChild(chip);
    });

    return {
      el: container,

      getSelected() {
        return [...selected];
      },

      setSelected(ids) {
        selected.clear();
        ids.forEach(id => {
          if (chipEls.has(id)) {
            selected.add(id);
            chipEls.get(id).classList.add('chip--selected');
          }
        });
        onChange([...selected]);
      },

      reset() {
        selected.clear();
        chipEls.forEach(chip => chip.classList.remove('chip--selected'));
        onChange([]);
      },

      isValid() {
        return selected.size >= minSelect;
      },
    };
  },

  // Internal chip click handler
  _handleChipClick(opt, selected, chipEls, maxSelect, onChange) {
    const isSelected = selected.has(opt.id);

    if (isSelected) {
      // Deselect
      selected.delete(opt.id);
      chipEls.get(opt.id).classList.remove('chip--selected');
    } else {
      // If this option is exclusive — clear all others first
      if (opt.exclusive) {
        selected.clear();
        chipEls.forEach(chip => chip.classList.remove('chip--selected'));
      }

      // If maxSelect reached — deselect oldest
      if (maxSelect !== null && selected.size >= maxSelect) {
        const oldest = [...selected][0];
        selected.delete(oldest);
        chipEls.get(oldest)?.classList.remove('chip--selected');
      }

      // Select this chip
      selected.add(opt.id);
      chipEls.get(opt.id).classList.add('chip--selected');
    }

    onChange([...selected]);
  },

  // ─── SINGLE SELECT COMPONENT ───────────────────────────────────────────────
  // For yes/no questions in Stage 3 property checks

  /*
    config = {
      id      : string
      question: string
      options : [{ id, label, sublabel, color }]
      onChange: fn(selectedId)
    }

    Returns: { el, getSelected, reset, isValid }
  */
  createSingleSelect(config) {
    const {
      id,
      question = '',
      options  = [],
      onChange = () => {},
    } = config;

    let selectedId = null;
    const optEls   = new Map();

    const wrapper = this.div({ class: 'single-select', id });

    if (question) {
      wrapper.appendChild(
        this.p({ class: 'single-select__question' }, question)
      );
    }

    const optRow = this.div({ class: 'single-select__options' });

    options.forEach(opt => {
      const optEl = this.div(
        {
          class: `single-select__option ${opt.color ? `option--${opt.color}` : ''}`,
          data : { id: opt.id },
        },
        [
          this.span({ class: 'option__label' }, opt.label),
          opt.sublabel
            ? this.span({ class: 'option__sublabel' }, opt.sublabel)
            : null,
        ].filter(Boolean)
      );

      optEl.addEventListener('click', () => {
        // Clear previous
        optEls.forEach(el => el.classList.remove('option--selected'));

        // Select this
        selectedId = opt.id;
        optEl.classList.add('option--selected');
        onChange(selectedId);
      });

      optEls.set(opt.id, optEl);
      optRow.appendChild(optEl);
    });

    wrapper.appendChild(optRow);

    return {
      el: wrapper,

      getSelected()  { return selectedId; },
      reset()        {
        selectedId = null;
        optEls.forEach(el => el.classList.remove('option--selected'));
        onChange(null);
      },
      isValid()      { return selectedId !== null; },
    };
  },

  // ─── PROGRESS BAR ──────────────────────────────────────────────────────────

  /*
    Creates a stage progress indicator.
    stages = [{ id, label, status: 'done'|'active'|'pending' }]
  */
  createProgressBar(stages) {
    const bar = this.div({ class: 'progress-bar' });

    stages.forEach((stage, idx) => {
      const dot = this.div(
        {
          class: `progress-dot progress-dot--${stage.status}`,
          data : { stageId: stage.id },
        },
        [
          this.span({ class: 'progress-dot__num' }, String(idx + 1)),
          this.span({ class: 'progress-dot__label' }, stage.label),
        ]
      );
      bar.appendChild(dot);

      if (idx < stages.length - 1) {
        bar.appendChild(this.div({ class: 'progress-connector' }));
      }
    });

    return {
      el: bar,

      setStatus(stageId, status) {
        const dot = bar.querySelector(`[data-stage-id="${stageId}"]`);
        if (!dot) return;
        dot.className = `progress-dot progress-dot--${status}`;
      },

      markDone(stageId)   { this.setStatus(stageId, 'done');    },
      markActive(stageId) { this.setStatus(stageId, 'active');  },
      reset() {
        bar.querySelectorAll('.progress-dot').forEach(dot => {
          dot.className = 'progress-dot progress-dot--pending';
        });
      },
    };
  },

  // ─── STATUS BADGE ──────────────────────────────────────────────────────────

  // green | yellow | red | blue | gray
  createBadge(text, status = 'gray') {
    return this.span(
      { class: `badge badge--${status}` },
      text
    );
  },

  // ─── COLLAPSIBLE SECTION ───────────────────────────────────────────────────

  createCollapsible(headerText, contentEl, startOpen = false) {
    const wrapper = this.div({ class: 'collapsible' });
    const header  = this.div({ class: 'collapsible__header' }, [
      this.span({ class: 'collapsible__title' }, headerText),
      this.span({ class: 'collapsible__arrow' }, startOpen ? '▲' : '▼'),
    ]);
    const body = this.div({ class: 'collapsible__body' });
    body.appendChild(contentEl);

    if (!startOpen) this.hide(body);

    header.addEventListener('click', () => {
      const isOpen = body.style.display !== 'none';
      this.toggle(body, !isOpen);
      header.querySelector('.collapsible__arrow').textContent = isOpen ? '▼' : '▲';
    });

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
  },

  // ─── TOOLTIP ───────────────────────────────────────────────────────────────

  attachTooltip(el, text) {
    if (!el) return;
    el.setAttribute('title', text);
    el.classList.add('has-tooltip');
  },

  // ─── FORM HELPERS ──────────────────────────────────────────────────────────

  // Get value from input/select safely
  getValue(el) {
    if (!el) return '';
    return el.value ?? '';
  },

  // Set value on input/select safely
  setValue(el, val) {
    if (el) el.value = val;
  },

  // Disable / enable element
  disable(el) { if (el) el.disabled = true;  },
  enable(el)  { if (el) el.disabled = false; },

  // ─── EVENT HELPERS ─────────────────────────────────────────────────────────

  // Add multiple event listeners at once
  on(el, events, handler) {
    if (!el) return;
    const evList = Array.isArray(events) ? events : [events];
    evList.forEach(ev => el.addEventListener(ev, handler));
  },

  // One-time event listener
  once(el, event, handler) {
    if (!el) return;
    el.addEventListener(event, handler, { once: true });
  },

  // Delegate event from parent to matching child selector
  delegate(parent, selector, event, handler) {
    if (!parent) return;
    parent.addEventListener(event, e => {
      const target = e.target.closest(selector);
      if (target && parent.contains(target)) {
        handler(e, target);
      }
    });
  },

  // ─── KEYBOARD HELPERS ──────────────────────────────────────────────────────

  // Attach keyboard shortcut to document
  // e.g. onKey('ArrowRight', handler)
  onKey(key, handler, target = document) {
    target.addEventListener('keydown', e => {
      if (e.key === key) handler(e);
    });
  },

  // ─── MISC ──────────────────────────────────────────────────────────────────

  // Deep clone a DOM node
  clone(el, deep = true) {
    return el ? el.cloneNode(deep) : null;
  },

  // Measure element dimensions
  measure(el) {
    if (!el) return { width: 0, height: 0, top: 0, left: 0 };
    const rect = el.getBoundingClientRect();
    return {
      width : rect.width,
      height: rect.height,
      top   : rect.top,
      left  : rect.left,
    };
  },

  // Detect if element is in viewport
  isInViewport(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      rect.top    >= 0 &&
      rect.left   >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right  <= (window.innerWidth  || document.documentElement.clientWidth)
    );
  },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DomUtils;
}