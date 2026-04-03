import { GameObject } from '../core/GameObject';
import { Subject } from '../core/Subject';
import { Vector } from '../core/Vector';
import { TerrainType } from '../terrain/TerrainType';

export abstract class TerrainTile extends GameObject {
  public abstract type: TerrainType;
  public destroyed = new Subject<{ centerPosition: Vector }>();

  public destroy(): void {
    this.removeSelf();
    this.destroyed.notify({
      centerPosition: this.getCenter(),
    });
  }
}
