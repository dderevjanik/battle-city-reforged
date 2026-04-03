import Phaser from 'phaser';

import { SceneNavigator, SceneParams } from '../core/scene/Scene';

import { GameSceneType } from './GameSceneType';

export class GameSceneRouter implements SceneNavigator {
  private scenePlugin: Phaser.Scenes.ScenePlugin | null = null;
  private readonly stack: { type: GameSceneType; params: SceneParams }[] = [];

  /**
   * Called by each GameScene.create() so the router always holds the active
   * scene's plugin, enabling it to launch the next scene.
   */
  public setScenePlugin(plugin: Phaser.Scenes.ScenePlugin): void {
    this.scenePlugin = plugin;
  }

  /** Start the initial scene (clears the stack first). */
  public start(type: GameSceneType, params?: SceneParams): void {
    this.stack.length = 0;
    this.push(type, params);
  }

  public push(type: GameSceneType, params?: SceneParams): void {
    const safe = params ?? {};
    this.stack.push({ type, params: safe });
    this.scenePlugin.start(GameSceneType[type], safe);
  }

  public replace(type: GameSceneType, params?: SceneParams): void {
    const safe = params ?? {};
    this.stack.pop();
    this.stack.push({ type, params: safe });
    this.scenePlugin.start(GameSceneType[type], safe);
  }

  public back(): void {
    if (this.stack.length <= 1) {
      return;
    }
    this.stack.pop();
    const prev = this.stack[this.stack.length - 1];
    this.scenePlugin.start(GameSceneType[prev.type], prev.params);
  }

  public clearAndPush(type: GameSceneType, params?: SceneParams): void {
    this.stack.length = 0;
    this.push(type, params);
  }
}
