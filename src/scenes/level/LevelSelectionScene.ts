import { GameContext } from '../../game/GameUpdateArgs';
import { Session } from '../../game/Session';
import { SceneMenu } from '../../gameObjects/menu/SceneMenu';
import {
  SelectorMenuItem,
  SelectorMenuItemChoice,
} from '../../gameObjects/menu/SelectorMenuItem';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { MapLoader } from '../../map/MapLoader';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

export class LevelSelectionScene extends GameScene {
  private stageItem!: SelectorMenuItem<number>;
  private enemyPowerupsItem!: TextMenuItem;
  private startItem!: TextMenuItem;
  private menu!: SceneMenu;
  private session!: Session;
  private mapLoader!: MapLoader;

  protected setup({ mapLoader, session }: GameContext): void {
    this.session = session;
    this.mapLoader = mapLoader;

    const title = new SceneMenuTitle('SELECT STAGE');
    this.root.add(title);

    const stageChoices: SelectorMenuItemChoice<number>[] = [];
    for (let i = 1; i <= mapLoader.getItemsCount(); i++) {
      stageChoices.push({ value: i, text: `STAGE ${i}` });
    }

    this.stageItem = new SelectorMenuItem(stageChoices);

    this.enemyPowerupsItem = new TextMenuItem(this.getEnemyPowerupsText());
    this.enemyPowerupsItem.selected.addListener(this.handleEnemyPowerupsSelected);

    this.startItem = new TextMenuItem('START');
    this.startItem.selected.addListener(this.handleStartSelected);

    this.menu = new SceneMenu();
    this.menu.setItems([this.stageItem, this.enemyPowerupsItem, this.startItem]);
    this.menu.back.addListener(this.handleBack);
    this.root.add(this.menu);
  }

  private handleStartSelected = (): void => {
    const stageNumber = this.stageItem.getValue()!;
    this.session.start(stageNumber, this.mapLoader.getItemsCount());
    this.navigator.replace(GameSceneType.LevelLoad);
  };

  private handleEnemyPowerupsSelected = (): void => {
    this.session.setEnemyPowerupsEnabled(!this.session.isEnemyPowerupsEnabled());
    this.enemyPowerupsItem.setText(this.getEnemyPowerupsText());
  };

  private handleBack = (): void => {
    this.navigator.back();
  };

  private getEnemyPowerupsText(): string {
    return `ENEMY POWERUPS [${this.session.isEnemyPowerupsEnabled() ? 'ON' : 'OFF'}]`;
  }
}
