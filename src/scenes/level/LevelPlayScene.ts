import { DebugCollisionMenu } from '../../debug/DebugCollisionMenu';
import { GameState } from '../../game/GameState';
import { GameContext } from '../../game/GameUpdateArgs';
import { Session } from '../../game/Session';
import { Border } from '../../gameObjects/Border';
import { InputManager } from '../../input/InputManager';
import { LevelProgressManager } from '../../progress/LevelProgressManager';
import { PowerupType } from '../../powerup/PowerupType';
import { TankDeathReason } from '../../tank/TankTypes';
import { TerrainFactory } from '../../terrain/TerrainFactory';
import { TerrainGPULayer } from '../../terrain/TerrainGPULayer';
import { TerrainTile } from '../../gameObjects/TerrainTile';
import * as config from '../../config';

import { LevelEventBus } from '../../level/LevelEventBus';
import { LevelScript } from '../../level/LevelScript';
import { LevelWorld } from '../../level/LevelWorld';
import {
  LevelEnemyDiedEvent,
  LevelPlayerDiedEvent,
  LevelPowerupPickedEvent,
} from '../../level/LevelEvents';
import { LevelAudioScript } from '../../level/scripts/LevelAudioScript';
import { LevelBaseScript } from '../../level/scripts/LevelBaseScript';
import { LevelEnemyScript } from '../../level/scripts/LevelEnemyScript';
import { LevelExplosionScript } from '../../level/scripts/LevelExplosionScript';
import { LevelGameOverScript } from '../../level/scripts/LevelGameOverScript';
import { LevelInfoScript } from '../../level/scripts/LevelInfoScript';
import { LevelIntroScript } from '../../level/scripts/LevelIntroScript';
import { LevelPauseScript } from '../../level/scripts/LevelPauseScript';
import { LevelPlayerOverScript } from '../../level/scripts/LevelPlayerOverScript';
import { LevelPlayerScript } from '../../level/scripts/LevelPlayerScript';
import { LevelPointsScript } from '../../level/scripts/LevelPointsScript';
import { LevelPowerupScript } from '../../level/scripts/LevelPowerupScript';
import { LevelSpawnScript } from '../../level/scripts/LevelSpawnScript';
import { LevelAchievementsScript } from '../../level/scripts/LevelAchievementsScript';
import { LevelStatsScript } from '../../level/scripts/LevelStatsScript';
import { LevelWinScript } from '../../level/scripts/LevelWinScript';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

import { LevelPlayLocationParams } from './LevelPlayLocationParams';

export class LevelPlayScene extends GameScene<LevelPlayLocationParams> {
  private world!: LevelWorld;
  private eventBus!: LevelEventBus;
  private session!: Session;
  private inputManager!: InputManager;
  private levelProgressManager!: LevelProgressManager;
  private debugCollisionMenu!: DebugCollisionMenu;
  private debugPanelAttached = false;

  private allScripts: LevelScript[] = [];
  private alwaysUpdateScripts: LevelScript[] = [];
  private playingUpdateScripts: LevelScript[] = [];

  private terrainGPULayer: TerrainGPULayer | null = null;
  private terrainTiles: TerrainTile[] = [];
  private gpuLayerInitialized = false;

  private audioScript!: LevelAudioScript;
  private baseScript!: LevelBaseScript;
  private enemyScript!: LevelEnemyScript;
  private explosionScript!: LevelExplosionScript;
  private gameOverScript!: LevelGameOverScript;
  private infoScript!: LevelInfoScript;
  private introScript!: LevelIntroScript;
  private playerOverScript!: LevelPlayerOverScript;
  private playerScript!: LevelPlayerScript;
  private pointsScript!: LevelPointsScript;
  private powerupScript!: LevelPowerupScript;
  private pauseScript!: LevelPauseScript;
  private spawnScript!: LevelSpawnScript;
  private winScript!: LevelWinScript;
  private achievementsScript!: LevelAchievementsScript;
  private statsScript!: LevelStatsScript;

