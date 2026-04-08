import { PowerupType } from '../powerup/PowerupType';
import { TankKind } from '../tank/TankTypes';

export interface GameStats {
  enemiesKilled: {
    total: number;
    byKind: Record<TankKind, number>;
    byPlayer: number[];
  };
  wallsDestroyed: {
    brick: number;
    steel: number;
    total: number;
  };
  levels: {
    beaten: number;
    failed: number;
  };
  deaths: {
    total: number;
    byPlayer: number[];
  };
  bulletsFired: number;
  powerupsPicked: {
    total: number;
    byType: Partial<Record<PowerupType, number>>;
  };
  sessions: {
    started: number;
    completed: number;
  };
  basesDestroyed: number;
}

export function createDefaultGameStats(): GameStats {
  return {
    enemiesKilled: {
      total: 0,
      byKind: {
        [TankKind.Basic]: 0,
        [TankKind.Fast]: 0,
        [TankKind.FastArmored]: 0,
        [TankKind.FastBomber]: 0,
        [TankKind.Medium]: 0,
        [TankKind.Heavy]: 0,
      },
      byPlayer: [0, 0, 0, 0],
    },
    wallsDestroyed: {
      brick: 0,
      steel: 0,
      total: 0,
    },
    levels: {
      beaten: 0,
      failed: 0,
    },
    deaths: {
      total: 0,
      byPlayer: [0, 0, 0, 0],
    },
    bulletsFired: 0,
    powerupsPicked: {
      total: 0,
      byType: {},
    },
    sessions: {
      started: 0,
      completed: 0,
    },
    basesDestroyed: 0,
  };
}
