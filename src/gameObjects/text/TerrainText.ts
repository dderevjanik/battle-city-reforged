import { GameObject } from '../../core/GameObject';
import { Rect } from '../../core/Rect';
import { Text, TextOptions } from '../../core/text/Text';
import { ArrayUtils } from '../../core/utils';
import { GameContext } from '../../game/GameUpdateArgs';
import { TerrainFactory } from '../../terrain/TerrainFactory';
import { TerrainType } from '../../terrain/TerrainType';
import * as config from '../../config';

export class TerrainText extends GameObject {
  private terrainType: TerrainType;
  private text: Text<Rect[]>;

  constructor(text = '', terrainType: TerrainType, options: TextOptions = {}) {
    super();

    this.text = new Text(text, options);
    this.terrainType = terrainType;
  }

  protected setup({ rectFontLoader }: GameContext): void {
    const font = rectFontLoader.load(config.PRIMARY_RECT_FONT_ID);

    this.text.setFont(font);
    this.size.copyFrom(this.text.getSize());

    const rects = this.text.build();
    const tiles = TerrainFactory.createFromRegions(
      this.terrainType,
      ArrayUtils.flatten(rects),
    );

    this.add(...tiles);
  }
}
