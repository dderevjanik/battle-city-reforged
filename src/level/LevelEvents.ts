import { Size } from '../core/Size';
import { Vector } from '../core/Vector';
import { EnemyTank } from '../gameObjects/EnemyTank';
import { PowerupType } from '../powerup/PowerupType';
import { TankDeathReason, TankType } from '../tank/TankTypes';
import { TerrainType } from '../terrain/TerrainType';

export interface LevelEnemyDiedEvent {
  type: TankType;
  centerPosition: Vector;
  reason: TankDeathReason;
  hitterPartyIndex: number | null;
}

export interface LevelEnemyExplodedEvent {
  type: TankType;
  centerPosition: Vector;
  reason: TankDeathReason;
}

export interface LevelEnemyHitEvent {
  type: TankType;
}

export interface LevelEnemySpawnCompletedEvent {
  type: TankType;
  centerPosition: Vector;
  partyIndex: number;
}

export interface LevelEnemySpawnRequestedEvent {
  type: TankType;
  position: Vector;
  partyIndex: number;
  unspawnedCount: number;
}

export interface LevelMapTileDestroyedEvent {
  type: TerrainType;
  position: Vector;
  size: Size;
}

export interface LevelPlayerDiedEvent {
  type: TankType;
  centerPosition: Vector;
  partyIndex: number;
}

export interface LevelPlayerSpawnCompletedEvent {
  type: TankType;
  centerPosition: Vector;
  partyIndex: number;
}

export interface LevelPlayerSpawnRequestedEvent {
  type: TankType;
  partyIndex: number;
  position: Vector;
}

export interface LevelPowerupPickedEvent {
  type: PowerupType;
  centerPosition: Vector;
  partyIndex: number;
}

export interface LevelPowerupSpawnedEvent {
  type: PowerupType;
  position: Vector;
}

export interface LevelEnemyPowerupPickedEvent {
  type: PowerupType;
  tank: EnemyTank;
  centerPosition: Vector;
}
