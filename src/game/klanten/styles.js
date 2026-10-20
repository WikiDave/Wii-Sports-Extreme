// CSS of the customer features (speech bubbles, name tags, the deal menu, the contacts page).
// Injected by the klanten feature with ctx.addStyle, so the main stylesheet stays untouched.

export const STYLES = `
/* ---- speech bubbles and name tags above heads */
.kl-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 6; }
.kl-bubble {
  position: absolute; left: 0; top: 0; max-width: min(230px, 62vw); padding: 7px 12px 9px;
  border-radius: 16px; background: #fff; color: #2d3440; font-weight: 700; font-size: 14px; line-height: 1.25;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.28); opacity: 0; transition: opacity 0.2s; will-change: transform;
}
.kl-bubble.is-in { opacity: 1; }
.kl-bubble::after {
  content: ''; position: absolute; left: 50%; bottom: -6px; width: 13px; height: 13px; background: #fff;
  transform: translateX(-50%) rotate(45deg); border-radius: 0 0 4px 0;
}
.kl-bubble-name { display: block; font-size: 11px; font-weight: 800; color: #0e94c9; margin-bottom: 1px; }
.kl-tag {
  position: absolute; left: 0; top: 0; padding: 3px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.92);
  color: #2d3440; font: 800 12px/1.2 var(--font-ui, system-ui); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  white-space: nowrap; opacity: 0; transition: opacity 0.2s; will-change: transform;
}

/* ---- the deal menu */
.kl-deal { display: grid; gap: 12px; }
.kl-head { display: flex; gap: 12px; align-items: center; }
.kl-portrait {
  width: 76px; height: 76px; flex: none; border-radius: 50%; object-fit: cover; border: 3px solid #fff;
  background: radial-gradient(circle at 50% 40%, #fff, #d9eefa); box-shadow: 0 2px 8px rgba(30, 60, 90, 0.22);
}
.kl-portrait.is-loading { animation: pulse 1.2s ease-in-out infinite; }
.kl-who { min-width: 0; display: grid; gap: 3px; flex: 1; }
.kl-name { font-size: 19px; font-weight: 800; line-height: 1.15; }
.kl-type { font-size: 13px; font-weight: 700; color: var(--ink-soft, #78818d); }
.kl-trust { display: grid; gap: 3px; font-size: 12px; font-weight: 800; color: #4a6378; }
.kl-bar { height: 10px; border-radius: 6px; background: #e3edf5; overflow: hidden; min-width: 40px; }
.kl-bar > span { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #7ed957, #3fb6ef); transition: width 0.5s; }
.kl-say {
  position: relative; padding: 10px 14px; border-radius: 16px; background: #eef8fe; border: 2px solid #cde7f6;
  font-weight: 700; margin-top: 4px;
}
.kl-say::before {
  content: ''; position: absolute; left: 34px; top: -9px; width: 14px; height: 14px; background: #eef8fe;
  border-left: 2px solid #cde7f6; border-top: 2px solid #cde7f6; transform: rotate(45deg);
}
.kl-mood { font-size: 1.15em; margin-right: 4px; }
.kl-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 12px; font-weight: 800; color: #4a6378; }
.kl-chip { padding: 2px 10px; border-radius: 999px; background: var(--fx, #e3edf5); font-weight: 800; font-size: 12px; color: #2a2a2e; }
.kl-chip.is-no { background: #ffe3de; border: 2px dashed #e0533f; padding: 0 8px; }
.kl-facts { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 13px; font-weight: 700; color: #4a6378; }
.kl-note { padding: 8px 12px; border-radius: 12px; background: #fff6d9; font-weight: 800; font-size: 13px; }
.kl-note.is-warn { background: #ffe3de; }
.kl-qty { display: flex; align-items: center; gap: 10px; font-weight: 800; }
.kl-qty b { min-width: 2ch; text-align: center; font-size: 18px; }
.kl-qty .btn { width: 44px; min-height: 44px; padding: 0; font-size: 20px; }
.kl-items { display: grid; gap: 8px; }
.kl-item { display: grid; gap: 6px; padding: 10px; border-radius: 16px; background: var(--panel-soft, #f7f9fb); border: 2px solid var(--line, #d4dae2); }
.kl-item.is-best { border-color: #7ed957; background: #f2fbea; }
.kl-item-top { display: flex; justify-content: space-between; gap: 8px; font-weight: 800; }
.kl-item-top small { font-weight: 700; color: var(--ink-soft, #78818d); white-space: nowrap; }
.kl-react { font-size: 12px; font-weight: 700; color: #4a6378; }
.kl-offers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.kl-offer { min-height: 58px; padding: 4px 6px; flex-direction: column; gap: 0; line-height: 1.15; font-size: 12px; }
.kl-offer b { font-size: 16px; }
.kl-offer small { font-size: 11px; font-weight: 700; color: var(--ink-soft, #78818d); }
.kl-result { display: grid; gap: 10px; justify-items: center; text-align: center; }
.kl-face { font-size: 44px; line-height: 1; }
.kl-sum { font-weight: 800; font-size: 17px; }
.kl-gain { font-weight: 800; color: #1c8a3a; }
.kl-loss { font-weight: 800; color: #d2432f; }
.kl-tierup { padding: 8px 14px; border-radius: 14px; background: linear-gradient(90deg, #ffe9a0, #ffd0e0); font-weight: 800; }
@media (max-width: 480px) {
  .kl-portrait { width: 64px; height: 64px; }
  .kl-name { font-size: 17px; }
}

/* ---- the contacts page of the phone */
.phone-screen:has(.kl-tools) { max-height: min(72vh, 620px); }
.kl-tools { position: sticky; top: -10px; z-index: 2; margin: -4px -10px 8px; padding: 6px 10px 6px; background: linear-gradient(180deg, #e7f4ff 88%, rgba(231, 244, 255, 0)); display: grid; gap: 5px; }
.kl-search {
  width: 100%; min-height: 38px; padding: 0 14px; border: 2px solid #cfe0ec; border-radius: 999px; background: #fff;
  font: inherit; font-size: 14px; font-weight: 700; color: #2d3440;
}
.kl-search:focus { outline: none; border-color: #3fb6ef; }
.kl-row { display: flex; flex-wrap: nowrap; gap: 4px; align-items: center; font-size: 11px; font-weight: 800; color: #4a6378; overflow-x: auto; scrollbar-width: none; white-space: nowrap; }
.kl-row::-webkit-scrollbar { display: none; }
.kl-pill {
  flex: none; min-height: 30px; padding: 0 8px; border: 2px solid #cfe0ec; border-radius: 999px; background: #fff; color: #2d3440;
  font: inherit; font-size: 11px; font-weight: 800; cursor: pointer;
}
.kl-pill.is-on { background: #3fb6ef; border-color: #2a9bd3; color: #fff; }
.kl-contact { display: grid; grid-template-columns: 48px 1fr; gap: 4px 10px; background: #fff; border-radius: 14px; padding: 8px 10px; margin-bottom: 8px; cursor: pointer; border: 2px solid transparent; scroll-margin-top: 110px; }
.kl-contact.is-open { border-color: #3fb6ef; }
.kl-contact.is-locked { opacity: 0.75; cursor: default; background: #f3f7fa; }
.kl-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: radial-gradient(circle at 50% 40%, #fff, #d9eefa); }
.kl-avatar.is-unknown { display: grid; place-items: center; font-size: 22px; font-weight: 800; color: #9bb3c4; background: #e3edf5; }
.kl-main { min-width: 0; display: grid; gap: 3px; }
.kl-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.kl-top strong { font-size: 15px; }
.kl-badge { font-size: 11px; font-weight: 800; color: #4a6378; white-space: nowrap; }
.kl-hint { font-size: 12px; font-weight: 700; color: #4a6378; }
.kl-now { font-size: 12px; font-weight: 800; color: #1c8a3a; }
.kl-small { font-size: 12px; font-weight: 700; color: #6b8396; }
.kl-details { grid-column: 1 / -1; display: grid; gap: 6px; padding-top: 6px; border-top: 1px dashed #cfe0ec; font-size: 13px; font-weight: 600; color: #3b4a58; }
.kl-details .kl-chips { font-size: 12px; }
.kl-empty { text-align: center; color: #6b8396; font-weight: 700; margin-top: 30px; }
`;
