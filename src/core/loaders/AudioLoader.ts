import Phaser from 'phaser';

import { Logger } from '../Logger';
import { Sound } from '../Sound';
import { Subject } from '../Subject';

interface AudioManifestItem {
  file: string;
}

interface AudioManifest {
  [id: string]: AudioManifestItem;
}

export class AudioLoader {
  public loaded = new Subject<Sound>();

  private soundManager: Phaser.Sound.BaseSoundManager | null = null;
  private readonly sounds = new Map<string, Sound>();
  protected readonly log = new Logger(AudioLoader.name, Logger.Level.None);

  // manifest kept for the no-op preloadAllAsync signature compatibility
  private readonly manifest: AudioManifest;

  constructor(manifest: AudioManifest) {
    this.manifest = manifest;
  }

  /**
   * Must be called once, from BridgeScene.create(), after Phaser has loaded
   * all audio assets via BridgeScene.preload().
   */
  public initPhaserAudio(soundManager: Phaser.Sound.BaseSoundManager): void {
    this.soundManager = soundManager;
  }

  public load(id: string): Sound {
    if (this.sounds.has(id)) {
      return this.sounds.get(id);
    }

    if (this.soundManager === null) {
      throw new Error(
        `AudioLoader.load("${id}") called before initPhaserAudio()`,
      );
    }

    const phaserSound = this.soundManager.add(id);
    const sound = new Sound(phaserSound);

    this.sounds.set(id, sound);
    this.log.debug('Loaded "%s"', id);
    this.loaded.notify(sound);

    return sound;
  }

  public async loadAsync(id: string): Promise<Sound> {
    return this.load(id);
  }

  /** No-op: Phaser preloads all audio in BridgeScene.preload(). */
  public preloadAll(): void {}

  /** No-op: Phaser preloads all audio in BridgeScene.preload(). */
  public async preloadAllAsync(): Promise<void> {}

  public getAllLoaded(): Sound[] {
    return Array.from(this.sounds.values());
  }
}
