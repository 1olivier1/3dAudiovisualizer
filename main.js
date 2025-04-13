// 1) IMPORTS for ES Modules
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm';

// 2) DOM Elements
const audioFileInput = document.getElementById('audioFileInput');
const audioPlayer = document.getElementById('audioPlayer');
const canvas = document.getElementById('visualizerCanvas');

// 3) THREE.js Basics
let scene, camera, renderer;
let audioContext, analyser, dataArray;

// For the sphere (shader-based)
let sphereMesh;
let sphereUniforms;

// For the torus (basic material)
let torusMesh;

// Post-processing
let composer;
let bloomPass;

// GUI parameters
const params = {
  bloomThreshold: 0.85,
  bloomStrength: 1.5,
  bloomRadius: 0.0
};

// -----------------------------
// 4) NOISE FUNCTION in GLSL
// -----------------------------
// Minimal “classic” 3D noise (cut down version).
// You can replace or expand this with your own noise function or library.
const noiseGLSL = `
// GLSL Classic Perlin 3D Noise
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float cnoise(vec3 P){
  vec3 i0 = floor(P), i1 = i0 + vec3(1.0);
  vec3 f0 = fract(P), f1 = f0 - vec3(1.0);
  vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x);
  vec4 iy = vec4(i0.y, i0.y, i1.y, i1.y);
  vec4 iz = vec4(i0.z, i0.z, i0.z, i0.z);
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz);
  vec4 ixy1 = permute(ixy + iz + 1.0);
  vec4 gx0 = ixy0 * (1.0/7.0);
  vec4 gy0 = fract(floor(gx0*(1.0/7.0))* (1.0/7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.75) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0/7.0);
  vec4 gy1 = fract(floor(gx1*(1.0/7.0))*(1.0/7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.75) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1)-0.5);
  gy1 -= sz1 * (step(0.0, gy1)-0.5);
  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g100,g100),
                     dot(g010,g010), dot(g110,g110)));
  g000 *= norm0.x; g100 *= norm0.y;
  g010 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g101,g101),
                     dot(g011,g011), dot(g111,g111)));
  g001 *= norm1.x; g101 *= norm1.y;
  g011 *= norm1.z; g111 *= norm1.w;
  vec4 m0 = max(0.5 - vec4(dot(f0, f0), dot(vec3(f1.x,f0.yz), vec3(f1.x,f0.yz)),
               dot(vec3(f0.x,f1.y,f0.z), vec3(f0.x,f1.y,f0.z)),
               dot(f1, f1)), 0.0);
  m0 = m0 * m0;
  vec4 m1 = max(0.5 - vec4(dot(vec3(f0.x,f0.y,f1.z), vec3(f0.x,f0.y,f1.z)),
               dot(vec3(f1.x,f1.y,f0.z), vec3(f1.x,f1.y,f0.z)),
               dot(vec3(f0.x,f1.yz), vec3(f0.x,f1.yz)),
               dot(f1, f1)), 0.0);
  m1 = m1 * m1;
  float x0 = dot(g000, f0);
  float x1 = dot(g100, vec3(f1.x,f0.yz));
  float x2 = dot(g010, vec3(f0.x,f1.y,f0.z));
  float x3 = dot(g110, vec3(f1.x,f1.y,f0.z));
  float x4 = dot(g001, vec3(f0.x,f0.y,f1.z));
  float x5 = dot(g101, vec3(f1.x,f0.y,f1.z));
  float x6 = dot(g011, vec3(f0.x,f1.y,f1.z));
  float x7 = dot(g111, f1);
  vec4 px = vec4(x0,x1,x2,x3);
  vec4 py = vec4(x4,x5,x6,x7);
  float n0 = m0.x * px.x;
  float n1 = m0.y * px.y;
  float n2 = m0.z * px.z;
  float n3 = m0.w * px.w;
  float n4 = m1.x * py.x;
  float n5 = m1.y * py.y;
  float n6 = m1.z * py.z;
  float n7 = m1.w * py.w;
  return 42.0 * (n0 + n1 + n2 + n3 + n4 + n5 + n6 + n7);
}
`;

