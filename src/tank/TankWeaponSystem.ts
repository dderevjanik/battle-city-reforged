import { Subject } from '../core/Subject';
import { Tag } from '../game/Tag';
import { Bullet } from '../gameObjects/Bullet';
import {
  WeaponState,
  afterFire,
  canFire,
  initWeapon,
  tickWeapon,
} from '../sim/weapon';

import type { Tank } from '../gameObjects/Tank';

/**
 * Adapter over src/sim/weapon.ts. Owns the live `bullets` array (which is
 * a tree of Phaser GameObjects) and the `fired` Subject, but delegates the
 * fire-eligibility decision and cooldown bookkeeping to the pure rule.
 */
export class TankWeaponSystem {
  public bullets: Bullet[] = [];
  public fired = new Subject<null>();
  private state: WeaponState = initWeapon();

  public updateTimer(_deltaTime: number): void {
    this.state = tickWeapon(this.state);
  }

  public fire(tank: Tank): boolean | void {
    if (!canFire(this.state, this.bullets.length, tank.attributes.bulletMaxCount)) {
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
    this.state = afterFire(this.state, tank.attributes.bulletRapidFireDelay);

    return true;
  }

  public hasBullet(bullet: Bullet): boolean {
    return this.bullets.includes(bullet);
  }
}
