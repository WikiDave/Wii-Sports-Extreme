// Small DOM pieces shared by the screens of the feature: euro text, stars, buttons, chips, bars.

import { h } from '../../ui/dom.js';

export const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;

/** A unit price: whole euros when round, else one decimal ("€1,8"). */
export const euro1 = (n) => {
  const r = Math.round(n * 10) / 10;
  return `€${r.toLocaleString('nl-NL', { minimumFractionDigits: Number.isInteger(r) ? 0 : 1, maximumFractionDigits: 1 })}`;
};

export const stars = (n, max = 5) => h('span', { class: 'hd-stars', title: `${n} van ${max}` }, '★'.repeat(n), h('i', {}, '★'.repeat(max - n)));

/** kind: '' | 'is-primary' | 'is-danger' | 'is-on' | 'is-small' (combine with spaces). */
export const btn = (label, onClick, { kind = '', disabled = false, title = null } = {}) =>
  h('button', { class: `hd-btn ${kind}`, type: 'button', disabled, title, onClick }, label);

export const chip = (text, kind = '') => h('span', { class: `hd-chip ${kind}` }, text);

export const bar = (frac, kind = '') => h('div', { class: `hd-bar ${kind}` }, h('span', { style: { width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%` } }));

/** A note box; onClose adds a small cross. */
export const note = (text, kind = '', onClose = null) =>
  h('div', { class: `hd-note ${kind}` }, onClose ? h('button', { type: 'button', 'aria-label': 'Weg', onClick: onClose }, '✕') : null, text);

/** Scrolls the phone screen (or the dialog) back to the top, after moving to another page. */
export const toTop = () => document.querySelector('.phone-screen, .hd-modal-body')?.scrollTo?.(0, 0);

/** Three skills side by side: label above, stars below. skills = [[label, n], ...]. */
export const skillGrid = (skills) => h('div', { class: 'hd-skills3' }, ...skills.map(([label, n]) => h('div', {}, h('div', { class: 'hd-sub' }, label), stars(n))));
