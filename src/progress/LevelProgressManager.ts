import { GameStorage } from '../game/GameStorage';
import * as config from '../config';

export class LevelProgressManager {
  private storage: GameStorage;
  private completedLevels: Set<number>;

  constructor(storage: GameStorage) {
    this.storage = storage;

    const json = this.storage.get(config.STORAGE_KEY_LEVELS_COMPLETED);
    let parsed: number[] = [];
    try {
      parsed = JSON.parse(json);
    } catch {
      // Not parse-able
    }

    if (!Array.isArray(parsed)) {
      parsed = [];
    }

    this.completedLevels = new Set(parsed);
  }

  public markLevelCompleted(levelNumber: number): void {
    if (this.completedLevels.has(levelNumber)) {
      return;
    }

    this.completedLevels.add(levelNumber);
    this.storage.set(
      config.STORAGE_KEY_LEVELS_COMPLETED,
      JSON.stringify(Array.from(this.completedLevels)),
    );
    this.storage.save();
  }

  public isLevelCompleted(levelNumber: number): boolean {
    return this.completedLevels.has(levelNumber);
  }

  public getCompletedLevels(): number[] {
    return Array.from(this.completedLevels);
  }
}
