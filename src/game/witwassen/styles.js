// CSS of the laundering layer (businesses, ATM, the taxman, the phone app "Zaken").
// Injected by the feature with ctx.addStyle, so the main stylesheet stays untouched.

export const STYLES = `
.wit-chip {
  display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; white-space: nowrap;
  background: #fff6dd; color: #6a4a12; border: 2px solid #f2b45a; font: 800 14px/1.2 var(--font-ui, system-ui);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}
.wit-chip[hidden] { display: none; }
.wit-chip.is-hot { background: #ffd9cc; border-color: #e0533f; color: #8a2412; animation: witPulse 1s ease-in-out infinite; }
@keyframes witPulse { 50% { transform: scale(1.06); } }
@media (max-width: 560px) { .wit-chip { font-size: 12px; padding: 3px 8px; } }

.wit .wit-blurb { font-style: italic; color: var(--ink-soft); margin: 0 0 10px; }
.wit-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 10px 0; }
.wit-stat { background: var(--panel-soft); border-radius: 14px; padding: 8px 10px; display: grid; gap: 2px; }
.wit-stat small { color: var(--ink-soft); font-weight: 700; }
.wit-stat strong { font-size: 15px; }
.wit-meter { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-top: 8px; font-weight: 700; }
.wit-bar { height: 12px; border-radius: 999px; background: var(--stripe); overflow: hidden; margin: 6px 0 4px; }
.wit-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #34beed, #7ed957); }
.wit-bar.is-hot i { background: linear-gradient(90deg, #f2b45a, #e0533f); }
.wit-bar-thin { height: 7px; }
.wit-amounts { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.wit-actions { display: flex; justify-content: flex-end; margin: 8px 0; }
.wit-ok { color: #1f7a3a; font-weight: 700; margin: 6px 0; }
.wit-warn { color: var(--danger-deep); font-weight: 700; margin: 6px 0; }
.wit-small { color: var(--ink-soft); font-size: 13px; }
.wit-pips { display: inline-flex; gap: 4px; }
.wit-pips i { width: 11px; height: 11px; border-radius: 50%; background: var(--line); display: inline-block; }
.wit-pips i.is-on { background: var(--wii-blue); }
.wit-upgrade { flex-wrap: wrap; }

.wit-card { background: #fff; border-radius: 18px; padding: 12px 14px; margin: 8px 0; box-shadow: 0 2px 8px rgba(30, 60, 90, 0.12); display: grid; gap: 4px; }
.wit-big { font-size: 26px; }
.wit-biz { gap: 6px; }
.wit-row-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.wit-status { font-weight: 800; font-size: 12px; padding: 3px 9px; border-radius: 999px; }
.wit-status.is-open { background: #d9f7e2; color: #1f7a3a; }
.wit-status.is-closed { background: #ffd9d1; color: #9b2b19; }
.wit-mail { background: #fff; border-radius: 14px; padding: 10px 12px; margin: 6px 0; border: 1px solid var(--line); }
.wit-mail.is-new { border-color: var(--wii-blue); }
.wit-mail p { margin: 4px 0; }
.wit-tip { color: var(--ink-soft); font-size: 13px; margin-top: 12px; }

.wit-audit { display: grid; gap: 10px; }
.wit-quote { display: flex; gap: 10px; align-items: center; background: #fff7e6; border-radius: 16px; padding: 10px 12px; }
.wit-quote p { margin: 2px 0 0; }
.wit-badge { font-size: 30px; flex: none; }
.wit-audit p { margin: 0; }
`;
