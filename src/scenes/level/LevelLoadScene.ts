import { Logger } from '../../core/Logger';
import { GameContext } from '../../game/GameUpdateArgs';
import { Session } from '../../game/Session';
import { Curtain } from '../../gameObjects/Curtain';
import { AlertModal } from '../../gameObjects/modals/AlertModal';
import { LevelTitle } from '../../gameObjects/text/LevelTitle';
import { InputHintSettings } from '../../input/InputHintSettings';
import { MapConfig } from '../../map/MapConfig';
import { MapLoader } from '../../map/MapLoader';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

import { LevelControlsLocationParams } from './LevelControlsLocationParams';

enum State {
  Navigation,
  Alert,
}

export class LevelLoadScene extends GameScene {
  private curtain!: Curtain;
  private title!: LevelTitle;
  private alertModal!: AlertModal;
  private mapLoader!: MapLoader;
  private session!: Session;
  private inputHintSettings!: InputHintSettings;
  private state = State.Navigation;
  private log = new Logger(LevelLoadScene.name, Logger.Level.Warn);

  protected setup({
    inputHintSettings,
    mapLoader,
    session,
  }: GameContext): void {
    this.inputHintSettings = inputHintSettings;
    this.session = session;

    const levelNumber = this.session.getLevelNumber();

    this.curtain = new Curtain(
      this.root.size.width,
      this.root.size.height,
      false,
    );
    this.root.add(this.curtain);

    this.title = new LevelTitle(levelNumber, this.session.isPlaytest());
    this.title.setCenter(this.root.getSelfCenter());
    this.title.origin.set(0.5, 0.5);
    this.root.add(this.title);

    this.alertModal = new AlertModal({
      containerWidth: 768,
      message: 'FAILED TO LOAD THE MAP\nTRYING NEXT MAP',
    });
    this.alertModal.size.copyFrom(this.root.size);
    this.alertModal.setVisible(false);
    this.alertModal.accepted.addListener(this.handleAlertAccepted);
    this.root.add(this.alertModal);

    this.mapLoader = mapLoader;
    this.mapLoader.loaded.addListenerOnce(this.handleMapLoaded);
    this.mapLoader.error.addListenerOnce(this.handleMapLoadError);
    this.mapLoader.loadAsync(levelNumber);
  }

  protected onUpdate(deltaTime: number): void {
    if (this.state === State.Alert) {
      this.alertModal.traverse((node) => {
        node.invokeUpdate(this.context, deltaTime);
      });
      return;
    }

    this.root.traverseDescedants((child) => {
      if (child === this.alertModal || child.hasParent(this.alertModal)) {
        return;
      }

      child.invokeUpdate(this.context, deltaTime);
    });
  }

  private handleMapLoaded = (mapConfig: MapConfig): void => {
    this.mapLoader.error.removeListener(this.handleMapLoadError);

    if (this.session.isMultiplayer()) {
      // Check if players already selected their variants.
      // It happens before first level.
      const primaryInputVariant = this.session.getPlayer(0).getInputVariant();
      const needSelectVariant = primaryInputVariant === null;

      if (needSelectVariant) {
        const params: LevelControlsLocationParams = {
          canSelectVariant: true,
          mapConfig,
          playerIndex: 0,
        };
        this.navigator.replace(GameSceneType.LevelControls, params);
        return;
      }
    }

    if (this.inputHintSettings.shouldShowLevelHint()) {
      const params: LevelControlsLocationParams = {
        canSelectVariant: false,
        mapConfig,
        playerIndex: 0,
      };
      this.navigator.replace(GameSceneType.LevelControls, params);
      return;
    }

    this.navigator.replace(GameSceneType.LevelPlay, {
      mapConfig,
    });
  };

  private handleMapLoadError = (err: any): void => {
    this.log.error('Failed to load the map', err);
    this.mapLoader.loaded.removeListener(this.handleMapLoaded);

    if (this.session.isLastLevel()) {
      this.alertModal.setText('FAILED TO LOAD THE MAP\nNO MAPS LEFT');
    }

    this.showAlert();
  };

  private showAlert(): void {
    this.alertModal.setVisible(true);
    this.state = State.Alert;
  }

  private hideAlert(): void {
    this.alertModal.setVisible(false);
    this.state = State.Navigation;
  }

  private handleAlertAccepted = (): void => {
    if (this.session.isPlaytest()) {
      this.navigator.replace(GameSceneType.MainMenu);
      return;
    }

    // If level failed to load it might be last level, but it also might
    // be the only level. Check if user has any points to identify if user
    // has played at all.
    if (this.session.isLastLevel()) {
      const hasPlayed = this.session.getMaxGamePoints() > 0;
      // If user has played and all levels ended, then he has won the game.
      // Otherwise return him to main menu.
      if (hasPlayed) {
        this.navigator.replace(GameSceneType.MainVictory);
      } else {
        this.navigator.replace(GameSceneType.MainMenu);
      }
      return;
    }

    this.session.activateNextLevel();
    this.navigator.replace(GameSceneType.LevelLoad);
  };
}
