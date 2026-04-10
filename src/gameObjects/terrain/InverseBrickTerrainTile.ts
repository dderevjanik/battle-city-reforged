import { TerrainType } from '../../terrain/TerrainType';

import { BrickTerrainTile } from './BrickTerrainTile';

export class InverseBrickTerrainTile extends BrickTerrainTile {
  declare public type: TerrainType.InverseBrick;

  protected getSpriteIds(): string[] {
    return ['terrain.inverse-brick.1', 'terrain.inverse-brick.2'];
  }
}
