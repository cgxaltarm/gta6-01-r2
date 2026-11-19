// Third-person walker and drivable coupe controller with deterministic screenshot setups.
import * as THREE from '../../vendor/three.module.min.js';
import { clamp, damp, shortestAngle } from '../core/rng.js';
import { isOnRoad, nearestRoad, ROAD_HALF, LANE, ROAD_X, ROAD_Z } from '../world/city-plan.js';
import { makeCar, makePedestrian } from '../entities/actors.js';

const WALK_SPEED = 7.3;
const SPRINT_SPEED = 11.8;
const CAR_ACCEL = 20;
const CAR_BRAKE = 29;
const CAR_MAX = 47;

export class PlayerController {
  constructor(scene, seed = 1) {
    this.scene = scene;
    this.position = new THREE.Vector3(92, 0, 102);
    this.velocity = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.money = 250;
    this.weapon = 'Pistol';
    this.wanted = 0;
    this.inCar = false;
    this.car = null;
    this.walker = makePedestrian({ outfit: 0, skin: 0, seed });
    this.walker.position.copy(this.position);
    scene.add(this.walker);
    this.currentCar = makeCar({ color: 0xc95639, seed, compact: false });
    this.currentCar.position.set(92, .07, 98);
    scene.add(this.currentCar);
    this.carHeading = 0;
    this.radioStation = 0;
    this.keys = new Set();
    this.sprint = false;
    this.carHitTimer = 0;
    this.actions = { fire: false, enter: false, weapon: null };
    this.respect = 0;
    this.load();
  }

  get visual() { return this.inCar ? this.currentCar : this.walker; }

  enterCar(carAgent = null) {
    if (this.inCar) return this.exitCar();
    if (carAgent) {
      this.scene.remove(this.currentCar);
      this.currentCar = carAgent.model;
      this.carHeading = this.currentCar.rotation.y;
    }
    this.inCar = true;
    this.car = carAgent;
    this.speed = 0;
    this.walker.visible = false;
    this.currentCar.visible = true;
    this.position.set(this.currentCar.position.x, 0, this.currentCar.position.z);
    this.save();
    return true;
  }

  exitCar() {
    if (!this.inCar) return false;
    this.inCar = false;
    this.car = null;
    this.currentCar.visible = true;
    const side = new THREE.Vector3(Math.cos(this.carHeading), 0, Math.sin(this.carHeading)).multiplyScalar(2.35);
    this.position.set(this.currentCar.position.x + side.x, 0, this.currentCar.position.z + side.z);
    this.walker.position.copy(this.position);
    this.walker.visible = true;
    this.speed = 0;
    this.save();
    return true;
  }

  setWeapon(index) {
    this.weapon = ['Fists', 'Pistol', 'SMG'][index] || this.weapon;
  }

  cycleRadio() { this.radioStation = (this.radioStation + 1) % 3; }

  update(dt, input, world, traffic, time) {
    this.actions = { fire: false, enter: false, weapon: null };
    if (input.justPressed('e')) this.actions.enter = true;
    if (input.justPressed('1')) this.setWeapon(0);
    if (input.justPressed('2')) this.setWeapon(1);
    if (input.justPressed('3')) this.setWeapon(2);
    if (input.justPressed('r')) this.cycleRadio();
    if (input.justPressed('f')) this.save();
    if (input.justPressed(' ') || input.justPressed('mouse0')) this.actions.fire = true;
    this.sprint = input.down('shift');
    if (this.inCar) this.updateDriving(dt, input, world, time);
    else this.updateWalking(dt, input, world, time);
    this.resolveBounds(world);
    return this.actions;
  }

