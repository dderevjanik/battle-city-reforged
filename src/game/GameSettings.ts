import { Difficulty } from './Difficulty';

/**
 * Persistent (per-tab) game settings: difficulty, mode flags, player count.
 * Survives across runs — only `Session.reset()` clears it back to defaults.
 */
export class GameSettings {
  private seenIntro!: boolean;
  private playerCount!: number;
  private playtest!: boolean;
  private shared!: boolean;
  private demo!: boolean;
  private difficulty!: Difficulty;
  private enemyPowerupsEnabled!: boolean;
  private friendlyFireEnabled!: boolean;
  private readonly playerCountCap: number;

  constructor(playerCountCap: number) {
    this.playerCountCap = playerCountCap;
    this.reset();
  }

  public reset(): void {
    this.seenIntro = false;
    this.playerCount = 1;
    this.playtest = false;
    this.shared = false;
    this.demo = false;
    this.difficulty = Difficulty.Classic;
    this.enemyPowerupsEnabled = false;
    this.friendlyFireEnabled = true;
  }

  public setSeenIntro(seen: boolean): void {
    this.seenIntro = seen;
  }

  public haveSeenIntro(): boolean {
    return this.seenIntro;
  }

  public setPlaytest(): void {
    this.playtest = true;
  }

  public resetPlaytest(): void {
    this.playtest = false;
  }

  public isPlaytest(): boolean {
    return this.playtest;
  }

  public setShared(): void {
    this.shared = true;
  }

  public isShared(): boolean {
    return this.shared;
  }

  public setDemo(enabled: boolean): void {
    this.demo = enabled;
  }

  public isDemo(): boolean {
    return this.demo;
  }

  public setPlayerCount(count: number): void {
    this.playerCount = Math.min(Math.max(count, 1), this.playerCountCap);
  }

  public getPlayerCount(): number {
    return this.playerCount;
  }

  public isMultiplayer(): boolean {
    return this.playerCount > 1;
  }

  public setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  public getDifficulty(): Difficulty {
    return this.difficulty;
  }

  public setEnemyPowerupsEnabled(enabled: boolean): void {
    this.enemyPowerupsEnabled = enabled;
  }

  public isEnemyPowerupsEnabled(): boolean {
    return this.enemyPowerupsEnabled;
  }

  public setFriendlyFireEnabled(enabled: boolean): void {
    this.friendlyFireEnabled = enabled;
  }

  public isFriendlyFireEnabled(): boolean {
    return this.friendlyFireEnabled;
  }
}
