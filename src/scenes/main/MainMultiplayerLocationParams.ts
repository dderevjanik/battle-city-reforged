import { SceneParams } from '../../core/scene/Scene';
import { FileMapListReader } from '../../map/MapListReaders';

export interface MainMultiplayerLocationParams extends SceneParams {
  fileMapListReader?: FileMapListReader;
}
