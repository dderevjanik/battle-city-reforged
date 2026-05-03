import { GameObject } from '../../core/GameObject';
import { Size } from '../../core/Size';
import { Sprite } from '../../core/graphics/Sprite';
import { SpriteFontLoader } from '../../core/loaders/SpriteFontLoader';
import { SpriteTextPainter } from '../../core/painters/SpriteTextPainter';
import { Text, TextOptions } from '../../core/text/Text';
import { GameContext } from '../../game/GameUpdateArgs';
import * as config from '../../config';

export interface SpriteTextOptions extends TextOptions {
  color?: string | null;
  letterSpacing?: number;
  opacity?: number;
}

const DEFAULT_OPTIONS: SpriteTextOptions = {
  color: null,
  letterSpacing: 4,
  lineSpacing: 16,
  opacity: 1,
};

export class SpriteText extends GameObject {
  public painter = new SpriteTextPainter();
  private readonly text: Text<Sprite>;
  private options: SpriteTextOptions;
  private spriteFontLoader: SpriteFontLoader | null = null;

  constructor(text = '', options: SpriteTextOptions = {}) {
    super();

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

    this.painter.color = this.options.color ?? null;
    this.painter.opacity = this.options.opacity ?? 1;

    this.text = new Text(text, this.options);
  }

  protected setup({ spriteFontLoader }: GameContext): void {
    this.spriteFontLoader = spriteFontLoader;

    const font = this.spriteFontLoader.load(config.PRIMARY_SPRITE_FONT_ID);
    this.text.setFont(font);

    this.size.copyFrom(this.text.getSize());

    this.painter.text = this.text;
  }

  public setColor(color: string): void {
    // The font is shared across colors — tinting is applied at render time —
    // so we only need to record the color. If setup hasn't run yet, the color
    // will be picked up by _syncSpriteTextPainter() once it does.
    this.painter.color = color;
  }

  public setText(text: string): void {
    this.text.setText(text);
    this.size.copyFrom(this.text.getSize());
    this.updateMatrix();
  }

  public getTextSize(): Size {
    return this.text.getSize();
  }
}
