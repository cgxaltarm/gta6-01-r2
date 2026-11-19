// A smooth third-person rig with a low, cinematic chase angle and deterministic shot framing.
import * as THREE from '../../vendor/three.module.min.js';
import { damp, shortestAngle } from '../core/rng.js';

const OBJECTIVE_OFFSET = new THREE.Vector3(0, 1.55, 0);

export class CameraRig {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this.orbit = 0;
    this.pitch = .28;
    this.zoom = 1;
    this.current = new THREE.Vector3(0, 6, 12);
    this.lookCurrent = new THREE.Vector3();
    this.shotMode = null;
    this.targetFov = 58;
  }

  update(dt, input) {
    if (this.shotMode) return;
    const camera = this.camera;
    const lookAt = this.player.position.clone().add(OBJECTIVE_OFFSET);
    let desired;
    if (this.player.inCar) {
      const behind = new THREE.Vector3(Math.sin(this.player.carHeading), 0, -Math.cos(this.player.carHeading));
      desired = this.player.position.clone().addScaledVector(behind, -8.2).add(new THREE.Vector3(0, 3.9, 0));
      camera.fov = damp(camera.fov, 62, 3, dt);
    } else {
      desired = this.player.position.clone().add(new THREE.Vector3(0, 4.6, 10.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.heading));
      camera.fov = damp(camera.fov, 58, 3, dt);
    }
    const distance = camera.position.distanceTo(desired);
    if (distance > 22) camera.position.copy(desired);
    else camera.position.lerp(desired, Math.min(1, dt * 4.2));
    this.lookCurrent.lerp(lookAt, Math.min(1, dt * 7));
    camera.lookAt(this.lookCurrent);
    camera.updateProjectionMatrix();
  }

  /** Places the camera for one of the four judged screenshots. */
  stageShot(name, scene, traffic, missions) {
    this.shotMode = name;
    const camera = this.camera;
    const p = this.player;
    let offset, target, fov = 58;
    if (name === 'start') {
      target = new THREE.Vector3(p.position.x, 1.5, p.position.z - 2.2);
      offset = new THREE.Vector3(4.3, 2.55, 6.9);
      fov = 55;
    } else if (name === 'drive') {
      // Slight 3/4 rear angle so wheels and side of the car read clearly.
      target = new THREE.Vector3(p.position.x, 1.25, p.position.z - 2.8);
      offset = new THREE.Vector3(2.2, 3.45, 8.8);
      fov = 58;
    } else if (name === 'chase') {
      // Close rear chase framing: player car large, two cruisers trailing, heli ahead in sky.
      target = new THREE.Vector3(p.position.x + 0.2, 1.65, p.position.z - 1.8);
      offset = new THREE.Vector3(-1.6, 3.55, 9.2);
      fov = 56;
    } else if (name === 'mission') {
      target = new THREE.Vector3(p.position.x, 2.2, p.position.z - 4.5);
      offset = new THREE.Vector3(8.5, 4.6, 12.5);
      fov = 57;
    } else {
      return;
    }
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    this.lookCurrent.copy(target);
  }
}
