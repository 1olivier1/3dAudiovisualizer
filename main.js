'use strict';

/**
 * Particle Background System
 * Creates floating particles with mouse interaction and connecting lines
 */
class ParticleBackground {
  constructor() {
    this.canvas = document.getElementById('particleCanvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 150 };
    this.particleCount = 80;
    this.connectionDistance = 120;
    this.baseSpeed = 0.3;
    this.pulsePhase = 0;

    this.init();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    // Create particles
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.baseSpeed,
        vy: (Math.random() - 0.5) * this.baseSpeed,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.pulsePhase += 0.02;
    const pulseFactor = 0.3 + Math.sin(this.pulsePhase) * 0.1;

    // Update and draw particles
    this.particles.forEach((p, i) => {
      // Mouse repulsion
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.vx += (dx / dist) * force * 0.5;
          p.vy += (dy / dist) * force * 0.5;
        }
      }

      // Apply velocity with damping
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;

      // Add gentle drift back to base speed
      if (Math.abs(p.vx) < this.baseSpeed * 0.5) {
        p.vx += (Math.random() - 0.5) * 0.05;
      }
      if (Math.abs(p.vy) < this.baseSpeed * 0.5) {
        p.vy += (Math.random() - 0.5) * 0.05;
      }

      // Wrap around edges
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Draw particle with pulsing glow
      const glowSize = p.size * (1 + pulseFactor);
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize * 3);
      gradient.addColorStop(0, `rgba(51, 255, 204, ${p.opacity})`);
      gradient.addColorStop(1, 'rgba(51, 255, 204, 0)');

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, glowSize * 3, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(51, 255, 204, ${p.opacity})`;
      this.ctx.fill();

      // Draw lines to nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.connectionDistance) {
          const opacity = (1 - dist / this.connectionDistance) * 0.3;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(51, 255, 204, ${opacity})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    });
  }
}

/**
 * 3D Audio Visualizer - Ultimate Edition
 * Features:
 * - Multiple visualization modes (sphere, bars, particles, waveform)
 * - Beat detection with reactive animations
 * - Particle explosions on bass hits
 * - Camera shake and movement
 * - Orbit controls (drag to rotate/zoom)
 * - Microphone input support
 * - Preset themes
 * - Frequency band separation (bass/mid/treble)
 */

class AudioVisualizer {
  constructor() {
    // DOM Elements
    this.canvas = document.getElementById('visualizerCanvas');
    this.audioFileInput = document.getElementById('audioFileInput');
    this.audioPlayer = document.getElementById('audioPlayer');

    // Three.js core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Audio
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.frequencyBands = { bass: 0, mid: 0, treble: 0, average: 0 };
    this.beatDetector = { threshold: 1.2, decay: 0.98, lastBeat: 0, energy: 0, beatCooldown: 0 };
    this.isPlaying = false;
    this.useMicrophone = false;

    // Visualizer objects
    this.sphereMesh = null;
    this.sphereUniforms = null;
    this.barMeshes = [];
    this.particles = null;
    this.particleSystem = null;
    this.waveformLine = null;
    this.backgroundStars = null;

    // Post-processing
    this.composer = null;
    this.bloomPass = null;

    // Controls
    this.orbitControls = null;
    this.cameraShake = { intensity: 0, decay: 0.9 };
    this.cameraTarget = new THREE.Vector3(0, 0, 0);

    // Settings
    this.params = {
      // Visualization
      mode: 'sphere', // sphere, bars, particles, waveform, combined

      // Colors
      primaryColor: '#33ffcc',
      secondaryColor: '#6366f1',
      accentColor: '#ec4899',
      theme: 'cyber', // cyber, vaporwave, minimal, fire, ocean

      // Bloom
      bloomThreshold: 0.4,
      bloomStrength: 1.8,
      bloomRadius: 0.5,

      // Reactivity
      reactivity: 1.0,
      bassReactivity: 1.5,
      beatSensitivity: 1.2,
      cameraShakeOnBeat: true,
      particlesOnBeat: true,

      // Sphere
      sphereSegments: 128,
      sphereWireframe: true,
      sphereRotationSpeed: 0.002,

      // Bars
      barCount: 64,
      barSpacing: 0.15,
      barWidth: 0.1,

      // Particles
      particleCount: 2000,
      particleSize: 0.05,
      particleSpeed: 0.02,

      // Background
      showStars: true,
      starCount: 1000,

      // Camera
      autoRotate: true,
      autoRotateSpeed: 0.3,
      cameraPulse: true,

      // Rainbow
      rainbow: false,
      rainbowSpeed: 0.5
    };

    // Themes
    this.themes = {
      cyber: { primary: '#33ffcc', secondary: '#6366f1', accent: '#ec4899', bg: '#0a0a0f' },
      vaporwave: { primary: '#ff6ad5', secondary: '#c774e8', accent: '#00d4ff', bg: '#1a0a2e' },
      minimal: { primary: '#ffffff', secondary: '#888888', accent: '#ffffff', bg: '#000000' },
      fire: { primary: '#ff4500', secondary: '#ff8c00', accent: '#ffff00', bg: '#0d0d0d' },
      ocean: { primary: '#00bfff', secondary: '#1e90ff', accent: '#00ffff', bg: '#001428' },
      matrix: { primary: '#00ff00', secondary: '#003300', accent: '#00ff00', bg: '#000500' }
    };

    // GLSL Noise
    this.noiseGLSL = `
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
        float n1 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n2 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n3 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n4 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n5 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n6 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n7 = dot(g111, Pf1);
        vec3 fade_xyz = Pf0 * Pf0 * Pf0 * (Pf0 * (Pf0 * 6.0 - 15.0) + 10.0);
        vec4 n_z = mix(vec4(n0, n1, n2, n3), vec4(n4, n5, n6, n7), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
        return 2.2 * n_xyz;
      }
    `;

    // Animation
    this.animationFrameId = null;

    // Bind methods
    this.animate = this.animate.bind(this);
    this.handleAudioFile = this.handleAudioFile.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    // Initialize
    this.init();
  }

  init() {
    this.initScene();
    this.initLights();
    this.initVisualizers();
    this.initPostProcessing();
    this.initControls();
    this.initGUI();
    this.attachEventListeners();
    this.animate();
    console.log('🎵 Audio Visualizer Ultimate initialized');
  }

  initScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.themes[this.params.theme].bg);
    this.scene.fog = new THREE.FogExp2(this.themes[this.params.theme].bg, 0.05);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(this.params.primaryColor, 1, 50);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(this.params.secondaryColor, 0.8, 50);
    pointLight2.position.set(-5, -5, 5);
    this.scene.add(pointLight2);
  }

  initVisualizers() {
    this.createSphere();
    this.createBars();
    this.createParticles();
    this.createWaveform();
    this.createBackgroundStars();
    this.updateVisualizerVisibility();
  }

  createSphere() {
    this.sphereUniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uBeat: { value: 0 },
      uColor1: { value: new THREE.Color(this.params.primaryColor) },
      uColor2: { value: new THREE.Color(this.params.secondaryColor) },
      uReactivity: { value: this.params.reactivity }
    };

    const vertexShader = `
      uniform float uTime;
      uniform float uBass;
      uniform float uMid;
      uniform float uTreble;
      uniform float uBeat;
      uniform float uReactivity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vDisplacement;
      
      ${this.noiseGLSL}
      
      void main() {
        vNormal = normal;
        vPosition = position;
        
        // Multi-frequency displacement
        float bassDisp = uBass * 0.5 * uReactivity;
        float midDisp = uMid * 0.3 * uReactivity;
        float trebleDisp = uTreble * 0.2 * uReactivity;
        
        // Noise-based displacement
        float noise1 = cnoise(position * 2.0 + uTime * 0.5) * bassDisp;
        float noise2 = cnoise(position * 4.0 + uTime * 0.8) * midDisp;
        float noise3 = cnoise(position * 8.0 + uTime * 1.2) * trebleDisp;
        
        // Beat pulse
        float beatPulse = uBeat * 0.3;
        
        // Combined displacement
        float displacement = 0.1 + noise1 + noise2 + noise3 + beatPulse;
        displacement += sin(uTime * 2.0 + position.y * 3.0) * 0.02;
        
        vDisplacement = displacement;
        
        vec3 newPosition = position + normal * displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uBass;
      uniform float uBeat;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vDisplacement;
      
      void main() {
        // Gradient based on displacement
        vec3 color = mix(uColor1, uColor2, vDisplacement * 2.0);
        
        // Add glow on beat
        color += uBeat * 0.5;
        
        // Fresnel effect
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
        color += fresnel * 0.3;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const geometry = new THREE.IcosahedronGeometry(1.5, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: this.sphereUniforms,
      vertexShader,
      fragmentShader,
      wireframe: this.params.sphereWireframe
    });

    this.sphereMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphereMesh);
  }

