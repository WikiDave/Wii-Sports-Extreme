// Feature "handel": street sellers (verkopers) and suppliers (leveranciers).
// The logic and the world live in src/game/handel/; see runtime.js for what it adds.
// Phone apps: Handelaren (street sellers) and Leveranciers (suppliers). Save data: state.ext.handel.
// Game events it emits: 'handel:levering', 'handel:leeg', 'handel:vol', 'handel:gepakt', 'handel:weg'.
// For other features: ctx.handel = { view, mailbox, board, openHandel(tab) }.
import { startHandel } from '../handel/runtime.js';

export default {
  id: 'handel',
  install(ctx) {
    return startHandel(ctx);
  },
};
