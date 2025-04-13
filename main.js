// main.js

let scene, camera, renderer, composer, sphere, analyser, dataArray, audioContext;
const bloomParams = {
  exposure: 1,
  bloomStrength: 1.5,
  bloomThreshold: 0,
  bloomRadius: 0
};

init();
animate();

function init() {
  // Create the scene
  scene = new THREE.Scene();

  // Set up the camera with an aspect ratio based on the window dimensions
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // Initialize the WebGL renderer and add it to the container div
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMappingExposure = Math.pow(bloomParams.exposure, 4.0);
  document.getElementById("container").appendChild(renderer.domElement);

  // Postprocessing: set up composer for rendering with effects
  composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  // Set up the UnrealBloomPass (adjust parameters as needed for different bloom effects)
  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    bloomParams.bloomStrength,
    bloomParams.bloomRadius,
    bloomParams.bloomThreshold
  );
  composer.addPass(bloomPass);

  // Create a wireframe sphere
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true
  });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // Set up the Web Audio API
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  // Set up the file input to handle audio uploads
  document.getElementById("audioUpload").addEventListener("change", handleFileUpload, false);

  // Adjust scene on window resize
  window.addEventListener("resize", onWindowResize, false);
}

// Update camera and renderer size on window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// Handle audio file upload and set up the audio source
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = url;
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.load();
    audio.play();

    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  }
}

function animate() {
  requestAnimationFrame(animate);

  // If audio is playing, update frequency data
  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average frequency value
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    
    // Adjust the sphere’s scale based on the audio frequency average.
    // The divisor controls the sensitivity of the scaling.
    const scaleFactor = 1 + avg / 128;
    sphere.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Optional: add a subtle rotation for visual appeal
    sphere.rotation.x += 0.005;
    sphere.rotation.y += 0.01;
  }

  // Render the scene using the composer to include postprocessing effects (bloom)
  composer.render();
}
