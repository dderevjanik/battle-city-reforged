import { Subject } from '../core/Subject';
import { Timer } from '../core/Timer';
import { Tag } from '../game/Tag';
import { Bullet } from '../gameObjects/Bullet';

import type { Tank } from '../gameObjects/Tank';
import type { TankAttributes } from './TankAttributesFactory';

export class TankWeaponSystem {
  public bullets: Bullet[] = [];
  public fired = new Subject<null>();
  private lastFireTimer = new Timer();

  public updateTimer(deltaTime: number): void {
    this.lastFireTimer.update(deltaTime);
  }

  public fire(tank: Tank): boolean | void {
    if (this.bullets.length >= tank.attributes.bulletMaxCount) {
      return;
    }

    if (this.lastFireTimer.isActive()) {
      return;
    }

    const bullet = new Bullet(
      tank.partyIndex,
      tank.attributes.bulletSpeed,
      tank.attributes.bulletTankDamage,
      tank.attributes.bulletWallDamage,
    );

    // Position bullet at the north center of the tank (where the gun is).
    // Bullet will inherit tank's rotation.
    tank.updateWorldMatrix(true);
    tank.add(bullet);
    bullet.updateMatrix();
    bullet.setCenter(tank.getSelfCenter());
    bullet.translateY(tank.size.height / 2 - bullet.size.height / 2);
    bullet.updateMatrix();

    // Detach bullet from tank and move it to the field
    tank.parent!.attach(bullet);

    if (tank.tags.includes(Tag.Player)) {
      bullet.tags.push(Tag.Player);
    } else if (tank.tags.includes(Tag.Enemy)) {
      bullet.tags.push(Tag.Enemy);
    }

    this.bullets.push(bullet);

    bullet.died.addListener(() => {
      this.bullets = this.bullets.filter((b) => b !== bullet);
    });

    this.fired.notify(null);

    this.lastFireTimer.reset(tank.attributes.bulletRapidFireDelay);

    return true;
  }

  public hasBullet(bullet: Bullet): boolean {
    return this.bullets.includes(bullet);
  }
}
