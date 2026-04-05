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
    this.storage.save();
  }

  public getAll(achievements: Achievement[]): { achievement: Achievement; unlocked: boolean }[] {
    return achievements.map((achievement) => ({
      achievement,
      unlocked: this.isUnlocked(achievement.id),
    }));
  }
}
