// Civilian traffic, police response and roadblocks, driven by lightweight lane agents.
import * as THREE from '../../vendor/three.module.min.js';
import { SeededRng, clamp } from '../core/rng.js';
import { BLOCK, GRID, LANE, ROAD_HALF, ROAD_X, ROAD_Z } from '../world/city-plan.js';
import { makeCar, makeHelicopter, makeRoadblock } from '../entities/actors.js';

const TRAFFIC_COLORS = [0x3a7885, 0xe2b35d, 0xb94e3c, 0x45545c, 0xd7d1c0, 0x6f7956, 0x7f4c54, 0xc9d4d1];
const BODY_COLORS = [0x202a30, 0x34424a, 0x5a4034, 0x74705f, 0x25383a];

export class TrafficSystem {
  constructor(scene, player, seed = 1) {
    this.scene = scene;
    this.player = player;
    this.rng = new SeededRng(seed ^ 0x1a4c9);
    this.traffic = [];
    this.police = [];
    this.barriers = [];
    this.helicopter = null;
    this.heat = 0;
    this.clock = 0;
    this.spawnTimer = 0;
    this.blockadeTimer = 0;
    this.lastWantedNotice = 0;
    this.dispatch = [];
    this.respect = null;
    this.makeInitialTraffic();
  }

  makeInitialTraffic() {
    for (let i = 0; i < 24; i++) this.spawnTraffic(i);
  }

  spawnTraffic(index = this.traffic.length) {
    const rng = this.rng;
    const axis = rng.chance(.52) ? 'z' : 'x';
    const road = rng.pick(axis === 'z' ? ROAD_X : ROAD_Z);
    const direction = rng.sign();
    const lane = direction > 0 ? LANE : -LANE;
    const distance = rng.range(-90, BLOCK * (GRID - 1) + 90);
    const color = TRAFFIC_COLORS[index % TRAFFIC_COLORS.length];
    const model = makeCar({ color, seed: rng.int(100000), compact: rng.chance(.36) });
    this.scene.add(model);
    const agent = { id: index, axis, road, direction, lane, distance, speed: rng.range(8, 18), cruise: rng.range(13, 21), model, color, phase: rng.range(0, Math.PI * 2) };
    this.traffic.push(agent);
    this.placeTraffic(agent);
    return agent;
  }

