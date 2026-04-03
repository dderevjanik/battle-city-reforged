import { SpritePainter } from '../../core';
import { GameContext } from '../../game';
import { TerrainType } from '../../terrain';
import * as config from '../../config';

import { TerrainTile } from '../TerrainTile';

export class JungleTerrainTile extends TerrainTile {
  public type = TerrainType.Jungle;
  public readonly painter = new SpritePainter();
  public zIndex = config.JUNGLE_TILE_Z_INDEX;

  constructor() {
    super(config.JUNGLE_TILE_SIZE, config.JUNGLE_TILE_SIZE);
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.painter.sprite = spriteLoader.load('terrain.jungle');
  }
}
