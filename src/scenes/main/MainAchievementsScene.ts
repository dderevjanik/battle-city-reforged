import { ACHIEVEMENTS } from '../../achievements/AchievementsRegistry';
import { AchievementsManager } from '../../achievements/AchievementsManager';
import { GameContext } from '../../game/GameUpdateArgs';
import { Menu } from '../../gameObjects/menu/Menu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { SpriteText } from '../../gameObjects/text/SpriteText';
import { MenuInputContext } from '../../input/InputContexts';
import * as config from '../../config';

import { GameScene } from '../GameScene';

const ITEMS_PER_PAGE = 9;
const ITEM_HEIGHT = 36;
const MENU_Y = 220;
// Below BACK (index ITEMS_PER_PAGE): MENU_Y + (ITEMS_PER_PAGE + 1) * ITEM_HEIGHT + gap
const DESCRIPTION_Y = MENU_Y + (ITEMS_PER_PAGE + 1) * ITEM_HEIGHT + 16;
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

  private pageIndex = 0;
  private totalPages = 0;
  private focusedItemOnPage = 0;

  private pageIndicator!: SpriteText;
  private description!: SpriteText;
  private menu!: Menu;

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
      { color: config.COLOR_GRAY },
    );
    summary.position.set(
      config.MENU_TITLE_DEFAULT_POSITION.x,
      config.MENU_TITLE_DEFAULT_POSITION.y + 40,
    );
    this.root.add(summary);

    this.pageIndicator = new SpriteText('', { color: config.COLOR_GRAY });
    this.pageIndicator.position.set(
      config.MENU_TITLE_DEFAULT_POSITION.x,
      config.MENU_TITLE_DEFAULT_POSITION.y + 72,
    );
    this.root.add(this.pageIndicator);

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

  protected onUpdate(deltaTime: number): void {
    const inputMethod = this.context.inputManager.getActiveMethod();

    if (inputMethod.isDownAny(MenuInputContext.HorizontalNext)) {
      this.changePage(1);
      return;
    }
    if (inputMethod.isDownAny(MenuInputContext.HorizontalPrev)) {
      this.changePage(-1);
      return;
    }

    super.onUpdate(deltaTime);
  }

  private changePage(delta: number): void {
    const next = this.pageIndex + delta;
    if (next < 0 || next >= this.totalPages) {
      return;
    }
    this.pageIndex = next;
    this.buildPage(this.pageIndex);
  }

  private currentPageSize = 0;

  private buildPage(page: number): void {
    const start = page * ITEMS_PER_PAGE;
    const slice = ACHIEVEMENTS.slice(start, start + ITEMS_PER_PAGE);
    this.currentPageSize = slice.length;

    const achievementItems = slice.map((achievement) => {
      const unlocked = this.achievementsManager.isUnlocked(achievement.id);
      const label = (unlocked ? '+ ' : '- ') + achievement.name.toUpperCase();
      const color = unlocked ? config.COLOR_WHITE : config.COLOR_GRAY;
      return new TextMenuItem(label, { color, unfocusableColor: color });
    });

    const backItem = new TextMenuItem('BACK');
    backItem.selected.addListener(this.handleBackSelected);

    this.menu.setItems([...achievementItems, backItem]);

    this.focusedItemOnPage = 0;
    this.updatePageIndicator();
    this.updateDescription(start);
  }

  private updatePageIndicator(): void {
    const left = this.pageIndex > 0 ? '< ' : '  ';
    const right = this.pageIndex < this.totalPages - 1 ? ' >' : '  ';
    this.pageIndicator.setText(
      `${left}PAGE ${this.pageIndex + 1}/${this.totalPages}${right}`,
    );
  }

  private handleMenuFocused = (indexOnPage: number): void => {
    this.focusedItemOnPage = indexOnPage;
    // Last item is always BACK — no achievement description for it
    if (indexOnPage >= this.currentPageSize) {
      this.description.setText('');
      return;
    }
    const globalIndex = this.pageIndex * ITEMS_PER_PAGE + indexOnPage;
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
