import { GameObject } from '../core/GameObject';
import { Subject } from '../core/Subject';
import { Vector } from '../core/Vector';
import { TerrainType } from '../terrain/TerrainType';
import { TilesetId } from '../terrain/TilesetId';

export abstract class TerrainTile extends GameObject {
  public abstract type: TerrainType;
  public destroyed = new Subject<{ centerPosition: Vector }>();
  protected tilesetId: TilesetId = TilesetId.Classic;

  public destroy(): void {
    this.removeSelf();
    this.destroyed.notify({
      centerPosition: this.getCenter(),
    });
  }
}
