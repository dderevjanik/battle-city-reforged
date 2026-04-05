import { GameStorage } from '../game/GameStorage';
import * as config from '../config';

import { Achievement } from './Achievement';
import { AchievementId } from './AchievementId';

export class AchievementsManager {
  private storage: GameStorage;

  constructor(storage: GameStorage) {
    this.storage = storage;
  }

  public isUnlocked(id: AchievementId): boolean {
    return (
      this.storage.getBoolean(config.STORAGE_KEY_ACHIEVEMENT_PREFIX + id, false) === true
    );
  }

  public unlock(id: AchievementId): void {
    if (this.isUnlocked(id)) {
      return;
    }
    this.storage.setBoolean(config.STORAGE_KEY_ACHIEVEMENT_PREFIX + id, true);
    this.storage.set(
      config.STORAGE_KEY_ACHIEVEMENT_PREFIX + id + config.STORAGE_KEY_ACHIEVEMENT_UNLOCKED_AT_SUFFIX,
      new Date().toISOString(),
    );
    this.storage.save();
  }

  public getUnlockedAt(id: AchievementId): Date | null {
    const raw = this.storage.get(
      config.STORAGE_KEY_ACHIEVEMENT_PREFIX + id + config.STORAGE_KEY_ACHIEVEMENT_UNLOCKED_AT_SUFFIX,
    );
    if (!raw) {
      return null;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  public reset(): void {
    for (const id of Object.values(AchievementId)) {
      this.storage.remove(config.STORAGE_KEY_ACHIEVEMENT_PREFIX + id);
      this.storage.remove(
        config.STORAGE_KEY_ACHIEVEMENT_PREFIX + id + config.STORAGE_KEY_ACHIEVEMENT_UNLOCKED_AT_SUFFIX,
      );
    }
    this.storage.save();
  }

  public getAll(achievements: Achievement[]): { achievement: Achievement; unlocked: boolean }[] {
    return achievements.map((achievement) => ({
      achievement,
      unlocked: this.isUnlocked(achievement.id),
    }));
  }
}
