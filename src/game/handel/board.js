// The wholesale sign next to the market stall in Havenstad: the market stays as it was, and this
// board opens the suppliers' order screen on the spot (with a price comparison against the market).

import { buildBoard } from './props3d.js';
import { findFree } from './place.js';

export class Board {
  /** hooks: { open() } opens the ordering dialog. */
  constructor(ctx, hooks) {
    this.ctx = ctx;
    const market = ctx.interactions.items.find((i) => i.label === 'Markt') ?? { x: 250, z: 70 };
    const spot = findFree(ctx, market.x + 7, market.z + 5, { gap: 3.5, maxH: 14 });
    this.group = buildBoard();
    this.group.position.set(spot.x, spot.y - 0.05, spot.z);
    this.group.rotation.y = -0.45;
    ctx.scene.add(this.group);
    ctx.shadowsOn(this.group);
    this.colliders = [
      { x: spot.x, z: spot.z, r: 1.9 },
      { x: spot.x + Math.cos(-0.45) * 2.6 + Math.sin(-0.45) * 0.6, z: spot.z - Math.sin(-0.45) * 2.6 + Math.cos(-0.45) * 0.6, r: 1.2 },
    ];
    ctx.props.colliders.push(...this.colliders);
    this.item = ctx.interactions.add({ x: spot.x, z: spot.z, r: 6.2, label: 'Groothandel', run: hooks.open });
  }

  dispose() {
    const { scene, interactions, props } = this.ctx;
    scene.remove(this.group);
    const i = interactions.items.indexOf(this.item);
    if (i >= 0) interactions.items.splice(i, 1);
    for (const c of this.colliders) {
      const k = props.colliders.indexOf(c);
      if (k >= 0) props.colliders.splice(k, 1);
    }
    this.group.traverse((o) => {
      o.geometry?.dispose();
      o.material?.map?.dispose();
      o.material?.dispose();
    });
  }
}
