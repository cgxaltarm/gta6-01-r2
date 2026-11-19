// Deterministic staging for the four screenshot scenes.
// Each preset places the hero car, supporting traffic, police, the mission beacon
// and a camera that keeps the named subject inside the measured framing bar.
import * as THREE from '../../vendor/three.module.min.js';
import { makeCar, makeHelicopter, makePedestrian, makeRoadblock } from './actors.js';

export function stageScene(name, { scene, player, traffic, pedestrians, missions, cameraRig, seed = 1 }) {
  // Clear the ambient layer that the preset would otherwise obscure.
  for (const unit of [...traffic.police]) scene.remove(unit.model);
  traffic.police.length = 0;
  traffic.removeHelicopter();
  traffic.barriers.forEach(barrier => scene.remove(barrier.model));
  traffic.barriers.length = 0;
  for (const agent of [...traffic.traffic]) traffic.removeTrafficCar(agent);
  for (const person of pedestrians.people) scene.remove(person.model);
  pedestrians.people.length = 0;
  player.walker.visible = true;
  player.currentCar.visible = true;
  missions.beacon.visible = false;

  if (name === 'start') {
    player.setShot('start');
    player.currentCar.position.set(92, .07, 98);
    player.currentCar.rotation.y = 0;
    player.position.set(92, 0, 105);
    player.walker.position.set(92, 0, 105);
    player.walker.rotation.y = 0;
    player.walker.visible = true;
    stagePedestrian(pedestrians, 50, 0, 86, 0);
    stagePedestrian(pedestrians, 41, 0, 112, 1);
    stageParked(traffic, 0x4b7f86, 73, 91, Math.PI / 2);
    stageParked(traffic, 0xe4b55a, 111, 111, -Math.PI / 2);
    stageLamp(scene, 82, 90);
    cameraRig.stageShot('start', scene, traffic, missions);
  } else if (name === 'drive') {
    player.setShot('drive');
    player.position.set(1, 0, 205);
    player.carHeading = 0;
    player.currentCar.position.set(1, .07, 205);
    player.currentCar.rotation.y = 0;
    player.walker.visible = false;
    stageParked(traffic, 0xe3b356, 12.2, 254, 0, true);
    stageParked(traffic, 0x3f727a, 33, 204, Math.PI, true);
    stagePedestrian(pedestrians, 22, 0, 188, 2);
    cameraRig.stageShot('drive', scene, traffic, missions);
  } else if (name === 'chase') {
    player.setShot('chase');
    // Player car on the boulevard, fleeing north (-z) with the camera behind and above.
    player.position.set(92, 0, 274);
    player.carHeading = 0;
    player.currentCar.position.set(92, .07, 274);
    player.currentCar.rotation.y = 0;
    player.walker.visible = false;
    // Wanted state must be consistent: 5 stars in HUD and in game state.
    player.wanted = 5;
    traffic.heat = 5;
    traffic.lastWantedNotice = 1e9;

    // Two police cruisers trail close behind/sides of the player, both in frame.
    stagePolice(traffic, scene, {
      id: 70001, x: 88.7, z: 273.2, heading: 0.08, siren: 0.2,
    });
    stagePolice(traffic, scene, {
      id: 70002, x: 96.1, z: 275.4, heading: -0.06, siren: 1.1,
    });

    // Helicopter in the upper sky, offset to the side so the full silhouette
    // (body, tail, rotors) reads clearly without covering the road/city.
    // Positioned fully in frame with margin from top edge, moderate scale.
    stageHelicopter(traffic, scene, {
      x: 96.8, y: 9.4, z: 256, heading: 0.45, scale: 2.2,
    });

    cameraRig.stageShot('chase', scene, traffic, missions);
  } else if (name === 'mission') {
    player.setShot('mission');
    player.position.set(184, 0, 188);
    player.walker.position.set(184, 0, 188);
    player.walker.visible = true;
    player.currentCar.position.set(184, .07, 172);
    player.currentCar.rotation.y = 0;
    missions.setMission(1);
    missions.beacon.visible = true;
    missions.beacon.position.set(184, 0, 164);
    stagePedestrian(pedestrians, 14, 0, 179, 3);
    stageParked(traffic, 0x2f5d68, 195, 153, 0, true);
    cameraRig.stageShot('mission', scene, traffic, missions);
  }
}

function stagePedestrian(pedestrians, seed, x, z, outfit) {
  const model = makePedestrian({ outfit, skin: seed % 4, seed });
  model.position.set(x, 0, z);
  model.rotation.y = Math.PI / 2;
  pedestrians.scene.add(model);
  pedestrians.people.push({ id: seed, model, along: z, speed: 0, phase: seed });
}

function stageParked(traffic, color, x, z, heading, driving = false) {
  const model = makeCar({ color, seed: color % 9999, compact: color % 2 === 0 });
  model.position.set(x, .07, z);
  model.rotation.y = heading;
  traffic.scene.add(model);
  traffic.traffic.push({ id: 90000 + color, axis: 'z', road: x, direction: 1, lane: 0, distance: z, speed: 0, cruise: 0, model, color });
}

function stagePolice(traffic, scene, { id, x, z, heading = 0, siren = 0 }) {
  const model = makeCar({ color: 0xffffff, police: true, seed: id });
  model.position.set(x, .07, z);
  model.rotation.y = heading;
  scene.add(model);
  traffic.police.push({ id, axis: 'z', road: 92, direction: 1, lane: 0, distance: z, speed: 0, cruise: 0, model, sirenPhase: siren });
}

function stageHelicopter(traffic, scene, { x, y, z, heading = 0.2, scale = 1.6 }) {
  const model = makeHelicopter();
  model.position.set(x, y, z);
  model.rotation.y = heading;
  model.scale.setScalar(scale);
  scene.add(model);
  traffic.helicopter = { model, phase: .3, orbit: 0 };
}

function stageLamp(scene, x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.11, .16, 8, 8), new THREE.MeshStandardMaterial({ color: 0x353c3b }));
  pole.position.set(x, 4, z); scene.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.23, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a5 }));
  bulb.position.set(x, 8.1, z); scene.add(bulb);
}