  protected setup(context: GameContext): void {
    const { collisionSystem, inputManager, levelProgressManager, session } = context;

    this.debugCollisionMenu = new DebugCollisionMenu(
      collisionSystem,
      this.root,
      { top: 470 },
    );

    this.eventBus = new LevelEventBus();

    this.inputManager = inputManager;
    this.levelProgressManager = levelProgressManager;
    this.session = session;

    const { mapConfig } = this.params;

    this.world = new LevelWorld(this.root, mapConfig.getFieldWidth(), mapConfig.getFieldHeight());

    this.root.add(new Border());

    this.world.field.position.set(
      config.BORDER_LEFT_WIDTH,
      config.BORDER_TOP_BOTTOM_HEIGHT,
    );
    this.root.add(this.world.field);

    const terrainRegions = mapConfig.getTerrainRegions();
    const tiles = TerrainFactory.createMapFromRegionConfigs(terrainRegions, mapConfig.getTileset(), mapConfig.getFieldWidth());

    for (const tile of tiles) {
      tile.destroyed.addListener(() => {
        this.eventBus.mapTileDestroyed.notify({
          type: tile.type,
          position: tile.position.clone(),
          size: tile.size.clone(),
        });
      });
    }

    this.world.field.add(...tiles);
    this.terrainTiles = tiles;
    this.terrainGPULayer = new TerrainGPULayer(this);

    this.audioScript = new LevelAudioScript();
    this.baseScript = new LevelBaseScript();
    this.enemyScript = new LevelEnemyScript();
    this.explosionScript = new LevelExplosionScript();
    this.gameOverScript = new LevelGameOverScript();
    this.infoScript = new LevelInfoScript();
    this.introScript = new LevelIntroScript();
    this.pauseScript = new LevelPauseScript();
    this.playerOverScript = new LevelPlayerOverScript();
    this.playerScript = new LevelPlayerScript();
    this.pointsScript = new LevelPointsScript();
    this.powerupScript = new LevelPowerupScript();
    this.spawnScript = new LevelSpawnScript();
    this.winScript = new LevelWinScript();
    this.achievementsScript = new LevelAchievementsScript();
    this.statsScript = new LevelStatsScript();

    this.allScripts = [
      this.audioScript,
      this.baseScript,
      this.enemyScript,
      this.explosionScript,
      this.gameOverScript,
      this.infoScript,
      this.introScript,
      this.pauseScript,
      this.playerOverScript,
      this.playerScript,
      this.pointsScript,
      this.powerupScript,
      this.spawnScript,
      this.winScript,
      this.achievementsScript,
      this.statsScript,
    ];

    this.allScripts.forEach((script) => {
      script.invokeInit(this.world, this.eventBus, session, mapConfig);
    });

    if (session.isDemo()) {
      this.pauseScript.disable();
    }

    // When intro starts, enable only it and audio
    this.alwaysUpdateScripts = [this.audioScript, this.introScript];
    this.playingUpdateScripts = [];

    // When intro is completed, enable the rest of the scripts
    this.introScript.completed.addListener(() => {
      this.alwaysUpdateScripts.push(
        this.gameOverScript,
        this.pauseScript,
        this.winScript,
      );

      this.playingUpdateScripts.push(
        this.baseScript,
        this.explosionScript,
        this.infoScript,
        this.enemyScript,
        this.spawnScript,
        this.playerOverScript,
        this.playerScript,
        this.pointsScript,
        this.powerupScript,
        this.achievementsScript,
        this.statsScript,
      );
    });

    this.eventBus.baseDied.addListener(this.handleBaseDied);
    this.eventBus.enemyAllDied.addListener(this.handleEnemyAllDied);
    this.eventBus.enemyDied.addListener(this.handleEnemyDied);
    this.eventBus.playerDied.addListener(this.handlePlayerDied);
    this.eventBus.powerupPicked.addListener(this.handlePowerupPicked);
    this.eventBus.levelGameOverCompleted.addListener(
      this.handleLevelGameOverCompleted,
    );
    this.eventBus.levelGameOverMoveBlocked.addListener(
      this.handleLevelGameOverMoveBlocked,
    );
    this.eventBus.levelWinCompleted.addListener(this.handleLevelWinCompleted);
  }

  private exitDemo(): void {
    const seenIntro = this.session.haveSeenIntro();
    this.session.reset();
    this.session.setSeenIntro(seenIntro);
    this.navigator.replace(GameSceneType.MainMenu);
  }

