import { Subject } from '../core/Subject';
import { GameContext } from '../game/GameUpdateArgs';
import { Tag } from '../game/Tag';
import { TankAttributesFactory } from '../tank/TankAttributesFactory';
import { TankColor, TankKind, TankType } from '../tank/TankTypes';
import { TankColorFactory } from '../tank/TankColorFactory';
import { TankSkinAnimation } from '../tank/TankSkinAnimation';
import * as config from '../config';

import { Tank } from './Tank';

export class PlayerTank extends Tank {
  public upgraded = new Subject<{ kind: TankKind }>();
  public tags = [Tag.Tank, Tag.Player];
  public zIndex = config.PLAYER_TANK_Z_INDEX;
  private kindSkinAnimations = new Map<TankKind, TankSkinAnimation>();
  private colors: TankColor[] = [];

  protected setup(context: GameContext): void {
    const { spriteLoader } = context;

    // Player only has one color
    this.colors.push(TankColorFactory.createPlayerColor(this.partyIndex));

    this.kindSkinAnimations.set(
      TankKind.Basic,
      new TankSkinAnimation(spriteLoader, TankType.PlayerA(), this.colors),
    );
    this.kindSkinAnimations.set(
      TankKind.Fast,
      new TankSkinAnimation(spriteLoader, TankType.PlayerB(), this.colors),
    );
    this.kindSkinAnimations.set(
      TankKind.Medium,
      new TankSkinAnimation(spriteLoader, TankType.PlayerC(), this.colors),
    );
    this.kindSkinAnimations.set(
      TankKind.Heavy,
      new TankSkinAnimation(spriteLoader, TankType.PlayerD(), this.colors),
    );

    this.skinAnimation = this.kindSkinAnimations.get(this.type.kind)!;

    super.setup(context);
  }

  // If kind is provided - it means that specific kind needs to be activated
  // when transitioning to the next level.next
  // If not - then most likely powerup has been picked up and we simply need
  // to upgrade the tank one kind up.
  public upgrade(targetKind: TankKind | null = null, notify = true): void {
    if (this.type.isMaxKind()) {
      return;
    }

    this.type.increaseKind(targetKind);

    this.attributes = TankAttributesFactory.create(this.type);
    this.skinAnimation = this.kindSkinAnimations.get(this.type.kind)!;

    if (notify === true) {
      this.upgraded.notify({ kind: this.type.kind });
    }
  }
}
