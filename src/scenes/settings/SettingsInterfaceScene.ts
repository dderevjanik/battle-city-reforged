import { AudioManager } from '../../game/AudioManager';
import { GameContext } from '../../game/GameUpdateArgs';
import { ScreenShakeSettings } from '../../game/ScreenShakeSettings';
import { SceneMenu } from '../../gameObjects/menu/SceneMenu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { DebugSettings } from '../../debug/DebugSettings';
import { InputHintSettings } from '../../input/InputHintSettings';
import { InputManager } from '../../input/InputManager';
import * as config from '../../config';

import { GameScene } from '../GameScene';

export class SettingsInterfaceScene extends GameScene {
  private title!: SceneMenuTitle;
  private levelControlsHintItem!: TextMenuItem;
  private touchInputItem!: TextMenuItem;
  private screenShakeItem!: TextMenuItem;
  private devPanelItem!: TextMenuItem;
  private backItem!: TextMenuItem;
  private menu!: SceneMenu;
  private audioManager!: AudioManager;
  private debugSettings!: DebugSettings;
  private inputHintSettings!: InputHintSettings;
  private inputManager!: InputManager;
  private screenShakeSettings!: ScreenShakeSettings;

  protected setup({ audioManager, debugSettings, inputHintSettings, inputManager, screenShakeSettings }: GameContext): void {
    this.audioManager = audioManager;
    this.debugSettings = debugSettings;
    this.inputHintSettings = inputHintSettings;
    this.inputManager = inputManager;
    this.screenShakeSettings = screenShakeSettings;

    this.title = new SceneMenuTitle('SETTINGS → INTERFACE');
    this.root.add(this.title);

    this.levelControlsHintItem = new TextMenuItem(
      this.getLevelControlsHintText(),
    );
    this.levelControlsHintItem.selected.addListener(
      this.handleLevelControlsHintSelected,
    );

    this.touchInputItem = new TextMenuItem(this.getTouchInputText());
    this.touchInputItem.selected.addListener(this.handleTouchInputSelected);

    this.screenShakeItem = new TextMenuItem(this.getScreenShakeText());
    this.screenShakeItem.selected.addListener(this.handleScreenShakeSelected);

    this.backItem = new TextMenuItem('BACK');
    this.backItem.selected.addListener(this.handleBackSelected);

    const menuItems: TextMenuItem[] = [
      this.levelControlsHintItem,
      this.touchInputItem,
      this.screenShakeItem,
    ];

    if (config.IS_DEV) {
      this.devPanelItem = new TextMenuItem(this.getDevPanelText());
      this.devPanelItem.selected.addListener(this.handleDevPanelSelected);
      menuItems.push(this.devPanelItem);
    }

    menuItems.push(this.backItem);

    this.menu = new SceneMenu();
    this.menu.setItems(menuItems);
    this.menu.back.addListener(this.handleBackSelected);
    this.root.add(this.menu);
  }

  private handleLevelControlsHintSelected = (): void => {
    const showLevelHint = this.inputHintSettings.getShowLevelHint();
    const nextShowLevelHint = !showLevelHint;

    this.inputHintSettings.setShowLevelHint(nextShowLevelHint);

    this.levelControlsHintItem.setText(this.getLevelControlsHintText());
  };

  private handleTouchInputSelected = (): void => {
    this.inputManager.setTouchEnabled(!this.inputManager.getTouchEnabled());
    this.touchInputItem.setText(this.getTouchInputText());
  };

  private handleDevPanelSelected = (): void => {
    this.debugSettings.setDevPanelEnabled(!this.debugSettings.getDevPanelEnabled());
    this.devPanelItem.setText(this.getDevPanelText());
  };

  private handleScreenShakeSelected = (): void => {
    this.screenShakeSettings.setEnabled(!this.screenShakeSettings.getEnabled());
    this.screenShakeItem.setText(this.getScreenShakeText());
  };

  private handleBackSelected = (): void => {
    this.navigator.back();
  };

  private getLevelControlsHintText(): string {
    const isEnabled = this.inputHintSettings.getShowLevelHint();

    let checkmark = ' ';
    if (isEnabled === null || isEnabled) {
      checkmark = '+';
    }

    return `GAMEPLAY CONTROLS HINT [${checkmark}]`;
  }

  private getTouchInputText(): string {
    const checkmark = this.inputManager.getTouchEnabled() ? '+' : ' ';
    return `TOUCH INPUT [${checkmark}]`;
  }

  private getScreenShakeText(): string {
    const checkmark = this.screenShakeSettings.getEnabled() ? '+' : ' ';
    return `SCREEN SHAKE [${checkmark}]`;
  }

  private getDevPanelText(): string {
    const checkmark = this.debugSettings.getDevPanelEnabled() ? '+' : ' ';
    return `DEV PANEL [${checkmark}]`;
  }
}
