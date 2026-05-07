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
  label?: string;
  file: string;
}

interface MapManifestGroup {
  name: string;
  maps: MapManifestListItem[];
}

interface MapManifest {
  groups: MapManifestGroup[];
}

const validateMapManifest = new Ajv().compile<MapManifest>(mapManifestSchema);

// Used to load out-of-the-box maps.
// Reads map list from JSON manifest. Maps are loaded over HTTP.
// The manifest is grouped (e.g. Original, Tank 1990); the active group can
// be switched at runtime, e.g. from the level selection screen.
export class ManifestMapListReader extends MapListReader {
  private readonly manifest: MapManifest;
  private activeGroupName: string;

  constructor(manifest: MapManifest, defaultGroupName?: string) {
    super();

    if (!validateMapManifest(manifest)) {
      throw new Error(
        `Invalid map manifest: ${new Ajv().errorsText(validateMapManifest.errors)}`,
      );
    }
    this.manifest = manifest;

    const initialGroup =
      (defaultGroupName !== undefined &&
        manifest.groups.find((g) => g.name === defaultGroupName)?.name) ||
      manifest.groups[0].name;
    this.activeGroupName = initialGroup;
  }

  public getGroupNames(): string[] {
    return this.manifest.groups.map((g) => g.name);
  }

  public getActiveGroupName(): string {
    return this.activeGroupName;
  }

  public setActiveGroup(name: string): void {
    if (this.manifest.groups.some((g) => g.name === name)) {
      this.activeGroupName = name;
    }
  }

  public async readAsync(levelNumber: number): Promise<void> {
    const group = this.getActiveGroup();
    const index = levelNumber - 1;
    const item = group.maps[index];
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
    return this.getActiveGroup().maps.length;
  }

  private getActiveGroup(): MapManifestGroup {
    const group = this.manifest.groups.find(
      (g) => g.name === this.activeGroupName,
    );
    return group ?? this.manifest.groups[0];
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
