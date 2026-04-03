import { BoxCollider } from '../../core/collision/BoxCollider';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { Tag } from '../../game/Tag';
import { TerrainType } from '../../terrain/TerrainType';
import * as config from '../../config';

import { TerrainTile } from '../TerrainTile';

export class SteelTerrainTile extends TerrainTile {
  public type = TerrainType.Steel;
  public collider = new BoxCollider(this);
  public zIndex = config.STEEL_TILE_Z_INDEX;
  public tags = [Tag.Wall, Tag.Steel, Tag.BlockMove];
  public painter = new SpritePainter();

  constructor() {
    super(config.STEEL_TILE_SIZE, config.STEEL_TILE_SIZE);
  }

  public destroy(): void {
    super.destroy();
    this.collider.unregister();
  }

  protected setup({ collisionSystem, spriteLoader }: GameContext): void {
    collisionSystem.register(this.collider);

    this.painter.sprite = spriteLoader.load('terrain.steel');
  }

  protected update(): void {
    this.collider.update();
  }
}
