// Styles of the missions feature (injected with ctx.addStyle). Class names start with ms-.
export const STYLES = `
.ms-tracker {
  position: absolute;
  left: 12px;
  top: 70px;
  width: min(250px, 56vw);
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px 9px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  color: #1e3a52;
  font-size: 0.88rem;
  pointer-events: none;
  z-index: 2;
}
.ms-tracker[hidden] { display: none; }
.ms-tracker.is-ready { background: #eaffef; }
.ms-ico { font-size: 1.45rem; line-height: 1.1; }
.ms-body { min-width: 0; flex: 1; }
.ms-kicker { display: block; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.6; }
.ms-title { display: block; font-size: 0.98rem; font-weight: 900; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-text { display: block; margin-top: 2px; line-height: 1.25; }
.ms-bar { height: 7px; margin-top: 6px; border-radius: 99px; background: #dbe9f3; overflow: hidden; }
.ms-fill { display: block; height: 100%; width: 0; border-radius: 99px; background: #ffb020; transition: width 0.4s ease; }
.is-ready .ms-fill { background: #35e06a; }
.ms-tip {
  position: absolute;
  left: 12px;
  top: 150px;
  width: min(290px, calc(100vw - 150px));
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 3px solid #3fb6ef;
  border-radius: 18px;
  background: #fff;
  color: #1e3a52;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  z-index: 3;
}
.ms-tip[hidden] { display: none; }
.ms-tip-text { flex: 1; min-width: 0; font-size: 0.92rem; font-weight: 700; line-height: 1.3; }
.ms-tip-step { display: block; font-size: 0.68rem; font-weight: 800; opacity: 0.6; }
.ms-tip-btns { display: flex; flex-direction: column; gap: 6px; }
.ms-tip-btns button {
  min-height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 99px;
  background: #e6f3fb;
  color: #1e3a52;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}
.ms-tip-btns .ms-skip { background: none; text-decoration: underline; }
.ms-banner {
  position: absolute;
  left: 50%;
  top: 30%;
  transform: translate(-50%, -50%) scale(0.85);
  padding: 10px 20px;
  border-radius: 999px;
  background: #ffd23f;
  color: #4a3300;
  font-weight: 900;
  white-space: nowrap;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
  z-index: 4;
}
.ms-banner.is-in { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.ms-pin {
  position: absolute;
  left: 0;
  top: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #1e3a52;
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  transform: translate(-50%, -100%);
  z-index: 2;
}
.ms-pin::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.96);
  border-bottom: 0;
}
.ms-pin[hidden] { display: none; }
.ms-pin.is-ready { background: #35e06a; color: #fff; }
.ms-pin.is-ready::after { border-top-color: #35e06a; }
.ms-pin.is-goal { background: #ffd23f; }
.ms-pin.is-goal::after { border-top-color: #ffd23f; }
.ms-pin.is-tip { background: #3fb6ef; color: #fff; }
.ms-pin.is-tip::after { border-top-color: #3fb6ef; }
.ms-mentor { display: flex; gap: 12px; align-items: center; }
.ms-portrait { width: 96px; height: 96px; flex: none; border-radius: 20px; background: #eaf6ff; object-fit: contain; }
.ms-name { display: block; font-weight: 900; color: #2a6fb0; }
.ms-say { margin: 4px 0 0; font-size: 1.02rem; font-weight: 700; line-height: 1.35; }
.ms-card { margin: 8px 0; padding: 10px 12px; border-radius: 14px; background: #f1f8fd; }
.ms-card h4 { margin: 2px 0 4px; font-size: 1.05rem; }
.ms-card p { margin: 4px 0; }
.ms-hint { color: #4a6378; font-size: 0.9rem; }
.ms-group { margin: 14px 0 4px; font-weight: 900; color: #2a6fb0; }
.ms-row { display: flex; align-items: baseline; gap: 6px; padding: 6px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.ms-row small { margin-left: auto; opacity: 0.6; }
.ms-ach { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; padding: 8px 10px; border-radius: 14px; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); }
.ms-ach.is-done { background: #eaffef; }
.ms-ach-ico { flex: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #e2e8ef; font-size: 1.1rem; }
.ms-ach.is-done .ms-ach-ico { background: #ffd23f; }
.ms-ach-body { flex: 1; min-width: 0; }
.ms-ach-body strong { display: block; }
.ms-ach-body small { display: block; color: #4a6378; line-height: 1.25; }
.ms-ach-body .ms-bar { margin-top: 4px; height: 5px; }
.ms-skill { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; padding: 8px 10px; border-radius: 14px; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); }
.ms-skill-ico { flex: none; font-size: 1.6rem; }
.ms-skill-body { flex: 1; min-width: 0; }
.ms-skill-body small { display: block; color: #4a6378; line-height: 1.25; }
.ms-pips { display: flex; gap: 5px; margin: 4px 0; }
.ms-pips i { width: 14px; height: 14px; border-radius: 50%; background: #d5dbe2; }
.ms-pips i.is-on { background: #ffb020; }
.ms-skill .btn { flex: none; }
.ms-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
@media (max-width: 560px) {
  .ms-tracker { font-size: 0.82rem; }
  .ms-tip { font-size: 0.9rem; }
}
`;
