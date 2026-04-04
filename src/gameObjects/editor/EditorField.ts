import { GameObject } from '../../core/GameObject';
import { BoxCollider } from '../../core/collision/BoxCollider';
import { GameContext } from '../../game/GameUpdateArgs';
import { Rotation } from '../../game/Rotation';
import { Tag } from '../../game/Tag';
import { Base } from '../Base';
import { TankColor, TankType } from '../../tank/TankTypes';
import { TankColorFactory } from '../../tank/TankColorFactory';
import * as config from '../../config';

import { EditorTankDummy } from './EditorTankDummy';

export class EditorField extends GameObject {
  private base!: Base;

  constructor() {
    super(config.FIELD_SIZE, config.FIELD_SIZE);
  }

  protected setup({ collisionSystem }: GameContext): void {
    this.base = new Base();
    this.base.collider = new BoxCollider(this.base, false);
    this.base.tags = [Tag.EditorBlockMove];
    this.base.position.set(
      config.BASE_DEFAULT_POSITION.x,
      config.BASE_DEFAULT_POSITION.y,
    );
    collisionSystem.register(this.base.collider);
    this.add(this.base);

    config.PLAYER_DEFAULT_SPAWN_POSITIONS.forEach((location, index) => {
      const dummy = new EditorTankDummy(
        TankType.PlayerA(),
        TankColorFactory.createPlayerColor(index),
      );
      dummy.position.set(location.x, location.y);
      this.add(dummy);
    });

    config.ENEMY_DEFAULT_SPAWN_POSITIONS.forEach((location) => {
      const dummy = new EditorTankDummy(
        TankType.EnemyA(),
        TankColor.Default,
        Rotation.Down,
      );
      dummy.position.set(location.x, location.y);
      this.add(dummy);
    });
  }

  protected update(): void {
    this.base.collider!.update();
  }
}
