import * as Phaser from 'phaser';

import { SpritePainter } from '../core/painters/SpritePainter';
import { resolveSpriteFrame } from '../core/GameObjectRenderer';
import { TerrainTile } from '../gameObjects/TerrainTile';
import { TerrainType } from './TerrainType';

// Phaser 4's SpriteGPULayer constructor references `Phaser.Structs.Map` as a
// global.  When Phaser is consumed as an ES module the global doesn't exist, so
// we polyfill it here.  This is a known Phaser 4.0.0 ESM issue.
if (typeof globalThis !== 'undefined' && !(globalThis as any).Phaser) {
  (globalThis as any).Phaser = Phaser;
}

const TERRAIN_TEXTURE_FILE = 'data/graphics/sprite.png';

/** Terrain types that are static (no per-frame animation) and worth GPU-batching. */
const GPU_TILE_TYPES = new Set<TerrainType>([
  TerrainType.Brick,
  TerrainType.Steel,
  TerrainType.Jungle,
  TerrainType.Ice,
  TerrainType.InverseBrick,
  TerrainType.BlueBrick,
]);

interface GPULayerGroup {
  layer: Phaser.GameObjects.SpriteGPULayer;
  tileToIndex: Map<TerrainTile, number>;
}

/**
 * Manages Phaser SpriteGPULayers that batch static terrain tiles into
 * single draw calls. Water tiles are excluded because they animate per-frame.
 * Tiles at different z-indices get separate layers (e.g. jungle at z=5).
 *
 * Usage:
 *   1. Construct after tiles are created.
 *   2. Call `initFromTiles()` once after the first update frame (when tile
 *      sprites have been loaded via setup()).
 *   3. The layers auto-hide members when tiles are destroyed.
 */
export class TerrainGPULayer {
  private scene: Phaser.Scene;
  private groups = new Map<number, GPULayerGroup>();
  private cleanupFns: (() => void)[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Scan terrain tiles, add static ones to GPU layers grouped by z-index,
   * and mark them as gpuRendered so the per-object sync pipeline skips them.
   */
  public initFromTiles(tiles: TerrainTile[]): void {
    const texture = this.scene.textures.get(TERRAIN_TEXTURE_FILE);
    if (!texture) return;

    // Collect all static tiles (including sub-tiles nested inside BrickSuperTerrainTile)
    const staticTiles: TerrainTile[] = [];
    for (const tile of tiles) {
      this.collectStaticTiles(tile, staticTiles);
    }

    if (staticTiles.length === 0) return;

    // Group tiles by z-index so each group gets the correct depth
    const byDepth = new Map<number, TerrainTile[]>();
    for (const tile of staticTiles) {
      const z = tile.getWorldZIndex() ?? 0;
      let list = byDepth.get(z);
      if (!list) {
        list = [];
        byDepth.set(z, list);
      }
      list.push(tile);
    }

    for (const [depth, depthTiles] of byDepth) {
      const layer = this.scene.add.spriteGPULayer(texture, depthTiles.length);
      layer.setDepth(depth);

      const group: GPULayerGroup = { layer, tileToIndex: new Map() };
      this.groups.set(depth, group);

      for (const tile of depthTiles) {
        const painter = tile.painter;
        if (!(painter instanceof SpritePainter) || painter.sprite === null) continue;

        const frameInfo = resolveSpriteFrame(painter.sprite);
        if (frameInfo === null) continue;

        const worldBox = tile.worldBoundingBox;
        const memberIndex = layer.memberCount;

        layer.addMember({
          x: worldBox.min.x,
          y: worldBox.min.y,
          frame: frameInfo.frameKey,
          originX: 0,
          originY: 0,
          scaleX: 1,
          scaleY: 1,
        });

        group.tileToIndex.set(tile, memberIndex);
        tile.gpuRendered = true;

        // Listen for destruction to hide the member
        const cleanup = tile.destroyed.addListener(() => {
          this.hideMember(tile, group);
        });
        this.cleanupFns.push(cleanup);
      }
    }
  }

  /** Hide a destroyed tile's GPU member by setting alpha to 0. */
  private hideMember(tile: TerrainTile, group: GPULayerGroup): void {
    const index = group.tileToIndex.get(tile);
    if (index === undefined) return;

    group.layer.editMember(index, { alpha: 0 });
    group.tileToIndex.delete(tile);
  }

  /** Recursively collect static (non-water, non-super) terrain tiles. */
  private collectStaticTiles(tile: TerrainTile, out: TerrainTile[]): void {
    if (GPU_TILE_TYPES.has(tile.type)) {
      out.push(tile);
    }

    // BrickSuperTerrainTile holds sub-tiles as children
    for (const child of tile.children) {
      if (child instanceof TerrainTile) {
        this.collectStaticTiles(child, out);
      }
    }
  }

  public destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    for (const group of this.groups.values()) {
      group.tileToIndex.clear();
      group.layer.destroy();
    }
    this.groups.clear();
  }
}
