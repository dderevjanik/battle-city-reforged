import { GameContext } from '../../game/GameUpdateArgs';
import { Session } from '../../game/Session';
import { SceneMenu } from '../../gameObjects/menu/SceneMenu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { MapLoader } from '../../map/MapLoader';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

import { MainMultiplayerLocationParams } from './MainMultiplayerLocationParams';

export class MainMultiplayerScene extends GameScene<MainMultiplayerLocationParams> {
  private title!: SceneMenuTitle;
  private twoPlayerItem!: TextMenuItem;
  private threePlayerItem!: TextMenuItem;
  private fourPlayerItem!: TextMenuItem;
  private backItem!: TextMenuItem;
  private menu!: SceneMenu;
  private session!: Session;
  private mapLoader!: MapLoader;

  protected setup({ session, mapLoader }: GameContext): void {
    this.session = session;
    this.mapLoader = mapLoader;

    this.title = new SceneMenuTitle('MULTIPLAYER');
    this.root.add(this.title);

    this.twoPlayerItem = new TextMenuItem('2 PLAYERS');
    this.twoPlayerItem.selected.addListener(this.handleTwoPlayerSelected);

    this.threePlayerItem = new TextMenuItem('3 PLAYERS');
    this.threePlayerItem.selected.addListener(this.handleThreePlayerSelected);

    this.fourPlayerItem = new TextMenuItem('4 PLAYERS');
    this.fourPlayerItem.selected.addListener(this.handleFourPlayerSelected);

    this.backItem = new TextMenuItem('BACK');
    this.backItem.selected.addListener(this.handleBackSelected);

    this.menu = new SceneMenu();
    this.menu.setItems([
      this.twoPlayerItem,
      this.threePlayerItem,
      this.fourPlayerItem,
      this.backItem,
    ]);
    this.menu.back.addListener(this.handleBackSelected);
    this.root.add(this.menu);
  }

  private startWithCount(count: number): void {
    this.session.setPlayerCount(count);

    if (this.params.fileMapListReader) {
      this.mapLoader.setListReader(this.params.fileMapListReader);
    }

    this.navigator.push(GameSceneType.LevelSelection);
  }

  private handleTwoPlayerSelected = (): void => {
    this.startWithCount(2);
  };

  private handleThreePlayerSelected = (): void => {
    this.startWithCount(3);
  };

  private handleFourPlayerSelected = (): void => {
    this.startWithCount(4);
  };

  private handleBackSelected = (): void => {
    this.navigator.back();
  };
}
