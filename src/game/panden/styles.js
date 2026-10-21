// Styles of the property menus (injected by features/panden.js through ctx.addStyle).
export const STYLE = `
/* Long dialogs (the upgrade lists) scroll inside the dialog on a phone, instead of running off the top. */
.modal { max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overflow-y: auto; }
.prop-info { margin: 4px 0; font-weight: 700; }
.upg-list { display: grid; gap: 8px; margin-top: 4px; }
.upg-row {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: 'main main' 'dots btn';
  gap: 6px 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 16px;
  background: var(--panel-soft);
}
.upg-main { grid-area: main; display: flex; flex-direction: column; gap: 2px; }
.upg-main small { color: var(--ink-soft); line-height: 1.3; }
.upg-dots { grid-area: dots; display: inline-flex; gap: 5px; }
.upg-dots i { width: 12px; height: 12px; border-radius: 50%; background: var(--line); }
.upg-dots i.is-on { background: var(--wii-blue); }
.upg-row .btn { grid-area: btn; justify-self: end; }
.upg-max { grid-area: btn; justify-self: end; font-weight: 700; color: var(--ink-soft); }
.upg-paint { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-weight: 700; padding: 4px 2px; }
.swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px var(--line);
  background: var(--c);
  cursor: pointer;
  padding: 0;
}
.swatch.is-on { box-shadow: 0 0 0 3px var(--wii-blue); }
.office-row { display: block; }
.office-prop summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 0;
  list-style: none;
}
.office-prop summary::-webkit-details-marker { display: none; }
.office-prop .upg-list { margin: 6px 0 8px; }
.chest { display: grid; gap: 8px; }
.chest-cap { margin: 0; font-weight: 700; }
.chest-empty { opacity: 0.7; }
.chest-row {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 16px;
  background: var(--panel-soft);
}
.chest-name { display: flex; flex-direction: column; }
.chest-name small { color: var(--ink-soft); }
.chest-pick { display: flex; align-items: center; gap: 10px; }
.chest-range { flex: 1; accent-color: var(--wii-blue); min-height: 32px; }
.chest-n { min-width: 2.2em; text-align: right; }
.chest-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.morning p { margin: 6px 0; }
`;
