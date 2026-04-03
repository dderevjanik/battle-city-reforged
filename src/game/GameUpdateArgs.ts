import {
  AudioLoader,
  CollisionSystem,
  ColorSpriteFontGenerator,
  ImageLoader,
  RectFontLoader,
  SpriteFontLoader,
  SpriteLoader,
  State,
} from '../core';
import { InputHintSettings, InputManager } from '../input';
import { MapLoader } from '../map';
import { PointsHighscoreManager } from '../points';

import { AudioManager } from './AudioManager';
import { GameState } from './GameState';
import { Session } from './Session';

/**
 * Long-lived game services, created once and passed to setup().
 * For per-frame data (deltaTime), use the update(deltaTime) parameter directly.
 */
export interface GameContext {
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

/** @deprecated Use GameContext instead */
export type GameUpdateArgs = GameContext & { deltaTime: number };
