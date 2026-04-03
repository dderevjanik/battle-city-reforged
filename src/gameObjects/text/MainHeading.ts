import { TextAlignment } from '../../core/text/Text';
import { TerrainType } from '../../terrain/TerrainType';

import { TerrainText } from './TerrainText';

export class MainHeading extends TerrainText {
  constructor() {
    super('BATTLE\nCITY', TerrainType.MenuBrick, {
      alignment: TextAlignment.Center,
      lineSpacing: 3,
    });
  }
}
