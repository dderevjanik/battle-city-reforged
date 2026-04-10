import { Difficulty } from "../../game/Difficulty";
import { GameContext } from "../../game/GameUpdateArgs";
import { Session } from "../../game/Session";
import { LevelMapPreview } from "../../gameObjects/level/LevelMapPreview";
import { SceneMenu } from "../../gameObjects/menu/SceneMenu";
import {
  SelectorMenuItem,
  SelectorMenuItemChoice,
} from "../../gameObjects/menu/SelectorMenuItem";
import { TextMenuItem } from "../../gameObjects/menu/TextMenuItem";
import { SceneMenuTitle } from "../../gameObjects/text/SceneMenuTitle";
import { MapConfig } from "../../map/MapConfig";
import { MapLoader } from "../../map/MapLoader";
import * as config from "../../config";

import { GameScene } from "../GameScene";
import { GameSceneType } from "../GameSceneType";

export class LevelSelectionScene extends GameScene {
  private stageItem!: SelectorMenuItem<number>;
  private difficultyLabelItem!: TextMenuItem;
  private difficultyItem!: SelectorMenuItem<Difficulty>;
  private enemyPowerupsItem!: TextMenuItem;
  private friendlyFireItem!: TextMenuItem;
  private startItem!: TextMenuItem;
  private menu!: SceneMenu;
  private preview!: LevelMapPreview;
  private session!: Session;
  private mapLoader!: MapLoader;

  protected setup({ mapLoader, session }: GameContext): void {
    this.session = session;
    this.mapLoader = mapLoader;

    const title = new SceneMenuTitle("SELECT STAGE");
    this.root.add(title);

    const stageChoices: SelectorMenuItemChoice<number>[] = [];
    for (let i = 1; i <= mapLoader.getItemsCount(); i++) {
      stageChoices.push({ value: i, text: `STAGE ${i}` });
    }

    this.stageItem = new SelectorMenuItem(stageChoices);

    this.difficultyLabelItem = new TextMenuItem("DIFFICULTY");
    this.difficultyLabelItem.setFocusable(false);

    const difficultyChoices: SelectorMenuItemChoice<Difficulty>[] = [
      { value: Difficulty.Classic, text: "CLASSIC" },
      { value: Difficulty.Hard, text: "HARD" },
      { value: Difficulty.Extreme, text: "EXTREME" },
    ];
    this.difficultyItem = new SelectorMenuItem(difficultyChoices);

    this.enemyPowerupsItem = new TextMenuItem(this.getEnemyPowerupsText());
    this.enemyPowerupsItem.selected.addListener(
      this.handleEnemyPowerupsSelected,
    );

    if (this.session.getPlayerCount() > 1) {
      this.friendlyFireItem = new TextMenuItem(this.getFriendlyFireText());
      this.friendlyFireItem.selected.addListener(
        this.handleFriendlyFireSelected,
      );
    }

    this.startItem = new TextMenuItem("START");
    this.startItem.selected.addListener(this.handleStartSelected);

    const menuItems = [
      this.stageItem,
      this.difficultyLabelItem,
      this.difficultyItem,
      this.enemyPowerupsItem,
    ];
    if (this.session.getPlayerCount() > 1) {
      menuItems.push(this.friendlyFireItem);
    }
    menuItems.push(this.startItem);

    this.menu = new SceneMenu();
    this.menu.setItems(menuItems);
    this.menu.back.addListener(this.handleBack);
    this.root.add(this.menu);

    this.preview = new LevelMapPreview(200, config.FIELD_SIZE);
    this.preview.position.set(560, 96);
    this.root.add(this.preview);

    this.mapLoader.loaded.addListener(this.handleMapLoaded);
    this.stageItem.changed.addListener(this.handleStageChanged);
    this.mapLoader.loadAsync(this.stageItem.getValue()!);
  }

  private handleStartSelected = (): void => {
    const stageNumber = this.stageItem.getValue()!;
    this.session.setDifficulty(this.difficultyItem.getValue()!);
    this.session.start(stageNumber, this.mapLoader.getItemsCount());
    this.navigator.replace(GameSceneType.LevelLoad);
  };

  private handleEnemyPowerupsSelected = (): void => {
    this.session.setEnemyPowerupsEnabled(
      !this.session.isEnemyPowerupsEnabled(),
    );
    this.enemyPowerupsItem.setText(this.getEnemyPowerupsText());
  };

  private handleFriendlyFireSelected = (): void => {
    this.session.setFriendlyFireEnabled(!this.session.isFriendlyFireEnabled());
    this.friendlyFireItem.setText(this.getFriendlyFireText());
  };

  private handleBack = (): void => {
    this.navigator.back();
  };

  private handleStageChanged = (
    choice: SelectorMenuItemChoice<number>,
  ): void => {
    this.mapLoader.loadAsync(choice.value);
  };

  private handleMapLoaded = (mapConfig: MapConfig): void => {
    this.preview.setRegions(mapConfig.getTerrainRegions());
  };

  private getEnemyPowerupsText(): string {
    return `ENEMY POWERUPS [${this.session.isEnemyPowerupsEnabled() ? "ON" : "OFF"}]`;
  }

  private getFriendlyFireText(): string {
    return `FRIENDLY FIRE [${this.session.isFriendlyFireEnabled() ? "ON" : "OFF"}]`;
  }
}
