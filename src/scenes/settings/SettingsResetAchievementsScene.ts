import { GameContext } from '../../game/GameUpdateArgs';
import { AchievementsManager } from '../../achievements/AchievementsManager';
import { SceneMenu } from '../../gameObjects/menu/SceneMenu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';

import { GameScene } from '../GameScene';

export class SettingsResetAchievementsScene extends GameScene {
  private title!: SceneMenuTitle;
  private resetItem!: TextMenuItem;
  private backItem!: TextMenuItem;
  private menu!: SceneMenu;
  private achievementsManager!: AchievementsManager;

  protected setup({ achievementsManager }: GameContext): void {
    this.achievementsManager = achievementsManager;

    this.title = new SceneMenuTitle('SETTINGS → RESET ACHIEVEMENTS');
    this.root.add(this.title);

    this.resetItem = new TextMenuItem('RESET ALL ACHIEVEMENTS');
    this.resetItem.selected.addListener(this.handleResetSelected);

    this.backItem = new TextMenuItem('BACK');
    this.backItem.selected.addListener(this.handleBackSelected);

    const menuItems = [this.resetItem, this.backItem];

    this.menu = new SceneMenu();
    this.menu.setItems(menuItems);
    this.menu.back.addListener(this.handleBackSelected);
    this.root.add(this.menu);
  }

  private handleResetSelected = (): void => {
    this.achievementsManager.reset();
    this.navigator.back();
  };

  private handleBackSelected = (): void => {
    this.navigator.back();
  };
}
