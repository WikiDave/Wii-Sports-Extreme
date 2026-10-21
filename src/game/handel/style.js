// CSS of the feature "handel" (phone apps, panels, HUD chip). Injected with ctx.addStyle().
// Everything is prefixed hd-. Tap targets are at least 40px high, layouts fit a 390px phone.

export const STYLE = `
.hd { display: grid; gap: 10px; }
.hd h3 { margin: 6px 0 0; font-size: 0.95rem; }
.hd p { margin: 0; }
.hd-card { background: #fff; border-radius: 14px; padding: 10px 12px; display: grid; gap: 6px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); text-align: left; font: inherit; color: inherit; border: 0; width: 100%; }
button.hd-card { cursor: pointer; }
.hd-card.is-warn { box-shadow: inset 0 0 0 2px #f2a516, 0 1px 4px rgba(0, 0, 0, 0.1); }
.hd-card.is-locked { opacity: 0.55; }
.hd-card.is-good { box-shadow: inset 0 0 0 2px #35c06a, 0 1px 4px rgba(0, 0, 0, 0.1); }
.hd-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.hd-wrap { flex-wrap: wrap; }
.hd-grow { flex: 1; min-width: 0; }
.hd-between { justify-content: space-between; }
.hd-name { font-weight: 800; overflow-wrap: anywhere; }
.hd-sub { font-size: 0.8rem; color: #6b8396; overflow-wrap: anywhere; }
.hd-big { font-size: 1.5rem; font-weight: 800; line-height: 1.1; }
.hd-money { color: #1c8a3a; font-weight: 800; }
.hd-avatar { position: relative; flex: none; width: 46px; height: 46px; border-radius: 50%; background: #dbe8f3; display: grid; place-items: center; overflow: hidden; font-weight: 800; color: #6b8396; }
.hd-avatar::before { content: attr(data-initial); }
.hd-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: #dbe8f3; }
.hd-avatar img:not([src]) { visibility: hidden; }
.hd-avatar.is-big { width: 64px; height: 64px; font-size: 1.4rem; }
.hd-avatar.is-orange { box-shadow: 0 0 0 3px #ff6e19; }
.hd-chip { display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px; border-radius: 999px; background: #e2f6fd; color: #0e6a94; font-size: 0.74rem; font-weight: 800; white-space: nowrap; }
.hd-chip.warn { background: #ffe9d2; color: #a8470f; }
.hd-chip.good { background: #dff6e5; color: #1c7a3a; }
.hd-chip.bad { background: #ffe0dc; color: #b03a2a; }
.hd-chip.dim { background: #eef2f6; color: #6b7a88; }
.hd-btn { min-height: 40px; padding: 0 12px; border-radius: 12px; border: 2px solid var(--line-deep, #bcc5d0); background: #fff; font: inherit; font-weight: 800; font-size: 0.84rem; color: var(--ink, #3b4049); cursor: pointer; }
.hd-btn.is-primary { background: var(--wii-blue, #34beed); border-color: var(--wii-blue-deep, #0e94c9); color: #fff; box-shadow: 0 3px 0 var(--wii-blue-deep, #0e94c9); }
.hd-btn.is-danger { color: var(--danger-deep, #b93a28); }
.hd-btn.is-on { background: var(--wii-blue-soft, #e2f6fd); border-color: var(--wii-blue, #34beed); }
.hd-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.hd-btn.is-small { min-height: 40px; min-width: 40px; padding: 0 8px; }
.hd-btns { display: flex; flex-wrap: wrap; gap: 6px; }
.hd-bar { height: 8px; border-radius: 4px; background: #e3edf5; overflow: hidden; }
.hd-bar > span { display: block; height: 100%; background: linear-gradient(90deg, #7ed957, #3fb6ef); }
.hd-bar.is-risk > span { background: linear-gradient(90deg, #f2b45a, #e2513f); }
.hd-stars { letter-spacing: 1px; color: #f2a516; font-size: 0.85rem; white-space: nowrap; }
.hd-stars i { color: #cdd6de; font-style: normal; }
.hd-note { background: #fff6d8; border-left: 4px solid #f2b45a; border-radius: 8px; padding: 6px 10px; font-size: 0.82rem; }
.hd-note.is-bad { background: #ffe9e5; border-color: #e2513f; }
.hd-note.is-good { background: #e3f8e8; border-color: #35c06a; }
.hd-note button { float: right; border: 0; background: none; font-size: 1rem; cursor: pointer; padding: 0 4px; }
.hd-back { justify-self: start; }
.hd-skill { display: grid; grid-template-columns: 5.4rem 1fr; gap: 6px; align-items: center; font-size: 0.82rem; }
.hd-skills3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.hd-routes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.hd-route { display: grid; gap: 2px; padding: 6px 8px; text-align: left; line-height: 1.2; min-height: 48px; }
.hd-route small { font-weight: 600; font-size: 0.7rem; color: #6b8396; }
.hd-item { display: grid; gap: 4px; padding: 6px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.08); }
.hd-item:last-child { border-bottom: 0; }
.hd-good { display: grid; gap: 4px; padding: 8px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.08); }
.hd-good.is-off { opacity: 0.55; }
.hd-stepper { display: flex; align-items: center; gap: 4px; }
.hd-stepper output { min-width: 2.2rem; text-align: center; font-weight: 800; }
.hd-tiers { display: flex; flex-wrap: wrap; gap: 4px; }
.hd-tiers .hd-btn { min-height: 34px; font-size: 0.74rem; padding: 0 8px; }
.hd-sum { display: grid; gap: 2px; font-size: 0.85rem; }
.hd-sum > div { display: flex; justify-content: space-between; gap: 8px; }
.hd-sum .is-total { font-weight: 800; font-size: 1rem; border-top: 2px solid #e3edf5; padding-top: 4px; }
.hd-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.hd-table th { text-align: left; color: #6b8396; font-weight: 700; padding: 2px 4px; }
.hd-table td { padding: 5px 4px; border-top: 1px solid rgba(0, 0, 0, 0.08); }
.hd-table td:nth-child(n + 2), .hd-table th:nth-child(n + 2) { text-align: right; }
.hd-hud { position: relative; }
.hd-hud .phone-badge { top: -4px; right: -4px; }
.hd-hud.is-pulse { animation: hd-pulse 1.4s ease-in-out infinite; }
@keyframes hd-pulse { 50% { transform: scale(1.12); } }
.hd-modal-body { max-height: 70vh; overflow: auto; }
@media (prefers-reduced-motion: reduce) { .hd-hud.is-pulse { animation: none; } }
`;
