import Phaser from 'phaser';

import { GameContext } from '../../game/GameUpdateArgs';
import { GameSceneRouter } from '../../scenes/GameSceneRouter';
import { GameSceneType } from '../../scenes/GameSceneType';
import { PhaserRenderer } from './PhaserRenderer';

import spriteManifest from '../../../data/sprite.manifest.json';
import audioManifest from '../../../data/audio.manifest.json';

export class BridgeScene extends Phaser.Scene {
  private gameContext: GameContext;
  private sceneRouter: GameSceneRouter;
  private gameRenderer: PhaserRenderer;

  constructor() {
    super({ key: 'BridgeScene' });
  }

  preload(): void {
    // Load all unique image files referenced in the sprite manifest
    const files = new Set<string>();
    for (const item of Object.values(spriteManifest)) {
      files.add(item.file);
    }
    for (const file of files) {
      this.load.image(file, file);
    }

    // Load all audio files
    for (const [id, item] of Object.entries(audioManifest)) {
      this.load.audio(id, item.file);
    }
  }

  create(): void {
    // Retrieve the GameContext that main.ts injected into the Phaser registry
    this.gameContext = this.game.registry.get('gameContext') as GameContext;

    // Register named frames on each loaded texture so sprite IDs can be used
    // as frame keys directly when creating images
    for (const [id, item] of Object.entries(spriteManifest)) {
      const [x, y, w, h] = item.rect;
      const texture = this.textures.get(item.file);
      if (texture && !texture.has(id)) {
        texture.add(id, 0, x, y, w, h);
      }
    }

    this.gameRenderer = new PhaserRenderer(this, spriteManifest);

    this.sceneRouter = new GameSceneRouter();
    this.sceneRouter.transitionStarted.addListener(() => {
      this.gameContext.collisionSystem.reset();
    });
    this.sceneRouter.start(GameSceneType.MainMenu);
  }

  update(_time: number, delta: number): void {
    this.gameContext.inputManager.update();

    const currentScene = this.sceneRouter.getCurrentScene();
    currentScene.invokeUpdate(this.gameContext, delta / 1000);

    this.gameRenderer.render(currentScene.getRoot());

    this.gameContext.gameState.update();
  }
}
