import { Difficulty } from "../../game/Difficulty";
import { GameContext } from "../../game/GameUpdateArgs";
import { Session } from "../../game/Session";
import { LevelMapPreview } from "../../gameObjects/level/LevelMapPreview";
import { MenuItem } from "../../gameObjects/menu/MenuItem";
import { SceneMenu } from "../../gameObjects/menu/SceneMenu";
import {
  SelectorMenuItem,
  SelectorMenuItemChoice,
} from "../../gameObjects/menu/SelectorMenuItem";
import { TextMenuItem } from "../../gameObjects/menu/TextMenuItem";
import { SceneMenuTitle } from "../../gameObjects/text/SceneMenuTitle";
import { SpriteText } from "../../gameObjects/text/SpriteText";
import { MapConfig } from "../../map/MapConfig";
import { MapLoader } from "../../map/MapLoader";
import { LevelProgressManager } from "../../progress/LevelProgressManager";
import * as config from "../../config";

import { GameScene } from "../GameScene";
import { GameSceneType } from "../GameSceneType";

export class LevelSelectionScene extends GameScene {
  private groupLabelItem: TextMenuItem | null = null;
  private groupItem: SelectorMenuItem<string> | null = null;
  private stageItem!: SelectorMenuItem<number>;
  private difficultyLabelItem!: TextMenuItem;
  private difficultyItem!: SelectorMenuItem<Difficulty>;
  private enemyPowerupsItem!: TextMenuItem;
  private friendlyFireItem!: TextMenuItem;
  private startItem!: TextMenuItem;
  private menu!: SceneMenu;
  private preview!: LevelMapPreview;
  private completeText!: SpriteText;
  private session!: Session;
  private mapLoader!: MapLoader;
  private levelProgressManager!: LevelProgressManager;

  protected setup({ levelProgressManager, mapLoader, session }: GameContext): void {
    this.session = session;
    this.mapLoader = mapLoader;
    this.levelProgressManager = levelProgressManager;

    const title = new SceneMenuTitle("SELECT STAGE");
    this.root.add(title);

    const groupNames = this.mapLoader.getGroupNames();
    if (groupNames.length > 1) {
      this.groupLabelItem = new TextMenuItem("MAP GROUP");
      this.groupLabelItem.setFocusable(false);

      const groupChoices: SelectorMenuItemChoice<string>[] = groupNames.map(
        (name) => ({ value: name, text: name.toUpperCase() }),
      );
      this.groupItem = new SelectorMenuItem(groupChoices);
      this.groupItem.setValue(
        this.mapLoader.getActiveGroupName() ?? groupNames[0],
      );
      this.groupItem.changed.addListener(this.handleGroupChanged);
    }

    this.stageItem = this.createStageItem();

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

    this.menu = new SceneMenu();
    this.menu.setItems(this.buildMenuItems());
    this.menu.back.addListener(this.handleBack);
    this.root.add(this.menu);

    this.preview = new LevelMapPreview(200, config.FIELD_SIZE);
    this.preview.position.set(560, 96);
    this.root.add(this.preview);

    this.completeText = new SpriteText("COMPLETE", {
      color: config.COLOR_YELLOW,
    });
    this.completeText.origin.setX(0.5);
    this.completeText.position.set(660, 304);
    this.completeText.setVisible(
      this.levelProgressManager.isLevelCompleted(this.stageItem.getValue()!),
    );
    this.root.add(this.completeText);

    this.mapLoader.loaded.addListener(this.handleMapLoaded);
    this.mapLoader.loadAsync(this.stageItem.getValue()!);
  }

  private buildMenuItems(): MenuItem[] {
    const menuItems: MenuItem[] = [];
    if (this.groupLabelItem !== null && this.groupItem !== null) {
      menuItems.push(this.groupLabelItem, this.groupItem);
    }
    menuItems.push(
      this.stageItem,
      this.difficultyLabelItem,
      this.difficultyItem,
      this.enemyPowerupsItem,
    );
    if (this.session.getPlayerCount() > 1) {
      menuItems.push(this.friendlyFireItem);
    }
    menuItems.push(this.startItem);
    return menuItems;
  }

  private createStageItem(): SelectorMenuItem<number> {
    const stageChoices: SelectorMenuItemChoice<number>[] = [];
    for (let i = 1; i <= this.mapLoader.getItemsCount(); i++) {
      stageChoices.push({ value: i, text: `STAGE ${i}` });
    }
    const item = new SelectorMenuItem(stageChoices);
    item.changed.addListener(this.handleStageChanged);
    return item;
  }

  private handleGroupChanged = (
    choice: SelectorMenuItemChoice<string>,
  ): void => {
    this.mapLoader.setActiveGroup(choice.value);
    this.stageItem = this.createStageItem();
    this.menu.setItems(this.buildMenuItems());
    this.completeText.setVisible(
      this.levelProgressManager.isLevelCompleted(this.stageItem.getValue()!),
    );
    this.mapLoader.loadAsync(this.stageItem.getValue()!);
  };

  private handleStartSelected = (): void => {
    const stageNumber = this.stageItem.getValue()!;
    const difficulty = this.difficultyItem.getValue()!;
    this.session.setDifficulty(difficulty);
    this.session.start(stageNumber, this.mapLoader.getItemsCount());
    this.context.analytics.track('difficulty_selected', { difficulty });
    this.context.analytics.track('game_start', {
      difficulty,
      party_size: this.session.getPlayerCount(),
      start_level: stageNumber,
      enemy_powerups: this.session.isEnemyPowerupsEnabled(),
      friendly_fire: this.session.isFriendlyFireEnabled(),
      via: 'new',
    });
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
    this.completeText.setVisible(
      this.levelProgressManager.isLevelCompleted(choice.value),
    );
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
