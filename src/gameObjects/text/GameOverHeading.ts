import { TerrainType } from '../../terrain/TerrainType';

import { TerrainText } from './TerrainText';

export class GameOverHeading extends TerrainText {
  constructor() {
    super('GAME\nOVER', TerrainType.Brick, {
      lineSpacing: 6,
    });
  }
}
