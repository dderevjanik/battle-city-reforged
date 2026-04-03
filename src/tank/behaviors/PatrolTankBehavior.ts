import { Vector } from '../../core';
import { Rotation } from '../../game';
import { Tank } from '../../gameObjects';

import { TankBehavior } from '../TankBehavior';

export class PatrolTankBehavior extends TankBehavior {
  private lastPosition: Vector = null;

  public update(tank: Tank, deltaTime: number): void {
    tank.move(deltaTime);

    const tankPosition = this.roundPosition(tank.position);

    if (this.lastPosition !== null && this.lastPosition.equals(tankPosition)) {
      if (tank.rotation === Rotation.Up) {
        tank.rotate(Rotation.Down);
      } else if (tank.rotation === Rotation.Down) {
        tank.rotate(Rotation.Up);
      } else if (tank.rotation === Rotation.Left) {
        tank.rotate(Rotation.Right);
      } else if (tank.rotation === Rotation.Right) {
        tank.rotate(Rotation.Left);
      }
      tank.move(deltaTime);
      return;
    }

    this.lastPosition = tankPosition;
  }

  private roundPosition(position: Vector): Vector {
    const roundedPosition = new Vector(
      Math.round(position.x),
      Math.round(position.y),
    );
    return roundedPosition;
  }
}