  updateWalking(dt, input, world, time) {
    const forward = Number(input.down('w') || input.down('arrowup')) - Number(input.down('s') || input.down('arrowdown'));
    const strafe = Number(input.down('d') || input.down('arrowright')) - Number(input.down('a') || input.down('arrowleft'));
    const axis = new THREE.Vector2(strafe, forward);
    if (axis.lengthSq() > 1) axis.normalize();
    const targetSpeed = this.sprint ? SPRINT_SPEED : WALK_SPEED;
    const move = new THREE.Vector3(axis.x, 0, -axis.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    const target = move.multiplyScalar(targetSpeed);
    this.velocity.x = damp(this.velocity.x, target.x, axis.lengthSq() ? 13 : 8, dt);
    this.velocity.z = damp(this.velocity.z, target.z, axis.lengthSq() ? 13 : 8, dt);
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    const movement = Math.hypot(this.velocity.x, this.velocity.z);
    if (movement > .4) {
      const desired = Math.atan2(this.velocity.x, this.velocity.z);
      this.heading += shortestAngle(this.heading, desired) * Math.min(1, dt * 8);
    }
    this.walker.position.set(this.position.x, Math.abs(Math.sin(time * (this.sprint ? 13 : 9))) * .04 * (movement > .4), this.position.z);
    this.walker.rotation.y = this.heading;
    for (const part of this.walker.userData.walkParts || []) {
      part.leg.rotation.x = Math.sin(time * (this.sprint ? 12 : 8)) * .42 * Math.min(1, movement / 2);
      part.arm.rotation.x = -part.leg.rotation.x * .55;
    }
    this.currentCar.position.y = .07 + Math.sin(time * 2) * .008;
  }

  updateDriving(dt, input, world, time) {
    const throttle = Number(input.down('w') || input.down('arrowup'));
    const reverse = Number(input.down('s') || input.down('arrowdown'));
    const steer = Number(input.down('d') || input.down('arrowright')) - Number(input.down('a') || input.down('arrowleft'));
    const max = this.sprint ? CAR_MAX : CAR_MAX * .72;
    if (throttle) this.speed = Math.min(max, this.speed + CAR_ACCEL * dt);
    else if (reverse) this.speed = Math.max(-13, this.speed - CAR_BRAKE * dt);
    else this.speed = damp(this.speed, 0, 1.7, dt);
    const grip = isOnRoad(this.position.x, this.position.z) ? 1 : .6;
    const steerRate = (.45 + Math.min(1, Math.abs(this.speed) / 13)) * grip;
    this.carHeading -= steer * steerRate * dt * Math.sign(this.speed || 1);
    const direction = new THREE.Vector3(Math.sin(this.carHeading), 0, -Math.cos(this.carHeading));
    this.position.addScaledVector(direction, this.speed * dt);
    this.currentCar.position.set(this.position.x, .07 + Math.sin(time * 2 + this.speed) * .012, this.position.z);
    this.currentCar.rotation.y = this.carHeading;
    for (const wheel of this.currentCar.userData.wheelMeshes || []) {
      wheel.rotation.x += this.speed * dt * 1.55;
      wheel.rotation.z = steer * .24;
    }
  }

  resolveBounds(world) {
    const b = world.bounds;
    this.position.x = clamp(this.position.x, b.minX + 4, b.maxX - 4);
    this.position.z = clamp(this.position.z, b.minZ + 4, b.maxZ - 4);
    if (!this.inCar) this.walker.position.set(this.position.x, this.walker.position.y, this.position.z);
    if (this.inCar) this.currentCar.position.set(this.position.x, this.currentCar.position.y, this.position.z);
  }

  save() {
    const state = {
      x: this.position.x, z: this.position.z, heading: this.heading,
      money: this.money, weapon: this.weapon, radio: this.radioStation,
      respect: Number.isFinite(this.respect) ? this.respect : 0,
    };
    try { localStorage.setItem('velamar-save', JSON.stringify(state)); } catch {}
    this.savedAt = Date.now();
  }

  load() {
    try {
      const state = JSON.parse(localStorage.getItem('velamar-save') || 'null');
      if (state && Number.isFinite(state.x) && Number.isFinite(state.z)) {
        this.position.set(state.x, 0, state.z); this.heading = state.heading || 0;
        this.money = state.money || 250; this.weapon = state.weapon || 'Pistol'; this.radioStation = state.radio || 0;
        this.respect = Number.isFinite(state.respect) ? state.respect : 0;
      }
    } catch {}
  }

  setShot(name) {
    const presets = {
      start: { position: [92, 0, 105], heading: 0, inCar: false, car: [92, .07, 98], carHeading: 0, money: 0, weapon: 'Fists', wanted: 0 },
      drive: { position: [1, 0, 202], heading: 0, inCar: true, car: [1, .07, 202], carHeading: 0, money: 250, weapon: 'Pistol', wanted: 0 },
      chase: { position: [92, 0, 277], heading: 0, inCar: true, car: [92, .07, 277], carHeading: 0, money: 800, weapon: 'SMG', wanted: 5 },
      mission: { position: [184, 0, 194], heading: 0, inCar: false, car: [184, .07, 190], carHeading: 0, money: 100, weapon: 'Fists', wanted: 0 },
    };
    const p = presets[name];
    if (!p) return;
    this.position.set(...p.position); this.heading = p.heading; this.inCar = p.inCar;
    this.currentCar.position.set(...p.car); this.carHeading = p.carHeading; this.currentCar.rotation.y = p.carHeading;
    this.walker.position.copy(this.position); this.walker.visible = !p.inCar; this.currentCar.visible = true;
    this.money = p.money; this.weapon = p.weapon; this.wanted = p.wanted;
    this.speed = name === 'drive' ? 32 : name === 'chase' ? 25 : 0;
  }
}
