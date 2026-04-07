import { GameObject } from '../core/GameObject';
import { Subject } from '../core/Subject';
import { Timer } from '../core/Timer';
import { RectPainter } from '../core/painters/RectPainter';
import { Achievement } from '../achievements/Achievement';
import * as config from '../config';

import { SpriteText } from './text/SpriteText';

const BOX_WIDTH = 860;
const BOX_HEIGHT = 104;
const PADDING = 16;

export class AchievementNotification extends GameObject {
  public completed = new Subject();
  public zIndex = config.ACHIEVEMENT_NOTIFICATION_Z_INDEX;
  public painter = new RectPainter(config.COLOR_GRAY, config.COLOR_YELLOW);

  private readonly timer = new Timer();
  private readonly achievement: Achievement;

  constructor(achievement: Achievement) {
    super(BOX_WIDTH, BOX_HEIGHT);
    this.achievement = achievement;
    this.timer.reset(config.ACHIEVEMENT_NOTIFICATION_DURATION);
    this.timer.done.addListener(this.handleTimer);
  }

  protected setup(): void {
    const header = new SpriteText('ACHIEVEMENT', { color: config.COLOR_YELLOW });
    header.position.set(PADDING, PADDING);
    this.add(header);

    const name = new SpriteText(this.achievement.name.toUpperCase(), {
      color: config.COLOR_WHITE,
    });
    name.position.set(PADDING, PADDING + 28 + 16);
    this.add(name);

    const points = new SpriteText(`${this.achievement.points}P`, {
      color: config.COLOR_GRAY,
    });
    // Position points right-aligned: after setup size is known
    points.position.set(BOX_WIDTH - PADDING - 48, PADDING + 28 + 16);
    this.add(points);
  }

  protected update(deltaTime: number): void {
    this.timer.update(deltaTime);
  }

  private handleTimer = (): void => {
    this.removeSelf();
    this.completed.notify(null);
  };
}
