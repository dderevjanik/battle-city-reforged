import { SpriteFontLoader } from '../loaders/SpriteFontLoader';
import { SpriteFont } from '../text/SpriteFont';

interface ColorSpriteFontGeneratorItem {
  defaultColor: string;
  defaultFont: SpriteFont;
  generatedColors: Set<string>;
}

/**
 * Manages sprite font color variants. In Phaser 4, color is applied at render
 * time via FILL tint instead of pre-baking colored copies onto a canvas. This
 * generator now only tracks which colors are valid — the actual tinting happens
 * in _syncSpriteTextPainter().
 */
export class ColorSpriteFontGenerator {
  private spriteFontLoader: SpriteFontLoader;
  private map = new Map<string, ColorSpriteFontGeneratorItem>();

  constructor(spriteFontLoader: SpriteFontLoader) {
    this.spriteFontLoader = spriteFontLoader;
  }

  public get(fontId: string, color: string | null = null): SpriteFont {
    const item = this.map.get(fontId);
    if (item === undefined) {
      throw new Error(`Font "${fontId}" not registered`);
    }

    // All colors now share the same base font — tinting is applied at render time
    return item.defaultFont;
  }

  public register(fontId: string, defaultColor: string): void {
    const defaultFont = this.spriteFontLoader.load(fontId);

    const item: ColorSpriteFontGeneratorItem = {
      defaultColor,
      defaultFont,
      generatedColors: new Set(),
    };

    this.map.set(fontId, item);
  }

  public generate(fontId: string, generatedColor: string): void {
    const item = this.map.get(fontId);
    if (item === undefined) {
      throw new Error(`Font "${fontId}" not registered`);
    }

    // Just register the color as valid — actual tinting is done by the renderer
    item.generatedColors.add(generatedColor);
  }
}