  createBars() {
    const barCount = this.params.barCount;
    const radius = 3;

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const geometry = new THREE.BoxGeometry(this.params.barWidth, 0.1, this.params.barWidth);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.params.primaryColor),
        emissive: new THREE.Color(this.params.primaryColor),
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.2
      });

      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = Math.cos(angle) * radius;
      bar.position.z = Math.sin(angle) * radius;
      bar.rotation.y = -angle;
      bar.userData.index = i;
      bar.userData.baseY = 0;

      this.barMeshes.push(bar);
      this.scene.add(bar);
    }
  }

  createParticles() {
    const count = this.params.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = [];

    const color1 = new THREE.Color(this.params.primaryColor);
    const color2 = new THREE.Color(this.params.secondaryColor);

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 3;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Random color between primary and secondary
      const mixRatio = Math.random();
      const color = color1.clone().lerp(color2, mixRatio);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * this.params.particleSize + 0.01;

      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02,
        originalX: positions[i * 3],
        originalY: positions[i * 3 + 1],
        originalZ: positions[i * 3 + 2]
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: this.params.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particles = { geometry, velocities, positions };
    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  createWaveform() {
    const points = [];
    const segmentCount = 256;

    for (let i = 0; i < segmentCount; i++) {
      const x = (i / segmentCount - 0.5) * 10;
      points.push(new THREE.Vector3(x, 0, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.params.primaryColor,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });

    this.waveformLine = new THREE.Line(geometry, material);
    this.waveformLine.position.y = -2;
    this.scene.add(this.waveformLine);
  }

  createBackgroundStars() {
    const count = this.params.starCount;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.backgroundStars = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundStars);
  }

  updateVisualizerVisibility() {
    const mode = this.params.mode;

    if (this.sphereMesh) {
      this.sphereMesh.visible = mode === 'sphere' || mode === 'combined';
    }

    this.barMeshes.forEach(bar => {
      bar.visible = mode === 'bars' || mode === 'combined';
    });

    if (this.particleSystem) {
      this.particleSystem.visible = mode === 'particles' || mode === 'combined';
    }

    if (this.waveformLine) {
      this.waveformLine.visible = mode === 'waveform' || mode === 'combined';
    }

    if (this.backgroundStars) {
      this.backgroundStars.visible = this.params.showStars;
    }
  }

  initPostProcessing() {
    try {
      // Check if post-processing classes are available
      if (typeof THREE.RenderPass === 'undefined' ||
        typeof THREE.UnrealBloomPass === 'undefined' ||
        typeof THREE.EffectComposer === 'undefined') {
        console.warn('Post-processing not available, using standard renderer');
        this.composer = null;
        return;
      }

      const renderPass = new THREE.RenderPass(this.scene, this.camera);

      this.bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.params.bloomStrength,
        this.params.bloomRadius,
        this.params.bloomThreshold
      );

      this.composer = new THREE.EffectComposer(this.renderer);
      this.composer.addPass(renderPass);
      this.composer.addPass(this.bloomPass);
      console.log('Post-processing enabled with bloom effect');
    } catch (err) {
      console.warn('Post-processing failed to initialize:', err.message);
      this.composer = null;
    }
  }

  initControls() {
    // Simple orbit controls (manual implementation since we can't load OrbitControls)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let spherical = { theta: 0, phi: Math.PI / 2, radius: 5 };

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      spherical.theta -= deltaX * 0.01;
      spherical.phi -= deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      this.updateCameraPosition(spherical);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mouseup', () => isDragging = false);
    this.canvas.addEventListener('mouseleave', () => isDragging = false);

    this.canvas.addEventListener('wheel', (e) => {
      spherical.radius += e.deltaY * 0.01;
      spherical.radius = Math.max(2, Math.min(15, spherical.radius));
      this.updateCameraPosition(spherical);
    });

    this.sphericalCoords = spherical;
  }

  updateCameraPosition(spherical) {
    this.camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    this.camera.position.y = spherical.radius * Math.cos(spherical.phi);
    this.camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    this.camera.lookAt(this.cameraTarget);
  }

  initGUI() {
    const gui = new dat.GUI({ width: 300 });

    // Visualization Mode
    const vizFolder = gui.addFolder('Visualization');
    vizFolder.add(this.params, 'mode', ['sphere', 'bars', 'particles', 'waveform', 'combined'])
      .name('Mode')
      .onChange(() => this.updateVisualizerVisibility());
    vizFolder.add(this.params, 'reactivity', 0.1, 3.0).name('Reactivity');
    vizFolder.add(this.params, 'bassReactivity', 0.5, 3.0).name('Bass Reactivity');
    vizFolder.open();

    // Theme
    const themeFolder = gui.addFolder('Theme');
    themeFolder.add(this.params, 'theme', Object.keys(this.themes))
      .name('Preset')
      .onChange((theme) => this.applyTheme(theme));
    themeFolder.addColor(this.params, 'primaryColor').name('Primary').onChange((c) => this.updateColors());
    themeFolder.addColor(this.params, 'secondaryColor').name('Secondary').onChange((c) => this.updateColors());

    // Bloom
    const bloomFolder = gui.addFolder('Bloom');
    bloomFolder.add(this.params, 'bloomThreshold', 0, 1).onChange((v) => this.bloomPass.threshold = v);
    bloomFolder.add(this.params, 'bloomStrength', 0, 3).onChange((v) => this.bloomPass.strength = v);
    bloomFolder.add(this.params, 'bloomRadius', 0, 1).onChange((v) => this.bloomPass.radius = v);

    // Effects
    const fxFolder = gui.addFolder('Effects');
    fxFolder.add(this.params, 'cameraShakeOnBeat').name('Camera Shake');
    fxFolder.add(this.params, 'particlesOnBeat').name('Particle Burst');
    fxFolder.add(this.params, 'autoRotate').name('Auto Rotate');
    fxFolder.add(this.params, 'showStars').name('Stars').onChange(() => this.updateVisualizerVisibility());

    // Audio
    const audioFolder = gui.addFolder('Audio');
    audioFolder.add(this, 'toggleMicrophone').name('🎤 Use Microphone');
    audioFolder.add(this, 'toggleDesktopAudio').name('🖥️ Desktop Audio');
    audioFolder.add(this.params, 'beatSensitivity', 0.5, 2.0).name('Beat Sensitivity');

    // Rainbow Colors
    const rainbowFolder = gui.addFolder('🌈 Rainbow Effect');
    rainbowFolder.add(this.params, 'rainbow').name('Enable Rainbow');
    rainbowFolder.add(this.params, 'rainbowSpeed', 0.1, 5.0).name('Speed');

    gui.close();
  }

  applyTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return;

    this.params.primaryColor = theme.primary;
    this.params.secondaryColor = theme.secondary;
    this.params.accentColor = theme.accent;

    this.scene.background = new THREE.Color(theme.bg);
    this.scene.fog = new THREE.FogExp2(theme.bg, 0.05);

    this.updateColors();
  }

  updateColors() {
    const primary = new THREE.Color(this.params.primaryColor);
    const secondary = new THREE.Color(this.params.secondaryColor);

    if (this.sphereUniforms) {
      this.sphereUniforms.uColor1.value = primary;
      this.sphereUniforms.uColor2.value = secondary;
    }

    this.barMeshes.forEach((bar, i) => {
      const color = primary.clone().lerp(secondary, i / this.barMeshes.length);
      bar.material.color = color;
      bar.material.emissive = color;
    });

    if (this.waveformLine) {
      this.waveformLine.material.color = primary;
    }
  }

  updateRainbowColors(time) {
    const speed = this.params.rainbowSpeed;
    const hue1 = (time * speed * 0.1) % 1;
    const hue2 = (time * speed * 0.1 + 0.5) % 1;

    const color1 = new THREE.Color().setHSL(hue1, 1, 0.5);
    const color2 = new THREE.Color().setHSL(hue2, 1, 0.5);

    this.params.primaryColor = '#' + color1.getHexString();
    this.params.secondaryColor = '#' + color2.getHexString();

    // Update dat.GUI controllers if needed (manual sync)
    // this.updateColors() will apply the new colors to objects
    this.updateColors();
  }

  toggleMicrophone() {
    if (this.useMicrophone) {
      this.useMicrophone = false;
      console.log('Microphone disabled');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);

        this.useMicrophone = true;
        this.isPlaying = true;
        console.log('🎤 Microphone enabled');
      })
      .catch(err => {
        console.error('Microphone error:', err);
        alert('Could not access microphone');
      });
  }

  toggleDesktopAudio() {
    // Check if browser supports getDisplayMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert('Your browser does not support capturing system audio.');
      return;
    }

    navigator.mediaDevices.getDisplayMedia({
      video: true, // Video is required to capture audio
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })
      .then(stream => {
        // We only need the audio
        const audioTrack = stream.getAudioTracks()[0];

        if (!audioTrack) {
          stream.getTracks().forEach(track => track.stop());
          alert('No audio track found. Did you check "Share Audio"?');
          return;
        }

        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } else if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
        // Don't connect to destination to avoid feedback loop if capturing own output
        // But for system audio, we usually want to hear it, so it depends.
        // If capturing "system audio" it usually means "what I hear", so we don't need to output it again.

        console.log('🖥️ Desktop Audio enabled');
        this.isPlaying = true;
        this.useMicrophone = false;
        this.params.rainbow = true; // Fun default
        this.updateRainbowColors(0);

        // Stop stream when track ends (user clicks "Stop Sharing")
        audioTrack.onended = () => {
          console.log('Desktop Audio stopped');
          if (this.analyser) {
            this.analyser.disconnect();
          }
        };
      })
      .catch(err => {
        console.error('Desktop Audio error:', err);
      });
  }

  attachEventListeners() {
    this.audioFileInput.addEventListener('change', this.handleAudioFile);
    window.addEventListener('resize', this.onWindowResize);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Drag & Drop
    this.initDragDrop();

    // Fullscreen button
    this.initFullscreen();

    // Hamburger menu
    this.initHamburgerMenu();
  }

  handleKeyboard(e) {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.togglePlayPause();
        break;
      case 'KeyF':
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case 'KeyM':
        e.preventDefault();
        this.toggleMute();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.seek(-5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.seek(5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.adjustVolume(0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.adjustVolume(-0.1);
        break;
    }
  }

  togglePlayPause() {
    if (!this.audioPlayer.src) return;
    if (this.audioPlayer.paused) {
      this.audioPlayer.play();
    } else {
      this.audioPlayer.pause();
    }
  }

  toggleMute() {
    this.audioPlayer.muted = !this.audioPlayer.muted;
  }

  seek(seconds) {
    if (!this.audioPlayer.src) return;
    this.audioPlayer.currentTime = Math.max(0, Math.min(
      this.audioPlayer.duration,
      this.audioPlayer.currentTime + seconds
    ));
  }

  adjustVolume(delta) {
    this.audioPlayer.volume = Math.max(0, Math.min(1, this.audioPlayer.volume + delta));
  }

  initDragDrop() {
    const dropOverlay = document.getElementById('dropOverlay');
    if (!dropOverlay) return;

    let dragCounter = 0;

    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer.types.includes('Files')) {
        dropOverlay.classList.add('active');
      }
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        dropOverlay.classList.remove('active');
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.classList.remove('active');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/')) {
          this.loadAudioFile(file);
        }
      }
    });
  }

  initFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    document.addEventListener('fullscreenchange', () => {
      this.onWindowResize();
    });
  }

  toggleFullscreen() {
    const container = document.querySelector('.visualizer-container') || document.documentElement;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.log('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');

    if (hamburgerBtn && navLinks) {
      hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
      });

      // Close menu when clicking a link
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          hamburgerBtn.classList.remove('active');
          navLinks.classList.remove('active');
        });
      });
    }
  }

  showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.add('active');
  }

  hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.remove('active');
  }

  loadAudioFile(file) {
    if (!file) return;

    console.log('Loading:', file.name);
    this.showLoading();

    // Create audio context on user interaction (required by browsers)
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Only create analyser if not already created
    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
    }
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const fileURL = URL.createObjectURL(file);
    this.audioPlayer.src = fileURL;
    this.audioPlayer.load();

    this.audioPlayer.addEventListener('canplaythrough', () => {
      this.hideLoading();
    }, { once: true });

    this.audioPlayer.play().then(() => {
      console.log('▶️ Playing:', file.name);
      this.hideLoading();

      // Only create media element source once
      if (!this.audioSource) {
        this.audioSource = this.audioContext.createMediaElementSource(this.audioPlayer);
        this.audioSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }

      this.isPlaying = true;
      this.useMicrophone = false;
    }).catch(err => {
      console.error('Playback error:', err);
      this.hideLoading();
      alert('Could not play audio file. Try clicking the play button manually.');
    });
  }

  handleAudioFile(e) {
    const file = e.target.files[0];
    this.loadAudioFile(file);
  }

  analyzeFrequencies() {
    if (!this.analyser || !this.dataArray) {
      this.frequencyBands = { bass: 0.05, mid: 0.05, treble: 0.05, average: 0.05 };
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    const bufferLength = this.dataArray.length;
    const bassEnd = Math.floor(bufferLength * 0.1);
    const midEnd = Math.floor(bufferLength * 0.5);

    let bassSum = 0, midSum = 0, trebleSum = 0;

    for (let i = 0; i < bassEnd; i++) {
      bassSum += this.dataArray[i];
    }
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += this.dataArray[i];
    }
    for (let i = midEnd; i < bufferLength; i++) {
      trebleSum += this.dataArray[i];
    }

    this.frequencyBands.bass = (bassSum / bassEnd / 255) * this.params.bassReactivity;
    this.frequencyBands.mid = (midSum / (midEnd - bassEnd) / 255) * this.params.reactivity;
    this.frequencyBands.treble = (trebleSum / (bufferLength - midEnd) / 255) * this.params.reactivity;
    this.frequencyBands.average = (this.frequencyBands.bass + this.frequencyBands.mid + this.frequencyBands.treble) / 3;

    // Beat detection
    this.detectBeat();
  }

  detectBeat() {
    const currentEnergy = this.frequencyBands.bass;
    const threshold = this.beatDetector.energy * this.params.beatSensitivity;

    if (this.beatDetector.beatCooldown > 0) {
      this.beatDetector.beatCooldown--;
    }

    if (currentEnergy > threshold && currentEnergy > 0.3 && this.beatDetector.beatCooldown === 0) {
      this.beatDetector.lastBeat = 1.0;
      this.beatDetector.beatCooldown = 10; // Cooldown frames
      this.onBeat();
    }

    this.beatDetector.lastBeat *= 0.9;
    this.beatDetector.energy = this.beatDetector.energy * this.beatDetector.decay + currentEnergy * (1 - this.beatDetector.decay);
  }

  onBeat() {
    // Camera shake
    if (this.params.cameraShakeOnBeat) {
      this.cameraShake.intensity = 0.1;
    }

    // Particle burst
    if (this.params.particlesOnBeat && this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      const velocities = this.particles.velocities;

      for (let i = 0; i < velocities.length; i++) {
        velocities[i].x += (Math.random() - 0.5) * 0.2;
        velocities[i].y += (Math.random() - 0.5) * 0.2;
        velocities[i].z += (Math.random() - 0.5) * 0.2;
      }
    }
  }

  updateSphere(time) {
    if (!this.sphereMesh || !this.sphereUniforms) return;

    // Idle breathing animation when no audio
    const isIdle = this.frequencyBands.average < 0.1;
    let idleBreathing = 0;
    let idleMorph = 0;

    if (isIdle) {
      // Slow breathing scale animation
      idleBreathing = Math.sin(time * 0.5) * 0.08;
      // Gentle morphing effect
      idleMorph = Math.sin(time * 0.3) * 0.05;

      // Apply breathing scale
      const baseScale = 1 + idleBreathing;
      this.sphereMesh.scale.set(baseScale, baseScale, baseScale);
    } else {
      // Reset scale when audio is playing
      this.sphereMesh.scale.set(1, 1, 1);
    }

    this.sphereUniforms.uTime.value = time;
    this.sphereUniforms.uBass.value = this.frequencyBands.bass + idleMorph;
    this.sphereUniforms.uMid.value = this.frequencyBands.mid + idleMorph * 0.5;
    this.sphereUniforms.uTreble.value = this.frequencyBands.treble;
    this.sphereUniforms.uBeat.value = this.beatDetector.lastBeat;
    this.sphereUniforms.uReactivity.value = this.params.reactivity;

    this.sphereMesh.rotation.y += this.params.sphereRotationSpeed * (1 + this.frequencyBands.bass);
    this.sphereMesh.rotation.x += this.params.sphereRotationSpeed * 0.5;
  }

  updateBars() {
    if (!this.dataArray) {
      // Idle pulsing animation for bars
      const time = this.clock.getElapsedTime();
      this.barMeshes.forEach((bar, i) => {
        const idlePulse = 0.3 + Math.sin(time * 0.8 + i * 0.15) * 0.15;
        bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, idlePulse, 0.1);
        bar.position.y = bar.scale.y / 2;
        bar.material.emissiveIntensity = 0.3 + Math.sin(time + i * 0.1) * 0.2;
      });
      return;
    }

    const step = Math.floor(this.dataArray.length / this.barMeshes.length);

    this.barMeshes.forEach((bar, i) => {
      const value = this.dataArray[i * step] / 255;
      const targetHeight = 0.1 + value * 3 * this.params.reactivity;

      bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, targetHeight, 0.3);
      bar.position.y = bar.scale.y / 2;

      // Color based on frequency
      const hue = (i / this.barMeshes.length) * 0.3;
      bar.material.emissiveIntensity = 0.3 + value * 0.7;
    });
  }

  updateParticles(time) {
    if (!this.particles || !this.particleSystem) return;

    const positions = this.particles.geometry.attributes.position.array;
    const velocities = this.particles.velocities;

    for (let i = 0; i < velocities.length; i++) {
      const i3 = i * 3;

      // Apply velocity
      positions[i3] += velocities[i].x * (1 + this.frequencyBands.bass);
      positions[i3 + 1] += velocities[i].y * (1 + this.frequencyBands.mid);
      positions[i3 + 2] += velocities[i].z * (1 + this.frequencyBands.treble);

      // Return to original position
      velocities[i].x *= 0.98;
      velocities[i].y *= 0.98;
      velocities[i].z *= 0.98;

      positions[i3] += (velocities[i].originalX - positions[i3]) * 0.01;
      positions[i3 + 1] += (velocities[i].originalY - positions[i3 + 1]) * 0.01;
      positions[i3 + 2] += (velocities[i].originalZ - positions[i3 + 2]) * 0.01;

      // Orbit
      const angle = time * this.params.particleSpeed + i * 0.01;
      positions[i3] += Math.sin(angle) * 0.01;
      positions[i3 + 2] += Math.cos(angle) * 0.01;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.rotation.y += 0.001 * (1 + this.frequencyBands.average);
  }

  updateWaveform() {
    if (!this.waveformLine) return;

    const positions = this.waveformLine.geometry.attributes.position.array;
    const time = this.clock.getElapsedTime();

    if (!this.dataArray) {
      // Ambient wave animation when no audio
      for (let i = 0; i < positions.length / 3; i++) {
        const x = (i / (positions.length / 3)) * Math.PI * 4;
        const ambientWave = Math.sin(x + time * 0.5) * 0.2 + Math.sin(x * 2 + time * 0.8) * 0.1;
        positions[i * 3 + 1] = ambientWave;
      }
      this.waveformLine.geometry.attributes.position.needsUpdate = true;
      return;
    }

    const step = Math.floor(this.dataArray.length / (positions.length / 3));

    for (let i = 0; i < positions.length / 3; i++) {
      const value = this.dataArray[i * step] / 255;
      positions[i * 3 + 1] = value * 2 * this.params.reactivity - 1;
    }

    this.waveformLine.geometry.attributes.position.needsUpdate = true;
  }

  updateCamera(time) {
    // Auto rotate
    if (this.params.autoRotate) {
      this.sphericalCoords.theta += this.params.autoRotateSpeed * 0.01;
      this.updateCameraPosition(this.sphericalCoords);
    }

    // Camera shake
    if (this.cameraShake.intensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake.intensity;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake.intensity;
      this.cameraShake.intensity *= this.cameraShake.decay;
    }

    // Camera pulse with bass
    if (this.params.cameraPulse) {
      const bassPulse = 1 + this.frequencyBands.bass * 0.1;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 75 * bassPulse, 0.1);
      this.camera.updateProjectionMatrix();
    }

    this.camera.lookAt(this.cameraTarget);
  }

  updateBackgroundStars(time) {
    if (!this.backgroundStars) return;
    this.backgroundStars.rotation.y = time * 0.02;
    this.backgroundStars.rotation.x = time * 0.01;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const time = this.clock.getElapsedTime();

    // Rainbow effect
    if (this.params.rainbow) {
      this.updateRainbowColors(time);
    }

    // Analyze audio
    this.analyzeFrequencies();

    // Update visualizers
    this.updateSphere(time);
    this.updateBars();
    this.updateParticles(time);
    this.updateWaveform();
    this.updateBackgroundStars(time);

    // Update camera
    this.updateCamera(time);

    // Render
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.audioFileInput.removeEventListener('change', this.handleAudioFile);
    window.removeEventListener('resize', this.onWindowResize);

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.particleBackground = new ParticleBackground();
  window.visualizer = new AudioVisualizer();
});
