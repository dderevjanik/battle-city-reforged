import * as Phaser from 'phaser';

import { GameObject, initRenderer } from '../core/GameObject';
import { maybeTraceTick } from '../core/determinism';
import { setActiveScene } from '../core/scene/ActiveScene';
import { SceneNavigator, SceneParams } from '../core/scene/Scene';
import { GameContext } from '../game/GameUpdateArgs';
import * as config from '../config';

import { GameSceneRouter } from './GameSceneRouter';

export abstract class GameScene<
  T extends SceneParams = {},
> extends Phaser.Scene {
  // No explicit constructor — Phaser.Scene's default is used so Phaser can
  // instantiate scenes via scene.add(key, SceneClass).

  protected params!: T;
  protected context!: GameContext;
  protected root!: GameObject;
  protected navigator!: SceneNavigator;

  // Fixed-timestep accumulator. The sim runs in exact SIM_STEP_SEC increments
  // regardless of the renderer's framerate, so two peers with different frame
  // rates produce identical simulation output. Rendering still happens every
  // browser frame.
  private static readonly SIM_HZ = 60;
  private static readonly SIM_STEP_SEC = 1 / GameScene.SIM_HZ;
  // Cap so a long stall (tab backgrounded, breakpoint) doesn't trigger a
  // multi-second catch-up that locks the page.
  private static readonly MAX_STEPS_PER_FRAME = 5;
  private simAccumulatorSec = 0;
  protected simTick = 0;

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
      this.input.keyboard!,
      this.input.gamepad!,
    );

    // Phaser fires a shutdown event (not a method call) when stopping a scene.
    // Reset the shared collision system so stale colliders from the previous
    // scene don't persist into the next one.
    this.events.once('shutdown', () => {
      this.context?.collisionSystem.reset();
      this.game.canvas.style.cursor = '';
    });

    const router = this.context.sceneNavigator as GameSceneRouter;
    router.setScenePlugin(this.scene);
    this.navigator = router;

    // Bind the module-level renderer state and sprite manifest to this scene.
    setActiveScene(this);
    initRenderer(this, this.game.registry.get('spriteManifest'));

    this.root = this.createRoot();
    this.setup(this.context);
  }

  public update(_time: number, delta: number): void {
    // Convert Phaser's variable-millisecond delta into a fixed-step sim loop.
    // Input is sampled once per browser frame; the sim runs zero or more times
    // depending on how much real time has elapsed. Rendering then reflects the
    // post-sim state.
    this.context.inputManager.update();

    this.simAccumulatorSec += delta / 1000;

    let steps = 0;
    while (
      this.simAccumulatorSec >= GameScene.SIM_STEP_SEC &&
      steps < GameScene.MAX_STEPS_PER_FRAME
    ) {
      this.onUpdate(GameScene.SIM_STEP_SEC);
      this.simAccumulatorSec -= GameScene.SIM_STEP_SEC;
      this.simTick++;
      steps++;
      maybeTraceTick(this.simTick, this.root);
    }

    // If we hit the catch-up cap, drop the leftover backlog rather than
    // spiraling. Better to skip a few ticks than to stall the page.
    if (steps >= GameScene.MAX_STEPS_PER_FRAME) {
      this.simAccumulatorSec = 0;
    }

    this._renderScene();
    this.context.gameState.update();
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

  // ---------------------------------------------------------------------------
  // Rendering — walk the tree, update world matrices, sync each node's painter
  // ---------------------------------------------------------------------------

  private _renderScene(): void {
    this.root.updateWorldMatrix(false, true);

    this.root.traverseDescedants((node) => {
      node._syncPainter();
    });
  }
}
