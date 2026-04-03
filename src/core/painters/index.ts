export * from './LinePainter';
export * from './RectPainter';
export * from './SpritePainter';
export * from './SpriteTextPainter';

import { LinePainter } from './LinePainter';
import { RectPainter } from './RectPainter';
import { SpritePainter } from './SpritePainter';
import { SpriteTextPainter } from './SpriteTextPainter';

export type Painter = SpritePainter | RectPainter | LinePainter | SpriteTextPainter;
