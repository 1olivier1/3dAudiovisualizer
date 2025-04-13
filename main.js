// Grab references to DOM elements
const audioFileInput = document.getElementById('audioFileInput');
const audioPlayer = document.getElementById('audioPlayer');
const canvas = document.getElementById('visualizerCanvas');

// Three.js core variables
let scene, camera, renderer;

// Audio / Analyser
let audioContext;
let analyser;
let dataArray;

// Sphere mesh & uniforms
let sphereMesh;
let sphereUniforms;

// -----------------------------------
// 1. Custom Shaders
// -----------------------------------
const vertexShader = `
uniform float uFreq;
uniform float uTime;

void main() {
  // Base displacement (starting offset + audio-based multiplier)
  float displacement = 0.1 + (uFreq * 1.0);

  // Add a simple sine wave animation based on time if you want
  displacement += 0.05 * sin(uTime + position.y * 5.0);

  // Push each vertex outward along its normal
  vec3 newPosition = position + normal * displacement;

  // Standard projection
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
void main() {
  // A teal-like color
  gl_FragColor = vec4(0.2, 1.0, 0.8, 1.0);
}
`;

// -----------------------------------
// 2. Initialize Three.js
// -----------------------------------
initThree();
animate();

function initThree() {
  // Create scene, camera, renderer
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Optional: add a basic ambient light so things aren't pitch black
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Create and add the wireframe sphere
  createSphereMesh();

  // Handle resizing
  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -----------------------------------
// 3. Create the Wireframe Sphere Mesh
// -----------------------------------
function createSphereMesh() {
  // These uniforms will be updated in the animation loop
  sphereUniforms = {
    uFreq: { value: 0.0 },
    uTime: { value: 0.0 }
  };

  const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: sphereUniforms,
    vertexShader,
    fragmentShader,
    wireframe: true // wireframe look
  });

  // A high-resolution sphere geometry for smooth displacement
  const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);

  sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphereMesh);
}

// -----------------------------------
// 4. Audio Input & Analyser Setup
// -----------------------------------
audioFileInput.addEventListener('change', handleAudioFile);

function handleAudioFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Create AudioContext if we haven't yet
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Analyser setup
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048; // Must be power of 2
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  // Load file into audio element
  const fileURL = URL.createObjectURL(file);
  audioPlayer.src = fileURL;
  audioPlayer.load();
  audioPlayer.play();

  // Connect nodes
  const source = audioContext.createMediaElementSource(audioPlayer);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

// -----------------------------------
// 5. The Animation Loop
// -----------------------------------
function animate() {
  requestAnimationFrame(animate);

  // If there's audio data, update shader uniforms
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);

    // For example, average the first 10 bins as “bass”
    let bassSum = 0;
    for (let i = 0; i < 10; i++) {
      bassSum += dataArray[i];
    }
    const bassAvg = bassSum / 10;
    const audioFactor = bassAvg / 255.0; // normalized 0 -> 1

    // Pass data to the shader
    sphereUniforms.uFreq.value = audioFactor;

    // Increment time so there's a slight wave movement
    sphereUniforms.uTime.value += 0.01;
  }

  renderer.render(scene, camera);
}
