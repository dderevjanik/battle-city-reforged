const { Window } = require('happy-dom');

const window = new Window();

// Expose browser globals to Node.js global scope for tests
const globals = [
  'document',
  'navigator',
  'window',
  'HTMLCanvasElement',
  'CanvasRenderingContext2D',
  'Image',
  'Audio',
  'localStorage',
  'performance',
  'requestAnimationFrame',
  'cancelAnimationFrame',
];

globals.forEach((key) => {
  if (window[key] !== undefined) {
    global[key] = window[key];
  }
});

global.window = window;
