// Small procedural character and vehicle models made entirely from Three.js geometry.
// Each silhouette is assembled from distinct meshes so a glance reads a person,
// a civilian sedan, a patrol car or a helicopter instead of a coloured block.
import * as THREE from '../../vendor/three.module.min.js';
import { SeededRng } from '../core/rng.js';

const MAT = (color, roughness = .72, metalness = .04) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const shared = {
  tire: MAT(0x202426), rubber: MAT(0x17191a), glass: new THREE.MeshStandardMaterial({ color: 0x9bb8b8, roughness: .26, metalness: .12, transparent: true, opacity: .84 }),
  chrome: MAT(0xbfc2bc, .31, .65), skin: MAT(0xd5a77e), pants: MAT(0x243441), shirt: MAT(0xe5e0d3), hair: MAT(0x30271f),
  black: MAT(0x151a20), white: MAT(0xf1eee4), red: MAT(0xb9352f), blue: MAT(0x245a82), gold: MAT(0xb9833d, .3, .55),
};
const sphere = new THREE.SphereGeometry(1, 12, 10);
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);

function addBox(parent, material, x, y, z, sx, sy, sz, geometry = box) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, material, x, y, z, radius, height, radial = 10, rotationX = 0) {
  const mesh = new THREE.Mesh(radial === 12 ? cylinder : new THREE.CylinderGeometry(radius, radius, height, radial), material);
  if (radial === 12) mesh.scale.set(radius, height, radius);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotationX;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Humanoid with distinct head, torso and articulated legs, colored streetwear. */
export function makePedestrian({ outfit = 0, skin = 0, female = false, officer = false, seed = 1 } = {}) {
  const rng = new SeededRng(seed);
  const actor = new THREE.Group();
  const outfits = [MAT(0xe0a847), MAT(0x367b79), MAT(0xb85c43), MAT(0xe1d6bb), MAT(0x586c96), MAT(0x7b543c)];
  const shirt = officer ? MAT(0x263849) : outfits[outfit % outfits.length];
  const trousers = officer ? MAT(0x172430) : [MAT(0x293644), MAT(0x46514c), MAT(0x292837)][outfit % 3];
  const skinMat = [MAT(0xe8bd98), MAT(0xc98d69), MAT(0x88583e), MAT(0xf1ceaa)][skin % 4];
  const head = new THREE.Mesh(sphere, skinMat);
  head.scale.set(.135, .16, .13); head.position.y = 1.53; head.castShadow = true; actor.add(head);
  const torso = addBox(actor, shirt, 0, 1.14, 0, .38, .48, .22);
  torso.rotation.z = rng.range(-.05, .05);
  // Neck and shoulders give the figure a grounded, human silhouette.
  addCylinder(actor, skinMat, 0, 1.39, 0, .06, .08, 8);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = addBox(actor, shirt, side * .245, 1.17, 0, .12, .43, .14);
    arm.rotation.z = side * -.12;
    const hand = new THREE.Mesh(sphere, skinMat); hand.scale.set(.065, .075, .065); hand.position.set(side * .25, .93, 0); actor.add(hand);
    const leg = new THREE.Group(); leg.position.set(side * .095, .89, 0); actor.add(leg);
    addBox(leg, trousers, 0, -.23, 0, .14, .46, .16);
    addBox(leg, MAT(0xc0a286), 0, -.48, .07, .15, .10, .28);
    arms.push({ arm, leg, side });
  }
  if (officer) {
    addBox(actor, shared.black, 0, 1.38, -.005, .27, .04, .24);
    addBox(actor, shared.gold, .1, 1.16, .115, .035, .045, .012);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.14, .15, .08, 12), shared.black); cap.position.set(0, 1.68, 0); actor.add(cap);
    addBox(actor, shared.black, 0, 1.62, .02, .26, .025, .2);
  } else {
    const hair = new THREE.Mesh(sphere, MAT([0x3a2d24, 0x2c201d, 0x463d35, 0x171719][rng.int(4)]));
    hair.scale.set(.139, .09, .14); hair.position.set(0, 1.63, -.012); actor.add(hair);
  }
  actor.userData.walkParts = arms;
  actor.userData.height = 1.72;
  return actor;
}

