// main.js

let scene, camera, renderer, composer, sphere;
let analyser, dataArray, audioContext;
const bloomParams = {
  exposure: 1,
  bloomStrength: 1.5,
  bloomThreshold: 0,
  bloomRadius: 0
};

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMappingExposure = Math.pow(bloomParams.exposure, 4.0);
  document.getElementById("container").appendChild(renderer.domElement);

  // Composer for effects
  composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    bloomParams.bloomStrength,
    bloomParams.bloomRadius,
    bloomParams.bloomThreshold
  );
  composer.addPass(bloomPass);

  // Wireframe Sphere
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true
  });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // Audio setup
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  document.getElementById("audioUpload").addEventListener("change", handleFileUpload);

  window.addEventListener("resize", onWindowResize);
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const audio = new Audio(URL.createObjectURL(file));
  audio.crossOrigin = "anonymous";
  audio.loop = true;
  audio.play();

  const source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (analyser) {
    analyser.getByteFrequencyData(dataArray);

    let sum = dataArray.reduce((a, b) => a + b, 0);
    let avg = sum / dataArray.length;

    let scaleFactor = 1 + avg / 128;
    sphere.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    sphere.rotation.x += 0.005;
    sphere.rotation.y += 0.01;
  }

  composer.render();
}
