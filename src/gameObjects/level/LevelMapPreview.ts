import { GameObject } from '../../core/GameObject';
import { RectPainter } from '../../core/painters/RectPainter';
import { TerrainRegionConfig } from '../../terrain/TerrainRegionConfig';
import { TerrainType } from '../../terrain/TerrainType';

const TERRAIN_COLORS: Partial<Record<TerrainType, string>> = {
  [TerrainType.Brick]: '#c84800',
  [TerrainType.Steel]: '#7a7a7a',
  [TerrainType.Water]: '#0044aa',
  [TerrainType.Jungle]: '#2d5a1b',
  [TerrainType.Ice]: '#88ccff',
};

export class LevelMapPreview extends GameObject {
  private readonly scale: number;
  private readonly border: GameObject;

  constructor(previewSize: number, fieldSize: number) {
    super(previewSize, previewSize);
    this.scale = previewSize / fieldSize;
    this.painter = new RectPainter('#000000');

    this.border = new GameObject(previewSize, previewSize);
    this.border.painter = new RectPainter(null, '#ffffff');
    this.border.setZIndex(1);
    this.add(this.border);
  }

  public setRegions(regions: TerrainRegionConfig[]): void {
    this.removeAllChildren();
    this.add(this.border);

    for (const region of regions) {
      const color = TERRAIN_COLORS[region.type];
      if (color === undefined) continue;

      const tile = new GameObject(
        Math.ceil(region.width * this.scale),
        Math.ceil(region.height * this.scale),
      );
      tile.position.set(
        Math.floor(region.x * this.scale),
        Math.floor(region.y * this.scale),
      );
      tile.painter = new RectPainter(color);
      this.add(tile);
    }
  }
}
