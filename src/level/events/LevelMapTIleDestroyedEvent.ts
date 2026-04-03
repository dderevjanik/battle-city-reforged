import { Size } from '../../core/Size';
import { Vector } from '../../core/Vector';
import { TerrainType } from '../../terrain/TerrainType';

export interface LevelMapTileDestroyedEvent {
  type: TerrainType;
  position: Vector;
  size: Size;
}
