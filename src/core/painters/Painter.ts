import { LinePainter } from './LinePainter';
import { RectPainter } from './RectPainter';
import { SpritePainter } from './SpritePainter';
import { SpriteTextPainter } from './SpriteTextPainter';

export type Painter = SpritePainter | RectPainter | LinePainter | SpriteTextPainter;
