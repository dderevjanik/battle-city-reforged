import { SceneRouter } from '../core/scene/SceneRouter';

import { EditorControlsScene } from './editor/EditorControlsScene';
import { EditorEnemyScene } from './editor/EditorEnemyScene';
import { EditorMapScene } from './editor/EditorMapScene';
import { EditorMenuScene } from './editor/EditorMenuScene';
import { LevelControlsScene } from './level/LevelControlsScene';
import { LevelLoadScene } from './level/LevelLoadScene';
import { LevelPlayScene } from './level/LevelPlayScene';
import { LevelScoreScene } from './level/LevelScoreScene';
import { LevelSelectionScene } from './level/LevelSelectionScene';
import { MainAboutScene } from './main/MainAboutScene';
import { MainGameOverScene } from './main/MainGameOverScene';
import { MainHighscoreScene } from './main/MainHighscoreScene';
import { MainMenuScene } from './main/MainMenuScene';
import { MainVictoryScene } from './main/MainVictoryScene';
import { ModesCustomScene } from './modes/ModesCustomScene';
import { ModesMenuScene } from './modes/ModesMenuScene';
import { SettingsAudioScene } from './settings/SettingsAudioScene';
import { SettingsInterfaceScene } from './settings/SettingsInterfaceScene';
import { SettingsKeybindingScene } from './settings/SettingsKeybindingScene';
import { SettingsMenuScene } from './settings/SettingsMenuScene';
import { SandboxTransformScene } from './sandbox/SandboxTransformScene';

import { GameScene } from './GameScene';
import { GameSceneType } from './GameSceneType';

// Composition root for game scenes
export class GameSceneRouter extends SceneRouter<GameScene> {
  public constructor() {
    super();

    this.register(GameSceneType.EditorEnemy, EditorEnemyScene);
    this.register(GameSceneType.EditorControls, EditorControlsScene);
    this.register(GameSceneType.EditorMap, EditorMapScene);
    this.register(GameSceneType.EditorMenu, EditorMenuScene);
    this.register(GameSceneType.MainAbout, MainAboutScene);
    this.register(GameSceneType.MainGameOver, MainGameOverScene);
    this.register(GameSceneType.MainHighscore, MainHighscoreScene);
    this.register(GameSceneType.MainMenu, MainMenuScene);
    this.register(GameSceneType.MainVictory, MainVictoryScene);
    this.register(GameSceneType.ModesMenu, ModesMenuScene);
    this.register(GameSceneType.ModesCustom, ModesCustomScene);
    this.register(GameSceneType.LevelControls, LevelControlsScene);
    this.register(GameSceneType.LevelLoad, LevelLoadScene);
    this.register(GameSceneType.LevelSelection, LevelSelectionScene);
    this.register(GameSceneType.LevelScore, LevelScoreScene);
    this.register(GameSceneType.LevelPlay, LevelPlayScene);
    this.register(GameSceneType.SettingsAudio, SettingsAudioScene);
    this.register(GameSceneType.SettingsInterface, SettingsInterfaceScene);
    this.register(GameSceneType.SettingsMenu, SettingsMenuScene);
    this.register(GameSceneType.SettingsKeybinding, SettingsKeybindingScene);
    this.register(GameSceneType.SandboxTransform, SandboxTransformScene);
  }
}
