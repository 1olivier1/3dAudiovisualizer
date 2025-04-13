// References to DOM elements
const audioFileInput = document.getElementById('audioFileInput');
const audioPlayer = document.getElementById('audioPlayer');
const canvas = document.getElementById('visualizerCanvas');

// THREE.js basics and audio variables
let scene, camera, renderer;
let audioContext, analyser, dataArray;

// Meshes and related uniforms
let sphereMesh, sphereUniforms;
let torusMesh;

// Post-processing and GUI
let composer, bloomPass;
const params = {
  bloomThreshold: 0.85,
  bloomStrength: 1.5,
  bloomRadius: 0.0
};

// -----------------------------------------
// Noise function code in GLSL (Perlin Noise)
// -----------------------------------------
const noiseGLSL = `
// Classic Perlin 3D noise function
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float cnoise(vec3 P){
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0/7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.75) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0/7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.75) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g100,g100), dot(g010,g010), dot(g110,g110)));
  g000 *= norm0.x;
  g100 *= norm0.y;
  g010 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g101,g101), dot(g011,g011), dot(g111,g111)));
  g001 *= norm1.x;
  g101 *= norm1.y;
  g011 *= norm1.z;
  g111 *= norm1.w;
  vec4 m0 = max(0.5 - vec4(dot(Pf0,Pf0), dot(vec3(Pf1.x,Pf0.yz),vec3(Pf1.x,Pf0.yz)),
               dot(vec3(Pf0.x,Pf1.y,Pf0.z),vec3(Pf0.x,Pf1.y,Pf0.z)), dot(Pf1,Pf1)), 0.0);
  m0 = m0 * m0;
  vec4 m1 = max(0.5 - vec4(dot(vec3(Pf0.x,Pf0.y,Pf1.z),vec3(Pf0.x,Pf0.y,Pf1.z)),
               dot(vec3(Pf1.x,Pf1.y,Pf0.z),vec3(Pf1.x,Pf1.y,Pf0.z)),
               dot(vec3(Pf0.x,Pf1.yz),vec3(Pf0.x,Pf1.yz)), dot(Pf1,Pf1)), 0.0);
  m1 = m1 * m1;
  float n0 = m0.x * dot(g000, Pf0);
  float n1 = m0.y * dot(g100, vec3(Pf1.x, Pf0.y, Pf0.z));
  float n2 = m0.z * dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n3 = m0.w * dot(g110, vec3(Pf1.x, Pf1.y, Pf0.z));
  float n4 = m1.x * dot(g001, vec3(Pf0.x, Pf0.y, Pf1.z));
  float n5 = m1.y * dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n6 = m1.z * dot(g011, vec3(Pf0.x, Pf1.y, Pf1.z));
  float n7 = m1.w * dot(g111, Pf1);
  return 42.0 * (n0 + n1 + n2 + n3 + n4 + n5 + n6 + n7);
}
`;

// ---------------------------------
// Vertex & Fragment Shaders
// ---------------------------------
const vertexShader = `
uniform float uFreq;
uniform float uTime;
${noiseGLSL}  // noise function code inserted here

void main() {
  // Basic audio-driven displacement
  float displacement = 0.1 + (uFreq * 1.0);
  
  // Add noise-based displacement (adjust multiplier 0.3 as desired)
  float n = cnoise(vec3(position * 1.5 + uTime * 0.2));
  displacement += 0.3 * n;
  
  // Optional sine wave for extra motion
  displacement += 0.05 * sin(uTime + position.y * 5.0);
  
  vec3 newPosition = position + normal * displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
void main() {
  gl_FragColor = vec4(0.2, 1.0, 0.8, 1.0);  // teal color
}
`;

// ---------------------------------
// Initialize Scene, Camera, Renderer, and Post-processing
// ---------------------------------
initScene();
initComposer();
animate();

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;
  
  renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Basic ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  
  // Create our reactive sphere and torus
  createSphereMesh();
  createTorusMesh();
  
  window.addEventListener('resize', onWindowResize);
}

function createSphereMesh() {
  sphereUniforms = {
    uFreq: { value: 0.0 },
    uTime: { value: 0.0 }
  };
  
  const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: sphereUniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ---------------------------------
// Initialize Composer with Bloom
// ---------------------------------
function initComposer() {
  const renderPass = new THREE.RenderPass(scene, camera);
  
  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    params.bloomStrength,
    params.bloomRadius,
    params.bloomThreshold
  );
  
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  
  initGUI();
}

function initGUI() {
  const gui = new dat.GUI();  // Use dat.GUI (or lil-gui if you prefer; the API is similar)
  gui.add(params, 'bloomThreshold', 0.0, 1.0).onChange(function(value) {
    bloomPass.threshold = value;
  });
  gui.add(params, 'bloomStrength', 0.0, 3.0).onChange(function(value) {
    bloomPass.strength = value;
  });
  gui.add(params, 'bloomRadius', 0.0, 1.0).onChange(function(value) {
    bloomPass.radius = value;
  });
}

// ---------------------------------
// Audio Setup
// ---------------------------------
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

// ---------------------------------
// Animation Loop
// ---------------------------------
function animate() {
  requestAnimationFrame(animate);
  
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    
    // Use bins 0-10 as "bass" for the sphere
    let bassSum = 0;
    for (let i = 0; i < 10; i++) {
      bassSum += dataArray[i];
    }
    const bassAvg = bassSum / 10;
    const audioFactor = bassAvg / 255.0;
    
    sphereUniforms.uFreq.value = audioFactor;
    sphereUniforms.uTime.value += 0.02;
    
    // For the torus, use a different frequency range (e.g., bins 300-400 for treble)
    let trebleSum = 0;
    let count = 0;
    for (let i = 300; i < 400 && i < dataArray.length; i++) {
      trebleSum += dataArray[i];
      count++;
    }
    const trebleAvg = trebleSum / Math.max(count, 1);
    const trebleFactor = trebleAvg / 255.0;
    
    // Scale and color-shift the torus based on treble
    const scale = 1.0 + trebleFactor * 0.5;
    torusMesh.scale.set(scale, scale, scale);
    torusMesh.material.color.setHSL(0.9 - trebleFactor * 0.3, 1.0, 0.5);
  }
  
  composer.render();
}
