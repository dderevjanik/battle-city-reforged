import { SceneParams } from '../../core/scene/Scene';
import { MapConfig } from '../../map/MapConfig';

import { EditorLoadState } from './EditorLoadState';

export interface EditorLocationParams extends SceneParams {
  mapConfig: MapConfig;
  loadState: EditorLoadState;
}
