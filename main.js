'use strict';

class AudioVisualizer {
  constructor() {
    // Get DOM elements
    this.startScreen = document.getElementById('startScreen');
    this.startButton = document.getElementById('startButton');
    this.controlsContainer = document.querySelector('.controls');
    this.audioFileInput = document.getElementById('audioFileInput');
    this.audioPlayer = document.getElementById('audioPlayer');
    this.canvas = document.getElementById('visualizerCanvas');
    
    // THREE.js basics and audio variables
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    
    // Mesh and related uniforms
    this.sphereMesh = null;
    this.sphereUniforms = null;
    
    // Post-processing and GUI parameters
    this.composer = null;
    this.bloomPass = null;
    this.params = {
      bloomThreshold: 0.85,
      bloomStrength: 1.5,
      bloomRadius: 0.0,
      sphereColor: '#33ffcc'
    };
    
    this.noiseGLSL = `
      // Classic Perlin 3D noise function (code unchanged)
      vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x,289.0); }
      vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
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
        vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.75) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);
        vec4 gx1 = ixy1 * (1.0 / 7.0);
        vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
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
        g000 *= norm0.x; g100 *= norm0.y; g010 *= norm0.z; g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g101,g101), dot(g011,g011), dot(g111,g111)));
        g001 *= norm1.x; g101 *= norm1.y; g011 *= norm1.z; g111 *= norm1.w;
        float n0 = dot(g000, Pf0);
        float n1 = dot(g100, vec3(Pf1.x, Pf0.y, Pf0.z));
        float n2 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n3 = dot(g110, vec3(Pf1.x, Pf1.y, Pf0.z));
        float n4 = dot(g001, vec3(Pf0.x, Pf0.y, Pf1.z));
        float n5 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n6 = dot(g011, vec3(Pf0.x, Pf1.y, Pf1.z));
        float n7 = dot(g111, Pf1);
        vec4 m = max(0.6 - vec4(dot(Pf0,Pf0), dot(vec3(Pf1.x, Pf0.yz), vec3(Pf1.x, Pf0.yz)), dot(vec3(Pf0.x,Pf1.y,Pf0.z), vec3(Pf0.x,Pf1.y,Pf0.z)), dot(vec3(Pf1.xy,Pf0.z), vec3(Pf1.xy,Pf0.z))), 0.0);
        vec4 m2 = m * m;
        vec4 m4 = m2 * m2;
        vec4 p = vec4(dot(Pf0,g000), dot(vec3(Pf1.x,Pf0.yz),g100), dot(vec3(Pf0.x,Pf1.y,Pf0.z),g010), dot(vec3(Pf1.xy,Pf0.z),g110));
        vec4 m_ = max(0.6 - vec4(dot(vec3(Pf0.xy,Pf1.z),vec3(Pf0.xy,Pf1.z)), dot(vec3(Pf1.x,Pf0.y,Pf1.z),vec3(Pf1.x,Pf0.y,Pf1.z)), dot(vec3(Pf0.x,Pf1.yz),vec3(Pf0.x,Pf1.yz)), dot(Pf1,Pf1)), 0.0);
        vec4 m2_ = m_ * m_;
        vec4 m4_ = m2_ * m2_;
        vec4 p_ = vec4(dot(vec3(Pf0.xy,Pf1.z),g001), dot(vec3(Pf1.x,Pf0.y,Pf1.z),g101), dot(vec3(Pf0.x,Pf1.yz),g011), dot(Pf1,g111));
        return 42.0 * dot(m4 * p + m4_ * p_, vec4(1.0));
      }
    `;

    this.vertexShader = `
      uniform float uFreq;
      uniform float uTime;
      ${this.noiseGLSL}
      void main() {
        float displacement = 0.1 + (uFreq * 0.2);
        float n = cnoise(vec3(position * 1.5 + uTime * 0.2));
        displacement += 0.3 * n;
        displacement += 0.05 * sin(uTime + position.y * 5.0);
        vec3 newPosition = position + normal * displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;

    this.fragmentShader = `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `;

    this.animationFrameId = null;

    // Bind event handlers
    this.startExperience = this.startExperience.bind(this);
    this.handleAudioFile = this.handleAudioFile.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.animate = this.animate.bind(this);

    this.init();
  }

  init() {
    this.initScene();
    this.initPostProcessing();
    this.animate();
    this.attachEventListeners();
    console.log("Visualizer initialized. Waiting for user to start.");
  }

  attachEventListeners() {
    this.startButton.addEventListener('click', this.startExperience, { once: true });
  }

  startExperience() {
    console.log("Starting experience...");
    // Initialize AudioContext
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Show controls and hide start screen
    this.startScreen.classList.add('hidden');
    this.controlsContainer.classList.remove('hidden');

    // Attach remaining event listeners
    this.audioFileInput.addEventListener('change', this.handleAudioFile);
    window.addEventListener('resize', this.onWindowResize);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    this.createSphereMesh();
  }

  createSphereMesh() {
    this.sphereUniforms = {
      uFreq: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color(this.params.sphereColor) }
    };
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: this.sphereUniforms,
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      wireframe: true
    });
    const sphereGeometry = new THREE.SphereGeometry(1, 96, 96);
    this.sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.scene.add(this.sphereMesh);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  initPostProcessing() {
    const renderPass = new THREE.RenderPass(this.scene, this.camera);
    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.params.bloomStrength,
      this.params.bloomRadius,
      this.params.bloomThreshold
    );
    this.composer.addPass(this.bloomPass);
    this.initGUI();
  }

  initGUI() {
    const gui = new dat.GUI();
    gui.add(this.params, 'bloomThreshold', 0.0, 1.0).onChange(value => {
      this.bloomPass.threshold = value;
    });
    gui.add(this.params, 'bloomStrength', 0.0, 3.0).onChange(value => {
      this.bloomPass.strength = value;
    });
    gui.add(this.params, 'bloomRadius', 0.0, 1.0).onChange(value => {
      this.bloomPass.radius = value;
    });
    gui.addColor(this.params, 'sphereColor').onChange(value => {
      this.sphereUniforms.uColor.value.set(value);
    });
    gui.domElement.style.right = '10px';
    gui.domElement.style.left = 'auto';
  }

  handleAudioFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!this.audioContext) {
        console.error("AudioContext not initialized!");
        alert("Please start the visualizer first.");
        return;
    }
    
    // Resume audio context if it was suspended
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    
    const fileURL = URL.createObjectURL(file);
    this.audioPlayer.src = fileURL;
    this.audioPlayer.load();
    this.audioPlayer.play().then(() => {
      console.log("Playing audio file:", file.name);
      const source = this.audioContext.createMediaElementSource(this.audioPlayer);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }).catch(err => {
      console.error("Audio playback error:", err);
      alert("Could not play audio. Please try a different file.");
    });
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let bassSum = 0;
      for (let i = 0; i < 10; i++) {
        bassSum += this.dataArray[i];
      }
      const bassAvg = bassSum / 10;
      const audioFactor = bassAvg / 255.0;
      this.sphereUniforms.uFreq.value = audioFactor;
      this.sphereUniforms.uTime.value += 0.02;
    } else if (this.sphereUniforms) {
      this.sphereUniforms.uFreq.value = 0.05;
      this.sphereUniforms.uTime.value += 0.005;
    }
    
    if (this.sphereMesh) {
      this.sphereMesh.rotation.y += 0.002;
    }
    
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AudioVisualizer();
});
