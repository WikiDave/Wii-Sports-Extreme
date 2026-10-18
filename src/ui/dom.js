// Tiny DOM helpers: element builder, modal dialog and toast.

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'htmlFor']);

/** h('button', { class: 'btn', onClick: fn }, 'Label') */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

/** Inline SVG icon from the ICONS table. */
export function icon(name, cls = 'icon') {
  const span = document.createElement('span');
  span.className = cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = ICONS[name] ?? '';
  return span;
}

/**
 * Shows a dialog. actions: [{ label, kind: 'primary' | 'danger', onClick }].
 * An action's onClick may return false to keep the dialog open.
 */
export function modal({ title, body, actions = [], wide = false, onClose }) {
  const previous = document.activeElement;
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
    previous?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  const buttons = actions.map((a) =>
    h(
      'button',
      {
        class: `btn ${a.kind ? 'btn-' + a.kind : ''}`,
        type: 'button',
        onClick: () => {
          if (a.onClick?.() !== false) close();
        },
      },
      a.label,
    ),
  );
  const titleId = 'dlg-' + Math.random().toString(36).slice(2, 8);
  const dialog = h(
    'div',
    { class: `modal ${wide ? 'modal-wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('h2', { class: 'modal-title', id: titleId }, title),
    h('div', { class: 'modal-body' }, body),
    buttons.length ? h('div', { class: 'modal-actions' }, buttons) : null,
  );
  const backdrop = h('div', { class: 'modal-backdrop', onClick: (e) => e.target === backdrop && close() }, dialog);
  document.body.append(backdrop);
  document.addEventListener('keydown', onKey);
  (buttons[buttons.length - 1] ?? dialog.querySelector('button'))?.focus();
  return { close, dialog };
}

let toastTimer = null;
export function toast(text) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = text;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

const stroke = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const ICONS = {
  back: stroke('<path d="M15 5l-7 7 7 7"/>'),
  plus: stroke('<path d="M12 5v14M5 12h14"/>'),
  minus: stroke('<path d="M5 12h14"/>'),
  up: stroke('<path d="M6 15l6-6 6 6"/>'),
  down: stroke('<path d="M6 9l6 6 6-6"/>'),
  left: stroke('<path d="M15 6l-6 6 6 6"/>'),
  right: stroke('<path d="M9 6l6 6-6 6"/>'),
  closer: stroke('<path d="M4 8l4 4-4 4M20 8l-4 4 4 4M12 5v14"/>'),
  apart: stroke('<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M12 5v14"/>'),
  rotl: stroke('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>'),
  rotr: stroke('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/>'),
  dice: stroke('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>'),
  turn: stroke('<path d="M3 12c0-2.5 4-4.5 9-4.5s9 2 9 4.5-4 4.5-9 4.5"/><path d="M10 14l2 2.5-2 2.5"/>'),
  edit: stroke('<path d="M14.5 5.5l4 4L9 19H5v-4z"/><path d="M12.5 7.5l4 4"/>'),
  copy: stroke('<rect x="8" y="8" width="11" height="11" rx="2.5"/><path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8"/>'),
  trash: stroke('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  swap: stroke('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
  check: stroke('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  // editor tabs
  profile: stroke('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.4"/><path d="M5.8 16.5c.6-1.7 1.8-2.6 3.2-2.6s2.6.9 3.2 2.6M14.5 10h4M14.5 13.5h3"/>'),
  body: stroke('<circle cx="12" cy="5" r="2.6"/><path d="M8 10.5c0-1 1.8-1.8 4-1.8s4 .8 4 1.8V15H8z"/><path d="M8 11l-2 4M16 11l2 4M10 15v5M14 15v5"/>'),
  face: stroke('<path d="M12 3.5c4.4 0 7.5 3.4 7.5 8 0 5-3.3 9-7.5 9s-7.5-4-7.5-9c0-4.6 3.1-8 7.5-8z"/>'),
  hair: stroke('<path d="M5 13c-1-6 2.5-9.5 7-9.5s8 3.5 7 9.5"/><path d="M5 13c2-.5 4.5-2.5 5.5-5 1.5 2.5 5 4.5 8.5 5"/><path d="M6.5 14c.6 3.5 2.8 6.5 5.5 6.5s4.9-3 5.5-6.5"/>'),
  brows: stroke('<path d="M3.5 11c1.8-2.4 4.5-2.8 7-1.4M20.5 11c-1.8-2.4-4.5-2.8-7-1.4"/><path d="M5 16h4M15 16h4" stroke-opacity=".35"/>'),
  eyes: stroke('<path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>'),
  nose: stroke('<path d="M12.5 4c-.5 4-2.5 8-4.5 10.5 1.8 1.6 5.2 1.6 7 0"/><path d="M9 18.5c1.8.8 4.2.8 6 0" stroke-opacity=".35"/>'),
  mouth: stroke('<path d="M4 11c2.2 1 4.8 1.2 8 1.2s5.8-.2 8-1.2c-1.4 4-4.4 6.2-8 6.2S5.4 15 4 11z"/><path d="M4 11c2-1.8 4.6-2.6 8-1.4 3.4-1.2 6-.4 8 1.4"/>'),
  beard: stroke('<path d="M12 10.5c-2-2-6-2.5-8.5.5 1.5 0 2.4 1.5 4.5 1.5 2 0 3.2-1 4-2 .8 1 2 2 4 2 2.1 0 3-1.5 4.5-1.5-2.5-3-6.5-2.5-8.5-.5z"/><path d="M6 15c1.4 3 3.6 5 6 5s4.6-2 6-5" stroke-opacity=".35"/>'),
  glasses: stroke('<circle cx="7" cy="13" r="3.8"/><circle cx="17" cy="13" r="3.8"/><path d="M10.8 12.5c.8-.7 1.6-.7 2.4 0M3.2 12.5L2 10M20.8 12.5L22 10"/>'),
  mole: stroke('<path d="M12 3.5c4.4 0 7.5 3.4 7.5 8 0 5-3.3 9-7.5 9s-7.5-4-7.5-9c0-4.6 3.1-8 7.5-8z" stroke-opacity=".35"/><circle cx="15" cy="14.5" r="1.7" fill="currentColor"/>'),
};
