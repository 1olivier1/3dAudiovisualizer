/* ProxySoul Visualizer v2 - Three modes: sphere, bars, waveform */
(function(){
  const canvas = document.getElementById('canvas');
  const modeSel = document.getElementById('mode');
  const sensRange = document.getElementById('sensitivity');
  const smoothingRange = document.getElementById('smoothing');
  const colorInput = document.getElementById('color');
  const playPauseBtn = document.getElementById('playPause');
  const micBtn = document.getElementById('micBtn');
  const fullscreenBtn = document.getElementById('fullscreen');
  const screenshotBtn = document.getElementById('screenshot');
  const rgbBtn = document.getElementById('rgbToggle');
  const fileInput = document.getElementById('fileInput');
  const dropHint = document.getElementById('dropHint');

  // THREE core
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);

  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(0, 1.2, 5);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Lights
  const hemi = new THREE.HemisphereLight(0x88ccff, 0x000011, 0.6);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.4);
  dir.position.set(2,3,2);
  scene.add(dir);

  // Grid + axes (toggle)
  const grid = new THREE.GridHelper(10,10,0x113333,0x112222);
  grid.visible = false;
  scene.add(grid);

  // Post-processing
  const composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.0, 0.2, 0.85);
  composer.addPass(bloom);
  let bloomEnabled = true;

  // RGB color cycling + reactive bloom
  let rgbEnabled = true; // default ON per user pref
  let hue = 0.0; // 0..1
  const baseBloom = 0.7; // base strength
  bloom.strength = baseBloom;

  rgbBtn?.addEventListener('click', ()=>{
    rgbEnabled = !rgbEnabled;
    rgbBtn.classList.toggle('active', rgbEnabled);
  });


  // Audio
  let audioCtx, analyser, sourceNode, dataArray, timeData;
  let usingMic = false;
  let playingEl; // <audio> element when using file
  const fftSize = 2048;

  function ensureAudio(){
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = parseFloat(smoothingRange.value);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);
    }
  }

  function connectSource(node){
    if(sourceNode) try{ sourceNode.disconnect(); }catch{}
    node.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  async function useMic(){
    ensureAudio();
    if(playingEl){ playingEl.pause(); }
    if(usingMic && sourceNode) return;
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mic = audioCtx.createMediaStreamSource(stream);
      sourceNode = mic;
      usingMic = true;
      connectSource(sourceNode);
      playPauseBtn.textContent = "Live";
    }catch(e){
      alert("Mic permission denied");
    }
  }

  function useFile(file){
    ensureAudio();
    const url = URL.createObjectURL(file);
    if(!playingEl){
      playingEl = new Audio();
      playingEl.crossOrigin = "anonymous";
      playingEl.addEventListener('ended', ()=> playPauseBtn.textContent = "Play");
    }
    playingEl.src = url;
    const elSource = audioCtx.createMediaElementSource(playingEl);
    sourceNode = elSource;
    usingMic = false;
    connectSource(sourceNode);
    playingEl.play();
    playPauseBtn.textContent = "Pause";
  }

  playPauseBtn.addEventListener('click', ()=>{
    if(usingMic){
      // no-op for live
      return;
    }
    if(!playingEl){ return; }
    if(playingEl.paused){
      playingEl.play(); playPauseBtn.textContent = "Pause";
    }else{
      playingEl.pause(); playPauseBtn.textContent = "Play";
    }
  });
  micBtn.addEventListener('click', useMic);
  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files[0];
    if(f) useFile(f);
  });

  // Drag & drop
  function showHint(show){ dropHint.style.display = show ? 'block' : 'none'; }
  document.addEventListener('dragenter', e=>{ e.preventDefault(); showHint(true); });
  document.addEventListener('dragover', e=>{ e.preventDefault(); });
  document.addEventListener('dragleave', e=>{ e.preventDefault(); showHint(false); });
  document.addEventListener('drop', e=>{
    e.preventDefault(); showHint(false);
    const file = e.dataTransfer.files?.[0];
    if(file) useFile(file);
  });

  // Fullscreen & screenshot
  fullscreenBtn.addEventListener('click', ()=>{
    if(!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
  screenshotBtn.addEventListener('click', ()=>{
    const link = document.createElement('a');
    link.download = `proxysoul-visualizer-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // Resize
  addEventListener('resize', ()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  // Keyboard
  addEventListener('keydown', (e)=>{
    if(e.key.toLowerCase()==='u'){ document.body.classList.toggle('hide-ui'); }
    if(e.key.toLowerCase()==='b'){ bloomEnabled = !bloomEnabled; }
    if(e.key.toLowerCase()==='g'){ grid.visible = !grid.visible; }
    if(e.key.toLowerCase()==='r'){ camera.position.set(0,1.2,5); controls.target.set(0,0,0); }
  });

  
  function setColorFromHue(h, sat=1.0, light=0.5){
    const c = new THREE.Color().setHSL((h%1+1)%1, THREE.MathUtils.clamp(sat,0,1), THREE.MathUtils.clamp(light,0,1));
    if(sphereUniforms) sphereUniforms.uColor.value = c;
    if(bars) bars.material.color.copy(c);
    if(lineMat) lineMat.color.copy(c);
  }

  // -------- Visual Modes -------- //
  const group = new THREE.Group();
  scene.add(group);

  // Common color accessor
  function currentColor(){
    const c = new THREE.Color(colorInput.value);
    return c;
  }

  // Sphere (shader displacement)
  let sphereMesh, sphereUniforms;
  const noiseGLSL = `
    vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x,289.0); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
    float cnoise(vec3 P){
      vec3 Pi0 = floor(P), Pi1 = Pi0 + vec3(1.0);
      vec3 Pf0 = fract(P), Pf1 = Pf0 - vec3(1.0);
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
      vec4 iz0 = vec4(Pi0.z), iz1 = vec4(Pi1.z);
      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0), ixy1 = permute(ixy + iz1);
      vec4 gx0 = ixy0 * (1.0/7.0);
      vec4 gy0 = fract(floor(gx0) * (1.0/7.0)) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.75) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0*(step(0.0,gx0)-0.5); gy0 -= sz0*(step(0.0,gy0)-0.5);
      vec4 gx1 = ixy1 * (1.0/7.0);
      vec4 gy1 = fract(floor(gx1) * (1.0/7.0)) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.75) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1*(step(0.0,gx1)-0.5); gy1 -= sz1*(step(0.0,gy1)-0.5);
      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x), g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z), g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x), g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z), g111 = vec3(gx1.w,gy1.w,gz1.w);
      vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000),dot(g100,g100),dot(g010,g010),dot(g110,g110)));
      g000*=norm0.x; g100*=norm0.y; g010*=norm0.z; g110*=norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001),dot(g101,g101),dot(g011,g011),dot(g111,g111)));
      g001*=norm1.x; g101*=norm1.y; g011*=norm1.z; g111*=norm1.w;
      vec4 m0 = max(0.5 - vec4(dot(Pf0,Pf0),
        dot(vec3(Pf1.x,Pf0.yz),vec3(Pf1.x,Pf0.yz)),
        dot(vec3(Pf0.x,Pf1.y,Pf0.z),vec3(Pf0.x,Pf1.y,Pf0.z)),
        dot(Pf1,Pf1)), 0.0); m0 *= m0;
      vec4 m1 = max(0.5 - vec4(dot(vec3(Pf0.x,Pf0.y,Pf1.z),vec3(Pf0.x,Pf0.y,Pf1.z)),
        dot(vec3(Pf1.x,Pf1.y,Pf0.z),vec3(Pf1.x,Pf1.y,Pf0.z)),
        dot(vec3(Pf0.x,Pf1.yz),vec3(Pf0.x,Pf1.yz)),
        dot(Pf1,Pf1)), 0.0); m1 *= m1;
      float n0 = m0.x * dot(g000, Pf0);
      float n1 = m0.y * dot(g100, vec3(Pf1.x,Pf0.y,Pf0.z));
      float n2 = m0.z * dot(g010, vec3(Pf0.x,Pf1.y,Pf0.z));
      float n3 = m0.w * dot(g110, vec3(Pf1.x,Pf1.y,Pf0.z));
      float n4 = m1.x * dot(g001, vec3(Pf0.x,Pf0.y,Pf1.z));
      float n5 = m1.y * dot(g101, vec3(Pf1.x,Pf0.y,Pf1.z));
      float n6 = m1.z * dot(g011, vec3(Pf0.x,Pf1.y,Pf1.z));
      float n7 = m1.w * dot(g111, Pf1);
      return 42.0*(n0+n1+n2+n3+n4+n5+n6+n7);
    }
  `;
  const sphereVS = `
    uniform float uFreq; uniform float uTime; ${noiseGLSL}
    void main(){
      float d = 0.12 + (uFreq * 0.28);
      float n = cnoise(vec3(normal*1.2 + uTime*0.25));
      d += 0.25*n;
      vec3 np = position + normal * d;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(np,1.0);
    }
  `;
  const sphereFS = `
    uniform vec3 uColor;
    void main(){ gl_FragColor = vec4(uColor, 1.0); }
  `;

  function buildSphere(){
    disposeMode();
    sphereUniforms = { uFreq:{value:0}, uTime:{value:0}, uColor:{ value: currentColor() } };
    const mat = new THREE.ShaderMaterial({ uniforms:sphereUniforms, vertexShader:sphereVS, fragmentShader:sphereFS, wireframe:true });
    const geo = new THREE.SphereGeometry(1.2, 128, 128);
    sphereMesh = new THREE.Mesh(geo, mat);
    group.add(sphereMesh);
  }

  // Bars (circular instanced boxes)
  let bars, barsCount = 128, barsMatrix = new THREE.Matrix4();
  function buildBars(){
    disposeMode();
    barsCount = analyser ? analyser.frequencyBinCount : 128;
    const dummy = new THREE.Object3D();
    const geo = new THREE.BoxGeometry(0.06, 1, 0.06);
    const mat = new THREE.MeshStandardMaterial({ color: currentColor(), metalness:0.2, roughness:0.3 });
    bars = new THREE.InstancedMesh(geo, mat, barsCount);
    const radius = 2.2;
    for(let i=0;i<barsCount;i++){
      const a = (i/barsCount)*Math.PI*2;
      dummy.position.set(Math.cos(a)*radius, 0, Math.sin(a)*radius);
      dummy.rotation.y = -a;
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bars.setMatrixAt(i, dummy.matrix);
    }
    bars.instanceMatrix.needsUpdate = true;
    group.add(bars);
  }

  // Waveform (line)
  let line, lineGeo, lineMat;
  function buildWaveform(){
    disposeMode();
    const N = analyser ? analyser.fftSize : 2048;
    lineGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(N * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineMat = new THREE.LineBasicMaterial({ color: currentColor(), transparent:true });
    line = new THREE.Line(lineGeo, lineMat);
    line.position.y = 0.0;
    group.add(line);
  }

  function disposeMode(){
    while(group.children.length){
      const obj = group.children.pop();
      if(obj.geometry) obj.geometry.dispose();
      if(obj.material){
        if(Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose()); else obj.material.dispose();
      }
      if(obj.dispose) obj.dispose();
    }
    sphereMesh = null; bars = null; line = null; lineGeo = null; lineMat = null; sphereUniforms = null;
  }

  // Initial mode
  buildSphere();

  // Mode changes & UI reactivity
  modeSel.addEventListener('change', ()=>{
    if(modeSel.value==='sphere') buildSphere();
    if(modeSel.value==='bars') buildBars();
    if(modeSel.value==='waveform') buildWaveform();
  });
  colorInput.addEventListener('input', ()=>{
    if(rgbEnabled) return;
    const c = currentColor();
    if(sphereUniforms) sphereUniforms.uColor.value = c;
    if(bars) bars.material.color.copy(c);
    if(lineMat) lineMat.color.copy(c);
  });
  sensRange.addEventListener('input', ()=>{});
  smoothingRange.addEventListener('input', ()=>{
    if(analyser) analyser.smoothingTimeConstant = parseFloat(smoothingRange.value);
  });

  // Animation
  const tmpObj = new THREE.Object3D();
  const clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    controls.update();

    // Gather audio
    if(analyser){
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeData);
    }

    const sens = parseFloat(sensRange.value);
    const t = clock.getElapsedTime();

    // Audio-reactive bloom & RGB hue
    let bass = 0.0;
    if(analyser && dataArray){ bass = averageRange(dataArray, 0, 12) / 255; }
    if(bloomEnabled){
      bloom.strength = baseBloom + bass * sens * 1.4; // pump with bass
      bloom.threshold = 0.8 - Math.min(0.6, bass * 0.6); // subtle threshold shift
    }
    if(rgbEnabled){
      // speed scales slightly with bass for liveliness
      hue += 0.0015 + bass * 0.01;
      // saturation also ticks up with bass (0.7..1.0)
      const sat = 0.7 + bass * 0.3;
      setColorFromHue(hue, sat, 0.55);
    }

    if(sphereUniforms){
      const bass = averageRange(dataArray, 0, 12) / 255;
      sphereUniforms.uFreq.value = (bass||0) * sens * 0.6;
      sphereUniforms.uTime.value = t;
      group.rotation.y += 0.003;
    }

    if(bars){
      const radius = 2.2;
      for(let i=0;i<bars.count;i++){
        const v = (dataArray?.[i]||0)/255;
        const s = 0.4 + v * sens * 2.0;
        const a = (i/bars.count)*Math.PI*2;
        tmpObj.position.set(Math.cos(a)*radius, 0, Math.sin(a)*radius);
        tmpObj.rotation.y = -a;
        tmpObj.scale.set(1, s, 1);
        tmpObj.updateMatrix();
        bars.setMatrixAt(i, tmpObj.matrix);
      }
      bars.instanceMatrix.needsUpdate = true;
      group.rotation.y += 0.0015;
    }

    if(line && lineGeo){
      const pos = lineGeo.attributes.position.array;
      const N = (timeData?.length)||2048;
      const span = 4.0;
      for(let i=0;i<N;i++){
        const x = (i/N - 0.5) * span;
        const y = (((timeData?.[i]||128) - 128)/128) * 0.8 * sens;
        pos[i*3+0] = x;
        pos[i*3+1] = y;
        pos[i*3+2] = 0;
      }
      lineGeo.attributes.position.needsUpdate = true;
    }

    // Render
    if(bloomEnabled) composer.render(); else renderer.render(scene, camera);
  }
  animate();

  function averageRange(arr, start, len){
    if(!arr) return 0;
    let s=0; for(let i=0;i<len && (start+i)<arr.length;i++) s+=arr[start+i];
    return s/len;
  }
})();