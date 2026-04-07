import { State } from '../core/State';
import { CollisionSystem } from '../core/collision/CollisionSystem';
import { ColorSpriteFontGenerator } from '../core/graphics/ColorSpriteFontGenerator';
import { AudioLoader } from '../core/loaders/AudioLoader';
import { ImageLoader } from '../core/loaders/ImageLoader';
import { RectFontLoader } from '../core/loaders/RectFontLoader';
import { SpriteFontLoader } from '../core/loaders/SpriteFontLoader';
import { SpriteLoader } from '../core/loaders/SpriteLoader';
import { InputHintSettings } from '../input/InputHintSettings';
import { InputManager } from '../input/InputManager';
import { MapLoader } from '../map/MapLoader';
import { PointsHighscoreManager } from '../points/PointsHighscoreManager';

import { AchievementsManager } from '../achievements/AchievementsManager';
import { AchievementsTracker } from '../achievements/AchievementsTracker';
import { GameStatsManager } from '../stats/GameStatsManager';

import { AudioManager } from './AudioManager';
import { GameState } from './GameState';
import { Session } from './Session';

/**
 * Long-lived game services, created once and passed to setup().
 * For per-frame data (deltaTime), use the update(deltaTime) parameter directly.
 */
export interface GameContext {
  achievementsManager: AchievementsManager;
  achievementsTracker: AchievementsTracker;
  gameStatsManager: GameStatsManager;
  audioManager: AudioManager;
  audioLoader: AudioLoader;
  collisionSystem: CollisionSystem;
  colorSpriteFontGenerator: ColorSpriteFontGenerator;
  imageLoader: ImageLoader;
  inputHintSettings: InputHintSettings;
  inputManager: InputManager;
  gameState: State<GameState>;
  mapLoader: MapLoader;
  pointsHighscoreManager: PointsHighscoreManager;
  rectFontLoader: RectFontLoader;
  session: Session;
  spriteFontLoader: SpriteFontLoader;
  spriteLoader: SpriteLoader;
}
