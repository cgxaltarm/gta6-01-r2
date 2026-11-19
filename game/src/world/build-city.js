// Builds VELAMAR's sunlit coastal city from reusable primitive geometry.
// Roads, sidewalks, buildings, palms, the ocean and distant hills form a readable skyline.
import * as THREE from '../../vendor/three.module.min.js';
import { BEACH_X, BLOCK, CITY_SPAN, GRID, HILLS_X, LANE, ROAD_HALF, ROAD_X, ROAD_Z, SEA_FLOOR, planCity } from './city-plan.js';
import { makePalm } from '../entities/actors.js';
import { SeededRng } from '../core/rng.js';

const mat = (color, roughness = .85, metalness = .02) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const palette = [0xb9a28a, 0xc8b69b, 0x9f9a87, 0xd2b999, 0x879496, 0xd0c8b4, 0xa78365, 0xb0b8ae];
const glass = new THREE.MeshStandardMaterial({ color: 0x67909a, roughness: .26, metalness: .28, transparent: true, opacity: .68, emissive: 0x172a2b, emissiveIntensity: .1 });

function block(parent, material, position, scale, options = {}) {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = options.cast ?? true; mesh.receiveShadow = true;
  if (options.rotation) mesh.rotation.y = options.rotation;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, material, x, y, z, radiusTop, radiusBottom, height, sides = 8) {
  const mesh = new THREE.Mesh(sides === 8 ? cylinderGeo : new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides), material);
  if (sides === 8) mesh.scale.set(radiusTop, height, radiusBottom);
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}

function makeBuilding(lot, seed) {
  const rng = new SeededRng(seed ^ (lot.gx * 997 + lot.gz * 751));
  const group = new THREE.Group(); group.position.set(lot.x, 0, lot.z);
  const wall = mat(palette[rng.int(palette.length)], .8, lot.glass ? .14 : .02);
  const baseHeight = lot.height;
  block(group, wall, [0, baseHeight / 2, 0], [lot.width, baseHeight, lot.depth]);
  // Each facade has recessed vertical panels, window bands and an alternating warm grid.
  const levels = Math.floor(baseHeight / 3.2);
  const cols = Math.max(3, Math.floor(lot.width / 3.4));
  const windowMatA = new THREE.MeshStandardMaterial({ color: rng.chance(.6) ? 0x8fb2b7 : 0xe0bc8d, roughness: .3, metalness: .2, emissive: 0x1b2a28, emissiveIntensity: .18 });
  const windowMatB = new THREE.MeshStandardMaterial({ color: 0x415e66, roughness: .36, metalness: .18 });
  for (const side of [-1, 1]) {
    for (let floor = 0; floor < levels; floor++) {
      const y = 2.15 + floor * 3.1;
      if (y > baseHeight - 1.1) continue;
      for (let col = 0; col < cols; col++) {
        const x = -lot.width / 2 + (col + .5) * lot.width / cols;
        if (lot.glass) {
          block(group, windowMatB, [side * (lot.width / 2 + .015), y, x * 0], [.03, 2.25, .01], { cast: false });
          block(group, rng.chance(.72) ? windowMatA : windowMatB, [x, y, side * (lot.depth / 2 + .012)], [lot.width / cols * .68, 1.8, .028], { cast: false });
        } else {
          block(group, rng.chance(.63) ? windowMatA : windowMatB, [x, y, side * (lot.depth / 2 + .014)], [lot.width / cols * .62, 1.25, .035], { cast: false });
          block(group, mat(0xeee1cb), [x, y - .78, side * (lot.depth / 2 + .025)], [lot.width / cols * .72, .12, .035], { cast: false });
        }
      }
      // Side facade windows are spaced separately from the front elevation.
      for (let col = 0; col < 2; col++) {
        const z = -lot.depth / 2 + (col + .55) * lot.depth / 2.2;
        block(group, rng.chance(.72) ? windowMatA : windowMatB, [side * (lot.width / 2 + .014), y, z], [.034, 1.45, 1.42], { cast: false });
      }
    }
  }
  const trim = mat(0xe1d2bc, .54, .04);
  block(group, trim, [0, .38, 0], [lot.width + .8, .76, lot.depth + .8], { cast: false });
  block(group, wall, [0, baseHeight + .25, 0], [lot.width + .4, .5, lot.depth + .4]);
  if (lot.rooftop) {
    block(group, mat(0x868a7f), [0, baseHeight + 2.1, 0], [lot.width * .56, 3.2, lot.depth * .58]);
    for (let i = -1; i <= 1; i++) block(group, mat(0x757d7a), [i * lot.width * .2, baseHeight + 4, 0], [lot.width * .05, 1.3, lot.depth * .42]);
    for (const x of [-lot.width * .43, lot.width * .43]) block(group, trim, [x, baseHeight + .75, 0], [.22, 1.4, lot.depth * .9]);
  }
  if (lot.canopy && baseHeight < 30) {
    block(group, mat(0x8f4531), [0, 4.4, lot.depth / 2 + 1], [lot.width + 2, .55, 3]);
    block(group, mat(0xeee1cb), [0, 3.7, lot.depth / 2 + 2.4], [lot.width * .62, .32, .16], { cast: false });
  }
  group.userData.height = baseHeight;
  return group;
}

