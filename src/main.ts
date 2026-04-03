import Stats from 'stats.js';

import { GameLoop } from './core/GameLoop';
import { GameObject } from './core/GameObject';
import { Logger } from './core/Logger';
import { State } from './core/State';
import { Vector } from './core/Vector';
import { CollisionSystem } from './core/collision/CollisionSystem';
import { ColorSpriteFontGenerator } from './core/graphics/ColorSpriteFontGenerator';
import { AudioLoader } from './core/loaders/AudioLoader';
import { ImageLoader } from './core/loaders/ImageLoader';
import { RectFontLoader } from './core/loaders/RectFontLoader';
import { SpriteFontLoader } from './core/loaders/SpriteFontLoader';
import { SpriteLoader } from './core/loaders/SpriteLoader';
import { createPixiApp } from './core/render/PixiApp';
import { PixiTextureManager } from './core/render/PixiTextureManager';
import { PixiRenderer } from './core/render/PixiRenderer';
import { DebugGameLoopMenu } from './debug/DebugGameLoopMenu';
import { DebugInspector } from './debug/DebugInspector';
import { AudioManager } from './game/AudioManager';
import { GameState } from './game/GameState';
import { GameStorage } from './game/GameStorage';
import { GameContext } from './game/GameUpdateArgs';
import { Session } from './game/Session';
import { InputHintSettings } from './input/InputHintSettings';
import { InputManager } from './input/InputManager';
import { ManifestMapListReader } from './map/ManifestMapListReader';
import { MapLoader } from './map/MapLoader';
import { PointsHighscoreManager } from './points/PointsHighscoreManager';
import { GameSceneRouter } from './scenes/GameSceneRouter';
import { GameSceneType } from './scenes/GameSceneType';

import * as config from './config';

import audioManifest from '../data/audio.manifest.json';
import spriteManifest from '../data/sprite.manifest.json';
import spriteFontConfig from '../data/fonts/sprite-font.json';
import rectFontConfig from '../data/fonts/rect-font.json';
import mapManifest from '../data/map.manifest.json';

const loadingElement = document.querySelector('[data-loading]');

const log = new Logger('main', Logger.Level.Debug);

const pixiApp = createPixiApp({
  width: config.CANVAS_WIDTH,
  height: config.CANVAS_HEIGHT,
});

const textureManager = new PixiTextureManager(spriteManifest);

let pixiRenderer: PixiRenderer;

const gameStorage = new GameStorage(config.STORAGE_NAMESPACE);
gameStorage.load();

const inputManager = new InputManager(gameStorage);
inputManager.listen();

const audioLoader = new AudioLoader(audioManifest);
const imageLoader = new ImageLoader();

const spriteFontLoader = new SpriteFontLoader(imageLoader);
spriteFontLoader.register(config.PRIMARY_SPRITE_FONT_ID, spriteFontConfig);

const colorSpriteFontGenerator = new ColorSpriteFontGenerator(spriteFontLoader);
colorSpriteFontGenerator.register(
  config.PRIMARY_SPRITE_FONT_ID,
  config.COLOR_BLACK,
);

const spriteLoader = new SpriteLoader(imageLoader, spriteManifest);

const rectFontLoader = new RectFontLoader();
rectFontLoader.register(config.PRIMARY_RECT_FONT_ID, rectFontConfig, {
  scale: config.TILE_SIZE_SMALL,
});

const manifestMapListReader = new ManifestMapListReader(mapManifest);
const mapLoader = new MapLoader(manifestMapListReader);

const audioManager = new AudioManager(audioLoader, gameStorage);
audioManager.loadSettings();

const session = new Session();

const inputHintSettings = new InputHintSettings(gameStorage);

const pointsHighscoreManager = new PointsHighscoreManager(gameStorage);

const collisionSystem = new CollisionSystem();

const sceneRouter = new GameSceneRouter();
sceneRouter.start(GameSceneType.MainMenu);
sceneRouter.transitionStarted.addListener(() => {
  collisionSystem.reset();
});

