import { PowerupType } from '../powerup/PowerupType';
import { TankAiMode } from '../tank/TankAiMode';
import { TankKind } from '../tank/TankTypes';
import { TerrainType } from '../terrain/TerrainType';

// Wire-format vocabulary for the binary map share/save format (mapBinary.ts).
//
// Each `Vn` block defines the indices used by version `n` of the format. These
// blocks are FROZEN once a version ships — never reorder, rename, or remove
// entries. To extend the editor's vocabulary (e.g. add a new enemy type), copy
// the latest block to a new `Vn+1`, append the new entry, and bump
// CURRENT_FORMAT_VERSION below.
//
// The decoder uses VERSIONED_ENUMS[version] from the byte read off the wire,
// so old shared URLs and saved .cmap files keep decoding against their
// original vocabulary even after we add new versions.

export const V1_ENUMS = {
  enemyTypes: [
    TankKind.Basic,
    TankKind.Fast,
    TankKind.Medium,
    TankKind.Heavy,
  ],
  enemyAis: [
    TankAiMode.Classic,
    TankAiMode.Hunter,
    TankAiMode.Ambush,
    TankAiMode.AttackBase,
  ],
  // '' = no drop. 'random' is a meta value (TankDropType is 'random' | PowerupType).
  drops: [
    '',
    'random',
    PowerupType.Shield,
    PowerupType.Freeze,
    PowerupType.Upgrade,
    PowerupType.Life,
    PowerupType.Wipeout,
    PowerupType.BaseDefence,
  ],
  // Index 0 is the empty/eraser slot; subsequent indices are paintable terrains.
  terrainTypes: [
    '',
    TerrainType.Brick,
    TerrainType.Steel,
    TerrainType.Jungle,
    TerrainType.Water,
    TerrainType.Ice,
  ],
} as const satisfies MapEnumSet;

export interface MapEnumSet {
  readonly enemyTypes:   readonly string[];
  readonly enemyAis:     readonly string[];
  readonly drops:        readonly string[];
  readonly terrainTypes: readonly string[];
}

export const VERSIONED_ENUMS: Record<number, MapEnumSet> = {
  1: V1_ENUMS,
};

export const CURRENT_FORMAT_VERSION = 1;
export const CURRENT_ENUMS = VERSIONED_ENUMS[CURRENT_FORMAT_VERSION];

// Editor-facing aliases — the editor always speaks the current format.
export const EDITOR_ENEMY_TYPES   = V1_ENUMS.enemyTypes;
export const EDITOR_ENEMY_AIS     = V1_ENUMS.enemyAis;
export const EDITOR_DROPS         = V1_ENUMS.drops;
export const EDITOR_TERRAIN_TYPES = V1_ENUMS.terrainTypes;
export type EditorEnemyType   = typeof EDITOR_ENEMY_TYPES[number];
export type EditorEnemyAi     = typeof EDITOR_ENEMY_AIS[number];
export type EditorDrop        = typeof EDITOR_DROPS[number];
export type EditorTerrainType = typeof EDITOR_TERRAIN_TYPES[number];