  placeTraffic(agent) {
    const { axis, road, lane, distance, model } = agent;
    if (axis === 'z') {
      model.position.set(road + lane, .07, distance);
      model.rotation.y = agent.direction > 0 ? Math.PI : 0;
    } else {
      model.position.set(distance, .07, road - lane);
      model.rotation.y = agent.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  spawnPolice(index, position = null) {
    const rng = this.rng;
    const axis = rng.chance(.5) ? 'z' : 'x';
    const road = rng.pick(axis === 'z' ? ROAD_X : ROAD_Z);
    const direction = rng.sign();
    const lane = direction > 0 ? LANE : -LANE;
    const playerPos = this.player.position;
    let distance = rng.range(-38, 38);
    if (!position) {
      if (axis === 'z') distance += playerPos.z + direction * 76;
      else distance += playerPos.x + direction * 76;
    }
    const model = makeCar({ color: 0xffffff, police: true, seed: rng.int(9999) });
    this.scene.add(model);
    const officer = { id: index, axis, road, direction, lane, distance, speed: 0, cruise: 25 + this.heat * 1.5, model, sirenPhase: rng.range(0, 1) };
    this.police.push(officer);
    this.placePolice(officer, position);
    return officer;
  }

  placePolice(agent, fixed = null) {
    if (fixed) {
      agent.model.position.set(fixed.x, .07, fixed.z);
      agent.model.rotation.y = fixed.heading ?? 0;
      return;
    }
    const { axis, road, lane, distance, model } = agent;
    if (axis === 'z') {
      model.position.set(road + lane, .07, distance);
      model.rotation.y = agent.direction > 0 ? Math.PI : 0;
    } else {
      model.position.set(distance, .07, road - lane);
      model.rotation.y = agent.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  setHeat(level) {
    const previous = this.heat;
    const wanted = clamp(Math.round(level), 0, 5);
    if (wanted === this.heat) return;
    if (previous > 0 && wanted === 0 && this.respect) this.respect.onEscapeWanted();
    this.heat = wanted;
    if (wanted > 0) {
      this.player.wanted = wanted;
      this.dispatch.push({ text: wanted >= 4 ? `${wanted}-STAR PURSUIT — HELI DISPATCHED` : `${wanted}-STAR WANTED — UNITS RESPONDING`, time: this.clock });
      while (this.police.length < Math.max(2, wanted)) this.spawnPolice(this.police.length);
      if (wanted >= 4) this.ensureHelicopter();
      else this.removeHelicopter();
      this.syncRoadblocks(wanted >= 3);
    } else {
      this.player.wanted = 0;
      this.removeHelicopter();
      this.syncRoadblocks(false);
    }
  }

  addHeat(amount = 1) {
    this.setHeat(Math.min(5, this.heat + amount));
  }

  clearHeat() {
    this.setHeat(0);
    for (const unit of this.police) this.scene.remove(unit.model);
    this.police.length = 0;
  }

  ensureHelicopter() {
    if (this.helicopter) return;
    const model = makeHelicopter();
    model.position.set(this.player.position.x + 4, 58, this.player.position.z - 33);
    model.rotation.y = -.28;
    this.scene.add(model);
    this.helicopter = { model, phase: .3, orbit: 0 };
  }

  removeHelicopter() {
    if (!this.helicopter) return;
    this.scene.remove(this.helicopter.model);
    this.helicopter = null;
  }

  syncRoadblocks(active) {
    const desired = active ? 2 + Math.floor(this.heat / 2) : 0;
    while (this.barriers.length < desired) {
      const rng = this.rng;
      const model = makeRoadblock();
      const axis = rng.chance(.5) ? 'x' : 'z';
      const road = rng.pick(axis === 'x' ? ROAD_X : ROAD_Z);
      const distance = rng.range(115, BLOCK * (GRID - 1) - 95);
      if (axis === 'x') model.position.set(distance, 0, road - ROAD_HALF + 3);
      else { model.position.set(road + ROAD_HALF - 3, 0, distance); model.rotation.y = Math.PI / 2; }
      this.scene.add(model);
      this.barriers.push({ model, axis, road, distance });
    }
    while (this.barriers.length > desired) {
      const barrier = this.barriers.pop(); this.scene.remove(barrier.model);
    }
  }

  update(dt, time) {
    this.clock = time;
    this.spawnTimer += dt;
    const targetCount = 22 + Math.min(8, this.heat * 2);
    if (this.spawnTimer > 4 && this.traffic.length < targetCount) {
      this.spawnTimer = 0;
      this.spawnTraffic();
    }
    for (const car of this.traffic) {
      const dx = car.axis === 'z' ? this.player.position.x - (car.road + car.lane) : this.player.position.x - car.distance;
      const dz = car.axis === 'z' ? this.player.position.z - car.distance : this.player.position.z - (car.road - car.lane);
      const distance = Math.hypot(dx, dz);
      const braking = distance < 9 && this.player.inCar ? .45 : 1;
      car.speed += (car.cruise * braking - car.speed) * Math.min(1, dt * 1.7);
      car.distance += car.direction * car.speed * dt;
      const max = BLOCK * (GRID - 1) + 130;
      if (car.distance > max) car.distance = -130;
      if (car.distance < -130) car.distance = max;
      this.placeTraffic(car);
      for (const wheel of car.model.userData.wheelMeshes) wheel.rotation.x += car.speed * dt * 1.5;
    }
    for (const unit of this.police) this.updatePolice(unit, dt);
    if (this.helicopter) this.updateHelicopter(dt);
    this.checkCollisions();
    if (this.heat > 0 && time - this.lastWantedNotice > 24 && this.player.inCar) {
      this.setHeat(this.heat - 1); this.lastWantedNotice = time;
    }
    this.updateBarriers(dt, time);
  }

  updatePolice(unit, dt) {
    const target = this.player.position;
    const targetRoadX = ROAD_X.reduce((a, b) => Math.abs(b - target.x) < Math.abs(a - target.x) ? b : a, ROAD_X[0]);
    const targetRoadZ = ROAD_Z.reduce((a, b) => Math.abs(b - target.z) < Math.abs(a - target.z) ? b : a, ROAD_Z[0]);
    const axisDistance = unit.axis === 'z' ? Math.abs(target.z - unit.distance) : Math.abs(target.x - unit.distance);
    if (axisDistance < 34 && this.rng.chance(dt * .3)) {
      unit.axis = unit.axis === 'z' ? 'x' : 'z';
      unit.road = unit.axis === 'z' ? targetRoadX : targetRoadZ;
      unit.direction = (unit.axis === 'z' ? target.z - unit.distance : target.x - unit.distance) >= 0 ? 1 : -1;
      unit.lane = unit.direction > 0 ? LANE : -LANE;
    }
    const goal = unit.axis === 'z' ? target.z : target.x;
    const diff = goal - unit.distance;
    const dirToPlayer = Math.sign(diff) || unit.direction;
    const desired = unit.cruise * (Math.abs(diff) < 15 ? .62 : 1);
    unit.speed += (desired - unit.speed) * Math.min(1, dt * 1.8);
    unit.distance += dirToPlayer * unit.speed * dt;
    unit.direction = dirToPlayer;
    if (unit.axis === 'z') unit.road = targetRoadX;
    else unit.road = targetRoadZ;
    this.placePolice(unit);
    unit.model.userData.wheelMeshes.forEach(wheel => wheel.rotation.x += unit.speed * dt * 1.4);
    const siren = unit.model.children.find((child, index) => index > 12 && child.material?.emissiveIntensity > 1);
    if (siren) siren.material.emissiveIntensity = .45 + Math.abs(Math.sin(this.clock * 9 + unit.sirenPhase)) * 2.4;
  }

  updateHelicopter(dt) {
    const heli = this.helicopter;
    heli.phase += dt * 1.3;
    heli.orbit += dt * .16;
    const player = this.player.position;
    heli.model.position.set(player.x + Math.sin(heli.orbit) * 19, 58 + Math.sin(heli.phase * .7) * 2.2, player.z - 32 + Math.cos(heli.orbit) * 11);
    heli.model.rotation.y = Math.atan2(Math.cos(heli.orbit), Math.sin(heli.orbit)) + .15;
    heli.model.userData.rotor.rotation.y += dt * 25;
    heli.model.userData.tailRotor.rotation.z += dt * 21;
  }

  updateBarriers(dt, time) {
    for (const barrier of this.barriers) {
      barrier.model.children[0].material.color.setHex(Math.sin(time * 3 + barrier.distance) > 0 ? 0xffd466 : 0xc78c39);
    }
  }

  checkCollisions() {
    if (this.player.inCar) {
      for (const agent of this.traffic) {
        const dx = this.player.position.x - agent.model.position.x;
        const dz = this.player.position.z - agent.model.position.z;
        if (dx * dx + dz * dz < 8.5) {
          this.player.velocity.x += dx * .13;
          this.player.velocity.z += dz * .13;
          this.player.speed *= .84;
          this.addHeat(1);
        }
      }
    }
  }

  nearestCar(position, maxDistance = 3.2) {
    let best = null, bestDistance = maxDistance;
    for (const car of this.traffic) {
      const dx = position.x - car.model.position.x, dz = position.z - car.model.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < bestDistance) { best = car; bestDistance = distance; }
    }
    return best ? { agent: best, distance: bestDistance } : null;
  }

  removeTrafficCar(agent) {
    this.scene.remove(agent.model);
    this.traffic = this.traffic.filter(car => car !== agent);
  }

  activeUnits() { return this.police; }
}
