// References to DOM elements
const audioFileInput = document.getElementById('audioFileInput');
const audioPlayer = document.getElementById('audioPlayer');
const canvas = document.getElementById('visualizerCanvas');

let scene, camera, renderer, cube;
let audioContext, analyser, dataArray;

initThree();
animate();

// -------------------------------
// 1. Three.js Initial Setup
// -------------------------------
function initThree() {
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

  // Add a basic light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Add a test cube
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -------------------------------
// 2. Animation Loop
// -------------------------------
function animate() {
  requestAnimationFrame(animate);

  // If we have an analyser, get the data
  if (analyser) {
    analyser.getByteFrequencyData(dataArray);

    // Example: average of first 10 bins -> "bass" 
    let bassSum = 0;
    for (let i = 0; i < 10; i++) {
      bassSum += dataArray[i];
    }
    const bassAverage = bassSum / 10;
    // Scale the cube's y-axis based on bass
    const scale = 1 + (bassAverage / 255) * 5;
    cube.scale.y = scale;

    // Overall average for color shift
    const overallAvg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
    const hue = (overallAvg / 255) * 360;
    cube.material.color.setHSL(hue / 360, 1, 0.5);
  }

  renderer.render(scene, camera);
}

// -------------------------------
// 3. Audio File Input & Analyser
// -------------------------------
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
