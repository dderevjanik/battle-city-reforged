import { Subject } from '../core/Subject';

import { LevelEnemyDiedEvent } from './events/LevelEnemyDiedEvent';
import { LevelEnemyExplodedEvent } from './events/LevelEnemyExplodedEvent';
import { LevelEnemyHitEvent } from './events/LevelEnemyHitEvent';
import { LevelEnemySpawnCompletedEvent } from './events/LevelEnemySpawnCompletedEvent';
import { LevelEnemySpawnRequestedEvent } from './events/LevelEnemySpawnRequestedEvent';
import { LevelMapTileDestroyedEvent } from './events/LevelMapTIleDestroyedEvent';
import { LevelPlayerDiedEvent } from './events/LevelPlayerDiedEvent';
import { LevelPlayerSpawnCompletedEvent } from './events/LevelPlayerSpawnCompletedEvent';
import { LevelPlayerSpawnRequestedEvent } from './events/LevelPlayerSpawnRequestedEvent';
import { LevelPowerupPickedEvent } from './events/LevelPowerupPickedEvent';
import { LevelPowerupSpawnedEvent } from './events/LevelPowerupSpawnedEvent';

export class LevelEventBus {
  public baseDied = new Subject();

  public enemyAllDied = new Subject();
  public enemyDied = new Subject<LevelEnemyDiedEvent>();
  public enemyExploded = new Subject<LevelEnemyExplodedEvent>();
  public enemyHit = new Subject<LevelEnemyHitEvent>();
  public enemySpawnCompleted = new Subject<LevelEnemySpawnCompletedEvent>();
  public enemySpawnRequested = new Subject<LevelEnemySpawnRequestedEvent>();

  public mapTileDestroyed = new Subject<LevelMapTileDestroyedEvent>();

  public levelPaused = new Subject();
  public levelUnpaused = new Subject();
  public levelGameOverMoveBlocked = new Subject();
  public levelGameOverCompleted = new Subject();
  public levelWinCompleted = new Subject();

  public playerDied = new Subject<LevelPlayerDiedEvent>();
  public playerFired = new Subject();
  public playerSlided = new Subject();
  public playerSpawnCompleted = new Subject<LevelPlayerSpawnCompletedEvent>();
  public playerSpawnRequested = new Subject<LevelPlayerSpawnRequestedEvent>();

  public powerupSpawned = new Subject<LevelPowerupSpawnedEvent>();
  public powerupPicked = new Subject<LevelPowerupPickedEvent>();
  public powerupRevoked = new Subject();
}
