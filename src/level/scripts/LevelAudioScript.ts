import { Sound } from '../../core/Sound';
import { State } from '../../core/State';
import { AudioManager } from '../../game/AudioManager';
import { GameState } from '../../game/GameState';
import { GameContext } from '../../game/GameUpdateArgs';
import { InputManager } from '../../input/InputManager';
import { LevelPlayInputContext } from '../../input/InputContexts';
import { PowerupType } from '../../powerup/PowerupType';

import { LevelScript } from '../LevelScript';
import { LevelPowerupPickedEvent } from '../LevelEvents';

const MOVE_CONTROLS = [
  ...LevelPlayInputContext.MoveUp,
  ...LevelPlayInputContext.MoveDown,
  ...LevelPlayInputContext.MoveLeft,
  ...LevelPlayInputContext.MoveRight,
];

enum MoveState {
  Idle,
  Moving,
}

export class LevelAudioScript extends LevelScript {
  private audioManager!: AudioManager;
  private gameState!: State<GameState>;
  private inputManager!: InputManager;
  private moveState = MoveState.Idle;

  private moveSound!: Sound;
  private idleSound!: Sound;
  private pauseSound!: Sound;
  private playerExplosionSound!: Sound;

  protected setup({
    audioManager,
    audioLoader,
    gameState,
    inputManager,
  }: GameContext): void {
    this.audioManager = audioManager;
    this.gameState = gameState;
    this.inputManager = inputManager;

    this.eventBus.baseDied.addListener(this.handleBaseDied);
    this.eventBus.enemyDied.addListener(this.handleEnemyDied);
    this.eventBus.playerDied.addListener(this.handlePlayerDied);
    this.eventBus.playerFired.addListener(this.handlePlayerFired);
    this.eventBus.playerSlided.addListener(this.handlePlayerSlided);
    this.eventBus.powerupSpawned.addListener(this.handlePowerupSpawned);
    this.eventBus.powerupPicked.addListener(this.handlePowerupPicked);
    this.eventBus.levelPaused.addListener(this.handleLevelPaused);
    this.eventBus.levelUnpaused.addListener(this.levelUnpaused);
    this.eventBus.levelGameOverMoveBlocked.addListener(
      this.handleLevelGameOverMoveBlocked,
    );
    this.eventBus.levelWinCompleted.addListener(this.handleLevelWinCompleted);

    this.session.getPlayers().forEach((playerSession) => {
      playerSession.lifeup.addListener(this.handlePlayerLifeup);
    });

    this.moveSound = audioLoader.load('tank.move');
    this.idleSound = audioLoader.load('tank.idle');
    this.pauseSound = audioLoader.load('pause');
    this.playerExplosionSound = audioLoader.load('explosion.player');

    // Play level intro right away. Rest of the sound must be muted until
    // intro finishes.
    const introSound = audioLoader.load('level-intro');
    introSound.ended.addListener(() => {
      this.audioManager.unmuteAll();
    });
    introSound.play();

    this.audioManager.muteAllExcept(
      introSound,
      this.pauseSound,
      this.playerExplosionSound,
    );

    this.idleSound.playLoop();
  }

  protected update(): void {
    const activeMethod = this.inputManager.getActiveMethod();

    // By default check single-player active input
    let inputMethods = [activeMethod];

    if (this.session.isMultiplayer()) {
      const methods = this.session
        .getPlayers()
        .slice(0, this.session.getPlayerCount())
        .map((playerSession) => {
          const playerVariant = playerSession.getInputVariant();
          if (playerVariant === null) {
            return null;
          }
          return this.inputManager.getMethodByVariant(playerVariant);
        })
        .filter((m) => m !== null);

      if (methods.length > 0) {
        inputMethods = methods;
      }
    }

    const anybodyMoving = inputMethods.some((inputMethod) => {
      return inputMethod.isHoldAny(MOVE_CONTROLS);
    });

    const everybodyIdle = inputMethods.every((inputMethod) => {
      return inputMethod.isNotHoldAll(MOVE_CONTROLS);
    });

    if (!this.gameState.is(GameState.Paused)) {
      // Check if started moving
      if (anybodyMoving && this.moveState !== MoveState.Moving) {
        this.moveState = MoveState.Moving;
        this.idleSound.stop();
        this.moveSound.playLoop();
      }

      // If stopped moving
      if (everybodyIdle && this.moveState !== MoveState.Idle) {
        this.moveState = MoveState.Idle;
        this.moveSound.stop();
        this.idleSound.playLoop();
      }
    }
  }

  private handleBaseDied = (): void => {
    this.playerExplosionSound.play();
  };

  private handleEnemyDied = (): void => {
    // TODO: wipeout powerup explodes multiple enemies, should trigger
    // single audio
    this.audioManager.play('explosion.enemy');
  };

  private handlePlayerDied = (): void => {
    this.playerExplosionSound.play();
  };

  private handlePlayerFired = (): void => {
    this.audioManager.play('fire');
  };

  private handlePlayerSlided = (): void => {
    this.audioManager.play('ice');
  };

  private handlePowerupSpawned = (): void => {
    this.audioManager.play('powerup.spawn');
  };

  private handlePowerupPicked = (event: LevelPowerupPickedEvent): void => {
    // Separate sound for life pickup
    if (event.type === PowerupType.Life) {
      return;
    }

    this.audioManager.play('powerup.pickup');
  };

  private handlePlayerLifeup = (): void => {
    this.audioManager.play('life');
  };

  private handleLevelPaused = (): void => {
    this.audioManager.pauseAll();
    this.pauseSound.play();
  };

  private levelUnpaused = (): void => {
    this.audioManager.resumeAll();
  };

  private handleLevelGameOverMoveBlocked = (): void => {
    this.moveSound.stop();
    this.idleSound.stop();
  };

  private handleLevelWinCompleted = (): void => {
    this.audioManager.stopAll();
  };
}
