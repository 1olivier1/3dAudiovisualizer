# 3dAudiovisualizer

A reactive 3D audio visualizer built with Three.js that creates beautiful visual representations of your music. The visualizer uses frequency data from audio files to animate a wireframe sphere and torus.

## Features

- Interactive 3D visualizations that react to audio frequencies
- Upload and play your own audio files
- Beautiful bloom effects with adjustable parameters
- Responsive design that works on different screen sizes

## How to Use

1. Visit the GitHub Pages site for this repository
2. Click the "Click to Start Visualizer" button (this is required due to browser audio policies)
3. Upload an audio file using the file input
4. Enjoy the visualization!
5. Adjust the bloom effect parameters using the control panel on the right

## Technical Details

This visualizer uses:

- Three.js for 3D rendering
- Web Audio API for audio analysis
- Custom GLSL shaders for dynamic vertex displacement
- UnrealBloomPass for post-processing effects
- dat.GUI for the control panel

## Browser Compatibility

This visualizer works best in modern browsers that support the Web Audio API and WebGL. Recommended browsers:

- Chrome
- Firefox
- Edge
- Safari (latest version)

## Development

To run this project locally:

1. Clone the repository
2. Open index.html in your browser or use a local server
3. For best results, use a local server to avoid CORS issues

## Troubleshooting

If you encounter issues:

- Ensure your browser supports the Web Audio API and WebGL
- Check the browser console for any errors
- Try using a different audio file (MP3 or WAV formats work best)
- Clear your browser cache or try in an incognito/private browsing window
