import { Session } from '../game/Session';
import { PowerupType } from '../powerup/PowerupType';
import { TankKind } from '../tank/TankTypes';

import { Achievement } from './Achievement';
import { AchievementId } from './AchievementId';
import { AchievementsManager } from './AchievementsManager';

interface RunState {
  levelsClearedInRun: Set<number>;
  deathOccurredInLevels: Set<number>;
  powerupsPickedInLevels: Set<number>;
  powerupsCollectedTypes: Set<PowerupType>;
  gameOverOccurred: boolean;
  maxTankKindReached: TankKind;
  wipeoutUsedWithoutKill: boolean;
  pendingWipeoutKills: number | null;
}

function createInitialState(): RunState {
  return {
    levelsClearedInRun: new Set(),
    deathOccurredInLevels: new Set(),
    powerupsPickedInLevels: new Set(),
    powerupsCollectedTypes: new Set(),
    gameOverOccurred: false,
    maxTankKindReached: TankKind.Basic,
    wipeoutUsedWithoutKill: false,
    pendingWipeoutKills: null,
  };
}

function levelsAllCleared(state: RunState, from: number, to: number): boolean {
  for (let i = from; i <= to; i++) {
    if (!state.levelsClearedInRun.has(i)) {
      return false;
    }
  }
  return true;
}

function noDeathsInRange(state: RunState, from: number, to: number): boolean {
  for (let i = from; i <= to; i++) {
    if (state.deathOccurredInLevels.has(i)) {
      return false;
    }
  }
  return true;
}

function noPowerupsInRange(state: RunState, from: number, to: number): boolean {
  for (let i = from; i <= to; i++) {
    if (state.powerupsPickedInLevels.has(i)) {
      return false;
    }
  }
  return true;
}

const ALL_POWERUP_TYPES: PowerupType[] = Object.values(PowerupType);

export class AchievementsTracker {
  private state: RunState = createInitialState();

  public reset(): void {
    this.state = createInitialState();
  }

  public recordLevelCleared(levelNum: number): void {
    this.state.levelsClearedInRun.add(levelNum);
  }

  public recordDeath(levelNum: number): void {
    this.state.deathOccurredInLevels.add(levelNum);
  }

  public recordPowerupPicked(type: PowerupType, levelNum: number): void {
    this.state.powerupsPickedInLevels.add(levelNum);
    this.state.powerupsCollectedTypes.add(type);
  }

  public recordTankKindReached(kind: TankKind): void {
    const order = [TankKind.Basic, TankKind.Fast, TankKind.Medium, TankKind.Heavy];
    const current = order.indexOf(this.state.maxTankKindReached);
    const incoming = order.indexOf(kind);
    if (incoming > current) {
      this.state.maxTankKindReached = kind;
    }
  }

  public recordGameOver(): void {
    this.state.gameOverOccurred = true;
  }

  public isWipeoutUsedWithoutKill(): boolean {
    return this.state.wipeoutUsedWithoutKill;
  }

  public recordWipeoutPickup(): void {
    this.state.pendingWipeoutKills = 0;
  }

  public recordWipeoutKill(): void {
    if (this.state.pendingWipeoutKills !== null) {
      this.state.pendingWipeoutKills += 1;
    }
  }

  /**
   * Call once per frame (from LevelAchievementsScript.update).
   * Resolves the pending wipeout check: if a wipeout was used and killed 0 enemies, mark it.
   */
  public flushWipeout(): void {
    if (this.state.pendingWipeoutKills === null) {
      return;
    }
    if (this.state.pendingWipeoutKills === 0) {
      this.state.wipeoutUsedWithoutKill = true;
    }
    this.state.pendingWipeoutKills = null;
  }

  /**
   * Returns IDs of achievements whose conditions are now met but not yet persisted.
   * Call this after recording a level clear (or any state change that could unlock achievements).
   */
  public getNewlyUnlocked(
    definitions: Achievement[],
    manager: AchievementsManager,
    session: Session,
  ): AchievementId[] {
    const result: AchievementId[] = [];
    const s = this.state;

    for (const def of definitions) {
      if (manager.isUnlocked(def.id)) {
        continue;
      }
      if (this.checkCondition(def.id, s, session)) {
        result.push(def.id);
      }
    }

    return result;
  }

  private checkCondition(id: AchievementId, s: RunState, session: Session): boolean {
    switch (id) {
      case AchievementId.StartingTrenches:
        return s.levelsClearedInRun.has(1);

      case AchievementId.MouseOfBattlefield:
        return levelsAllCleared(s, 1, 10);

      case AchievementId.TreadingWater:
        return levelsAllCleared(s, 11, 20);

      case AchievementId.BrickhouseBoss:
        return levelsAllCleared(s, 21, 35);

      case AchievementId.MilitaryMaze:
        return s.levelsClearedInRun.has(50);

      case AchievementId.BrushBattleground:
        return s.levelsClearedInRun.has(60);

      case AchievementId.NewRevolution:
        return s.levelsClearedInRun.has(70);

      case AchievementId.DeathlessDriver1:
        return levelsAllCleared(s, 1, 5) && noDeathsInRange(s, 1, 5);

      case AchievementId.DeathlessDriver2:
        return levelsAllCleared(s, 16, 25) && noDeathsInRange(s, 16, 25);

      case AchievementId.ConfidentCommander1:
        return (
          levelsAllCleared(s, 6, 15) &&
          noPowerupsInRange(s, 6, 15) &&
          !s.gameOverOccurred
        );

      case AchievementId.ConfidentCommander2:
        return (
          levelsAllCleared(s, 25, 35) &&
          noPowerupsInRange(s, 25, 35) &&
          !s.gameOverOccurred
        );

      case AchievementId.CombatClear:
        return levelsAllCleared(s, 1, 35) && !s.gameOverOccurred;

      case AchievementId.StarSoldier:
        return s.maxTankKindReached === TankKind.Heavy;

      case AchievementId.VacantBattlefield:
        return s.wipeoutUsedWithoutKill;

      case AchievementId.FullArsenal:
        return (
          ALL_POWERUP_TYPES.every((type) => s.powerupsCollectedTypes.has(type)) &&
          !s.gameOverOccurred
        );

      case AchievementId.BattleBrigadier:
        return session.getMaxGamePoints() >= 20000;

      case AchievementId.CityChampion:
        return session.getMaxGamePoints() >= 100000;

      default:
        return false;
    }
  }
}
