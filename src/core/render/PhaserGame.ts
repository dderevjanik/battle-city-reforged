import Phaser from 'phaser';

import { BridgeScene } from './BridgeScene';

export interface PhaserGameOptions {
  width: number;
  height: number;
  parent?: HTMLElement;
}

export function createPhaserGame(options: PhaserGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: options.width,
    height: options.height,
    backgroundColor: '#000000',
    antialias: false,
    pixelArt: true,
    scene: [BridgeScene],
    audio: { disableWebAudio: false },
    parent: options.parent,
  });
}
