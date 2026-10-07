// Static ES modules: deploy these three files directly to GitHub Pages.
const $ = (id) => document.getElementById(id);
const audio = $('audio');
const settings = ['sensitivity', 'bloomStrength', 'bloomRadius', 'bloomThreshold', 'exposure', 'rotation'];
const defaults = { sensitivity: 1.2, bloomStrength: 0.85, bloomRadius: 0.5, bloomThreshold: 0.2, exposure: 1.1, rotation: 0.25 };
const palettes = {
  aurora: { a: '#7bf2d1', b: '#428dff', rgb: '123,242,209' },
  ember: { a: '#ffc76e', b: '#ff546e', rgb: '255,199,110' },
  violet: { a: '#bba1ff', b: '#ff66c5', rgb: '187,161,255' },
};
let app, audioContext, analyser, outputGain, mediaSource, frequencyData;
let objectURL, loadedFile = false, demoActive = false, demoTimer, demoBus;
let operationGeneration = 0, playingRequest = false;
let demoStep = 0, nextDemoTime = 0, elapsed = 0;
const levels = { bass: 0, mid: 0, high: 0 };
const bars = Array.from({ length: 40 }, () => {
  const bar = document.createElement('i');
  $('spectrum').appendChild(bar);
  return bar;
});

function message(text, isError = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', isError);
}
function timeLabel(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
function syncPlaybackUI() {
  const playing = demoActive || !audio.paused;
  $('playButton').textContent = playing ? 'Ⅱ' : '▶';
  $('playButton').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  $('playButton').disabled = !app || (!loadedFile && !demoActive) || playingRequest;
  $('modeTag').textContent = demoActive ? 'DEMO' : playing ? 'PLAYING' : loadedFile ? 'READY' : 'IDLE';
  $('demoButton').textContent = demoActive ? 'Stop demo' : 'Try demo';
  $('demoButton').setAttribute('aria-pressed', String(demoActive));
  $('seek').disabled = demoActive || !Number.isFinite(audio.duration) || audio.duration <= 0;
}

// The browser allows AudioContext to start only after a user gesture.
async function ensureAudio() {
  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('Web Audio is unavailable in this browser.');
    audioContext = new Context();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    outputGain = audioContext.createGain();
    outputGain.gain.value = Number($('volume').value);
    analyser.connect(outputGain);
    outputGain.connect(audioContext.destination);
    // Create once, reuse when the audio element's src changes.
    mediaSource = audioContext.createMediaElementSource(audio);
    mediaSource.connect(analyser);
  }
  await audioContext.resume();
}

function stopDemo() {
  clearInterval(demoTimer);
  demoTimer = undefined;
  demoActive = false;
  if (demoBus) {
    demoBus.gain.value = 0;
    demoBus.disconnect();
    demoBus = undefined;
  }
  $('trackName').textContent = loadedFile ? audio.dataset.filename : 'No track selected';
  $('trackDetail').textContent = 'Your files stay on this device';
  $('currentTime').textContent = timeLabel(audio.currentTime);
  $('duration').textContent = timeLabel(audio.duration);
  syncPlaybackUI();
}
function demoVoice(frequency, when, length, volume, type = 'sine', kick = false) {
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, when);
  if (kick) oscillator.frequency.exponentialRampToValueAtTime(42, when + length);
  envelope.gain.setValueAtTime(0.001, when);
  envelope.gain.exponentialRampToValueAtTime(volume, when + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.001, when + length);
  oscillator.connect(envelope);
  envelope.connect(demoBus);
  oscillator.start(when);
  oscillator.stop(when + length + 0.02);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}
