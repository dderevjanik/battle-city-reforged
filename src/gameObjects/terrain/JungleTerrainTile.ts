import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { TerrainType } from '../../terrain/TerrainType';
import { TilesetId } from '../../terrain/TilesetId';
import * as config from '../../config';

import { TerrainTile } from '../TerrainTile';

export class JungleTerrainTile extends TerrainTile {
  public type = TerrainType.Jungle;
  public readonly painter = new SpritePainter();
  public zIndex = config.JUNGLE_TILE_Z_INDEX;

  constructor(tilesetId: TilesetId = TilesetId.Classic) {
    super(config.JUNGLE_TILE_SIZE, config.JUNGLE_TILE_SIZE);
    this.tilesetId = tilesetId;
  }

  protected setup({ spriteLoader }: GameContext): void {
    const id = this.tilesetId === TilesetId.Modern ? 'terrain.jungle.modern' : 'terrain.jungle';
    this.painter.sprite = spriteLoader.load(id);
  }
}
