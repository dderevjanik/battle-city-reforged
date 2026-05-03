import { State } from '../core/State';
import { CollisionSystem } from '../core/collision/CollisionSystem';
import { AudioLoader } from '../core/loaders/AudioLoader';
import { DebugSettings } from '../debug/DebugSettings';
import { InputHintSettings } from '../input/InputHintSettings';
import { InputManager } from '../input/InputManager';
import { SceneNavigator } from '../core/scene/Scene';

import { AudioManager } from './AudioManager';
import { GameState } from './GameState';
import { Session } from './Session';

/**
 * Per-frame runtime services: input, audio, collision, current game state and
 * scene navigation. These are touched by gameplay scenes every tick.
 */
export interface RuntimeContext {
  audioLoader: AudioLoader;
  audioManager: AudioManager;
  collisionSystem: CollisionSystem;
  debugSettings: DebugSettings;
  gameState: State<GameState>;
  inputHintSettings: InputHintSettings;
  inputManager: InputManager;
  session: Session;
  sceneNavigator: SceneNavigator;
}
