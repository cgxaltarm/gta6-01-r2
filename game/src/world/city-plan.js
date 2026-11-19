// The road network of VELAMAR, laid out as a coastal grid.
// Blocks are 92 units apart, two lanes each way, with a beach road running
// along the water on the west side and a hill road climbing to the east.
import { SeededRng } from '../core/rng.js';

export const ROAD_HALF = 7.2;
export const LANE = 3.3;
export const BLOCK = 92;
export const GRID = 7;
export const CITY_SPAN = BLOCK * (GRID - 1);

export const ROAD_X = Array.from({ length: GRID }, (_, i) => i * BLOCK);
export const ROAD_Z = Array.from({ length: GRID }, (_, i) => i * BLOCK);

export const BEACH_X = -38;
export const SEA_FLOOR = -118;
export const HILLS_X = GRID * BLOCK + 25;

export function isOnRoad(x, z) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) < ROAD_HALF) return true;
  for (const rz of ROAD_Z) if (Math.abs(z - rz) < ROAD_HALF) return true;
  return false;
}

export function nearestRoad(x, z) {
  let bestX = ROAD_X[0];
  for (const rx of ROAD_X) if (Math.abs(x - rx) < Math.abs(x - bestX)) bestX = rx;
  let bestZ = ROAD_Z[0];
  for (const rz of ROAD_Z) if (Math.abs(z - rz) < Math.abs(z - bestZ)) bestZ = rz;
  if (Math.abs(x - bestX) < Math.abs(z - bestZ)) return { x: bestX, z, axis: 'z', along: z };
  return { x, z: bestZ, axis: 'x', along: x };
}

const NAMES_X = ['CALLE DEL SOL', 'AVENIDA MAR', 'PALM ROW', 'SUNSET BOULEVARD', 'CORAL WAY', 'BLUFF DRIVE', 'EASTBANK ROAD'];
const NAMES_Z = ['PIER STREET', 'SHORELINE AVENUE', 'LAGOON LANE', 'HARBOR MILE', 'CITRUS COURT', 'CLIFFSIDE AVENUE', 'THE RIDGE'];

export const STREET_NAMES = { x: NAMES_X, z: NAMES_Z };

/** Builds the static city plan: building lots, sidewalk trees, palms and landmarks. */
export function planCity(seed = 1) {
  const rng = new SeededRng(seed);
  const lots = [];
  const trees = [];
  const lamps = [];
  const palms = [];
  for (let gx = 0; gx < ROAD_X.length - 1; gx++) {
    for (let gz = 0; gz < ROAD_Z.length - 1; gz++) {
      const x0 = ROAD_X[gx] + ROAD_HALF + 3.6;
      const x1 = ROAD_X[gx + 1] - ROAD_HALF - 3.6;
      const z0 = ROAD_Z[gz] + ROAD_HALF + 3.6;
      const z1 = ROAD_Z[gz + 1] - ROAD_HALF - 3.6;
      const ocean = gx <= 0;
      const ring = Math.max(Math.abs(gx - 3), Math.abs(gz - 3));
      const downtown = gx >= 2 && gx <= 4 && gz >= 2 && gz <= 4;
      const height = downtown ? rng.range(22, 70) : ring >= 3 ? rng.range(10, 28) : rng.range(16, 45);
      const depth = rng.range(22, 33);
      const width = rng.range(24, 36);
      const midX = (x0 + x1) / 2;
      const midZ = (z0 + z1) / 2;
      const palette = downtown ? 0 : ring >= 3 ? 2 : 1;
      const floors = Math.max(3, Math.round(height / 3.6));
      lots.push({
        gx, gz, x: midX, z: midZ, width, depth,
        height: height,
        floors,
        palette,
        ocean,
        rooftop: rng.chance(0.48),
        rooftopHeight: rng.range(2.4, 6.5),
        glass: rng.chance(downtown ? 0.6 : 0.2),
        accent: rng.sign(),
        canopy: rng.chance(0.33),
      });
      if (!ocean) {
        for (let i = 0; i < 3; i++) {
          palms.push({ x: x0 + rng.range(1.5, 4), z: z0 + rng.range(2, 8), size: rng.range(0.8, 1.4) });
          palms.push({ x: x1 - rng.range(1.5, 4), z: z1 - rng.range(2, 8), size: rng.range(0.8, 1.4) });
        }
      }
    }
  }
  for (const rx of ROAD_X) {
    for (const rz of ROAD_Z) {
      lamps.push({ x: rx + ROAD_HALF + 1.8, z: rz + ROAD_HALF + 1.8 });
      lamps.push({ x: rx - ROAD_HALF - 1.8, z: rz - ROAD_HALF - 1.8 });
    }
  }
  for (let x = -20; x < CITY_SPAN + 20; x += 13) trees.push({ x: x + rng.range(-3, 3), z: -27 + rng.range(-2, 2), size: rng.range(.9, 1.5) });
  return { lots, palms, lamps, trees };
}

export const LANDMARKS = {
  pier: { x: -48, z: 300, icon: '◆', name: 'OLD PIER' },
  marina: { x: 1, z: 1, icon: '⚓', name: 'MARINA' },
  arena: { x: 520, z: 145, icon: '◈', name: 'VELAMAR ARENA' },
  garage: { x: 310, z: 430, icon: '⊞', name: 'SUNSET MOTORS' },
  precinct: { x: 590, z: 292, icon: '✦', name: 'PRECINCT 7' },
};