const debugInspector = new DebugInspector(pixiApp.view as HTMLCanvasElement);
debugInspector.listen();
debugInspector.click.addListener((position: Vector) => {
  const intersections: GameObject[] = [];

  const scene = sceneRouter.getCurrentScene();
  scene.getRoot().traverseDescedants((child) => {
    if (child.getWorldBoundingBox().containsPoint(position)) {
      intersections.push(child);
    }
  });
  log.debug(intersections);
});

const gameState = new State<GameState>(GameState.Playing);

const gameContext: GameContext = {
  audioManager,
  audioLoader,
  collisionSystem,
  colorSpriteFontGenerator,
  imageLoader,
  inputHintSettings,
  inputManager,
  gameState,
  mapLoader,
  pointsHighscoreManager,
  rectFontLoader,
  session,
  spriteFontLoader,
  spriteLoader,
};

const gameLoop = new GameLoop();

const stats = new Stats();
const debugGameLoopMenu = new DebugGameLoopMenu(gameLoop);

if (config.IS_DEV) {
  document.body.appendChild(stats.dom);
  debugGameLoopMenu.attach();
}

gameLoop.tick.addListener((event) => {
  stats.begin();

  inputManager.update();

  const scene = sceneRouter.getCurrentScene();
  scene.invokeUpdate(gameContext, event.deltaTime);

  pixiRenderer.render(scene.getRoot());

  gameState.update();

  stats.end();
});

async function main(): Promise<void> {
  log.time('Audio preload');
  loadingElement.textContent = 'Loading audio...';
  await audioLoader.preloadAllAsync();
  log.timeEnd('Audio preload');

  log.time('Rect font preload');
  loadingElement.textContent = 'Loading rects fonts...';
  await rectFontLoader.preloadAll();
  log.timeEnd('Rect font preload');

  log.time('Sprite font preload');
  loadingElement.textContent = 'Loading sprite fonts...';
  await spriteFontLoader.preloadAllAsync();
  log.timeEnd('Sprite font preload');

  log.time('Color sprite font generation');
  loadingElement.textContent = 'Generating sprite font colors...';
  colorSpriteFontGenerator.generate(
    config.PRIMARY_SPRITE_FONT_ID,
    config.COLOR_WHITE,
  );
  colorSpriteFontGenerator.generate(
    config.PRIMARY_SPRITE_FONT_ID,
    config.COLOR_GRAY,
  );
  colorSpriteFontGenerator.generate(
    config.PRIMARY_SPRITE_FONT_ID,
    config.COLOR_RED,
  );
  colorSpriteFontGenerator.generate(
    config.PRIMARY_SPRITE_FONT_ID,
    config.COLOR_YELLOW,
  );
  log.timeEnd('Color sprite font generation');

  log.time('Sprites preload');
  loadingElement.textContent = 'Loading sprites...';
  await spriteLoader.preloadAllAsync();
  log.timeEnd('Sprites preload');

  log.time('PixiJS textures preload');
  loadingElement.textContent = 'Loading PixiJS textures...';
  await textureManager.preload();
  log.timeEnd('PixiJS textures preload');

  pixiRenderer = new PixiRenderer({
    width: config.CANVAS_WIDTH,
    height: config.CANVAS_HEIGHT,
    app: pixiApp,
    textureManager,
  });
  pixiRenderer.buildTextureCache(spriteManifest);

  log.time('Input bindings load');
  loadingElement.textContent = 'Loading input bindings...';
  inputManager.loadAllBindings();
  log.timeEnd('Input bindings load');

  document.body.removeChild(loadingElement);
  document.body.appendChild(pixiApp.view as HTMLCanvasElement);

  gameLoop.start();
  // gameLoop.next();
}

main().catch((err) => {
  console.error('Failed to start game:', err);
  loadingElement.textContent = `ERROR: ${err.message}`;
});

if (config.IS_DEV) {
  window.gameLoop = gameLoop;
}
