import Ajv from 'ajv';

import { TankBulletWallDamage, TankKind, TankParty, TankType } from './TankTypes';
import { TankAiMode } from './TankAiMode';
import tankManifest from '../../data/tank.manifest.json';
import tankSchema from '../../data/tank.schema.json';

export interface TankAttributes {
  ai?: TankAiMode;
  sprite?: TankKind;
  bulletMaxCount: number;
  bulletRapidFireDelay: number;
  bulletSpeed: number;
  bulletTankDamage: number;
  bulletWallDamage: TankBulletWallDamage;
  health: number;
  moveSpeed: number;
}

export interface TankAttributesListSelector {
  party: TankParty;
  kind: TankKind;
}

interface TankAttributesListItem {
  selector: TankAttributesListSelector;
  attributes: TankAttributes;
}

interface TankAttributesConfig {
  list: TankAttributesListItem[];
}

const validateTankManifest = new Ajv().compile<TankAttributesConfig>(tankSchema);
if (!validateTankManifest(tankManifest)) {
  throw new Error(
    `Invalid tank manifest: ${new Ajv().errorsText(validateTankManifest.errors)}`,
  );
}
const config = tankManifest as TankAttributesConfig;

export class TankAttributesFactory {
  public static create(type: TankType): TankAttributes {
    const foundItem = config.list.find((item) => {
      const { selector } = item;
      return selector.party === type.party && selector.kind === type.kind;
    });

    if (foundItem === undefined) {
      throw new Error(
        `Tank attributes not found for type = "${type.serialize()}"`,
      );
    }

    // Shallow copy to prevent mutation of manifest data
    const attributes = Object.assign({}, foundItem.attributes);

    return attributes;
  }
}