// -----------------------------
// 5) Vertex & Fragment Shaders
// -----------------------------
const vertexShader = `
uniform float uFreq;  // audio factor (0.0 to 1.0)
uniform float uTime;  // time for animated waves

${noiseGLSL} // Insert the noise function code here

void main() {
  // Base displacement from the audio
  float displacement = 0.1 + (uFreq * 1.0);

  // Add noise-based displacement
  // Increase or tweak the multiplier (0.3) to taste
  // This uses the vertex's world position + time to sample noise
  float n = cnoise(vec3(position * 1.5 + uTime * 0.2));
  displacement += 0.3 * n;

  // Optional: also do a simple sine wave
  displacement += 0.05 * sin(uTime + position.y * 5.0);

  vec3 newPosition = position + normal * displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
void main() {
  // A teal color
  gl_FragColor = vec4(0.2, 1.0, 0.8, 1.0);
}
`;

// --------------------------------
// 6) Initialize Scene & PostFX
// --------------------------------
initScene();
initComposer();
animate();

function initScene() {
  // Scene, Camera, Renderer
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Simple ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Sphere with custom ShaderMaterial
  createSphereMesh();

  // Torus with a basic material
  createTorusMesh();

  // Listen for resizes
  window.addEventListener('resize', onWindowResize);
}

function createSphereMesh() {
  sphereUniforms = {
    uFreq: { value: 0.0 },
    uTime: { value: 0.0 }
  };

  const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: sphereUniforms,
    vertexShader,
    fragmentShader,
    wireframe: true
  });

  const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
  sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphereMesh);
}

function createTorusMesh() {
  const torusGeometry = new THREE.TorusGeometry(1.6, 0.2, 32, 64);
  const torusMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0066,
    wireframe: true
  });
  torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
  scene.add(torusMesh);
}

// --------------------------------
// 7) Post-processing: Bloom
// --------------------------------
function initComposer() {
  // Set up post-processing with a composer
  const renderScene = new RenderPass(scene, camera);

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    params.bloomStrength,  // strength
    params.bloomRadius,    // radius
    params.bloomThreshold  // threshold
  );

  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  // Add a GUI for bloom parameters
  initGUI();
}

function initGUI() {
  const gui = new GUI();

  gui.add(params, 'bloomThreshold', 0.0, 1.0).onChange(value => {
    bloomPass.threshold = value;
  });

  gui.add(params, 'bloomStrength', 0.0, 3.0).onChange(value => {
    bloomPass.strength = value;
  });

  gui.add(params, 'bloomRadius', 0.0, 1.0).onChange(value => {
    bloomPass.radius = value;
  });
}

// --------------------------------
// 8) Handle Window Resize
// --------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------------------
// 9) Audio Input & Analyser
// --------------------------------
audioFileInput.addEventListener('change', handleAudioFile);

function handleAudioFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  const fileURL = URL.createObjectURL(file);
  audioPlayer.src = fileURL;
  audioPlayer.load();
  audioPlayer.play();

  const source = audioContext.createMediaElementSource(audioPlayer);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

// --------------------------------
// 10) Animation Loop
// --------------------------------
function animate() {
  requestAnimationFrame(animate);

  // Update audio data
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);

    // Example: average bass from bins 0..10
    let bassSum = 0;
    for (let i = 0; i < 10; i++) {
      bassSum += dataArray[i];
    }
    const bassAvg = bassSum / 10;
    const audioFactor = bassAvg / 255.0; // 0..1

    // Pass that factor into the sphere's vertex shader
    sphereUniforms.uFreq.value = audioFactor;
    sphereUniforms.uTime.value += 0.02;

    // Let’s scale or color-shift the torus with a different range (e.g., bins ~300..400 for “treble”)
    let trebleSum = 0;
    let count = 0;
    for (let i = 300; i < 400 && i < dataArray.length; i++) {
      trebleSum += dataArray[i];
      count++;
    }
    const trebleAvg = trebleSum / Math.max(count, 1);
    const trebleFactor = trebleAvg / 255.0;

    // Scale torus based on treble
    const scale = 1.0 + trebleFactor * 0.5;
    torusMesh.scale.set(scale, scale, scale);

    // Optional color shift
    torusMesh.material.color.setHSL(0.9 - trebleFactor * 0.3, 1.0, 0.5);
  }

  // Instead of renderer.render(scene, camera)...
  composer.render();
}
