import { ACHIEVEMENTS } from '../../achievements/AchievementsRegistry';
import { GameContext } from '../../game/GameUpdateArgs';
import { Menu } from '../../gameObjects/menu/Menu';
import { TextMenuItem } from '../../gameObjects/menu/TextMenuItem';
import { SceneMenuTitle } from '../../gameObjects/text/SceneMenuTitle';
import { SpriteText } from '../../gameObjects/text/SpriteText';
import * as config from '../../config';

import { GameScene } from '../GameScene';

const ITEM_HEIGHT = 36;
// Sprite font: 16px char width + 4px letter spacing = 20px per char.
// Description starts at MENU_TITLE_DEFAULT_POSITION.x (112). Available: ~45 chars.
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
  if (line) {
    lines.push(line);
  }
  return lines.join('\n');
}

export class MainAchievementsScene extends GameScene {
  private description!: SpriteText;

  protected setup({ achievementsManager }: GameContext): void {
    const title = new SceneMenuTitle('ACHIEVEMENTS');
    this.root.add(title);

    const unlockedCount = ACHIEVEMENTS.filter((a) =>
      achievementsManager.isUnlocked(a.id),
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

    this.description = new SpriteText('', { color: config.COLOR_GRAY });
    this.description.position.set(
      config.MENU_TITLE_DEFAULT_POSITION.x,
      config.MENU_TITLE_DEFAULT_POSITION.y + 80,
    );
    this.root.add(this.description);

    const achievementItems = ACHIEVEMENTS.map((achievement) => {
      const unlocked = achievementsManager.isUnlocked(achievement.id);
      const label = (unlocked ? '+ ' : '- ') + achievement.name.toUpperCase();
      const color = unlocked ? config.COLOR_WHITE : config.COLOR_GRAY;
      return new TextMenuItem(label, { color, unfocusableColor: color });
    });

    const backItem = new TextMenuItem('BACK');
    backItem.selected.addListener(this.handleBackSelected);

    const menu = new Menu({ itemHeight: ITEM_HEIGHT });
    menu.setItems([...achievementItems, backItem]);
    menu.position.set(config.MENU_DEFAULT_POSITION.x, 236);
    this.root.add(menu);

    menu.focused.addListener(this.handleMenuFocused);
    // Show description for initial focused item (index 0)
    this.updateDescription(0);
  }

  private handleMenuFocused = (index: number): void => {
    this.updateDescription(index);
  };

  private updateDescription(index: number): void {
    const achievement = ACHIEVEMENTS[index];
    if (achievement === undefined) {
      this.description.setText('');
      return;
    }
    this.description.setText(
      wrapText(achievement.description.toUpperCase(), DESCRIPTION_WRAP_CHARS),
    );
  }

  private handleBackSelected = (): void => {
    this.navigator.back();
  };
}
