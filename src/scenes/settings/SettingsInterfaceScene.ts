import { AudioManager } from '../../game/AudioManager';
import { GameContext } from '../../game/GameUpdateArgs';
import { SceneMenu } from '../../gameObjects/menu/SceneMenu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { InputHintSettings } from '../../input/InputHintSettings';
import { InputManager } from '../../input/InputManager';

import { GameScene } from '../GameScene';

export class SettingsInterfaceScene extends GameScene {
  private title!: SceneMenuTitle;
  private levelControlsHintItem!: TextMenuItem;
  private touchInputItem!: TextMenuItem;
  private backItem!: TextMenuItem;
  private menu!: SceneMenu;
  private audioManager!: AudioManager;
  private inputHintSettings!: InputHintSettings;
  private inputManager!: InputManager;

  protected setup({ audioManager, inputHintSettings, inputManager }: GameContext): void {
    this.audioManager = audioManager;
    this.inputHintSettings = inputHintSettings;
    this.inputManager = inputManager;

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

    this.backItem = new TextMenuItem('BACK');
    this.backItem.selected.addListener(this.handleBackSelected);

    const menuItems = [
      this.levelControlsHintItem,
      this.touchInputItem,
      this.backItem,
    ];

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
}
