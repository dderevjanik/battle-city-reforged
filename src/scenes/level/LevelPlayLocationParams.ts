import { SceneParams } from '../../core/scene/Scene';
import { MapConfig } from '../../map/MapConfig';

export interface LevelPlayLocationParams extends SceneParams {
  mapConfig: MapConfig;
}
