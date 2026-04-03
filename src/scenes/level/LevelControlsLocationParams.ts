import { SceneParams } from '../../core/scene/SceneNavigator';
import { MapConfig } from '../../map/MapConfig';

export interface LevelControlsLocationParams extends SceneParams {
  canSelectVariant: boolean;
  mapConfig: MapConfig;
  playerIndex: number;
}