/** Low-poly coastal sedan with four separate rubber wheels, cabin and lit lamps. */
export function makeCar({ color = 0xc35a3c, police = false, seed = 1, compact = false } = {}) {
  const rng = new SeededRng(seed);
  const group = new THREE.Group();
  const bodyMat = police ? shared.white : MAT(color, .27, .34);
  const length = compact ? 3.9 : 4.55;
  const width = compact ? 1.72 : 1.88;
  addBox(group, bodyMat, 0, .66, 0, width, .51, length);
  addBox(group, bodyMat, 0, .98, -.18, width * .79, .46, length * .48);
  const cabin = addBox(group, shared.glass, 0, 1.01, -.18, width * .74, .34, length * .43);
  cabin.material = shared.glass;
  // Window pillars remain visible, so the windscreen reads as glazing rather than a solid roof.
  for (const side of [-1, 1]) {
    addBox(group, bodyMat, side * width * .38, 1.02, -.18, .075, .38, length * .47);
    addBox(group, bodyMat, side * width * .38, .96, .48, .075, .35, .065);
  }
  addBox(group, bodyMat, 0, 1.24, -.22, width * .66, .07, length * .35);
  const wheelGeometry = new THREE.CylinderGeometry(.31, .31, .19, 12);
  for (const x of [-width * .51, width * .51]) {
    for (const z of [-length * .31, length * .31]) {
      const wheel = new THREE.Mesh(wheelGeometry, shared.tire);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .38, z); wheel.castShadow = true; group.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .195, 8), shared.chrome);
      hub.rotation.z = Math.PI / 2; hub.position.set(x * 1.01, .38, z); group.add(hub);
    }
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1c3, emissive: 0xffc45d, emissiveIntensity: 1.1 });
  for (const x of [-.57, .57]) {
    addBox(group, lampMat, x, .75, -length * .51, .27, .12, .045);
    addBox(group, MAT(0xa9332d), x, .7, length * .51, .24, .11, .04);
  }
  addBox(group, shared.black, 0, .37, -length * .51, width * .85, .12, .11);
  addBox(group, shared.black, 0, .38, length * .51, width * .82, .12, .11);
  if (police) {
    addBox(group, shared.black, 0, .72, .09, width * 1.01, .24, length * .41);
    const beaconRed = new THREE.MeshStandardMaterial({ color: 0xff3a28, emissive: 0xff1600, emissiveIntensity: 2 });
    const beaconBlue = new THREE.MeshStandardMaterial({ color: 0x448dff, emissive: 0x164cff, emissiveIntensity: 2 });
    addBox(group, beaconRed, -.3, 1.31, -.2, .24, .09, .11);
    addBox(group, beaconBlue, .3, 1.31, -.2, .24, .09, .11);
    addBox(group, shared.white, 0, .8, -.4, .22, .16, .025);
    group.userData.kind = 'police';
  } else {
    addBox(group, MAT(0xd9d3c0), 0, .73, -.27, .29, .19, .015);
  }
  group.userData.wheelMeshes = group.children.filter(child => child.geometry === wheelGeometry);
  group.userData.length = length;
  return group;
}

/** Distinct patrol helicopter with long rotor blades and a tail boom. */
export function makeHelicopter() {
  const group = new THREE.Group();
  const dark = MAT(0x27343c, .46, .15);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x83a2a4, roughness: .2, metalness: .12 });
  const fuselage = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), shared.white);
  fuselage.scale.set(1.15, .55, 1.85); fuselage.position.y = 0; fuselage.castShadow = true; group.add(fuselage);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), windowMat);
  cockpit.scale.set(.93, .41, .74); cockpit.position.set(0, .1, -1.28); group.add(cockpit);
  const tail = addBox(group, shared.white, 0, .1, 2.55, .17, .17, 2.7);
  const fin = addBox(group, shared.white, 0, .4, 3.58, .13, .77, .42);
  addBox(group, dark, .08, .15, 3.72, .06, .54, .58);
  const rotorHub = new THREE.Group(); rotorHub.position.y = .62; group.add(rotorHub);
  addCylinder(rotorHub, shared.black, 0, 0, 0, .1, .23, 8);
  for (let i = 0; i < 4; i++) {
    const blade = addBox(rotorHub, dark, 0, .035, 0, .17, .045, 6.35);
    blade.rotation.y = i * Math.PI / 2;
  }
  const tailRotor = new THREE.Group(); tailRotor.position.set(.22, .28, 3.72); group.add(tailRotor);
  for (let i = 0; i < 2; i++) {
    const blade = addBox(tailRotor, dark, 0, 0, 0, .11, .12, 1.2); blade.rotation.z = i * Math.PI / 2;
  }
  for (const side of [-1, 1]) {
    const skid = addBox(group, dark, side * .95, -.65, .1, .12, .09, 3.05);
    addBox(group, dark, side * .8, -.45, .05, .09, .51, .12);
  }
  const red = new THREE.MeshStandardMaterial({ color: 0xff4f39, emissive: 0xff2614, emissiveIntensity: 1.8 });
  const green = new THREE.MeshStandardMaterial({ color: 0x52ffb0, emissive: 0x18cc70, emissiveIntensity: 1.5 });
  const lightA = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), red); lightA.position.set(-.85, .07, 0); group.add(lightA);
  const lightB = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), green); lightB.position.set(.85, .07, 0); group.add(lightB);
  group.userData.rotor = rotorHub;
  group.userData.tailRotor = tailRotor;
  group.userData.fuselage = fuselage;
  group.userData.dimensions = { width: 12.7, length: 8 };
  return group;
}

/** A triangular roadblock barrier with reflective strips. */
export function makeRoadblock() {
  const group = new THREE.Group();
  addBox(group, MAT(0x303b3e), 0, .5, 0, 5.6, .85, .32);
  addBox(group, MAT(0xf2c052), 0, .5, -.18, 5.4, .7, .12);
  for (let x = -2.1; x <= 2.1; x += .7) {
    const stripe = addBox(group, shared.white, x, .5, -.25, .24, .72, .035);
    stripe.rotation.z = -.32;
  }
  for (const x of [-2.4, 2.4]) {
    const leg = addBox(group, MAT(0x343a39), x, .2, 0, .15, .6, .17);
    leg.rotation.z = x < 0 ? -.2 : .2;
  }
  return group;
}

export function makePalm({ size = 1 } = {}) {
  const group = new THREE.Group();
  const bark = MAT(0x806041);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.11 * size, .22 * size, 3.4 * size, 7), bark);
  trunk.position.y = 1.7 * size; trunk.rotation.z = -.07; trunk.castShadow = true; group.add(trunk);
  const crown = MAT(0x1d654e);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(.22 * size, 2.7 * size, 5), crown);
    leaf.position.y = 3.25 * size; leaf.rotation.z = Math.PI / 2.8; leaf.rotation.y = (i / 7) * Math.PI * 2; leaf.scale.set(1, 1, .4); leaf.castShadow = true; group.add(leaf);
  }
  return group;
}
