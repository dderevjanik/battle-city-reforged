import { Analytics } from '../../analytics/Analytics';
import { DebugCollisionMenu } from '../../debug/DebugCollisionMenu';
import { GameState } from '../../game/GameState';
import { GameContext } from '../../game/GameUpdateArgs';
import { Session } from '../../game/Session';
import { Border } from '../../gameObjects/Border';
import { BorderWall } from '../../gameObjects/BorderWall';
import { InputManager } from '../../input/InputManager';
import { MapLoader } from '../../map/MapLoader';
import { ContinueManager } from '../../progress/ContinueManager';
import { LevelProgressManager } from '../../progress/LevelProgressManager';
import { PowerupType } from '../../powerup/PowerupType';
import { TankDeathReason } from '../../tank/TankTypes';
import { TerrainFactory } from '../../terrain/TerrainFactory';
import { TerrainGPULayer } from '../../terrain/TerrainGPULayer';
import { TerrainTile } from '../../gameObjects/TerrainTile';
import { seedGameRandom } from '../../core/Random';
import { resetEntityIds } from '../../core/GameObject';
import { Match } from '../../net/Match';
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
import { LevelCameraScript } from '../../level/scripts/LevelCameraScript';
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
  private mapLoader!: MapLoader;
  private continueManager!: ContinueManager;
  private analytics!: Analytics;
  private debugCollisionMenu!: DebugCollisionMenu;
  private debugPanelAttached = false;

  private levelStartMs = 0;
  private levelKills = 0;
  private levelDeaths = 0;

  private allScripts: LevelScript[] = [];
  private alwaysUpdateScripts: LevelScript[] = [];
  private playingUpdateScripts: LevelScript[] = [];

  private terrainGPULayer: TerrainGPULayer | null = null;
  private terrainTiles: TerrainTile[] = [];
  private gpuLayerInitialized = false;
  private hitPauseRemaining = 0;

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
  private cameraScript: LevelCameraScript | null = null;

  /**
   * This is the scene that participates in multiplayer sync. Menus and
   * other non-gameplay scenes do not — their local state intentionally
   * diverges (different cursor positions, etc.) and broadcasting their
   * hashes produces false-positive desync alerts.
   */
  protected isMultiplayerSyncScene(): boolean {
    return true;
  }

  protected setup(context: GameContext): void {
    const { analytics, collisionSystem, continueManager, inputManager, levelProgressManager, mapLoader, session } = context;

    this.debugCollisionMenu = new DebugCollisionMenu(
      collisionSystem,
      this.root,
      { top: 470 },
    );

    this.eventBus = new LevelEventBus();

    this.inputManager = inputManager;
    this.levelProgressManager = levelProgressManager;
    this.mapLoader = mapLoader;
    this.continueManager = continueManager;
    this.session = session;
    this.analytics = analytics;

    this.levelStartMs = Date.now();
    this.levelKills = 0;
    this.levelDeaths = 0;

    // Seed the gameplay PRNG deterministically from level metadata so that two
    // peers running the same level produce identical RNG sequences. For
    // networked play the host's seed will be sent over the wire instead.
    // In multiplayer the seed comes from the host's handshake so both
    // peers' simulations are identical. Otherwise we derive it from the
    // local level+difficulty as before.
    if (Match.current !== null) {
      seedGameRandom(Match.current.seed);
    } else {
      let diffHash = 0;
      for (const ch of session.getDifficulty()) {
        diffHash = (diffHash * 31 + ch.charCodeAt(0)) | 0;
      }
      seedGameRandom((session.getLevelNumber() * 2654435761) ^ diffHash);
    }
    resetEntityIds();

    if (!session.isDemo() && !session.isPlaytest()) {
      this.analytics.track('level_start', {
        level: session.getLevelNumber(),
        difficulty: session.getDifficulty(),
        party_size: session.getPlayerCount(),
      });
    }

    const { mapConfig } = this.params;

    this.world = new LevelWorld(this.root, mapConfig.getFieldWidth(), mapConfig.getFieldHeight());

    this.root.add(new Border());

    // viewMode="fit": scale the field down so the entire map fits inside the
    // 832×832 playfield viewport, and center it. Set BEFORE tiles are added so
    // the GPU terrain layer captures scaled positions/sizes on first init.
    let fitGapLeft = 0;
    let fitGapTop = 0;
    let fitGapRight = 0;
    let fitGapBottom = 0;
    if (mapConfig.getViewMode() === 'fit') {
      const mw = mapConfig.getFieldWidth();
      const mh = mapConfig.getFieldHeight();
      const fitScale = Math.min(
        config.VIEWPORT_SIZE / mw,
        config.VIEWPORT_SIZE / mh,
        1,
      );
      this.world.field.scale = fitScale;
      const scaledW = mw * fitScale;
      const scaledH = mh * fitScale;
      fitGapLeft = (config.VIEWPORT_SIZE - scaledW) / 2;
      fitGapRight = config.VIEWPORT_SIZE - scaledW - fitGapLeft;
      fitGapTop = (config.VIEWPORT_SIZE - scaledH) / 2;
      fitGapBottom = config.VIEWPORT_SIZE - scaledH - fitGapTop;
      this.world.field.position.set(
        config.BORDER_LEFT_WIDTH + fitGapLeft,
        config.BORDER_TOP_BOTTOM_HEIGHT + fitGapTop,
      );
    } else {
      this.world.field.position.set(
        config.BORDER_LEFT_WIDTH,
        config.BORDER_TOP_BOTTOM_HEIGHT,
      );
    }
    this.world.field.updateMatrix(true);
    this.root.add(this.world.field);

    // Letterbox: when the map's aspect ratio differs from the viewport, fill
    // the leftover gap with grey BorderWalls so (a) it visually matches the
    // surrounding border instead of showing the dark playfield background,
    // and (b) tanks bumping into the scaled field edge collide here instead
    // of being able to drift past the map's logical bounds toward the outer
    // viewport border. Drawn above bullets so a despawning bullet is hidden.
    const addGap = (x: number, y: number, w: number, h: number): void => {
      if (w <= 0 || h <= 0) return;
      const bar = new BorderWall(w, h);
      bar.position.set(x, y);
      bar.setZIndex(config.BULLET_Z_INDEX + 1);
      this.root.add(bar);
    };
    addGap(
      config.BORDER_LEFT_WIDTH,
      config.BORDER_TOP_BOTTOM_HEIGHT,
      config.VIEWPORT_SIZE,
      fitGapTop,
    );
    addGap(
      config.BORDER_LEFT_WIDTH,
      config.BORDER_TOP_BOTTOM_HEIGHT + config.VIEWPORT_SIZE - fitGapBottom,
      config.VIEWPORT_SIZE,
      fitGapBottom,
    );
    addGap(
      config.BORDER_LEFT_WIDTH,
      config.BORDER_TOP_BOTTOM_HEIGHT + fitGapTop,
      fitGapLeft,
      config.VIEWPORT_SIZE - fitGapTop - fitGapBottom,
    );
    addGap(
      config.BORDER_LEFT_WIDTH + config.VIEWPORT_SIZE - fitGapRight,
      config.BORDER_TOP_BOTTOM_HEIGHT + fitGapTop,
      fitGapRight,
      config.VIEWPORT_SIZE - fitGapTop - fitGapBottom,
    );

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

    if (mapConfig.getViewMode() === 'scroll') {
      this.cameraScript = new LevelCameraScript();
    }

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
      ...(this.cameraScript ? [this.cameraScript] : []),
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
      if (this.cameraScript) {
        this.playingUpdateScripts.push(this.cameraScript);
      }
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

    // Screen shake + hit-pause on deaths (respect settings toggle)
    const { screenShakeSettings } = context;
    this.eventBus.enemyDied.addListener(() => {
      if (!screenShakeSettings.getEnabled()) return;
      this.cameras.main.shake(
        config.SCREEN_SHAKE_DURATION,
        config.SCREEN_SHAKE_INTENSITY,
      );
      this.triggerHitPause(config.HIT_PAUSE_DURATION);
    });
    this.eventBus.playerDied.addListener(() => {
      if (!screenShakeSettings.getEnabled()) return;
      this.cameras.main.shake(
        config.SCREEN_SHAKE_DURATION * 2,
        config.SCREEN_SHAKE_INTENSITY_LARGE,
      );
      this.triggerHitPause(config.HIT_PAUSE_DURATION_LARGE);
    });
    this.eventBus.baseDied.addListener(() => {
      if (!screenShakeSettings.getEnabled()) return;
      this.cameras.main.shake(
        config.SCREEN_SHAKE_DURATION * 3,
        config.SCREEN_SHAKE_INTENSITY_LARGE,
      );
      this.triggerHitPause(config.HIT_PAUSE_DURATION_LARGE);
    });

    // Pause the game when the tab loses visibility. Skip demo mode since it's
    // a no-input attract sequence.
    if (!session.isDemo()) {
      const onVisibilityChange = (): void => {
        if (document.hidden) {
          this.pauseScript.pauseIfPlaying();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      this.events.once('shutdown', () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      });
    }
  }

  private exitDemo(): void {
    const seenIntro = this.session.haveSeenIntro();
    this.session.reset();
    this.session.setSeenIntro(seenIntro);
    this.navigator.replace(GameSceneType.MainMenu);
  }

  private triggerHitPause(duration: number): void {
    // Take the longer of any overlapping hit-pauses so a bigger event
    // (player/base death) isn't cut short by a smaller one.
    if (duration > this.hitPauseRemaining) {
      this.hitPauseRemaining = duration;
    }
  }

  protected onUpdate(deltaTime: number): void {
    const { collisionSystem, gameState } = this.context;

    if (this.session.isDemo() && this.inputManager.hasAnyInputThisFrame()) {
      this.exitDemo();
      return;
    }

    if (this.hitPauseRemaining > 0) {
      this.hitPauseRemaining -= deltaTime;
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
    this.levelDeaths += 1;

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
    this.continueManager.clearContinue();

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
    this.levelKills += 1;

    // Only kills are awarded
    if (event.reason === TankDeathReason.WipeoutPowerup) {
      return;
    }

    const playerSession = this.session.getPlayer(event.hitterPartyIndex!);

    playerSession.addKillPoints(event.type.kind);
  };

  private handlePowerupPicked = (event: LevelPowerupPickedEvent): void => {
    if (!this.session.isDemo() && !this.session.isPlaytest()) {
      this.analytics.track('powerup_picked', {
        type: event.type,
        level: this.session.getLevelNumber(),
        party_index: event.partyIndex,
      });
    }

    const playerSession = this.session.getPlayer(event.partyIndex);

    playerSession.addPowerupPoints(event.type);

    if (event.type === PowerupType.Life) {
      playerSession.addLife();
    }
  };

  private handleBaseDied = (): void => {
    this.session.setGameOver();
    this.continueManager.clearContinue();

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

    this.analytics.track('game_over', {
      level: this.session.getLevelNumber(),
      score: this.session.getMaxGamePoints(),
      kills: this.levelKills,
      deaths: this.levelDeaths,
      difficulty: this.session.getDifficulty(),
    });

    this.navigator.replace(GameSceneType.LevelScore, {
      title: this.params.mapConfig.getTitle(this.session.getLevelNumber()),
    });
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

    this.analytics.track('level_complete', {
      level: this.session.getLevelNumber(),
      difficulty: this.session.getDifficulty(),
      party_size: this.session.getPlayerCount(),
      kills: this.levelKills,
      deaths: this.levelDeaths,
      time_sec: Math.round((Date.now() - this.levelStartMs) / 1000),
    });

    this.levelProgressManager.markLevelCompleted(
      this.mapLoader.getActiveGroupName() ?? '',
      this.session.getLevelNumber(),
    );
    this.navigator.replace(GameSceneType.LevelScore, {
      title: this.params.mapConfig.getTitle(this.session.getLevelNumber()),
    });
  };
}
