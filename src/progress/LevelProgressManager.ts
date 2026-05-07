import { GameStorage } from '../game/GameStorage';
import * as config from '../config';

// Group name used to migrate legacy progress entries that were stored as a
// flat number array, before per-group tracking existed.
const LEGACY_GROUP_NAME = 'Original';

export class LevelProgressManager {
  private storage: GameStorage;
  private completedByGroup: Map<string, Set<number>>;

  constructor(storage: GameStorage) {
    this.storage = storage;
    this.completedByGroup = this.load();
  }

  public markLevelCompleted(groupName: string, levelNumber: number): void {
    const completed = this.getOrCreateGroup(groupName);
    if (completed.has(levelNumber)) {
      return;
    }

    completed.add(levelNumber);
    this.persist();
  }

  public isLevelCompleted(groupName: string, levelNumber: number): boolean {
    return this.completedByGroup.get(groupName)?.has(levelNumber) ?? false;
  }

  public getCompletedLevels(groupName: string): number[] {
    const completed = this.completedByGroup.get(groupName);
    return completed ? Array.from(completed) : [];
  }

  private getOrCreateGroup(groupName: string): Set<number> {
    let completed = this.completedByGroup.get(groupName);
    if (!completed) {
      completed = new Set();
      this.completedByGroup.set(groupName, completed);
    }
    return completed;
  }

  private load(): Map<string, Set<number>> {
    const json = this.storage.get(config.STORAGE_KEY_LEVELS_COMPLETED);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return new Map();
    }

    const result = new Map<string, Set<number>>();
    if (Array.isArray(parsed)) {
      // Legacy format: flat array of level numbers, attributed to Original.
      result.set(
        LEGACY_GROUP_NAME,
        new Set(parsed.filter((n) => typeof n === 'number')),
      );
    } else if (parsed && typeof parsed === 'object') {
      for (const [groupName, levels] of Object.entries(parsed)) {
        if (Array.isArray(levels)) {
          result.set(
            groupName,
            new Set(levels.filter((n) => typeof n === 'number')),
          );
        }
      }
    }
    return result;
  }

  private persist(): void {
    const serialized: Record<string, number[]> = {};
    for (const [groupName, completed] of this.completedByGroup.entries()) {
      serialized[groupName] = Array.from(completed);
    }
    this.storage.set(
      config.STORAGE_KEY_LEVELS_COMPLETED,
      JSON.stringify(serialized),
    );
    this.storage.save();
  }
}
