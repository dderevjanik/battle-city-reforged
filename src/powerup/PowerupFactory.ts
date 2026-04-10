import { Powerup } from '../gameObjects/Powerup';

import { PowerupType } from './PowerupType';

// Higher weight = more likely to spawn. Gun is rare (1 vs 10 for others).
const WEIGHTED_TYPES: { type: PowerupType; weight: number }[] = [
  { type: PowerupType.BaseDefence, weight: 10 },
  { type: PowerupType.Freeze, weight: 10 },
  { type: PowerupType.Gun, weight: 4 },
  { type: PowerupType.Life, weight: 10 },
  { type: PowerupType.Shield, weight: 10 },
  { type: PowerupType.Upgrade, weight: 10 },
  { type: PowerupType.Wipeout, weight: 10 },
];

const TOTAL_WEIGHT = WEIGHTED_TYPES.reduce((sum, entry) => sum + entry.weight, 0);

export class PowerupFactory {
  public static create(type: PowerupType): Powerup {
    const powerup = new Powerup(type);
    return powerup;
  }

  public static createRandom(): Powerup {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const entry of WEIGHTED_TYPES) {
      roll -= entry.weight;
      if (roll < 0) {
        return new Powerup(entry.type);
      }
    }
    return new Powerup(WEIGHTED_TYPES[0].type);
  }
}
