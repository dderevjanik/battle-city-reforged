import { State } from '../../core';
import { GameContext, GameState } from '../../game';
import { PauseNotice } from '../../gameObjects';
import { InputManager, LevelPlayInputContext } from '../../input';

import { LevelScript } from '../LevelScript';

export class LevelPauseScript extends LevelScript {
  private notice: PauseNotice;
  private gameState: State<GameState>;
  private inputManager: InputManager;

  protected setup({ gameState, inputManager }: GameContext): void {
    this.gameState = gameState;
    this.inputManager = inputManager;
    this.notice = new PauseNotice();
    this.notice.updateMatrix();
    this.notice.setCenter(this.world.field.getSelfCenter());
    this.notice.position.y += 18;
    this.notice.setVisible(false);
    this.world.field.add(this.notice);
  }

  protected update(): void {
    const activeMethod = this.inputManager.getActiveMethod();

    // By default check single-player active input
    let inputMethods = [activeMethod];

    if (this.session.isMultiplayer()) {
      const playerSessions = this.session.getPlayers();

      // Get input variants for all players
      inputMethods = playerSessions.map((playerSession) => {
        const playerVariant = playerSession.getInputVariant();
        const playerMethod = this.inputManager.getMethodByVariant(playerVariant);
        return playerMethod;
      });
    }

    const anybodyPaused = inputMethods.some((inputMethod) => {
      return inputMethod.isDownAny(LevelPlayInputContext.Pause);
    });

    if (anybodyPaused) {
      if (this.gameState.is(GameState.Playing)) {
        this.gameState.set(GameState.Paused);
        this.activate();
      } else {
        this.gameState.set(GameState.Playing);
        this.deactivate();
      }
    }
  }

  private activate(): void {
    this.notice.setVisible(true);
    this.notice.restart();

    this.eventBus.levelPaused.notify(null);
  }

  private deactivate(): void {
    this.notice.setVisible(false);

    this.eventBus.levelUnpaused.notify(null);
  }
}
