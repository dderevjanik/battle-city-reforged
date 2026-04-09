import { ACHIEVEMENTS } from '../../achievements/AchievementsRegistry';
import { AchievementsManager } from '../../achievements/AchievementsManager';
import { GameContext } from '../../game/GameUpdateArgs';
import { Menu } from '../../gameObjects/menu/Menu';
import { SelectorMenuItem, SelectorMenuItemChoice } from '../../gameObjects/menu/SelectorMenuItem';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { SpriteText } from '../../gameObjects/text/SpriteText';
import * as config from '../../config';

import { GameScene } from '../GameScene';

const ITEMS_PER_PAGE = 9;
const ITEM_HEIGHT = 36;
const MENU_Y = 220;
const DESCRIPTION_Y = MENU_Y + (ITEMS_PER_PAGE + 3) * ITEM_HEIGHT + 16;
const DESCRIPTION_WRAP_CHARS = 45;

function wrapText(text: string, maxChars: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

export class MainAchievementsScene extends GameScene {
  private achievementsManager!: AchievementsManager;

  private totalPages = 0;
  private pageSelector!: SelectorMenuItem<number>;
  private description!: SpriteText;
  private menu!: Menu;
  private currentPageSize = 0;

  protected setup(context: GameContext): void {
    this.achievementsManager = context.achievementsManager;

    this.totalPages = Math.ceil(ACHIEVEMENTS.length / ITEMS_PER_PAGE);

    const title = new SceneMenuTitle('ACHIEVEMENTS');
    this.root.add(title);

    const unlockedCount = ACHIEVEMENTS.filter((a) =>
      this.achievementsManager.isUnlocked(a.id),
    ).length;

    const summary = new SpriteText(
      `${unlockedCount}/${ACHIEVEMENTS.length} UNLOCKED`,
      { color: config.COLOR_WHITE },
    );
    summary.position.set(
      config.MENU_TITLE_DEFAULT_POSITION.x,
      config.MENU_TITLE_DEFAULT_POSITION.y + 40,
    );
    this.root.add(summary);

    const pageChoices: SelectorMenuItemChoice<number>[] = [];
    for (let i = 0; i < this.totalPages; i++) {
      pageChoices.push({ value: i, text: `PAGE ${i + 1}/${this.totalPages}` });
    }

    this.pageSelector = new SelectorMenuItem(pageChoices, {
      color: config.COLOR_WHITE,
      containerWidth: 256,
    });
    this.pageSelector.changed.addListener(this.handlePageChanged);

    this.menu = new Menu({ itemHeight: ITEM_HEIGHT });
    this.menu.position.set(config.MENU_DEFAULT_POSITION.x, MENU_Y);
    this.root.add(this.menu);

    this.description = new SpriteText('', { color: config.COLOR_GRAY });
    this.description.position.set(
      config.MENU_TITLE_DEFAULT_POSITION.x,
      DESCRIPTION_Y,
    );
    this.root.add(this.description);

    this.menu.focused.addListener(this.handleMenuFocused);
    this.menu.back.addListener(this.handleBackSelected);

    this.buildPage(0);
  }

  private handlePageChanged = (choice: SelectorMenuItemChoice<number>): void => {
    this.buildPage(choice.value);
  };

  private buildPage(page: number): void {
    const start = page * ITEMS_PER_PAGE;
    const slice = ACHIEVEMENTS.slice(start, start + ITEMS_PER_PAGE);
    this.currentPageSize = slice.length;

    const achievementItems = slice.map((achievement) => {
      const unlocked = this.achievementsManager.isUnlocked(achievement.id);
      const label = (unlocked ? '+ ' : '- ') + achievement.name.toUpperCase();
      const color = unlocked ? config.COLOR_YELLOW : config.COLOR_GRAY;
      return new TextMenuItem(label, { color, unfocusableColor: color });
    });

    const spacerItem = new TextMenuItem('', {
      color: config.COLOR_GRAY,
      unfocusableColor: config.COLOR_GRAY,
    });
    spacerItem.setFocusable(false);

    const backItem = new TextMenuItem('BACK');
    backItem.selected.addListener(this.handleBackSelected);

    this.menu.setItems([this.pageSelector, ...achievementItems, spacerItem, backItem]);

    this.pageSelector.setValue(page);
    this.updateDescription(start);
  }

  private handleMenuFocused = (indexOnPage: number): void => {
    // index 0 is the pageSelector; achievement items start at 1
    const achievementIndex = indexOnPage - 1;
    if (achievementIndex < 0 || achievementIndex >= this.currentPageSize) {
      this.description.setText('');
      return;
    }
    const globalIndex = this.pageSelector.getValue()! * ITEMS_PER_PAGE + achievementIndex;
    this.updateDescription(globalIndex);
  };

  private updateDescription(globalIndex: number): void {
    const achievement = ACHIEVEMENTS[globalIndex];
    if (achievement === undefined) {
      this.description.setText('');
      return;
    }
    let text = wrapText(achievement.description.toUpperCase(), DESCRIPTION_WRAP_CHARS);
    const unlockedAt = this.achievementsManager.getUnlockedAt(achievement.id);
    if (unlockedAt !== null) {
      text += '\n\nUNLOCKED ' + unlockedAt.toISOString().substring(0, 10);
    }
    this.description.setText(text);
  }

  private handleBackSelected = (): void => {
    this.navigator.back();
  };
}
