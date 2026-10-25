// The CSS of the police feature: speech bubbles, the police panel
// (phone and police post) and the arrest dialogs. Added by the feature (ctx.addStyle).

export const STYLES = `
.pz-speech {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 6;
  max-width: 240px;
  padding: 8px 12px;
  border-radius: 16px;
  background: #ffffff;
  color: #1d2633;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}
.pz-speech[hidden] {
  display: none;
}
.pz-speech-name {
  display: block;
  color: #e2513f;
  font-size: 0.8rem;
}
.pz-speech::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -7px;
  margin-left: -7px;
  border: 7px solid transparent;
  border-top-color: #ffffff;
  border-bottom: 0;
}
.pz-panel {
  display: grid;
  gap: 4px;
}
.pz-panel h3 {
  margin: 0 0 4px;
  font-size: 1rem;
}
.pz-card {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 14px;
  padding: 10px 12px;
  margin: 6px 0;
}
.pz-card p {
  margin: 0 0 8px;
}
.pz-status {
  border-radius: 14px;
  padding: 10px 12px;
  background: #eef6ff;
}
.pz-status.pz-lvl-3,
.pz-status.pz-lvl-4 {
  background: #ffe9e1;
}
.pz-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pz-dots {
  display: flex;
  gap: 5px;
}
.pz-ladder {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  margin: 8px 0 4px;
}
.pz-ladder li {
  padding: 4px 9px;
  border-radius: 999px;
  background: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
}
.pz-ladder li.is-now {
  background: #ff6a2a;
  color: #ffffff;
}
.pz-note {
  font-size: 0.9rem;
  opacity: 0.85;
}
.pz-msg {
  padding: 6px 8px;
  border-radius: 10px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.6);
}
.pz-msg.is-new {
  border-left: 4px solid #ff6a2a;
}
.pz-msg p {
  margin: 2px 0 0;
}
.pz-log {
  margin: 0;
  padding-left: 18px;
  font-size: 0.9rem;
}
.pz-log li {
  margin-bottom: 4px;
}
.pz-scene p {
  margin: 0 0 10px;
  line-height: 1.4;
}
`;
