import { PowerupType } from '../powerup/PowerupType';
import { TankKind } from '../tank/TankTypes';
import * as config from '../config';

const TANK_POINTS_MAP: Record<TankKind, number> = {
  [TankKind.Basic]: 100,
  [TankKind.Fast]: 200,
  [TankKind.FastArmored]: 300,
  [TankKind.FastBomber]: 300,
  [TankKind.Medium]: 300,
  [TankKind.Heavy]: 400,
};

const POWERUP_POINTS = 500;

export class PointsRecord {
  private kills: TankKind[] = [];
  private powerups: PowerupType[] = [];
  private bonus = false;

  public addKill(tier: TankKind): this {
    this.kills.push(tier);

    return this;
  }

  public addPowerup(type: PowerupType): this {
    this.powerups.push(type);

    return this;
  }

  public addBonus(): this {
    this.bonus = true;

    return this;
  }

  public hasBonus(): boolean {
    return this.bonus === true;
  }

  public getKindKillCost(tier: TankKind): number {
    return TANK_POINTS_MAP[tier];
  }

  public getPowerupCost(): number {
    return POWERUP_POINTS;
  }

  public getKillTotalCount(): number {
    return this.kills.length;
  }

  public getKindKillCount(tierToFind: TankKind): number {
    const kills = this.kills.filter((tier) => tier === tierToFind);
    const count = kills.length;

    return count;
  }

  public getKindPoints(tierToFind: TankKind): number {
    let total = 0;

    this.kills.forEach((tier) => {
      if (tier !== tierToFind) {
        return;
      }
      total += this.getKindKillCost(tier);
    });

    return total;
  }

  public getKillTotalPoints(): number {
    let total = 0;

    this.kills.forEach((tier) => {
      total += this.getKindKillCost(tier);
    });

    return total;
  }

  public getPowerupTotalPoints(): number {
    const total = this.powerups.length * this.getPowerupCost();

    return total;
  }

  public getBonusTotalPoints(): number {
    if (this.bonus) {
      return config.BONUS_POINTS;
    }
    return 0;
  }

  public getTotalPoints(): number {
    const killTotal = this.getKillTotalPoints();
    const powerupTotal = this.getPowerupTotalPoints();
    const bonusTotal = this.getBonusTotalPoints();

    const total = killTotal + powerupTotal + bonusTotal;

    return total;
  }

  public reset(): void {
    this.kills = [];
    this.powerups = [];
    this.bonus = false;
  }
}
