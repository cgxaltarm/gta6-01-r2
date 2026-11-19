// VELAMAR browser entry: initialize renderer, world systems, controls and the four deterministic shots.
import * as THREE from '../vendor/three.module.min.js';
import { SeededRng, hashSeed } from './core/rng.js';
import { buildCity } from './world/build-city.js';
import { createEnvironment } from './systems/environment.js';
import { PlayerController } from './systems/player.js';
import { TrafficSystem } from './systems/traffic.js';
import { PedestrianSystem } from './systems/pedestrians.js';
import { MissionSystem } from './systems/missions.js';
import { CameraRig } from './systems/camera-rig.js';
import { Input } from './systems/input.js';
import { Hud } from './ui/hud.js';
import { RespectSystem } from './systems/respect.js';
import { stageScene } from './entities/shot-staging.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const shotMode = ['start', 'drive', 'chase', 'mission'].includes(shotName);
const seedValue = Number(params.get('seed') || 1);
const seed = hashSeed('VELAMAR', Number.isFinite(seedValue) ? seedValue : 1);

const canvas = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

const scene = new THREE.Scene();
const environment = createEnvironment(scene);
const world = buildCity(scene, seed);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .08, 1800);
camera.position.set(99, 7, 113);
const player = new PlayerController(scene, seed);
const traffic = new TrafficSystem(scene, player, seed);
const pedestrians = new PedestrianSystem(scene, seed);
const missions = new MissionSystem(scene, player, seed);
const respect = new RespectSystem(player);
missions.respect = respect;
traffic.respect = respect;
const cameraRig = new CameraRig(camera, player);
const hud = new Hud(player, missions, traffic);
const input = new Input(() => {
  if (hud.titleOpen) startStory();
});

const weaponWheel = document.getElementById('weapon-wheel');
const weaponSegments = weaponWheel ? [...weaponWheel.querySelectorAll('.weapon-segment')] : [];
let weaponWheelOpen = false;

function refreshWeaponWheel() {
  if (!weaponWheel) return;
  weaponWheel.classList.toggle('open', weaponWheelOpen);
  weaponWheel.setAttribute('aria-hidden', weaponWheelOpen ? 'false' : 'true');
  for (const segment of weaponSegments) {
    segment.classList.toggle('active', segment.dataset.weapon === player.weapon);
  }
}

function openWeaponWheel() {
  if (shotMode || weaponWheelOpen) return;
  weaponWheelOpen = true;
  refreshWeaponWheel();
}

function closeWeaponWheel() {
  if (!weaponWheelOpen) return;
  weaponWheelOpen = false;
  refreshWeaponWheel();
}

function selectWeapon(name) {
  if (name === 'Fists') player.setWeapon(0);
  else if (name === 'Pistol') player.setWeapon(1);
  else if (name === 'SMG') player.setWeapon(2);
  refreshWeaponWheel();
  hud.update(elapsed);
}

for (const segment of weaponSegments) {
  segment.addEventListener('click', (event) => {
    event.preventDefault();
    selectWeapon(segment.dataset.weapon);
    closeWeaponWheel();
  });
}

let started = false;
let paused = false;
let elapsed = 0;
let autoSave = 0;
let lastShot = null;

function startStory() {
  if (started) return;
  started = true;
  hud.setTitle(false);
  hud.resetToast('VELAMAR — New Game', 5);
}

function setShot() {
  stageScene(shotName, { scene, player, traffic, pedestrians, missions, cameraRig, seed });
  hud.setShot(shotName);
  started = true;
  lastShot = shotName;
}

