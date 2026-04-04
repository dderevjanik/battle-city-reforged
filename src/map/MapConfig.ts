import { Rect } from '../core/Rect';
import { Vector } from '../core/Vector';
import { TankAiMode } from '../tank/TankAiMode';
import { TankParty, TankType } from '../tank/TankTypes';
import { TerrainFactory } from '../terrain/TerrainFactory';
import { TerrainRegionConfig } from '../terrain/TerrainRegionConfig';
import * as config from '../config';

import { MapDto, MapDtoSchema } from './MapDto';
import { TilesetId } from '../terrain/TilesetId';

export interface MapConfigToJsonOptions {
  pretty?: boolean;
}

const DEFAULT_TO_JSON_OPTIONS = {
  pretty: true,
};

export class MapConfig {
  private dto: MapDto;

  constructor() {
    this.dto = this.fillAndValidate({
      spawn: {
        enemy: {
          spawnDelay: config.ENEMY_SPAWN_DELAY,
          maxAliveCount: config.ENEMY_MAX_ALIVE_COUNT,
          locations: config.ENEMY_DEFAULT_SPAWN_POSITIONS,
          list: [],
        },
        player: { locations: config.PLAYER_DEFAULT_SPAWN_POSITIONS },
      },
    });
  }

  public getDto(): MapDto {
    return this.dto;
  }

  public fromDto(dto: MapDto): void {
    this.dto = this.fillAndValidate(dto);
  }

  public fillAndValidate(dto: MapDto): MapDto {
    const { value: validatedDto, error: schemaError } =
      MapDtoSchema.validate(dto);

    if (schemaError !== undefined) {
      throw schemaError;
    }

    const terrainError = TerrainFactory.validateRegionConfigs(
      validatedDto.terrain!.regions!,
    );
    if (terrainError !== undefined) {
      throw terrainError;
    }

    return validatedDto;
  }

  public addTerrainRegion(region: TerrainRegionConfig): void {
    this.dto.terrain!.regions!.push(region);
  }

  public clearTerrainRect(rectToClear: Rect): void {
    const regions = this.dto.terrain!.regions!;

    // Iterate in reverse because we are removing items from array
    for (let i = regions.length - 1; i >= 0; i -= 1) {
      const region = regions[i];

      const regionRect = new Rect(
        region.x,
        region.y,
        region.width,
        region.height,
      );

      if (regionRect.intersectsRect(rectToClear)) {
        regions.splice(i, 1);
      }
    }
  }

  public getTileset(): TilesetId {
    return this.dto.tileset ?? TilesetId.Classic;
  }

  public getTerrainRegions(): TerrainRegionConfig[] {
    return this.dto.terrain!.regions!;
  }

  public getPlayerSpawnPositions(): Vector[] {
    return this.dto.spawn.player.locations.map(
      (location) => new Vector(location.x, location.y),
    );
  }

  public getEnemySpawnDelay(): number {
    return this.dto.spawn.enemy.spawnDelay;
  }

  public getEnemyMaxAliveCount(): number {
    return this.dto.spawn.enemy.maxAliveCount;
  }

  public getEnemySpawnPositions(): Vector[] {
    return this.dto.spawn.enemy.locations.map(
      (location) => new Vector(location.x, location.y),
    );
  }

  public getEnemySpawnList(): TankType[] {
    return this.dto.spawn.enemy.list!.map((item) => {
      return new TankType(TankParty.Enemy, item.type, item.drop);
    });
  }

  public getEnemyAiModes(): (TankAiMode | undefined)[] {
    return this.dto.spawn.enemy.list!.map((item) => item.ai);
  }

  public isEnemySpawnListEmpty(): boolean {
    return this.dto.spawn.enemy.list!.length === 0;
  }

  public fillEnemySpawnList(type: TankType): void {
    for (let i = 0; i < config.ENEMY_MAX_TOTAL_COUNT; i += 1) {
      this.dto.spawn.enemy.list![i] = {
        type: type.kind,
        drop: type.hasDrop,
      };
    }
  }

  public setEnemySpawnListItem(index: number, type: TankType): void {
    this.dto.spawn.enemy.list![index] = {
      type: type.kind,
      drop: type.hasDrop,
    };
  }

  public toJSON(argOptions: MapConfigToJsonOptions = {}): string {
    const options = Object.assign({}, DEFAULT_TO_JSON_OPTIONS, argOptions);

    let json;
    if (options.pretty) {
      json = JSON.stringify(this.dto, null, 2);
    } else {
      json = JSON.stringify(this.dto);
    }

    return json;
  }

  public fromJSON(json: string): void {
    const dto = JSON.parse(json);

    this.dto = this.fillAndValidate(dto);
  }
}