function scheduleDemo() {
  while (nextDemoTime < audioContext.currentTime + 0.25) {
    if (demoStep % 4 === 0) demoVoice(150, nextDemoTime, 0.25, 0.8, 'sine', true);
    demoVoice(5200 + (demoStep % 3) * 600, nextDemoTime, 0.035, demoStep % 2 ? 0.025 : 0.045, 'triangle');
    if (demoStep % 2 === 0) {
      const notes = [130.81, 164.81, 196, 261.63, 196, 164.81, 146.83, 196];
      demoVoice(notes[(demoStep / 2) % notes.length], nextDemoTime, 0.3, 0.14, 'triangle');
    }
    demoStep = (demoStep + 1) % 16;
    nextDemoTime += 0.125;
  }
}
$('demoButton').addEventListener('click', async () => {
  const generation = ++operationGeneration;
  if (demoActive) { stopDemo(); message('Demo stopped. Load a track or play your selection.'); return; }
  audio.pause();
  try {
    await ensureAudio();
    if (generation !== operationGeneration) return;
    stopDemo();
    demoBus = audioContext.createGain();
    demoBus.gain.value = 0.65;
    demoBus.connect(analyser);
    demoActive = true;
    nextDemoTime = audioContext.currentTime + 0.04;
    demoStep = 0;
    scheduleDemo();
    demoTimer = setInterval(scheduleDemo, 100);
    $('trackName').textContent = 'Orbit / built-in synth';
    $('trackDetail').textContent = '120 BPM · generated in your browser';
    $('currentTime').textContent = 'LIVE';
    $('duration').textContent = '∞';
    message('Demo playing. Try the palettes and glow controls.');
    syncPlaybackUI();
  } catch (error) { message(error.message, true); }
});
$('playButton').addEventListener('click', async () => {
  ++operationGeneration;
  if (demoActive) { stopDemo(); message('Demo paused. Click Try demo to restart.'); return; }
  if (!audio.paused) { audio.pause(); message('Paused. Press play to resume.'); return; }
  const generation = operationGeneration;
  playingRequest = true;
  syncPlaybackUI();
  try {
    await ensureAudio();
    if (generation !== operationGeneration) return;
    if (audio.ended) audio.currentTime = 0;
    await audio.play();
    message('Playing your track. Drag the sphere to change the view.');
  } catch (error) {
    if (error.name !== 'AbortError') message('Unable to play this file. Try an MP3 or WAV supported by your browser.', true);
  } finally { playingRequest = false; syncPlaybackUI(); }
});

