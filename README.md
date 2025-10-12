# ProxySoul 3D Audio Visualizer v2

Upgraded UI + new modes (Sphere, Bars, Waveform). Drag & drop audio, mic input, screenshots, fullscreen, and quick keyboard toggles.

## Features
- Three modes:
  - **Sphere** — shader-displaced wireframe sphere reactive to bass.
  - **Bars** — circular instanced bars reacting to full spectrum.
  - **Waveform** — oscilloscope-style time-domain line.
- **Modern glass UI**: mode switcher, sensitivity, smoothing, color, Play/Pause, Mic, Fullscreen, Screenshot.
- **Drag & drop** audio, or upload via button. Mic input supported (browser permission required).
- **Keyboard**: `U` toggle UI, `B` toggle bloom, `G` grid, `R` reset camera.
- **Mobile-friendly** (best on modern mobile/desktop browsers).

## Usage (GitHub Pages)
1. Create a repo (or use your existing one).
2. Copy these files to the repo root (or `/docs`) and commit.
3. In repo settings → Pages, set the branch to `main` and the folder you used (root or `/docs`).
4. Visit your GitHub Pages URL to run.

## Files
- `index.html` — shell & UI.
- `style.css` — glass aesthetic.
- `main.js` — Three.js logic, audio + modes.

## Credits
- Three.js for rendering
- Web Audio API for analysis

### New
- **RGB glow** button (default ON): auto rainbow cycling with bass-reactive saturation.
- **Audio-reactive bloom**: glow strength pulses with bass.
