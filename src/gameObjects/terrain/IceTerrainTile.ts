import { BoxCollider } from '../../core/collision/BoxCollider';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { Tag } from '../../game/Tag';
import { TerrainType } from '../../terrain/TerrainType';
import { TilesetId } from '../../terrain/TilesetId';
import * as config from '../../config';

import { TerrainTile } from '../TerrainTile';

export class IceTerrainTile extends TerrainTile {
  public collider: BoxCollider = new BoxCollider(this);
  public type = TerrainType.Ice;
  public painter = new SpritePainter();
  public tags = [Tag.Ice];
  public zIndex = config.ICE_TILE_Z_INDEX;

  constructor(tilesetId: TilesetId = TilesetId.Classic) {
    super(config.ICE_TILE_SIZE, config.ICE_TILE_SIZE);
    this.tilesetId = tilesetId;
  }

  protected setup({ collisionSystem, spriteLoader }: GameContext): void {
    collisionSystem.register(this.collider);

    const id = this.tilesetId === TilesetId.Modern ? 'terrain.ice.modern' : 'terrain.ice';
    this.painter.sprite = spriteLoader.load(id);
  }

  protected update(): void {
    this.collider.update();
  }
}
