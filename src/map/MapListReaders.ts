import Ajv from 'ajv';

import { Subject } from '../core/Subject';

import mapManifestSchema from '../../data/map-manifest.schema.json';
import { MapConfig } from './MapConfig';
import { MapFileReader } from './MapFileReader';

export abstract class MapListReader {
  public readonly loaded = new Subject<MapConfig>();
  public readonly error = new Subject<Error>();

  abstract readAsync(levelNumber: number): void;
  abstract getCount(): number;
}

// Used to load user maps from files system via browser file dialog.
// Use in combination with core/FileDialogs.FileOpener.
export class FileMapListReader extends MapListReader {
  private files: globalThis.File[];
  private fileReader!: MapFileReader;

  constructor(files: globalThis.FileList) {
    super();

    const fileList = Array.from(files);

    // Sort by filename alphabetically
    fileList.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    this.files = fileList;
  }

  public async readAsync(levelNumber: number): Promise<void> {
    const index = levelNumber - 1;

    const file = this.files[index];
    if (file === undefined) {
      this.error.notify(new Error(`Level "${levelNumber} not found`));
      return;
    }

    const fileReader = new MapFileReader();

    fileReader.loaded.addListenerOnce((mapConfig) => {
      this.loaded.notify(mapConfig);
    });

    fileReader.error.addListenerOnce((err) => {
      this.error.notify(err);
    });

    fileReader.read(file);
  }

  public getCount(): number {
    return this.files.length;
  }
}

interface MapManifestListItem {
  file: string;
}

interface MapManifest {
  list: MapManifestListItem[];
}

const validateMapManifest = new Ajv().compile<MapManifest>(mapManifestSchema);

// Used to load out-of-the-box maps.
// Reads map list from JSON manifest. Maps are loaded over HTTP.
export class ManifestMapListReader extends MapListReader {
  private readonly manifest: MapManifest;

  constructor(manifest: MapManifest) {
    super();

    if (!validateMapManifest(manifest)) {
      throw new Error(
        `Invalid map manifest: ${new Ajv().errorsText(validateMapManifest.errors)}`,
      );
    }
    this.manifest = manifest;
  }

  public async readAsync(levelNumber: number): Promise<void> {
    const index = levelNumber - 1;
    const item = this.manifest.list[index];
    if (item === undefined) {
      this.error.notify(new Error(`Level "${levelNumber} not found`));
      return;
    }

    try {
      const response = await fetch(item.file);
      const data = await response.json();

      const config = new MapConfig();

      config.fromDto(data);

      this.loaded.notify(config);
    } catch (err) {
      this.error.notify(err as Error);
    }
  }

  public getCount(): number {
    return this.manifest.list.length;
  }
}

// Use to load maps from in-memory map configs.
// Used in editor to playtest the map.
export class MemoryMapListReader extends MapListReader {
  private mapConfigs: MapConfig[];

  constructor(mapConfigs: MapConfig[]) {
    super();

    this.mapConfigs = mapConfigs;
  }

  public readAsync(levelNumber: number): void {
    const index = levelNumber - 1;

    const mapConfig = this.mapConfigs[index];
    if (mapConfig === undefined) {
      this.error.notify(new Error(`Level "${levelNumber} not found`));
      return;
    }

    this.loaded.notify(mapConfig);
  }

  public getCount(): number {
    return this.mapConfigs.length;
  }
}
