import { FileOpener } from '../../core/file/FileDialogs';
import { GameContext } from '../../game/GameUpdateArgs';
import { DividerMenuItem } from '../../gameObjects/menu/DividerMenuItem';
import { MenuDescription } from '../../gameObjects/menu/MenuDescription';
import { SceneMenu } from '../../gameObjects/menu/SceneMenu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { FileMapListReader } from '../../map/MapListReaders';
import { MapLoader } from '../../map/MapLoader';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';
import { MainMultiplayerLocationParams } from '../main/MainMultiplayerLocationParams';

export class ModesCustomScene extends GameScene {
  private title!: SceneMenuTitle;
  private description!: MenuDescription;
  private loadItem!: TextMenuItem;
  private singlePlayerItem!: TextMenuItem;
  private multiPlayerItem!: TextMenuItem;
  private backItem!: TextMenuItem;
  private menu!: SceneMenu;
  private mapLoader!: MapLoader;
  private fileMapListReader: FileMapListReader | null = null;

  protected setup({ mapLoader }: GameContext): void {
    this.mapLoader = mapLoader;

    this.title = new SceneMenuTitle('MODES → CUSTOM MAPS');
    this.root.add(this.title);

    this.description = new MenuDescription(
      'LOAD YOUR OWN LIST OF MAPS \nFROM CONSTRUCTION JSON FILES',
    );
    this.description.position.set(16, 180);
    this.root.add(this.description);

    this.loadItem = new TextMenuItem('LOAD');
    this.loadItem.selected.addListener(this.handleLoadSelected);

    this.singlePlayerItem = new TextMenuItem('PLAY - 1 PLAYER');
    this.singlePlayerItem.selected.addListener(this.handleSinglePlayerSelected);
    this.singlePlayerItem.setFocusable(false);

    this.multiPlayerItem = new TextMenuItem('PLAY - MULTIPLAYER');
    this.multiPlayerItem.selected.addListener(this.handleMultiPlayerSelected);
    this.multiPlayerItem.setFocusable(false);

    this.backItem = new TextMenuItem('BACK');
    this.backItem.selected.addListener(this.handleBackSelected);

    const divider = new DividerMenuItem();

    this.menu = new SceneMenu();
    this.menu.position.addY(164);
    this.menu.setItems([
      this.loadItem,
      this.singlePlayerItem,
      this.multiPlayerItem,
      divider,
      this.backItem,
    ]);
    this.menu.back.addListener(this.handleBackSelected);
    this.root.add(this.menu);
  }

  private updateMenu(): void {
    this.singlePlayerItem.setFocusable(this.canPlay());
    this.multiPlayerItem.setFocusable(this.canPlay());
  }

  private canPlay(): boolean {
    return this.fileMapListReader !== null;
  }

  private handleLoadSelected = (): void => {
    const fileOpener = new FileOpener();
    fileOpener.opened.addListener((files) => {
      this.fileMapListReader = new FileMapListReader(files);
      this.updateMenu();
    });
    fileOpener.openDialog();
  };

  private handleSinglePlayerSelected = (): void => {
    this.mapLoader.setListReader(this.fileMapListReader!);
    this.navigator.push(GameSceneType.LevelSelection);
  };

  private handleMultiPlayerSelected = (): void => {
    const params: MainMultiplayerLocationParams = {
      fileMapListReader: this.fileMapListReader!,
    };
    this.navigator.push(GameSceneType.MainMultiplayer, params);
  };

  private handleBackSelected = (): void => {
    this.mapLoader.restoreDefaultReader();
    this.navigator.back();
  };
}
