import { SessionPlayer } from './SessionPlayer';

export enum RunLifecycle {
  Idle,
  Playing,
  GameOver,
}

/**
 * State of the current run: level progression and lifecycle.
 * Created and reset whenever a new run begins. Player progress (lives,
 * points, tank kind) lives on SessionPlayer instances managed by Session.
 */
export class RunState {
  private startLevelNumber!: number;
  private endLevelNumber!: number;
  private currentLevelNumber!: number;
  private lifecycle!: RunLifecycle;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.startLevelNumber = 1;
    this.currentLevelNumber = 1;
    this.endLevelNumber = 1;
    this.lifecycle = RunLifecycle.Idle;
  }

  public start(startLevelNumber: number, endLevelNumber: number): boolean {
    if (this.lifecycle !== RunLifecycle.Idle) {
      return false;
    }
    this.startLevelNumber = startLevelNumber;
    this.endLevelNumber = endLevelNumber;
    this.currentLevelNumber = startLevelNumber;
    this.lifecycle = RunLifecycle.Playing;
    return true;
  }

  public activateNextLevel(players: SessionPlayer[]): void {
    this.currentLevelNumber += 1;
    for (const player of players) {
      player.completeLevel();
    }
  }

  public getStartLevelNumber(): number {
    return this.startLevelNumber;
  }

  public getLevelNumber(): number {
    return this.currentLevelNumber;
  }

  public isLastLevel(): boolean {
    return this.currentLevelNumber === this.endLevelNumber;
  }

  public setGameOver(): void {
    this.lifecycle = RunLifecycle.GameOver;
  }

  public isGameOver(): boolean {
    return this.lifecycle === RunLifecycle.GameOver;
  }
}
