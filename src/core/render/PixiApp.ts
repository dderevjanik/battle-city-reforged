import * as PIXI from 'pixi.js';

export interface PixiAppOptions {
  width: number;
  height: number;
  backgroundColor?: number;
}

let instance: PIXI.Application = null;

export function createPixiApp(options: PixiAppOptions): PIXI.Application {
  // Global defaults for pixel art rendering
  PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
  if (instance !== null) {
    return instance;
  }

  instance = new PIXI.Application({
    width: options.width,
    height: options.height,
    backgroundColor: options.backgroundColor ?? 0x000000,
    antialias: false,
  });

  // Disable the default ticker — we drive rendering from our own GameLoop
  instance.ticker.autoStart = false;
  instance.ticker.stop();

  return instance;
}

export function getPixiApp(): PIXI.Application {
  return instance;
}
