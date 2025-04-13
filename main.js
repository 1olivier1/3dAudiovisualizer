// Import modules from CDNs (adjust version numbers if needed)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CopyShader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/shaders/CopyShader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm';

// AudioVisualizer class encapsulates the entire app
class AudioVisualizer {
  constructor() {
    // Get DOM elements
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
    this.dummyData = new Uint8Array(1024).fill(0); // For pre-audio visualization

    // Meshes and related uniforms
    this.sphereMesh = null;
    this.sphereUniforms = null;
    this.torusMesh = null;

    // Post-processing and GUI
    this.composer = null;
    this.bloomPass = null;
    this.params = {
      bloomThreshold: 0.85,
      bloomStrength: 1.5,
      bloomRadius: 0.0
    };

    // Noise GLSL shader code (Perlin Noise)
    this.noiseGLSL = `
      // Classic Perlin 3D noise function
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
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
        g000 *= norm0.x;
        g100 *= norm0.y;
        g010 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g101,g101), dot(g011,g011), dot(g111,g111)));
        g001 *= norm1.x;
        g101 *= norm1.y;
        g011 *= norm1.z;
        g111 *= norm1.w;
        vec4 m0 = max(0.5 - vec4(dot(Pf0,Pf0),
                   dot(vec3(Pf1.x,Pf0.yz), vec3(Pf1.x,Pf0.yz)),
                   dot(vec3(Pf0.x, Pf1.y, Pf0.z), vec3(Pf0.x, Pf1.y, Pf0.z)),
                   dot(Pf1,Pf1)), 0.0);
        m0 = m0 * m0;
        vec4 m1 = max(0.5 - vec4(dot(vec3(Pf0.x, Pf0.y, Pf1.z), vec3(Pf0.x, Pf0.y, Pf1.z)),
                   dot(vec3(Pf1.x, Pf1.y, Pf0.z), vec3(Pf1.x, Pf1.y, Pf0.z)),
                   dot(vec3(Pf0.x, Pf1.yz), vec3(Pf0.x, Pf1.yz)),
                   dot(Pf1,Pf1)), 0.0);
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

    // Vertex shader
    this.vertexShader = `
      uniform float uFreq;
      uniform float uTime;
      ${this.noiseGLSL}
      
      void main() {
        // Basic audio-driven displacement
        float displacement = 0.1 + (uFreq * 1.0);
        
        // Add noise-based displacement
        float n = cnoise(vec3(position * 1.5 + uTime * 0.2));
        displacement += 0.3 * n;
        
        // Optional sine wave for extra motion
        displacement += 0.05 * sin(uTime + position.y * 5.0);
        
        vec3 newPosition = position + normal * displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;

    // Fragment shader
    this.fragmentShader = `
      void main() {
        gl_FragColor = vec4(0.2, 1.0, 0.8, 1.0);
      }
    `;

    // Animation loop management
    this.animationFrameId = null;
    this.isInitialized = false;

    // Pulse effect variables for pre-audio visualization
    this.pulseValue = 0;
    this.pulseDirection = 1;

    // Bind event handlers
    this.handleAudioFile = this.handleAudioFile.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.animate = this.animate.bind(this);
    this.pulseEffect = this.pulseEffect.bind(this);

    // Initialize the visualizer
    this.init();

    // Attach event listeners
    this.attachEventListeners();
  }

  // Set up everything
  init() {
    try {
      this.initScene();
      this.initPostProcessing();
      this.animate();
      this.isInitialized = true;
      console.log("Visualizer initialized successfully (ES Modules)");
    } catch (error) {
      console.error("Error initializing visualizer:", error);
    }
  }

  // Attach required event listeners
  attachEventListeners() {
    this.audioFileInput.addEventListener('change', this.handleAudioFile);
    window.addEventListener('resize', this.onWindowResize);
  }

  // Set up the Three.js scene, camera, and renderer
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Create reactive meshes
    this.createSphereMesh();
    this.createTorusMesh();
  }

  // Create a reactive sphere with shader-based displacement
  createSphereMesh() {
    this.sphereUniforms = {
      uFreq: { value: 0.0 },
      uTime: { value: 0.0 }
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

  // Create a reactive torus that responds to a different frequency range
  createTorusMesh() {
    const torusGeometry = new THREE.TorusGeometry(1.6, 0.2, 32, 64);
    const torusMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0066,
      wireframe: true
    });
    this.torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
    this.scene.add(this.torusMesh);
  }

