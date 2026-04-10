import { GameStorage } from '../game/GameStorage';
import * as config from '../config';

import { GameStats, createDefaultGameStats } from './GameStats';

export class GameStatsManager {
  private storage: GameStorage;
  private stats: GameStats;

  constructor(storage: GameStorage) {
    this.storage = storage;
    this.stats = this.load();
  }

  public getStats(): GameStats {
    return this.stats;
  }

  public save(): void {
    this.storage.set(config.STORAGE_KEY_GAME_STATS, JSON.stringify(this.stats));
    this.storage.save();
  }

  public reset(): void {
    this.stats = createDefaultGameStats();
    this.save();
  }

  private load(): GameStats {
    const raw = this.storage.get(config.STORAGE_KEY_GAME_STATS);
    const defaults = createDefaultGameStats();

    if (!raw) {
      return defaults;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return defaults;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return defaults;
    }

    // Deep merge parsed data onto defaults so new fields added in the future
    // get their default values when loading an older save.
    return this.merge(defaults, parsed as Record<string, unknown>);
  }

  private merge(defaults: GameStats, saved: Record<string, unknown>): GameStats {
    const result = { ...defaults };

    for (const key of Object.keys(defaults) as (keyof GameStats)[]) {
      const savedVal = saved[key];
      if (savedVal === undefined || savedVal === null) {
        continue;
      }

      const defaultVal = defaults[key];
      if (
        typeof savedVal === 'object' &&
        !Array.isArray(savedVal) &&
        typeof defaultVal === 'object' &&
        !Array.isArray(defaultVal)
      ) {
        // Shallow-merge nested objects so new fields from defaults are preserved
        (result as Record<string, unknown>)[key] = {
          ...(defaultVal as Record<string, unknown>),
          ...(savedVal as Record<string, unknown>),
        };
      } else {
        (result as Record<string, unknown>)[key] = savedVal;
      }
    }

    return result;
  }
}
