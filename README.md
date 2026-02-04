# 🎵 3D Audio Visualizer

<div align="center">

![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=for-the-badge&logo=webgl&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=github&logoColor=white)

**Experience your music in three dimensions**

[Live Demo](https://1olivier1.github.io/3dAudiovisualizer) • [Report Bug](https://github.com/1olivier1/3dAudiovisualizer/issues) • [Request Feature](https://github.com/1olivier1/3dAudiovisualizer/issues)

</div>

---

## ✨ Features

- 🎧 **Real-time Audio Analysis** — Uses Web Audio API to analyze frequency data in real-time
- 🌐 **3D WebGL Rendering** — Powered by Three.js for smooth 60 FPS visualization
- ✨ **Bloom Post-Processing** — Unreal Engine-style bloom effects with adjustable parameters
- 🎨 **Customizable Colors** — Real-time color picker to personalize your experience
- 📱 **Responsive Design** — Works on desktop and mobile devices
- 🔊 **Any Audio File** — Supports MP3, WAV, and other audio formats

## 🚀 Quick Start

1. Visit the [live demo](https://1olivier1.github.io/3dAudiovisualizer)
2. Click "Choose Audio File" and select your music
3. Enjoy the visualization!
4. Adjust bloom and color settings using the control panel

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Three.js** | 3D rendering and scene management |
| **Web Audio API** | Real-time audio frequency analysis |
| **GLSL Shaders** | Custom vertex displacement with Perlin noise |
| **UnrealBloomPass** | Post-processing glow effects |
| **dat.GUI** | Interactive control panel |

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/1olivier1/3dAudiovisualizer.git

# Navigate to the project
cd 3dAudiovisualizer

# Open with a local server (recommended)
npx serve .

# Or simply open index.html in your browser
```

## 🎛️ Controls

| Parameter | Description | Range |
|-----------|-------------|-------|
| Bloom Threshold | Brightness threshold for bloom | 0.0 - 1.0 |
| Bloom Strength | Intensity of the glow effect | 0.0 - 3.0 |
| Bloom Radius | Spread of the bloom effect | 0.0 - 1.0 |
| Sphere Color | Color of the visualizer mesh | Any color |

## 🌐 Browser Support

| Browser | Supported |
|---------|-----------|
| Chrome | ✅ |
| Firefox | ✅ |
| Edge | ✅ |
| Safari | ✅ (latest) |

## 🔧 Troubleshooting

- **No visualization?** Make sure WebGL is enabled in your browser
- **No sound?** Check browser console for audio context errors; try clicking the page first
- **Performance issues?** Try a smaller browser window or lower device pixel ratio

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Connect

- **YouTube:** [@proxisol](https://youtube.com/@proxisol)
- **TikTok:** [@1proxisol](https://tiktok.com/@1proxisol)
- **Instagram:** [@proxibuilds](https://instagram.com/proxibuilds)
- **GitHub:** [@1olivier1](https://github.com/1olivier1)

---

<div align="center">
  Made with 🎵 and Three.js by <a href="https://github.com/1olivier1">ProxiSol</a>
</div>