  // Handle window resize events
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // Initialize post-processing with RenderPass and UnrealBloomPass using ES module classes
  initPostProcessing() {
    try {
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(renderPass);

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.params.bloomStrength,
        this.params.bloomRadius,
        this.params.bloomThreshold
      );
      this.composer.addPass(this.bloomPass);

      console.log("Post-processing (ES Modules) initialized");
      this.initGUI();
    } catch (error) {
      console.error("Error initializing post-processing:", error);
      console.log("Falling back to direct rendering");
      this.initGUI();
    }
  }

  // Initialize GUI controls using lil-gui
  initGUI() {
    const gui = new GUI();
    gui.add(this.params, 'bloomThreshold', 0.0, 1.0).onChange((value) => {
      if (this.bloomPass) this.bloomPass.threshold = value;
    });
    gui.add(this.params, 'bloomStrength', 0.0, 3.0).onChange((value) => {
      if (this.bloomPass) this.bloomPass.strength = value;
    });
    gui.add(this.params, 'bloomRadius', 0.0, 1.0).onChange((value) => {
      if (this.bloomPass) this.bloomPass.radius = value;
    });
    // Optionally adjust the GUI DOM positioning
    gui.domElement.style.right = '10px';
    gui.domElement.style.left = 'auto';
  }

  // A simple pulse effect for when no audio is provided
  pulseEffect() {
    this.pulseValue += 0.01 * this.pulseDirection;
    if (this.pulseValue >= 0.5) {
      this.pulseDirection = -1;
    } else if (this.pulseValue <= 0) {
      this.pulseDirection = 1;
    }
    return this.pulseValue;
  }

  // Handle audio file selection and setup playback
  handleAudioFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    console.log("Playing audio file:", file.name);

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext created successfully");
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      const fileURL = URL.createObjectURL(file);
      this.audioPlayer.src = fileURL;
      this.audioPlayer.load();

      this.audioPlayer.play()
        .then(() => {
          console.log("Playing audio file");
          const source = this.audioContext.createMediaElementSource(this.audioPlayer);
          source.connect(this.analyser);
          this.analyser.connect(this.audioContext.destination);
        })
        .catch(err => {
          console.error("Audio playback error:", err);
          alert("Could not play audio. Please try a different file.");
        });
    } catch (error) {
      console.error("Audio processing error:", error);
      alert("Error processing audio. Please try again.");
    }
  }

  // Animation loop to update visuals
  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);

      // Process bass frequencies for the sphere
      let bassSum = 0;
      for (let i = 0; i < 10; i++) {
        bassSum += this.dataArray[i];
      }
      const bassAvg = bassSum / 10;
      const audioFactor = bassAvg / 255.0;
      this.sphereUniforms.uFreq.value = audioFactor;
      this.sphereUniforms.uTime.value += 0.02;

      // Process treble frequencies for the torus
      let trebleSum = 0;
      let count = 0;
      for (let i = 300; i < 400 && i < this.dataArray.length; i++) {
        trebleSum += this.dataArray[i];
        count++;
      }
      const trebleAvg = trebleSum / Math.max(count, 1);
      const trebleFactor = trebleAvg / 255.0;
      const scale = 1.0 + trebleFactor * 0.5;
      this.torusMesh.scale.set(scale, scale, scale);
      this.torusMesh.material.color.setHSL(0.9 - trebleFactor * 0.3, 1.0, 0.5);
    } else {
      // Fallback animation (pulsing) when no audio is playing
      const pulseVal = this.pulseEffect();
      if (this.sphereUniforms) {
        this.sphereUniforms.uFreq.value = pulseVal;
        this.sphereUniforms.uTime.value += 0.01;
      }
      if (this.torusMesh) {
        const scale = 1.0 + pulseVal * 0.3;
        this.torusMesh.scale.set(scale, scale, scale);
        this.torusMesh.material.color.setHSL(0.6 + pulseVal, 0.9, 0.5);
      }
    }

    // Rotate objects slightly for visual interest
    if (this.sphereMesh) {
      this.sphereMesh.rotation.y += 0.002;
    }
    if (this.torusMesh) {
      this.torusMesh.rotation.x += 0.001;
      this.torusMesh.rotation.y += 0.002;
    }

    // Render using the composer if available, else use the renderer directly
    if (this.composer && this.composer.passes.length > 0) {
      this.composer.render();
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Dispose of resources when needed
  dispose() {
    this.audioFileInput.removeEventListener('change', this.handleAudioFile);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.sphereMesh) {
      this.sphereMesh.geometry.dispose();
      this.sphereMesh.material.dispose();
    }
    if (this.torusMesh) {
      this.torusMesh.geometry.dispose();
      this.torusMesh.material.dispose();
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Start the visualizer once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AudioVisualizer();
});
