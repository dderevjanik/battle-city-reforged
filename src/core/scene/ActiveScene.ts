import Phaser from 'phaser';

let _scene: Phaser.Scene | null = null;

/**
 * Called once at the start of each GameScene.create() so that new
 * GameObjects created during setup() have a valid scene reference.
 */
export function setActiveScene(scene: Phaser.Scene): void {
  _scene = scene;
}

export function getActiveScene(): Phaser.Scene {
  if (_scene === null) {
    throw new Error('No active scene. Call setActiveScene() before creating GameObjects.');
  }
  return _scene;
}
