import { GameStorage } from '../game/GameStorage';
import { Difficulty } from '../game/Difficulty';
import { TankKind } from '../tank/TankTypes';
import * as config from '../config';

export interface ContinuePoint {
  levelNumber: number;
  difficulty: Difficulty;
  enemyPowerupsEnabled: boolean;
  gamePoints: number;
  lives: number;
  tankKind: TankKind;
}

export class ContinueManager {
  private storage: GameStorage;
  private point: ContinuePoint | null = null;

  constructor(storage: GameStorage) {
    this.storage = storage;

    const json = this.storage.get(config.STORAGE_KEY_CONTINUE);
    if (!json) {
      return;
    }

    try {
      const parsed = JSON.parse(json);
      if (this.isValid(parsed)) {
        this.point = parsed;
      }
    } catch {
      // Not parse-able; leave null
    }
  }

  public hasContinue(): boolean {
    return this.point !== null;
  }

  public getContinue(): ContinuePoint | null {
    return this.point;
  }

  public saveContinue(point: ContinuePoint): void {
    this.point = point;
    this.storage.set(config.STORAGE_KEY_CONTINUE, JSON.stringify(point));
    this.storage.save();
  }

  public clearContinue(): void {
    if (this.point === null) {
      return;
    }
    this.point = null;
    this.storage.remove(config.STORAGE_KEY_CONTINUE);
    this.storage.save();
  }

  private isValid(data: unknown): data is ContinuePoint {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const candidate = data as Record<string, unknown>;
    return typeof candidate.levelNumber === 'number'
      && this.isDifficulty(candidate.difficulty)
      && typeof candidate.enemyPowerupsEnabled === 'boolean'
      && typeof candidate.gamePoints === 'number'
      && typeof candidate.lives === 'number'
      && this.isTankKind(candidate.tankKind);
  }

  private isDifficulty(value: unknown): value is Difficulty {
    return value === Difficulty.Classic
      || value === Difficulty.Hard
      || value === Difficulty.Extreme;
  }

  private isTankKind(value: unknown): value is TankKind {
    return value === TankKind.Basic
      || value === TankKind.Fast
      || value === TankKind.FastArmored
      || value === TankKind.FastBomber
      || value === TankKind.Medium
      || value === TankKind.Heavy;
  }
}
