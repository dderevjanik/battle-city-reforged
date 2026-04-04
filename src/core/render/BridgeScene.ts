import Phaser from 'phaser';

import { GameContext } from '../../game/GameUpdateArgs';
import { EditorControlsScene } from '../../scenes/editor/EditorControlsScene';
import { EditorEnemyScene } from '../../scenes/editor/EditorEnemyScene';
import { EditorMapScene } from '../../scenes/editor/EditorMapScene';
import { EditorMenuScene } from '../../scenes/editor/EditorMenuScene';
import { LevelControlsScene } from '../../scenes/level/LevelControlsScene';
import { LevelLoadScene } from '../../scenes/level/LevelLoadScene';
import { LevelPlayScene } from '../../scenes/level/LevelPlayScene';
import { LevelScoreScene } from '../../scenes/level/LevelScoreScene';
import { LevelSelectionScene } from '../../scenes/level/LevelSelectionScene';
import { MainAboutScene } from '../../scenes/main/MainAboutScene';
import { MainGameOverScene } from '../../scenes/main/MainGameOverScene';
import { MainHighscoreScene } from '../../scenes/main/MainHighscoreScene';
import { MainMenuScene } from '../../scenes/main/MainMenuScene';
import { MainVictoryScene } from '../../scenes/main/MainVictoryScene';
import { ModesCustomScene } from '../../scenes/modes/ModesCustomScene';
import { ModesMenuScene } from '../../scenes/modes/ModesMenuScene';
import { SettingsAudioScene } from '../../scenes/settings/SettingsAudioScene';
import { SettingsInterfaceScene } from '../../scenes/settings/SettingsInterfaceScene';
import { SettingsKeybindingScene } from '../../scenes/settings/SettingsKeybindingScene';
import { SettingsMenuScene } from '../../scenes/settings/SettingsMenuScene';
import { GameSceneRouter } from '../../scenes/GameSceneRouter';
import { GameSceneType } from '../../scenes/GameSceneType';

import spriteManifest from '../../../data/sprite.manifest.json';
import audioManifest from '../../../data/audio.manifest.json';

/** Maps each GameSceneType to its concrete class. */
const SCENE_REGISTRY: [GameSceneType, typeof Phaser.Scene][] = [
  [GameSceneType.EditorControls, EditorControlsScene],
  [GameSceneType.EditorEnemy, EditorEnemyScene],
  [GameSceneType.EditorMap, EditorMapScene],
  [GameSceneType.EditorMenu, EditorMenuScene],
  [GameSceneType.LevelControls, LevelControlsScene],
  [GameSceneType.LevelLoad, LevelLoadScene],
  [GameSceneType.LevelPlay, LevelPlayScene],
  [GameSceneType.LevelScore, LevelScoreScene],
  [GameSceneType.LevelSelection, LevelSelectionScene],
  [GameSceneType.MainAbout, MainAboutScene],
  [GameSceneType.MainGameOver, MainGameOverScene],
  [GameSceneType.MainHighscore, MainHighscoreScene],
  [GameSceneType.MainMenu, MainMenuScene],
  [GameSceneType.MainVictory, MainVictoryScene],
  [GameSceneType.ModesCustom, ModesCustomScene],
  [GameSceneType.ModesMenu, ModesMenuScene],
  [GameSceneType.SettingsAudio, SettingsAudioScene],
  [GameSceneType.SettingsInterface, SettingsInterfaceScene],
  [GameSceneType.SettingsKeybinding, SettingsKeybindingScene],
  [GameSceneType.SettingsMenu, SettingsMenuScene],
];

/**
 * Bootstrap scene: loads all assets, initialises services, registers all
 * GameScenes with Phaser, then hands off to MainMenuScene.
 * It stops itself as soon as it starts the first GameScene.
 */
export class BridgeScene extends Phaser.Scene {
  private gameContext!: GameContext;

  constructor() {
    super({ key: 'BridgeScene' });
  }

  preload(): void {
    // Load every unique image referenced by the sprite manifest
    const files = new Set<string>();
    for (const item of Object.values(spriteManifest)) {
      files.add(item.file);
    }
    for (const file of files) {
      this.load.image(file, file);
    }

    // Load all audio
    for (const [id, item] of Object.entries(audioManifest)) {
      this.load.audio(id, item.file);
    }
  }

  create(): void {
    this.gameContext = this.game.registry.get('gameContext') as GameContext;

    // Register named frames on each loaded texture
    for (const [id, item] of Object.entries(spriteManifest)) {
      const [x, y, w, h] = item.rect;
      const texture = this.textures.get(item.file);
      if (texture && !texture.has(id)) {
        texture.add(id, 0, x, y, w, h);
      }
    }

    // Store manifest so GameScene renderers can build their lookup maps
    this.game.registry.set('spriteManifest', spriteManifest);

    // Initialise Phaser-backed audio (sound manager is global — only needed once)
    this.gameContext.audioLoader.initPhaserAudio(this.sound);

    // Register every GameScene class with Phaser's SceneManager
    for (const [type, SceneClass] of SCENE_REGISTRY) {
      this.scene.add(GameSceneType[type], SceneClass);
    }

    // Create the shared router and publish it for all GameScenes to use
    const router = new GameSceneRouter();
    this.game.registry.set('sceneRouter', router);

    // Hand off to the first scene (this also stops BridgeScene)
    router.setScenePlugin(this.scene);
    router.start(GameSceneType.MainMenu);
  }
}
