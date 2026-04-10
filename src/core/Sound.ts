import * as Phaser from 'phaser';

import { Subject } from './Subject';

export class Sound {
  public readonly ended = new Subject();
  public readonly loaded = new Subject();

  private readonly phaserSound: Phaser.Sound.BaseSound;
  private localMuted = false;
  private globalMuted = false;

  constructor(phaserSound: Phaser.Sound.BaseSound) {
    this.phaserSound = phaserSound;
    this.phaserSound.on(Phaser.Sound.Events.COMPLETE, this.handleEnded);
  }

  public isLoaded(): boolean {
    // Phaser preloads all audio in BridgeScene.preload() before any scene
    // runs, so by the time a Sound is constructed the audio is ready.
    return true;
  }

  public play(): void {
    this.stop();
    this.phaserSound.play();
  }

  public playLoop(): void {
    this.stop();
    this.phaserSound.play({ loop: true });
  }

  public resume(): void {
    this.phaserSound.resume();
  }

  public pause(): void {
    this.phaserSound.pause();
  }

  public stop(): void {
    this.phaserSound.stop();
  }

  public canResume(): boolean {
    return this.phaserSound.isPaused;
  }

  public setMuted(isMuted: boolean): void {
    this.localMuted = isMuted;
    this.updateMuted();
  }

  public isMuted(): boolean {
    return this.localMuted;
  }

  public setGlobalMuted(isGlobalMuted: boolean): void {
    this.globalMuted = isGlobalMuted;
    this.updateMuted();
  }

  public isGlobalMuted(): boolean {
    return this.globalMuted;
  }

  private updateMuted(): void {
    // setMute exists on WebAudioSound / HTML5AudioSound but not on BaseSound's
    // TypeScript declaration — cast to access it.
    (this.phaserSound as Phaser.Sound.WebAudioSound).setMute(
      this.globalMuted || this.localMuted,
    );
  }

  private handleEnded = (): void => {
    this.ended.notify(null);
  };
}
