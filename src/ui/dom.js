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

const glyph = (paths) => `<svg viewBox="0 0 24 24" fill="currentColor">${paths}</svg>`;

const stroke = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const ICONS = {
  back: stroke('<path d="M15 5l-7 7 7 7"/>'),
  plus: stroke('<path d="M12 5v14M5 12h14"/>'),
  minus: stroke('<path d="M5 12h14"/>'),
  // adjustment buttons, after the Wii editor: a dot (the part) and arrows
  up: glyph('<circle cx="7" cy="15" r="3.2"/><path d="M16 20V6M11.5 10.5L16 6l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  down: glyph('<circle cx="7" cy="9" r="3.2"/><path d="M16 4v14M11.5 13.5L16 18l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  bigger: glyph('<circle cx="12" cy="12" r="4"/><path d="M3.5 3.5l4 4M3.5 3.5v4M3.5 3.5h4M20.5 3.5l-4 4M20.5 3.5v4M20.5 3.5h-4M3.5 20.5l4-4M3.5 20.5v-4M3.5 20.5h4M20.5 20.5l-4-4M20.5 20.5v-4M20.5 20.5h-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  smaller: glyph('<circle cx="12" cy="12" r="2.6"/><path d="M8 8L3.5 3.5M8 8H4.5M8 8V4.5M16 8l4.5-4.5M16 8h3.5M16 8V4.5M8 16l-4.5 4.5M8 16H4.5M8 16v3.5M16 16l4.5 4.5M16 16h3.5M16 16v3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  rotl: glyph('<circle cx="12" cy="15" r="3.4"/><path d="M5 11a7.5 7.5 0 0 1 14 0M19 11l-3.5-1M19 11l1-3.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  rotr: glyph('<circle cx="12" cy="9" r="3.4"/><path d="M5 13a7.5 7.5 0 0 0 14 0M19 13l-3.5 1M19 13l1 3.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  closer: glyph('<circle cx="9.5" cy="12" r="2.4"/><circle cx="14.5" cy="12" r="2.4"/><path d="M1.5 12h4M3.8 9.5L6 12l-2.2 2.5M22.5 12h-4M20.2 9.5L18 12l2.2 2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  apart: glyph('<circle cx="3.5" cy="12" r="2.4"/><circle cx="20.5" cy="12" r="2.4"/><path d="M8 12h8M10.2 9.5L8 12l2.2 2.5M13.8 9.5L16 12l-2.2 2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  left: glyph('<circle cx="16" cy="12" r="3.2"/><path d="M11 12H3M6.5 8.5L3 12l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  right: glyph('<circle cx="8" cy="12" r="3.2"/><path d="M13 12h8M17.5 8.5L21 12l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  dice: stroke('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>'),
  turn: stroke('<path d="M3 12c0-2.5 4-4.5 9-4.5s9 2 9 4.5-4 4.5-9 4.5"/><path d="M10 14l2 2.5-2 2.5"/>'),
  edit: stroke('<path d="M14.5 5.5l4 4L9 19H5v-4z"/><path d="M12.5 7.5l4 4"/>'),
  copy: stroke('<rect x="8" y="8" width="11" height="11" rx="2.5"/><path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8"/>'),
  trash: stroke('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  swap: stroke('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
  check: stroke('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  // editor tabs, after the Wii Mii Channel icons
  profile: glyph('<rect x="2.5" y="1.5" width="19" height="8" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="6.6" cy="5.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="11" cy="5.5" r="1.1"/><circle cx="14.2" cy="5.5" r="1.1"/><circle cx="17.4" cy="5.5" r="1.1"/><path d="M10.5 9.5l1.5 2 1.5-2z"/><path fill-rule="evenodd" d="M12 12.4a5.4 5.4 0 1 1 0 10.8a5.4 5.4 0 0 1 0-10.8zM10 16.4a.9.9 0 1 0 0 1.8a.9.9 0 0 0 0-1.8zM14 16.4a.9.9 0 1 0 0 1.8a.9.9 0 0 0 0-1.8zM9.8 19.4c1.2 1.4 3.2 1.4 4.4 0l-.6-.5c-.9 1-2.3 1-3.2 0z"/>'),
  body: glyph('<circle cx="7" cy="9.2" r="2.3"/><path d="M5 12.2h4v5H8.4v4.3H7.3v-3.6h-.6v3.6H5.6v-4.3H5z"/><circle cx="16.5" cy="3.6" r="2.2"/><path d="M15 6.6h3v8.4h-.4v6.5h-.9v-6h-.4v6h-.9v-6.5H15z"/>'),
  face: glyph('<path fill-rule="evenodd" d="M12 2.2c4.4 0 7.4 3.3 7.4 8 0 6.2-4.4 11.6-7.4 11.6S4.6 16.4 4.6 10.2c0-4.7 3-8 7.4-8zm0 1.8c-3.4 0-5.6 2.6-5.6 6.2 0 5 3.5 9.8 5.6 9.8s5.6-4.8 5.6-9.8c0-3.6-2.2-6.2-5.6-6.2zM9.4 10.2a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 0 0 0-2.2zm5.2 0a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 0 0 0-2.2zM9 14.6c1.6 1.9 4.4 1.9 6 0l-.9-.7c-1.2 1.3-3 1.3-4.2 0z"/>'),
  hair: glyph('<path fill-rule="evenodd" d="M12 1.8c4.8 0 8 3.6 8 8.3 0 2-.4 3.6-1.1 4.9-.4 4.2-3.2 7.2-6.9 7.2s-6.5-3-6.9-7.2C4.4 13.7 4 12.1 4 10.1c0-4.7 3.2-8.3 8-8.3zm-5.2 9.6c0 5 2.3 8.6 5.2 8.6s5.2-3.6 5.2-8.6c0-.6 0-1.1-.1-1.6-2.6-.4-4.6-1.8-5.6-3.6-1 2-2.7 3.4-4.6 3.9-.1.4-.1.8-.1 1.3z"/>'),
  brows: glyph('<path d="M2 12.6l1-2.6 8.2-2.4.6 2.2zM22 12.6l-1-2.6-8.2-2.4-.6 2.2z"/>'),
  eyes: glyph('<path fill-rule="evenodd" d="M6.6 6.8c3 0 5 2.6 5 5.2s-2 5.2-5 5.2-5-2.6-5-5.2 2-5.2 5-5.2zm0 1.8c-1.9 0-3.2 1.6-3.2 3.4s1.3 3.4 3.2 3.4 3.2-1.6 3.2-3.4-1.3-3.4-3.2-3.4zM17.4 6.8c3 0 5 2.6 5 5.2s-2 5.2-5 5.2-5-2.6-5-5.2 2-5.2 5-5.2zm0 1.8c-1.9 0-3.2 1.6-3.2 3.4s1.3 3.4 3.2 3.4 3.2-1.6 3.2-3.4-1.3-3.4-3.2-3.4z"/><circle cx="6.6" cy="12" r="1.9"/><circle cx="17.4" cy="12" r="1.9"/>'),
  nose: glyph('<path d="M13 2.5c.4 5-1.4 9-3.9 12.5-1 1.6-.4 3.4 1.6 3.4h3.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  mouth: glyph('<path fill-rule="evenodd" d="M2 11.6c2.2-3.4 5-4.9 7.4-4.4.9.2 1.8.6 2.6 1.2.8-.6 1.7-1 2.6-1.2 2.4-.5 5.2 1 7.4 4.4-2.4 3.6-6 5.6-10 5.6s-7.6-2-10-5.6zm3 .3c1.9 1.5 4.4 2.2 7 2.2s5.1-.7 7-2.2c-2.2-.6-4.6-.9-7-.9s-4.8.3-7 .9z"/>'),
  extra: glyph('<path fill-rule="evenodd" d="M6.6 3.4a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 0 1 0-7.2zm0 1.6a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM17.4 3.4a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 0 1 0-7.2zm0 1.6a2 2 0 1 0 0 4a2 2 0 0 0 0-4z"/><path d="M10.1 6.4h3.8v1.4h-3.8zM5 15.2c2.4-2.4 4.8-2.4 7-.6 2.2-1.8 4.6-1.8 7 .6-1 1.6-1.6 3-1.8 4.8l-1.2-1.5-1.2 1.6-1.2-1.6-1.3 1.6-1.3-1.6-1.2 1.6-1.2-1.6-1.2 1.5c-.2-1.8-.8-3.2-1.8-4.8z"/>'),
};
