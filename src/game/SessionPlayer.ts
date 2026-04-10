import { Subject } from '../core/Subject';
import { InputVariant } from '../input/InputVariant';
import { PointsRecord } from '../points/PointsRecord';
import { PowerupType } from '../powerup/PowerupType';
import { TankKind } from '../tank/TankTypes';
import * as config from '../config';

export class SessionPlayer {
  public lifeup = new Subject();

  private levelPointsRecord!: PointsRecord;
  // Total points for current session
  private gamePoints!: number;
  // Total points from last session
  private lastGamePoints: number | null = null;
  private lives!: number;
  private nextLifePointThreshold!: number;
  private tankKind!: TankKind;
  private levelFirstSpawned!: boolean;
  // Should be used for multiplayer only
  private inputVariant: InputVariant | null = null;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.levelPointsRecord = new PointsRecord();
    this.gamePoints = 0;
    this.lastGamePoints = null;
    this.lives = config.PLAYER_INITIAL_LIVES;
    this.nextLifePointThreshold = config.PLAYER_EXTRA_LIVE_POINTS;
    this.tankKind = TankKind.Basic;
    this.levelFirstSpawned = true;
    this.inputVariant = null;
  }

  public addKillPoints(kind: TankKind): void {
    this.levelPointsRecord.addKill(kind);
    this.checkLifeup();
  }

  public addPowerupPoints(type: PowerupType): void {
    this.levelPointsRecord.addPowerup(type);
    this.checkLifeup();
  }

  public addBonusPoints(): void {
    this.levelPointsRecord.addBonus();
    this.checkLifeup();
  }

  public completeLevel(): void {
    this.gamePoints += this.getLevelPoints();
    this.levelPointsRecord.reset();

    this.resetLevelFirstSpawn();
  }

  // Sum of all previous levels and current level
  public getGamePoints(): number {
    return this.gamePoints + this.getLevelPoints();
  }

  public getLevelPoints(): number {
    return this.levelPointsRecord.getTotalPoints();
  }

  public setLastGamePoints(lastGamePoints: number): void {
    this.lastGamePoints = lastGamePoints;
  }

  public getLastGamePoints(): number | null {
    return this.lastGamePoints;
  }

  public wasInLastGame(): boolean {
    return this.lastGamePoints !== null;
  }

  public hasBonusPoints(): boolean {
    return this.levelPointsRecord.hasBonus();
  }

  public getLevelPointsRecord(): PointsRecord {
    return this.levelPointsRecord;
  }

  public getLivesCount(): number {
    return this.lives;
  }

  public isAlive(): boolean {
    return this.lives > 0;
  }

  public getTankKind(): TankKind {
    return this.tankKind;
  }

  public setTankKind(tankKind: TankKind): void {
    this.tankKind = tankKind;
  }

  public resetTankKind(): void {
    this.tankKind = TankKind.Basic;
  }

  public isLevelFirstSpawn(): boolean {
    return this.levelFirstSpawned;
  }

  public setLevelSpawned(): void {
    this.levelFirstSpawned = false;
  }

  public resetLevelFirstSpawn(): void {
    this.levelFirstSpawned = true;
  }

  public addLife(): void {
    this.lives += 1;

    this.lifeup.notify(null);
  }

  public removeLife(): void {
    this.lives -= 1;
  }

  public setInputVariant(inputVariant: InputVariant): void {
    this.inputVariant = inputVariant;
  }

  public getInputVariant(): InputVariant | null {
    return this.inputVariant;
  }

  private checkLifeup(): void {
    if (this.getGamePoints() >= this.nextLifePointThreshold) {
      this.nextLifePointThreshold += config.PLAYER_EXTRA_LIVE_POINTS;
      this.addLife();
    }
  }
}
