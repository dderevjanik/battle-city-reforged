import Phaser from 'phaser';

import { GameObject } from '../core/GameObject';
import { PhaserRenderer } from '../core/render/PhaserRenderer';
import { SceneNavigator, SceneParams } from '../core/scene/Scene';
import { GameContext } from '../game/GameUpdateArgs';
import * as config from '../config';

import { GameSceneRouter } from './GameSceneRouter';

export abstract class GameScene<
  T extends SceneParams = {},
> extends Phaser.Scene {
  // No explicit constructor — Phaser.Scene's default is used so Phaser can
  // instantiate scenes via scene.add(key, SceneClass).

  protected params: T;
  protected context: GameContext;
  protected root: GameObject;
  protected navigator: SceneNavigator;

  private gameRenderer: PhaserRenderer;

  // ---------------------------------------------------------------------------
  // Phaser lifecycle
  // ---------------------------------------------------------------------------

  public init(data: T): void {
    this.params = (data ?? {}) as T;
  }

  public create(): void {
    this.context = this.game.registry.get('gameContext') as GameContext;

    // Re-attach input devices to this scene's keyboard/gamepad plugins.
    // Each Phaser scene has its own input plugin, so we must do this on every
    // scene transition (the previous scene's plugin is destroyed on shutdown).
    this.context.inputManager.initPhaserDevices(
      this.input.keyboard,
      this.input.gamepad,
    );

    const router = this.game.registry.get('sceneRouter') as GameSceneRouter;
    router.setScenePlugin(this.scene);
    this.navigator = router;

    this.gameRenderer = new PhaserRenderer(
      this,
      this.game.registry.get('spriteManifest'),
    );

    this.root = this.createRoot();
    this.setup(this.context);
  }

  public update(_time: number, delta: number): void {
    this.context.inputManager.update();
    this.onUpdate(delta / 1000);
    this.gameRenderer.render(this.root);
    this.context.gameState.update();
  }

  public shutdown(): void {
    this.context?.collisionSystem.reset();
  }

  // ---------------------------------------------------------------------------
  // Subclass API
  // ---------------------------------------------------------------------------

  protected abstract setup(context: GameContext): void;

  protected onUpdate(deltaTime: number): void {
    this.root.traverseDescedants((child) => {
      child.invokeUpdate(this.context, deltaTime);
    });
  }

  protected createRoot(): GameObject {
    const root = new GameObject();
    root.size.set(config.CANVAS_WIDTH, config.CANVAS_HEIGHT);
    root.updateMatrix();
    return root;
  }
}
