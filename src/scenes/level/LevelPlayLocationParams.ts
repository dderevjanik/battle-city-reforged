import { SceneParams } from '../../core/scene/SceneNavigator';
import { MapConfig } from '../../map/MapConfig';

export interface LevelPlayLocationParams extends SceneParams {
  mapConfig: MapConfig;
}
