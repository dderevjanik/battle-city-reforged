import { GameObject } from '../../core/GameObject';
import { GameContext } from '../../game/GameUpdateArgs';
import { Session } from '../../game/Session';
import { Menu } from '../../gameObjects/menu/Menu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { MainHeading } from '../../gameObjects/text/MainHeading';
import { SpriteText } from '../../gameObjects/text/SpriteText';
import { MenuInputContext } from '../../input/InputContexts';
import { PointsHighscoreManager } from '../../points/PointsHighscoreManager';
import { ACHIEVEMENTS } from '../../achievements/AchievementsRegistry';
import { AchievementsManager } from '../../achievements/AchievementsManager';
import { GameStatsManager } from '../../stats/GameStatsManager';
import * as config from '../../config';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

const SLIDE_SPEED = 240;

const STATS_BOTTOM_LEFT_X = 92;
const STATS_KILLS_DEATHS_Y = 800;

const STATS_ACHIEVEMENTS_Y = 848;
const STATS_SCORE_X = 640;
const STATS_SCORE_Y = 64;

enum State {
  Sliding,
  Ready,
}

export class MainMenuScene extends GameScene {
  private group!: GameObject;
  private heading!: MainHeading;
  private menu!: Menu;
  private singlePlayerItem!: TextMenuItem;
  private multiPlayerItem!: TextMenuItem;
  private settingsItem!: TextMenuItem;
  private achievementsItem!: TextMenuItem;
  private state: State = State.Ready;
  private session!: Session;
  private pointsHighscoreManager!: PointsHighscoreManager;
  private achievementsManager!: AchievementsManager;
  private gameStatsManager!: GameStatsManager;

  protected setup({
    mapLoader,
    pointsHighscoreManager,
    session,
    achievementsManager,
    gameStatsManager,
  }: GameContext): void {
    this.session = session;
    this.pointsHighscoreManager = pointsHighscoreManager;
    this.achievementsManager = achievementsManager;
    this.gameStatsManager = gameStatsManager;

    // Restore source for maps to default
    mapLoader.restoreDefaultReader();

    this.group = new GameObject();
    this.group.size.copyFrom(this.root.size);

    this.heading = new MainHeading();
    this.heading.origin.setX(0.5);
    this.heading.setCenter(this.root.getSelfCenter());
    this.heading.position.setY(160);
    this.group.add(this.heading);

    // Stats panel
    const stats = this.gameStatsManager.getStats();
    const unlockedCount = ACHIEVEMENTS.filter((a) =>
      this.achievementsManager.isUnlocked(a.id),
    ).length;

    const killsText = new SpriteText(
      `KILLS ${stats.enemiesKilled.total}`,
      { color: config.COLOR_WHITE },
    );
    killsText.position.set(STATS_BOTTOM_LEFT_X, STATS_KILLS_DEATHS_Y);
    this.group.add(killsText);

    const deathsText = new SpriteText(
      `DEATHS ${stats.deaths.total}`,
      { color: config.COLOR_WHITE },
    );
    deathsText.origin.setX(1);
    deathsText.position.set(this.root.size.width - STATS_BOTTOM_LEFT_X, STATS_KILLS_DEATHS_Y);
    this.group.add(deathsText);

    const scoreText = new SpriteText(
      `SCORE ${this.pointsHighscoreManager.getOverallMaxPoints()}`,
      { color: config.COLOR_WHITE },
    );
    scoreText.position.set(STATS_SCORE_X, STATS_SCORE_Y);
    this.group.add(scoreText);

    const achievementsText = new SpriteText(
      `ACHIEVEMENTS ${unlockedCount}/${ACHIEVEMENTS.length}`,
      { color: config.COLOR_WHITE },
    );
    achievementsText.position.set(STATS_BOTTOM_LEFT_X, STATS_ACHIEVEMENTS_Y);
    this.group.add(achievementsText);

    this.singlePlayerItem = new TextMenuItem('1 PLAYER');
    this.singlePlayerItem.selected.addListener(this.handleSinglePlayerSelected);

    this.multiPlayerItem = new TextMenuItem('MULTIPLAYER');
    this.multiPlayerItem.selected.addListener(this.handleMultiPlayerSelected);

    this.settingsItem = new TextMenuItem('SETTINGS');
    this.settingsItem.selected.addListener(this.handleSettingsSelected);

    this.achievementsItem = new TextMenuItem('ACHIEVEMENTS');
    this.achievementsItem.selected.addListener(this.handleAchievementsSelected);

    const menuItems = [
      this.singlePlayerItem,
      this.multiPlayerItem,
      this.settingsItem,
      this.achievementsItem,
    ];

    this.menu = new Menu();
    this.menu.setItems(menuItems);
    this.menu.setCenter(this.root.getSelfCenter());
    this.menu.position.setY(490);
    this.group.add(this.menu);

    if (!this.session.haveSeenIntro()) {
      this.state = State.Sliding;
      this.group.position.setY(this.root.size.height);
      this.menu.hideCursor();
    }

    this.root.add(this.group);
  }

  protected onUpdate(deltaTime: number): void {
    const { inputManager } = this.context;

    const inputMethod = inputManager.getActiveMethod();

    if (this.state === State.Sliding) {
      let nextPosition = this.group.position.y - SLIDE_SPEED * deltaTime;
      if (nextPosition <= 0) {
        nextPosition = 0;
      }

      const isSkipped = inputMethod.isDownAny(MenuInputContext.Skip);
      if (isSkipped) {
        nextPosition = 0;
      }

      const hasReachedTop = nextPosition === 0;

      this.group.position.setY(nextPosition);
      this.group.updateMatrix(true);

      if (hasReachedTop) {
        this.state = State.Ready;
        this.menu.showCursor();
        this.session.setSeenIntro(true);
      } else {
        super.onUpdate(deltaTime);
      }
      return;
    }

    super.onUpdate(deltaTime);
  }

  private handleSinglePlayerSelected = (): void => {
    this.navigator.push(GameSceneType.LevelSelection);
  };

  private handleMultiPlayerSelected = (): void => {
    this.navigator.push(GameSceneType.MainMultiplayer);
  };

  private handleSettingsSelected = (): void => {
    this.navigator.push(GameSceneType.SettingsMenu);
  };

  private handleAchievementsSelected = (): void => {
    this.navigator.push(GameSceneType.MainAchievements);
  };
}
