// Warm sunset lighting, horizon haze, visible sun and an authored sky dome.
import * as THREE from '../../vendor/three.module.min.js';

const skyVertex = `
varying vec3 vWorld;
void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}
`;
const skyFragment = `
varying vec3 vWorld;
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform vec3 lowColor;
void main(){float h=normalize(vWorld-cameraPosition).y;float t=smoothstep(-0.18,0.72,h);vec3 c=mix(horizonColor,topColor,t);float low=smoothstep(-0.32,-0.02,h);c=mix(lowColor,c,low);gl_FragColor=vec4(c,1.0);}
`;

/** Builds and lights a scene with a bright sun, not a dark empty background. */
export function createEnvironment(scene) {
  scene.background = new THREE.Color(0x83b9d2);
  scene.fog = new THREE.FogExp2(0xc5b6a0, .0014);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 22), new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    uniforms: {
      topColor: { value: new THREE.Color(0x72b5d5) },
      horizonColor: { value: new THREE.Color(0xf5c08a) },
      lowColor: { value: new THREE.Color(0xd98a68) },
    },
    side: THREE.BackSide,
    depthWrite: false,
  }));
  scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(15, 24, 20), new THREE.MeshBasicMaterial({ color: 0xffe9a6, fog: false }));
  sun.position.set(-210, 175, -270);
  scene.add(sun);
  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(25, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffcf84, transparent: true, opacity: .13, fog: false }));
  sunGlow.position.copy(sun.position);
  scene.add(sunGlow);
  const hemi = new THREE.HemisphereLight(0xe4f5ff, 0x786348, 2.0);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffdda5, 3.4);
  key.position.set(-100, 180, -125); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -270; key.shadow.camera.right = 760; key.shadow.camera.top = 760; key.shadow.camera.bottom = -270;
  key.shadow.bias = -.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa9d6e2, .8); fill.position.set(160, 70, 210); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, .22));
  const sunDirection = key.position.clone().normalize();
  return { sky, sun, sunDirection, key };
}
