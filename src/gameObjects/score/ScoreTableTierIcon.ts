import { GameObject } from '../../core/GameObject';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { Rotation } from '../../game/Rotation';
import { TankColor, TankParty, TankSpriteId, TankTier, TankType } from '../../tank/TankTypes';
import * as config from '../../config';

import { SpriteText } from '../text/SpriteText';

export class ScoreTableTierIcon extends GameObject {
  private tier: TankTier;
  private showRight: boolean;
  private leftIcon = new SpriteText('←', {
    color: config.COLOR_WHITE,
  });
  private rightIcon = new SpriteText('→', {
    color: config.COLOR_WHITE,
  });
  private tank = new GameObject(64, 64);

  constructor(tier: TankTier, showRight = false) {
    super(128, 64);

    this.tier = tier;
    this.showRight = showRight;
  }

  protected setup({ spriteLoader }: GameContext): void {
    const type = new TankType(TankParty.Enemy, this.tier);
    const spriteId = TankSpriteId.create(type, TankColor.Default, Rotation.Up);
    const sprite = spriteLoader.load(spriteId);

    const painter = new SpritePainter();
    painter.sprite = sprite;
    this.tank.painter = painter;
    this.tank.updateMatrix();
    this.tank.setCenter(this.getSelfCenter());
    this.add(this.tank);

    this.leftIcon.position.setY(16);
    this.add(this.leftIcon);

    if (this.showRight) {
      this.rightIcon.position.set(100, 16);
      this.add(this.rightIcon);
    }
  }
}
