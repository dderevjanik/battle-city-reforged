import { Animation, BoxCollider, Sprite, SpritePainter } from '../../core';
import { GameContext, Tag } from '../../game';
import { TerrainType } from '../../terrain';
import * as config from '../../config';

import { TerrainTile } from '../TerrainTile';

export class WaterTerrainTile extends TerrainTile {
  public type = TerrainType.Water;
  public collider = new BoxCollider(this);
  public zIndex = config.WATER_TILE_Z_INDEX;
  public tags = [Tag.BlockMove];
  public readonly painter = new SpritePainter();
  private animation: Animation<Sprite>;

  constructor() {
    super(config.WATER_TILE_SIZE, config.WATER_TILE_SIZE);
  }

  public destroy(): void {
    super.destroy();
    this.collider.unregister();
  }

  protected setup({ collisionSystem, spriteLoader }: GameContext): void {
    collisionSystem.register(this.collider);

    this.animation = new Animation(
      spriteLoader.loadList(['terrain.water.1', 'terrain.water.2']),
      { delay: 0.5, loop: true },
    );
  }

  protected update(deltaTime: number): void {
    this.collider.update();

    this.animation.update(deltaTime);
    this.painter.sprite = this.animation.getCurrentFrame();
  }
}
