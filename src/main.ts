import './main.css';

import { installErrorReporter, reportManual } from './core/ErrorReporter';
import { Logger } from './core/Logger';
import { Analytics } from './analytics/Analytics';

installErrorReporter();

const analytics = new Analytics();
analytics.init();
import { State } from './core/State';
import { CollisionSystem } from './core/collision/CollisionSystem';
import { AudioLoader } from './core/loaders/AudioLoader';
import { ImageLoader } from './core/loaders/ImageLoader';
import { RectFontLoader } from './core/loaders/RectFontLoader';
import { SpriteFontLoader } from './core/loaders/SpriteFontLoader';
import { SpriteLoader } from './core/loaders/SpriteLoader';
import { createPhaserGame } from './core/render/PhaserGame';
import { AudioManager } from './game/AudioManager';
import { GameState } from './game/GameState';
import { GameStorage } from './game/GameStorage';
import { GameContext } from './game/GameUpdateArgs';
import { Session } from './game/Session';
import { InputHintSettings } from './input/InputHintSettings';
import { DebugSettings } from './debug/DebugSettings';
import { ScreenShakeSettings } from './game/ScreenShakeSettings';
import { InputManager } from './input/InputManager';
import { ManifestMapListReader } from './map/MapListReaders';
import { MapLoader } from './map/MapLoader';
import { AchievementsManager } from './achievements/AchievementsManager';
import { AchievementsTracker } from './achievements/AchievementsTracker';
import { ContinueManager } from './progress/ContinueManager';
import { LevelProgressManager } from './progress/LevelProgressManager';
import { PointsHighscoreManager } from './points/PointsHighscoreManager';
import { GameStatsManager } from './stats/GameStatsManager';
import { GameSceneRouter } from './scenes/GameSceneRouter';

import * as config from './config';

import audioManifest from '../data/audio.manifest.json';
import spriteManifest from '../data/sprite.manifest.json';
import spriteFontConfig from '../data/fonts/sprite-font.json';
import rectFontConfig from '../data/fonts/rect-font.json';
import mapManifest from '../data/maps/manifest.json';

const loadingElement = document.querySelector('[data-loading]');

const log = new Logger(
  'main',
  import.meta.env.PROD ? Logger.Level.Warn : Logger.Level.Debug,
);

const gameStorage = new GameStorage(config.STORAGE_NAMESPACE);
gameStorage.load();

const inputManager = new InputManager(gameStorage);

const audioLoader = new AudioLoader(audioManifest);
const imageLoader = new ImageLoader();

const spriteFontLoader = new SpriteFontLoader(imageLoader);
spriteFontLoader.register(config.PRIMARY_SPRITE_FONT_ID, spriteFontConfig);

const spriteLoader = new SpriteLoader(imageLoader, spriteManifest);

const rectFontLoader = new RectFontLoader();
rectFontLoader.register(config.PRIMARY_RECT_FONT_ID, rectFontConfig, {
  scale: config.TILE_SIZE_SMALL,
});

const manifestMapListReader = new ManifestMapListReader(mapManifest, 'Original');
const mapLoader = new MapLoader(manifestMapListReader);

const audioManager = new AudioManager(audioLoader, gameStorage);
audioManager.loadSettings();

const session = new Session();

const inputHintSettings = new InputHintSettings(gameStorage);
const debugSettings = new DebugSettings(gameStorage);
const screenShakeSettings = new ScreenShakeSettings(gameStorage);

const achievementsManager = new AchievementsManager(gameStorage);
const achievementsTracker = new AchievementsTracker();
const gameStatsManager = new GameStatsManager(gameStorage);

const levelProgressManager = new LevelProgressManager(gameStorage);
const continueManager = new ContinueManager(gameStorage);
const pointsHighscoreManager = new PointsHighscoreManager(gameStorage);

const collisionSystem = new CollisionSystem();

const gameState = new State<GameState>(GameState.Playing);

const sceneNavigator = new GameSceneRouter(analytics);

const gameContext: GameContext = {
  debugSettings,
  achievementsManager,
  achievementsTracker,
  analytics,
  gameStatsManager,
  audioManager,
  audioLoader,
  collisionSystem,
  imageLoader,
  inputHintSettings,
  inputManager,
  gameState,
  continueManager,
  levelProgressManager,
  mapLoader,
  pointsHighscoreManager,
  rectFontLoader,
  sceneNavigator,
  screenShakeSettings,
  session,
  spriteFontLoader,
  spriteLoader,
};


async function main(): Promise<void> {
  log.time('Rect font preload');
  loadingElement!.textContent ='Loading rects fonts...';
  await rectFontLoader.preloadAll();
  log.timeEnd('Rect font preload');

  log.time('Sprite font preload');
  loadingElement!.textContent ='Loading sprite fonts...';
  await spriteFontLoader.preloadAllAsync();
  log.timeEnd('Sprite font preload');

  log.time('Sprites preload');
  loadingElement!.textContent ='Loading sprites...';
  await spriteLoader.preloadAllAsync();
  log.timeEnd('Sprites preload');

  log.time('Input bindings load');
  loadingElement!.textContent ='Loading input bindings...';
  inputManager.loadAllBindings();
  log.timeEnd('Input bindings load');

  document.body.removeChild(loadingElement!);

  // Create Phaser game — it will append its own canvas to document.body
  const phaserGame = createPhaserGame({
    width: config.CANVAS_WIDTH,
    height: config.CANVAS_HEIGHT,
  });

  // Initialise touch virtual gamepad now that the canvas exists in the DOM
  inputManager.initTouchDevice();

  // Inject the game context into the Phaser registry BEFORE BridgeScene.create() runs
  phaserGame.registry.set('gameContext', gameContext);
}

main().catch((err) => {
  reportManual(err);
  loadingElement!.textContent =`ERROR: ${err.message}`;
});

if (config.IS_PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
