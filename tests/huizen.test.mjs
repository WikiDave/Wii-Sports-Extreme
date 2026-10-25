import assert from 'node:assert/strict';
import { houseDoor } from '../src/game/wereld/houses.js';

const anchor = (x, z, rot, radius) => ({ position: { x, z }, rotation: { y: rot }, userData: { radius } });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// Facing +z: the door lies in front, at radius + 0.3, and the outside point a step further.
{
  const { door, out } = houseDoor(anchor(10, 20, 0, 5));
  near(door.x, 10);
  near(door.z, 25.3);
  near(out.z, 26.6);
}

// Turned a quarter: the door now lies along +x.
{
  const { door, out } = houseDoor(anchor(10, 20, Math.PI / 2, 5));
  near(door.x, 15.3);
  near(door.z, 20);
  near(out.x, 16.6);
}

// Turned half a turn: the door is behind the centre in +z direction flipped.
{
  const { door } = houseDoor(anchor(0, 0, Math.PI, 4));
  near(door.z, -4.3);
}

// The door point is always just outside the house's collision circle.
for (const rot of [0, 1.2, 2.5, 4.1]) {
  const { door, out } = houseDoor(anchor(3, -7, rot, 6));
  assert.ok(Math.hypot(door.x - 3, door.z + 7) > 6, 'door outside the circle');
  assert.ok(Math.hypot(out.x - 3, out.z + 7) > Math.hypot(door.x - 3, door.z + 7), 'outside is further out');
}
console.log('huizen.test ok');
