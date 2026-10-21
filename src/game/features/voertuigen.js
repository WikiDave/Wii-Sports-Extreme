// Feature "voertuigen": bicycles, scooters, golf carts and boats. You buy or rent them at the Garage
// in Havenstad (land) and the harbour rental (boats), get on and off with E, fill up at the pump in
// the harbour, and call them to you from the phone (app Garage). Boats sail between the islands
// and reach a hidden beach with a treasure crate. Logic and models: src/game/voertuigen/.
// Save data: state.ext.voertuigen (see voertuigen/store.js). Game events: none of its own.

import { startVoertuigen } from '../voertuigen/runtime.js';

export default {
  id: 'voertuigen',
  install(ctx) {
    return startVoertuigen(ctx);
  },
};
