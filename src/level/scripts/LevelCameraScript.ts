import * as config from '../../config';

import { LevelScript } from '../LevelScript';

// Camera follows the first player tank; the field GameObject is moved each
// frame and child world matrices propagate via the standard render walk.
// Known limitations to revisit:
//  - Static terrain rendered via TerrainGPULayer (steel/jungle/ice) is
//    attached at the scene root with positions captured once at build time;
//    it does not follow the scroll. Destructible terrain (brick) and all
//    dynamic objects (tanks, bullets) scroll correctly.
//  - There is no clipping mask, so any terrain past the 832 viewport is
//    drawn over the border region until a per-camera mask is added.
export class LevelCameraScript extends LevelScript {
  private mapWidth = 0;
  private mapHeight = 0;
  private viewportLeft = 0;
  private viewportTop = 0;

  protected init(): void {
    this.mapWidth = this.mapConfig.getFieldWidth();
    this.mapHeight = this.mapConfig.getFieldHeight();
    this.viewportLeft = config.BORDER_LEFT_WIDTH;
    this.viewportTop = config.BORDER_TOP_BOTTOM_HEIGHT;
  }

  protected update(): void {
    const tank = this.world.getPlayerTanks().find((t) => t !== null && t !== undefined);
    if (!tank) return;

    const tankCenter = tank.getCenter();

    let offsetX = tankCenter.x - config.VIEWPORT_SIZE / 2;
    let offsetY = tankCenter.y - config.VIEWPORT_SIZE / 2;

    const maxOffsetX = Math.max(0, this.mapWidth - config.VIEWPORT_SIZE);
    const maxOffsetY = Math.max(0, this.mapHeight - config.VIEWPORT_SIZE);
    offsetX = Math.max(0, Math.min(maxOffsetX, offsetX));
    offsetY = Math.max(0, Math.min(maxOffsetY, offsetY));

    this.world.field.position.set(
      this.viewportLeft - offsetX,
      this.viewportTop - offsetY,
    );
    this.world.field.updateMatrix(true);
  }
}
