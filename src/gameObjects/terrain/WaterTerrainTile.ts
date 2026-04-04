import { Animation } from '../../core/Animation';
import { BoxCollider } from '../../core/collision/BoxCollider';
import { Sprite } from '../../core/graphics/Sprite';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { Tag } from '../../game/Tag';
import { TerrainType } from '../../terrain/TerrainType';
import { TilesetId } from '../../terrain/TilesetId';
import * as config from '../../config';

import { TerrainTile } from '../TerrainTile';

export class WaterTerrainTile extends TerrainTile {
  public type = TerrainType.Water;
  public collider: BoxCollider = new BoxCollider(this);
  public zIndex = config.WATER_TILE_Z_INDEX;
  public tags = [Tag.BlockMove];
  public readonly painter = new SpritePainter();
  private animation!: Animation<Sprite>;

  constructor(tilesetId: TilesetId = TilesetId.Classic) {
    super(config.WATER_TILE_SIZE, config.WATER_TILE_SIZE);
    this.tilesetId = tilesetId;
  }

  public destroy(): void {
    super.destroy();
    this.collider.unregister();
  }

  protected setup({ collisionSystem, spriteLoader }: GameContext): void {
    collisionSystem.register(this.collider);

    const ids = this.tilesetId === TilesetId.Modern
      ? ['terrain.water.modern.1', 'terrain.water.modern.2']
      : ['terrain.water.1', 'terrain.water.2'];
    this.animation = new Animation(
      spriteLoader.loadList(ids),
      { delay: 0.5, loop: true },
    );
  }

  protected update(deltaTime: number): void {
    this.collider.update();

    this.animation.update(deltaTime);
    this.painter.sprite = this.animation.getCurrentFrame();
  }
}
