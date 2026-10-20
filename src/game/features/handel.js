// Feature "handel": street sellers (verkopers) and suppliers (leveranciers).
// The logic and the world live in src/game/handel/; see runtime.js for what it adds.
import { startHandel } from '../handel/runtime.js';

export default {
  id: 'handel',
  install(ctx) {
    return startHandel(ctx);
  },
};