  protected onUpdate(deltaTime: number): void {
    const { collisionSystem, gameState } = this.context;

    if (this.session.isDemo() && this.inputManager.hasAnyInputThisFrame()) {
      this.exitDemo();
      return;
    }

    this.alwaysUpdateScripts.forEach((script) => {
      script.invokeUpdate(this.context, deltaTime);
    });

    if (!gameState.is(GameState.Paused)) {
      // These scripts won't run when game is paused
      this.playingUpdateScripts.forEach((script) => {
        // Extra check not to run same script twice
        if (this.alwaysUpdateScripts.includes(script)) {
          return;
        }

        script.invokeUpdate(this.context, deltaTime);
      });
    }

    // Update all objects on the scene
    this.root.traverseDescedants((node) => {
      const shouldUpdate = gameState.is(GameState.Playing) || node.ignorePause;
      if (shouldUpdate) {
        node.invokeUpdate(this.context, deltaTime);
      }
    });

    this.root.updateWorldMatrix(false, true);

    collisionSystem.update();

    if (config.IS_DEV) {
      const enabled = this.context.debugSettings.getDevPanelEnabled();
      if (enabled && !this.debugPanelAttached) {
        this.debugCollisionMenu.attach();
        this.debugCollisionMenu.show();
        this.debugPanelAttached = true;
      } else if (!enabled && this.debugPanelAttached) {
        this.debugCollisionMenu.hide();
        this.debugCollisionMenu.detach();
        this.debugPanelAttached = false;
      }
      if (enabled) {
        this.debugCollisionMenu.update();
      }
    }

    collisionSystem.collide();

    // Initialize GPU terrain layer after the first update frame, when all
    // tile setup() methods have run and sprites are loaded.
    if (!this.gpuLayerInitialized && this.terrainGPULayer) {
      this.gpuLayerInitialized = true;
      this.terrainGPULayer.initFromTiles(this.terrainTiles);
    }
  }

  private handlePlayerDied = (event: LevelPlayerDiedEvent): void => {
    const playerSession = this.session.getPlayer(event.partyIndex);
    playerSession.removeLife();

    if (this.session.isAnyPlayerAlive()) {
      // If other player is alive, but current player is dead - show
      // notification for dead player that his game is over. Only the first
      // player who dies gets this notification.
      if (!playerSession.isAlive()) {
        this.playerOverScript.setPlayerIndex(event.partyIndex);
        this.playerOverScript.enable();
      }
      return;
    }

    // If both players die - game is lost

    this.session.setGameOver();

    this.pauseScript.disable();
    this.playerScript.disable();
    this.gameOverScript.enable();

    // Game can be lost even after level is won if the base is killed
    this.winScript.disable();
  };

  private handleEnemyAllDied = (): void => {
    this.pauseScript.disable();
    this.winScript.enable();
  };

  private handleEnemyDied = (event: LevelEnemyDiedEvent): void => {
    // Only kills are awarded
    if (event.reason === TankDeathReason.WipeoutPowerup) {
      return;
    }

    const playerSession = this.session.getPlayer(event.hitterPartyIndex!);

    playerSession.addKillPoints(event.type.kind);
  };

  private handlePowerupPicked = (event: LevelPowerupPickedEvent): void => {
    const playerSession = this.session.getPlayer(event.partyIndex);

    playerSession.addPowerupPoints(event.type);

    if (event.type === PowerupType.Life) {
      playerSession.addLife();
    }
  };

  private handleBaseDied = (): void => {
    this.session.setGameOver();

    this.pauseScript.disable();
    this.playerScript.disable();
    this.gameOverScript.enable();

    // Player can lose even after level is won
    this.winScript.disable();
  };

  // Block user input after some delay when game is over
  private handleLevelGameOverMoveBlocked = (): void => {
    this.inputManager.unlisten();
  };

  private handleLevelGameOverCompleted = (): void => {
    // Restore input
    this.inputManager.listen();

    if (this.session.isDemo()) {
      this.exitDemo();
      return;
    }

    if (this.session.isPlaytest()) {
      this.navigator.replace(GameSceneType.MainMenu);
      return;
    }

    this.navigator.replace(GameSceneType.LevelScore);
  };

  private handleLevelWinCompleted = (): void => {
    if (this.session.isDemo()) {
      this.exitDemo();
      return;
    }

    if (this.session.isPlaytest()) {
      this.navigator.replace(GameSceneType.MainMenu);
      return;
    }

    this.levelProgressManager.markLevelCompleted(this.session.getLevelNumber());
    this.navigator.replace(GameSceneType.LevelScore);
  };
}