if (shotMode) {
  setShot();
  // Give the static shot setup an unimpeded first paint before the render loop begins.
  cameraRig.shotMode = shotName;
} else {
  hud.setTitle(true);
  started = false;
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener('resize', resize);

function syncActions(actions) {
  if (actions.enter) {
    if (player.inCar) {
      player.exitCar();
      hud.resetToast('ON FOOT — stay sharp', 3);
    } else {
      const nearby = traffic.nearestCar(player.position, 4.4);
      if (nearby) {
        traffic.removeTrafficCar(nearby.agent);
        player.enterCar(nearby.agent);
        missions.onEnterVehicle();
        hud.resetToast('VEHICLE ACQUIRED — DRIVE SAFE', 4);
      } else {
        player.enterCar();
        missions.onEnterVehicle();
        hud.resetToast('SOLANO GT — READY TO DRIVE', 3);
      }
    }
  }
  if (actions.fire) {
    if (player.weapon !== 'Fists') {
      traffic.addHeat(player.weapon === 'SMG' ? 2 : 1);
      hud.resetToast(player.weapon === 'SMG' ? 'AUTOMATIC FIRE — POLICE ALERTED' : 'SHOT FIRED — POLICE ALERTED', 3);
    } else {
      traffic.addHeat(1);
      hud.resetToast('A STREET FIGHT — WITNESSES CALL IT IN', 3);
    }
  }
}

function update(dt) {
  elapsed += dt;
  if (!shotMode && !started) {
    if (input.justPressed('enter') || input.justPressed(' ')) startStory();
    player.currentCar.rotation.y = Math.sin(elapsed * .22) * .018;
    player.walker.rotation.y = Math.sin(elapsed * .2) * .025;
    cameraRig.update(dt, input);
    hud.update(elapsed);
    return;
  }
  if (!shotMode) {
    if (input.justPressed('q')) openWeaponWheel();
    if (weaponWheelOpen) {
      if (input.justPressed('escape')) closeWeaponWheel();
      if (input.justReleased('q')) closeWeaponWheel();
      if (input.justPressed('1')) { selectWeapon('Fists'); closeWeaponWheel(); }
      if (input.justPressed('2')) { selectWeapon('Pistol'); closeWeaponWheel(); }
      if (input.justPressed('3')) { selectWeapon('SMG'); closeWeaponWheel(); }
      // Keep world running but block movement/weapon actions while wheel is open.
      traffic.update(dt, elapsed);
      pedestrians.update(dt, elapsed);
      missions.update(dt, elapsed);
      cameraRig.update(dt, input);
      hud.update(elapsed);
      return;
    }

    const actions = player.update(dt, input, world, traffic, elapsed);
    syncActions(actions);
    traffic.update(dt, elapsed);
    pedestrians.update(dt, elapsed);
    missions.update(dt, elapsed);
    cameraRig.update(dt, input);
    autoSave += dt;
    if (autoSave > 22) { player.save(); autoSave = 0; }
    if (input.justPressed('escape')) paused = !paused;
    if (input.justPressed('g')) hud.resetToast('SUNSET MOTORS — upgrades unlock after First Wheels', 4);
  } else {
    // Screenshot scenes remain pixel-stable in camera and framing while prop animation loops.
    if (shotName === 'chase' && traffic.helicopter) {
      traffic.helicopter.model.userData.rotor.rotation.y += dt * 24;
      traffic.helicopter.model.userData.tailRotor.rotation.z += dt * 20;
    }
    if (player.inCar) {
      player.currentCar.position.y = .07 + Math.sin(elapsed * 2) * .012;
      for (const wheel of player.currentCar.userData.wheelMeshes) wheel.rotation.x += dt * 1.2;
    }
  }
  hud.update(elapsed);
}

let previous = performance.now();
function frame(now) {
  const dt = Math.min(.05, Math.max(.001, (now - previous) / 1000));
  previous = now;
  update(dt);
  renderer.render(scene, camera);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose a tiny read-only smoke hook for browser automation and devtools, not game logic.
window.VELAMAR = {
  get state() {
    return {
      started, shot: lastShot, money: player.money, weapon: player.weapon,
      wanted: traffic.heat, inCar: player.inCar, mission: missions.index,
      respect: respect.points, respectLevel: respect.level,
      weaponWheelOpen,
    };
  },
  start: startStory,
  setShot: (name) => { const url = new URL(location.href); url.searchParams.set('shot', name); location.href = url.href; },
  completeMission() {
    missions.complete();
    hud.resetToast(missions.toast, 4);
    hud.updateMission(missions.index);
    hud.update(elapsed);
    return this.state;
  },
  escapeWanted() {
    const prev = traffic.heat;
    traffic.setHeat(0);
    hud.resetToast(prev > 0 ? `ESCAPED ${prev}-STAR HEAT · +60 RESPECT` : 'NO HEAT TO ESCAPE', 4);
    hud.update(elapsed);
    return this.state;
  },
  addRespect(amount = 40) {
    respect.award(amount, 'debug');
    hud.update(elapsed);
    return this.state;
  },
  openWeaponWheel() { openWeaponWheel(); hud.update(elapsed); return this.state; },
  closeWeaponWheel() { closeWeaponWheel(); hud.update(elapsed); return this.state; },
  selectWeapon(name) { selectWeapon(name); return this.state; },
};

document.getElementById('new-game').addEventListener('click', startStory);

// Keep deterministic replay behavior independent from future random game actions.
void new SeededRng(seed);
