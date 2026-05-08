import { GameContext } from '../../game/GameUpdateArgs';
import { MenuDescription } from '../../gameObjects/menu/MenuDescription';
import { SceneMenu } from '../../gameObjects/menu/SceneMenu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { MapLoader } from '../../map/MapLoader';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

const DESCRIPTION_Y = 180;
const MENU_OFFSET_Y = 140;

export class MainMapGroupScene extends GameScene {
  private title!: SceneMenuTitle;
  private description!: MenuDescription;
  private menu!: SceneMenu;
  private groupItems: TextMenuItem[] = [];
  private groupNames: string[] = [];
  private mapLoader!: MapLoader;

  protected setup({ mapLoader }: GameContext): void {
    this.mapLoader = mapLoader;

    this.title = new SceneMenuTitle('SELECT MAPS');
    this.root.add(this.title);

    this.description = new MenuDescription('');
    this.description.position.set(16, DESCRIPTION_Y);
    this.root.add(this.description);

    this.groupNames = this.mapLoader.getGroupNames();
    this.groupItems = this.groupNames.map((name) => {
      const mapCount = this.mapLoader.getGroupMapCount(name);
      const label = `${name.toUpperCase()} (${mapCount})`;
      const item = new TextMenuItem(label);
      item.selected.addListener(() => this.handleGroupSelected(name));
      return item;
    });

    const backItem = new TextMenuItem('BACK');
    backItem.selected.addListener(this.handleBackSelected);

    this.menu = new SceneMenu();
    this.menu.position.addY(MENU_OFFSET_Y);
    this.menu.setItems([...this.groupItems, backItem]);
    this.menu.focused.addListener(this.handleMenuFocused);
    this.menu.back.addListener(this.handleBackSelected);
    this.root.add(this.menu);

    const activeGroup = this.mapLoader.getActiveGroupName();
    const initialIndex = activeGroup
      ? this.groupNames.indexOf(activeGroup)
      : 0;
    this.handleMenuFocused(initialIndex >= 0 ? initialIndex : 0);
  }

  private handleMenuFocused = (index: number): void => {
    const groupName = this.groupNames[index];
    if (groupName === undefined) {
      this.description.setMessage('');
      return;
    }
    const desc = this.mapLoader.getGroupDescription(groupName);
    this.description.setMessage(desc);
  };

  private handleGroupSelected(name: string): void {
    this.mapLoader.setActiveGroup(name);
    this.navigator.push(GameSceneType.LevelSelection);
  }

  private handleBackSelected = (): void => {
    this.navigator.back();
  };
}