function loadFile(file) {
  if (!file) return;
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac|aiff|opus|weba)$/i.test(file.name)) {
    message('Choose an audio file such as MP3, WAV, OGG or M4A.', true);
    return;
  }
  ++operationGeneration;
  stopDemo();
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  if (objectURL) URL.revokeObjectURL(objectURL);
  objectURL = URL.createObjectURL(file);
  audio.src = objectURL;
  audio.dataset.filename = file.name;
  loadedFile = true;
  $('trackName').textContent = file.name;
  $('trackDetail').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · local audio`;
  $('currentTime').textContent = '0:00';
  $('duration').textContent = '0:00';
  $('seek').value = 0;
  message('Track loaded. Press play to begin.');
  syncPlaybackUI();
}
$('audioUpload').addEventListener('change', (event) => {
  loadFile(event.target.files[0]);
  event.target.value = ''; // Selecting the same file again must still fire change.
});
const panel = document.querySelector('.visual-panel');
let dragDepth = 0;
panel.addEventListener('dragenter', (event) => { event.preventDefault(); ++dragDepth; panel.classList.add('dragging'); });
panel.addEventListener('dragover', (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
panel.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; panel.classList.remove('dragging'); } });
panel.addEventListener('drop', (event) => { event.preventDefault(); dragDepth = 0; panel.classList.remove('dragging'); loadFile(event.dataTransfer.files[0]); });
// Prevent dropped files from navigating away from the visualizer.
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());
for (const event of ['play', 'pause', 'ended', 'loadedmetadata', 'durationchange']) {
  audio.addEventListener(event, () => {
    if (!demoActive) $('duration').textContent = timeLabel(audio.duration);
    if (event === 'ended' && !demoActive) message('Track finished. Press play to listen again.');
    syncPlaybackUI();
  });
}
audio.addEventListener('timeupdate', () => {
  if (demoActive) return;
  $('currentTime').textContent = timeLabel(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0) $('seek').value = audio.currentTime / audio.duration * 100;
});
audio.addEventListener('error', () => {
  if (!audio.getAttribute('src')) return;
  loadedFile = false;
  message('This audio format could not be decoded. Try an MP3 or WAV file.', true);
  syncPlaybackUI();
});
$('seek').addEventListener('input', () => {
  if (!demoActive && Number.isFinite(audio.duration)) audio.currentTime = Number($('seek').value) / 100 * audio.duration;
});
$('volume').addEventListener('input', () => {
  const volume = Number($('volume').value);
  $('volumeValue').value = `${Math.round(volume * 100)}%`;
  if (outputGain) outputGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.025);
});

function applySettings() {
  for (const id of settings) $(id + 'Value').value = Number($(id).value).toFixed(2);
  if (!app) return;
  app.bloom.strength = Number($('bloomStrength').value);
  app.bloom.radius = Number($('bloomRadius').value);
  app.bloom.threshold = Number($('bloomThreshold').value);
  app.renderer.toneMappingExposure = Number($('exposure').value);
}
settings.forEach((id) => $(id).addEventListener('input', applySettings));
function setPalette(name) {
  const palette = palettes[name];
  document.documentElement.style.setProperty('--accent', palette.a);
  document.documentElement.style.setProperty('--accent-rgb', palette.rgb);
  document.querySelectorAll('.palette').forEach((button) => {
    const active = button.dataset.palette === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (app) {
    app.uniforms.uColorA.value.set(palette.a);
    app.uniforms.uColorB.value.set(palette.b);
    app.dust.material.color.set(palette.a);
    app.rings.forEach((ring) => ring.material.color.set(palette.a));
  }
}
document.querySelectorAll('.palette').forEach((button) => button.addEventListener('click', () => setPalette(button.dataset.palette)));
$('resetButton').addEventListener('click', () => {
  for (const id of settings) $(id).value = defaults[id];
  applySettings(); setPalette('aurora');
  if (app) { app.controls.reset(); app.sphere.rotation.set(0, 0, 0.18); }
});
function toggleFocus(force) {
  const active = typeof force === 'boolean' ? force : !document.body.classList.contains('immersive');
  document.body.classList.toggle('immersive', active);
  $('focusButton').setAttribute('aria-pressed', String(active));
  $('focusButton').querySelector('span').textContent = active ? 'Exit immersive view' : 'Immersive view';
}
$('focusButton').addEventListener('click', () => toggleFocus());
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') toggleFocus(false);
});

function band(low, high) {
  const binHz = audioContext.sampleRate / analyser.fftSize;
  const start = Math.max(1, Math.floor(low / binHz));
  const end = Math.min(frequencyData.length, Math.ceil(high / binHz));
  let sum = 0;
  for (let i = start; i < end; i++) sum += frequencyData[i];
  return sum / Math.max(1, end - start) / 255;
}
function updateAudio(delta) {
  const active = analyser && (demoActive || !audio.paused);
  if (active) analyser.getByteFrequencyData(frequencyData);
  const blend = 1 - Math.exp(-delta * 9);
  for (const [key, low, high] of [['bass', 30, 250], ['mid', 250, 2500], ['high', 2500, 12000]]) {
    const target = active ? band(low, high) : 0;
    levels[key] += (target - levels[key]) * blend;
  }
  bars.forEach((bar, index) => {
    let level = 0;
    if (active) {
      const low = 30 * Math.pow(16000 / 30, index / bars.length);
      const high = 30 * Math.pow(16000 / 30, (index + 1) / bars.length);
      level = band(low, high);
    }
    bar.style.transform = `scaleY(${Math.max(0.035, level)})`;
  });
}

async function init() {
  try {
    // These are named module exports, NOT constructors on the THREE namespace.
    const [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { OrbitControls }] = await Promise.all([
      import('three'),
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
      import('three/addons/controls/OrbitControls.js'),
    ]);
    const viewport = $('viewport');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
    camera.position.set(0, 0.25, 5.7);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    viewport.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3.5;
    controls.maxDistance = 10;
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), defaults.bloomStrength, defaults.bloomRadius, defaults.bloomThreshold);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const uniforms = {
      uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
      uColorA: { value: new THREE.Color(palettes.aurora.a) }, uColorB: { value: new THREE.Color(palettes.aurora.b) },
    };
    const material = new THREE.ShaderMaterial({
      uniforms, wireframe: true, transparent: true,
      vertexShader: `
        uniform float uTime, uBass, uMid, uHigh;
        varying vec3 vPosition;
        varying float vWave;
        void main() {
          vec3 n = normalize(position);
          float wave = sin(n.x * 6.0 + uTime * 0.8) * cos(n.y * 5.0 - uTime * 0.6)
                     * sin(n.z * 5.0 + uTime * 0.5);
          float ripple = sin(n.y * 18.0 + n.x * 9.0 + uTime * 2.0);
          float radius = 1.0 + uBass * 0.30 + wave * (0.025 + uMid * 0.23) + ripple * uHigh * 0.07;
          vec3 p = position * radius;
          vPosition = p; vWave = wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColorA, uColorB;
        uniform float uBass;
        varying vec3 vPosition;
        varying float vWave;
        void main() {
          float mixAmount = clamp(vPosition.y * 0.36 + 0.5 + vWave * 0.12, 0.0, 1.0);
          vec3 color = mix(uColorB, uColorA, mixAmount) * (0.70 + uBass * 0.35);
          gl_FragColor = vec4(color, 0.63);
        }`,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.24, 64, 44), material);
    sphere.rotation.z = 0.18;
    scene.add(sphere);
    const rings = [1.87, 2.0].map((radius, index) => {
      const points = Array.from({ length: 180 }, (_, i) => {
        const angle = i / 180 * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      });
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: palettes.aurora.a, transparent: true, opacity: index ? 0.08 : 0.16 }));
      ring.rotation.set(1.25 + index * 0.22, index * 0.25, 0.22);
      scene.add(ring); return ring;
    });
    const dustPositions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      const azimuth = Math.random() * Math.PI * 2;
      const elevation = Math.acos(2 * Math.random() - 1);
      const radius = 2.6 + Math.random() * 4;
      dustPositions[i * 3] = radius * Math.sin(elevation) * Math.cos(azimuth);
      dustPositions[i * 3 + 1] = radius * Math.cos(elevation);
      dustPositions[i * 3 + 2] = radius * Math.sin(elevation) * Math.sin(azimuth);
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: palettes.aurora.a, size: 0.013, transparent: true, opacity: 0.34, depthWrite: false }));
    scene.add(dust);
    app = { renderer, bloom, uniforms, sphere, dust, rings, controls, composer };
    function resize() {
      const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
    }
    new ResizeObserver(resize).observe(viewport);
    resize(); applySettings();
    $('renderStatus').textContent = '3D engine ready';
    $('demoButton').disabled = false;
    syncPlaybackUI();
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); renderer.setAnimationLoop(null);
      audio.pause(); stopDemo();
      $('renderStatus').textContent = 'Graphics connection lost';
      message('The graphics context was lost. Reload this page to restart.', true);
    });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let previous = performance.now();
    renderer.setAnimationLoop((now) => {
      const delta = Math.min((now - previous) / 1000, 0.06);
      previous = now;
      if (document.hidden) return;
      elapsed += delta;
      updateAudio(delta);
      const response = Number($('sensitivity').value);
      const motion = reducedMotion.matches ? 0.2 : 1;
      uniforms.uTime.value = elapsed * motion;
      uniforms.uBass.value = levels.bass * response * motion;
      uniforms.uMid.value = levels.mid * response * motion;
      uniforms.uHigh.value = levels.high * response * motion;
      sphere.rotation.y += delta * Number($('rotation').value) * motion;
      dust.rotation.y += delta * 0.012 * motion;
      rings[0].rotation.z += delta * 0.015 * motion;
      controls.update();
      composer.render(delta);
    });
  } catch (error) {
    console.error('Visualizer initialization failed:', error);
    $('renderStatus').textContent = 'Unable to start 3D';
    message('3D could not start. Open this page through GitHub Pages or a local web server, check your connection, and ensure WebGL is enabled.', true);
  }
}
window.addEventListener('pagehide', () => {
  audio.pause(); stopDemo();
});
// Refill the synth scheduler after returning to a backgrounded tab.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && demoActive && nextDemoTime < audioContext.currentTime) nextDemoTime = audioContext.currentTime + 0.04;
});
applySettings();
init();
