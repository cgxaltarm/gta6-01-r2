// People on the sidewalks: small wandering actors with visible heads, torsos and walking legs.
import * as THREE from '../../vendor/three.module.min.js';
import { SeededRng } from '../core/rng.js';
import { BLOCK, CITY_SPAN, ROAD_HALF, ROAD_X, ROAD_Z } from '../world/city-plan.js';
import { makePedestrian } from '../entities/actors.js';

const SIDEWALK_OFFSET = ROAD_HALF + 3.6;

export class PedestrianSystem {
  constructor(scene, seed = 1) {
    this.scene = scene;
    this.rng = new SeededRng(seed ^ 0x82ef3);
    this.people = [];
    for (let i = 0; i < 34; i++) this.spawn(i);
  }

  spawn(index = this.people.length) {
    const rng = this.rng;
    const horizontal = rng.chance(.5);
    const road = rng.pick(horizontal ? ROAD_Z : ROAD_X);
    const direction = rng.sign();
    const lane = (rng.chance(.5) ? 1 : -1) * SIDEWALK_OFFSET;
    const along = rng.range(0, CITY_SPAN);
    const model = makePedestrian({ outfit: rng.int(6), skin: rng.int(4), seed: rng.int(99999) });
    const scale = rng.range(.91, 1.08);
    model.scale.setScalar(scale);
    const person = { id: index, horizontal, road, lane, along, direction, speed: rng.range(1.1, 2.2), model, phase: rng.range(0, 6), stopped: 0 };
    this.scene.add(model);
    this.people.push(person);
    this.place(person);
    return person;
  }

  place(person) {
    const { horizontal, road, lane, along, direction, model } = person;
    if (horizontal) {
      model.position.set(along, 0, road + lane);
      model.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      model.position.set(road + lane, 0, along);
      model.rotation.y = direction > 0 ? Math.PI : 0;
    }
  }

  update(dt, time) {
    for (const person of this.people) {
      if (person.stopped > 0) {
        person.stopped -= dt;
      } else {
        person.along += person.direction * person.speed * dt;
        const length = CITY_SPAN;
        if (person.along > length + 6) person.along = -6;
        if (person.along < -6) person.along = length + 6;
      }
      this.place(person);
      const walk = Math.sin(time * person.speed * 4.6 + person.phase) * .52;
      const parts = person.model.userData.walkParts;
      if (parts) {
        parts[0].leg.rotation.x = walk;
        parts[1].leg.rotation.x = -walk;
        parts[0].arm.rotation.x = -walk * .65;
        parts[1].arm.rotation.x = walk * .65;
        person.model.position.y = Math.abs(Math.sin(time * person.speed * 4.6 + person.phase)) * .035;
      }
      // Occasionally a pedestrian stops at a corner or turns toward a shopfront.
      if (this.rng.chance(dt * .018)) person.stopped = this.rng.range(1.5, 5);
    }
  }

  nearestPerson(position, maxDistance = 2) {
    let best = null, bestD = maxDistance;
    for (const person of this.people) {
      const distance = Math.hypot(position.x - person.model.position.x, position.z - person.model.position.z);
      if (distance < bestD) { best = person; bestD = distance; }
    }
    return best;
  }
}
