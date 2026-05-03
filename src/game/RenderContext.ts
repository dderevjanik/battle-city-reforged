import { ImageLoader } from '../core/loaders/ImageLoader';
import { RectFontLoader } from '../core/loaders/RectFontLoader';
import { SpriteFontLoader } from '../core/loaders/SpriteFontLoader';
import { SpriteLoader } from '../core/loaders/SpriteLoader';

import { ScreenShakeSettings } from './ScreenShakeSettings';

/**
 * Long-lived rendering services: image/sprite/font loaders and visual settings.
 * Scenes that only present static visuals should depend on this slice instead
 * of the full GameContext.
 */
export interface RenderContext {
  imageLoader: ImageLoader;
  rectFontLoader: RectFontLoader;
  screenShakeSettings: ScreenShakeSettings;
  spriteFontLoader: SpriteFontLoader;
  spriteLoader: SpriteLoader;
}
