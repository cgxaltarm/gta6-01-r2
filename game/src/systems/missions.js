// Eight connected story threads, each with its own objective and physical beacon.
import * as THREE from '../../vendor/three.module.min.js';
import { ROAD_X, ROAD_Z, BLOCK, GRID, ROAD_HALF } from '../world/city-plan.js';

const STORY = [
  { title: 'FIRST WHEELS', objective: 'Find a car and make it yours.', hint: 'E — enter a nearby car', kind: 'car', reward: 0, color: 0xffcc64 },
  { title: 'SUNSET DELIVERY', objective: 'Take the parcel to the marina before dusk.', hint: 'Drive to the gold marker', kind: 'drive', reward: 180, point: [92, 92] },
  { title: 'THE PICKUP', objective: 'Meet Nia beneath the pier lights.', hint: 'A quiet handoff, no questions', kind: 'beacon', reward: 240, point: [-48, 300] },
  { title: 'HEAT ON THE STRIP', objective: 'Shake the patrols and lose the tail.', hint: 'Stay out of sight until the heat cools', kind: 'escape', reward: 320, point: [184, 92] },
  { title: 'WAREHOUSE RUN', objective: 'Reach the east docks before the gate closes.', hint: 'A new route opens at the container yard', kind: 'drive', reward: 400, point: [460, 460] },
  { title: 'COASTLINE GRAND PRIX', objective: 'Complete one clean lap along the waterfront.', hint: 'The faster you are, the bigger the purse', kind: 'race', reward: 520, point: [-34, 368] },
  { title: 'TOOLS OF THE TRADE', objective: 'Collect the kit from the hillside lookout.', hint: 'On foot, follow the cliffside path', kind: 'beacon', reward: 620, point: [552, 368] },
  { title: 'THE LAST TIDE', objective: 'Bring the story home at the old pier.', hint: 'One last turn toward the water', kind: 'final', reward: 950, point: [-48, 300] },
];

const beaconGeometry = new THREE.CylinderGeometry(1.25, 1.25, 4.2, 24, 1, true);
const ringGeometry = new THREE.TorusGeometry(2.4, .13, 8, 32);

export class MissionSystem {
  constructor(scene, player, seed = 1) {
    this.scene = scene;
    this.player = player;
    this.index = 0;
    this.elapsed = 0;
    this.deadline = 260;
    this.completed = false;
    this.beacon = new THREE.Group();
    this.beacon.visible = false;
    this.scene.add(this.beacon);
    this.beaconShell = new THREE.Mesh(beaconGeometry, new THREE.MeshBasicMaterial({ color: 0xffcf55, transparent: true, opacity: .13, side: THREE.DoubleSide }));
    this.beacon.add(this.beaconShell);
    this.beaconRing = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xffdc72, transparent: true, opacity: .92 }));
    this.beaconRing.rotation.x = Math.PI / 2; this.beaconRing.position.y = .12; this.beacon.add(this.beaconRing);
    this.beaconTop = new THREE.Mesh(new THREE.ConeGeometry(.52, 1.1, 4), new THREE.MeshBasicMaterial({ color: 0xffd06a }));
    this.beaconTop.position.y = 4.3; this.beaconTop.rotation.y = Math.PI / 4; this.beacon.add(this.beaconTop);
    this.beaconLight = new THREE.PointLight(0xffbd54, 14, 32); this.beaconLight.position.y = 3; this.beacon.add(this.beaconLight);
    this.targetCar = null;
    this.createTargetCar();
    this.setMission(0);
    this.toast = 'Follow the beacon';
  }

  createTargetCar() {
    // The first wheel is staged beside the player; subsequent missions keep a route car near the marker.
    this.targetCar = null;
  }

  setMission(index) {
    this.index = Math.max(0, Math.min(STORY.length - 1, index));
    this.elapsed = 0;
    this.deadline = [260, 235, 210, 190, 220, 280, 220, 260][this.index];
    this.beacon.visible = this.index !== 0;
    const chapter = STORY[this.index];
    if (chapter.point) {
      this.beacon.position.set(chapter.point[0], 0, chapter.point[1]);
      this.beacon.visible = true;
    }
    return chapter;
  }

  current() { return STORY[this.index]; }

  update(dt, time) {
    this.elapsed += dt;
    this.beacon.position.y = Math.sin(time * 2.4) * .22;
    this.beaconRing.rotation.z += dt * .8;
    this.beaconShell.material.opacity = .08 + (Math.sin(time * 3.4) + 1) * .05;
    this.beaconTop.position.y = 4.1 + Math.sin(time * 2.2) * .35;
    const chapter = this.current();
    const point = chapter.point;
    if (point && this.index > 0) {
      const dx = this.player.position.x - point[0], dz = this.player.position.z - point[1];
      if (Math.hypot(dx, dz) < 10 && this.index !== 3) this.complete();
    }
  }

  complete() {
    if (this.completed) return false;
    const chapter = this.current();
    this.completed = true;
    this.player.money += chapter.reward;
    if (this.index < STORY.length - 1) this.setMission(this.index + 1);
    else this.setMission(this.index);
    this.completed = false;
    this.toast = `THREAD COMPLETE · +$${chapter.reward}`;
    this.player.save();
    return true;
  }

  onEnterVehicle() {
    if (this.index === 0) {
      this.complete();
      return true;
    }
    return false;
  }

  onEscape() {
    if (this.index === 3) {
      this.complete();
      return true;
    }
    return false;
  }

  get remaining() { return Math.max(0, this.deadline - this.elapsed); }
  get stories() { return STORY; }
}