/** Construct all world landmarks and return their meshes for lighting/collision. */
export function buildCity(scene, seed = 1) {
  const plan = planCity(seed);
  const rng = new SeededRng(seed + 761);
  const world = new THREE.Group(); world.name = 'VelamarWorld'; scene.add(world);
  const grass = mat(0x82976b);
  block(world, grass, [CITY_SPAN / 2, -.62, CITY_SPAN / 2], [CITY_SPAN + 260, 1, CITY_SPAN + 290], { cast: false });

  // Warm sandy land and a cool blue ocean, separated by a curved pale beach.
  block(world, mat(0xd3bc94), [-24, -.25, CITY_SPAN / 2], [75, .48, CITY_SPAN + 360], { cast: false });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3e9baf, roughness: .28, metalness: .11, transparent: true, opacity: .93, emissive: 0x12506a, emissiveIntensity: .22 });
  block(world, waterMat, [SEA_FLOOR - 24, -1.15, CITY_SPAN / 2], [SEA_FLOOR * -1 + BEACH_X, 1.3, CITY_SPAN + 480], { cast: false });
  // Fine turquoise bands follow the shore and catch the low sunlight.
  for (let i = 0; i < 8; i++) {
    const surf = mat(i % 2 ? 0x83c8ca : 0xc6d7c0, .3, .08);
    block(world, surf, [-59 - i * 5.5, -.47 + i * .012, CITY_SPAN / 2], [.45, .045, CITY_SPAN + 340], { cast: false });
  }
  block(world, mat(0xcdb88d), [HILLS_X + 95, -.4, CITY_SPAN / 2], [230, 3, CITY_SPAN + 380], { cast: false });

  // Seven vertical and horizontal corridors form the unmistakable city grid.
  const asphalt = mat(0x3d4244, .96, .01);
  const curb = mat(0xc7b89d);
  const sidewalk = mat(0xd0c5ad);
  const lanePaint = new THREE.MeshStandardMaterial({ color: 0xf4ebd2, roughness: .8, emissive: 0x363127, emissiveIntensity: .08 });
  const amber = mat(0xe2b84e, .55, .04);
  for (const x of ROAD_X) {
    block(world, asphalt, [x, -.17, CITY_SPAN / 2], [ROAD_HALF * 2, .22, CITY_SPAN + 230], { cast: false });
    for (const side of [-1, 1]) {
      block(world, sidewalk, [x + side * (ROAD_HALF + 2.6), -.03, CITY_SPAN / 2], [5.1, .35, CITY_SPAN + 230], { cast: false });
      block(world, curb, [x + side * (ROAD_HALF + .12), .015, CITY_SPAN / 2], [.28, .37, CITY_SPAN + 230], { cast: false });
    }
    for (let z = -100; z < CITY_SPAN + 100; z += 5.8) {
      block(world, lanePaint, [x, -.043, z], [.13, .025, 3.1], { cast: false });
      for (const side of [-1, 1]) block(world, amber, [x + side * .27, -.041, z], [.065, .022, 3.1], { cast: false });
    }
  }
  for (const z of ROAD_Z) {
    block(world, asphalt, [CITY_SPAN / 2, -.17, z], [CITY_SPAN + 190, .22, ROAD_HALF * 2], { cast: false });
    for (const side of [-1, 1]) {
      block(world, sidewalk, [CITY_SPAN / 2, -.03, z + side * (ROAD_HALF + 2.6)], [CITY_SPAN + 190, .35, 5.1], { cast: false });
      block(world, curb, [CITY_SPAN / 2, .015, z + side * (ROAD_HALF + .12)], [CITY_SPAN + 190, .37, .28], { cast: false });
    }
    for (let x = -85; x < CITY_SPAN + 85; x += 5.8) {
      block(world, lanePaint, [x, -.043, z], [3.1, .025, .13], { cast: false });
      for (const side of [-1, 1]) block(world, amber, [x, -.041, z + side * .27], [3.1, .022, .065], { cast: false });
    }
  }
  // Corner crosswalks and storm-drain grates at the intersections.
  for (const x of ROAD_X) for (const z of ROAD_Z) {
    for (let stripe = -3; stripe <= 3; stripe++) {
      block(world, lanePaint, [x + stripe * .82, -.036, z + ROAD_HALF - .8], [.42, .026, 2.6], { cast: false });
      block(world, lanePaint, [x + ROAD_HALF - .8, -.036, z + stripe * .82], [2.6, .026, .42], { cast: false });
    }
  }

  const buildings = [];
  for (const lot of plan.lots) {
    const building = makeBuilding(lot, seed);
    world.add(building); buildings.push(building);
  }
  const palmMeshes = [];
  for (const info of plan.palms) {
    const palm = makePalm(info); palm.position.set(info.x, 0, info.z); world.add(palm); palmMeshes.push(palm);
  }
  // Beachfront palms, low shrubs and street trees soften the sidewalk grid.
  for (let z = 10; z < CITY_SPAN + 10; z += 19) {
    for (const x of [-34, 7]) {
      const palm = makePalm({ size: rng.range(.92, 1.27) }); palm.position.set(x, 0, z + rng.range(-4, 4)); world.add(palm); palmMeshes.push(palm);
    }
  }
  for (const treeInfo of plan.trees) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .27, 2.6, 7), mat(0x74563a)); trunk.position.set(treeInfo.x, 1.3, treeInfo.z); trunk.castShadow = true; world.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.8 * treeInfo.size, 8, 6), mat(0x3d7653)); crown.position.set(treeInfo.x, 3.3, treeInfo.z); crown.scale.y = .8; crown.castShadow = true; world.add(crown);
  }
  // Hills rise at the inland edge as layered green silhouettes.
  for (let i = 0; i < 11; i++) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat([0x477458, 0x5d855d, 0x779263][i % 3]));
    hill.scale.set(rng.range(28, 75), rng.range(28, 68), rng.range(100, 190));
    hill.position.set(HILLS_X + 14 + rng.range(0, 150), hill.scale.y * .44 - 2, i * (CITY_SPAN + 250) / 10 - 130);
    hill.castShadow = true; world.add(hill);
  }
  // Boardwalk pier with timber pylons and a striped pavilion.
  const pierX = -75, pierZ = CITY_SPAN * .46;
  block(world, mat(0x92714e), [pierX, .35, pierZ], [27, .5, 118]);
  for (let z = pierZ - 55; z <= pierZ + 55; z += 11) for (const x of [pierX - 12, pierX + 12]) cylinder(world, mat(0x614831), x, -.5, z, .55, .55, 4.1, 7);
  block(world, mat(0xd8d1bc), [pierX, 6.4, pierZ - 34], [30, .45, 36]);
  for (let i = -2; i <= 2; i++) block(world, mat(i % 2 ? 0xc45540 : 0xe4d8bd), [pierX + i * 5.3, 8.2, pierZ - 34], [5.7, 4.1, 5.7]);
  // Road light poles are restrained to keep the skyline and the sunlight readable.
  const lampMat = mat(0x333a3b, .45, .4);
  for (let x = 0; x < CITY_SPAN; x += BLOCK) for (let z = 0; z < CITY_SPAN; z += BLOCK) {
    for (const [dx, dz] of [[11, 11], [-11, -11]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .13, 7.5, 7), lampMat); pole.position.set(x + dx, 3.75, z + dz); world.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, .09, .09), lampMat); arm.position.set(x + dx + .5, 7.25, z + dz); world.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffdc9b })); bulb.position.set(x + dx + 1, 7.1, z + dz); world.add(bulb);
    }
  }
  return { world, buildings, palms: palmMeshes, plan, bounds: { minX: -150, maxX: CITY_SPAN + 150, minZ: -150, maxZ: CITY_SPAN + 150 } };
}
