import { TextFileReader } from '../core/file/TextFileReader';

import { MapConfig } from './MapConfig';

export class MapFileReader extends TextFileReader<MapConfig> {
  protected onLoad(ev: any): void {
    const json = ev.target.result as string;

    const mapConfig = new MapConfig();

    try {
      mapConfig.fromJSON(json);
      this.loaded.notify(mapConfig);
    } catch (err) {
      this.throwError(err);
    }
  }
}
