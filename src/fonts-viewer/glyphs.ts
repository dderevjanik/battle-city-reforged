import { RectFontConfig } from '../core/text/RectFont';
import { SpriteFontConfig } from '../core/text/SpriteFont';

export function createSpriteGlyph(
  config: SpriteFontConfig,
  ch: string,
  scale: number,
): HTMLDivElement | null {
  const idx = config.characterSet.indexOf(ch);
  if (idx < 0) return null;

  const col = idx % config.columnCount;
  const row = Math.floor(idx / config.columnCount);
  const cw = config.characterWidth;
  const chh = config.characterHeight;
  const sx = config.offsetX + col * (cw + config.horizontalSpacing);
  const sy = config.offsetY + row * (chh + config.verticalSpacing);

  const el = document.createElement('div');
  el.className = 'glyph-sprite';
  el.style.width = `${cw * scale}px`;
  el.style.height = `${chh * scale}px`;

  const posX = `-${sx * scale}px`;
  const posY = `-${sy * scale}px`;
  const sizeX = `${(cw + config.horizontalSpacing) * config.columnCount * scale}px`;
  const sizeY = `${(chh + config.verticalSpacing) * config.rowCount * scale}px`;

  el.style.webkitMaskPosition = `${posX} ${posY}`;
  el.style.maskPosition = `${posX} ${posY}`;
  el.style.webkitMaskSize = `${sizeX} ${sizeY}`;
  el.style.maskSize = `${sizeX} ${sizeY}`;
  return el;
}

export function createRectGlyph(
  config: RectFontConfig,
  ch: string,
  scale: number,
  color: string,
): HTMLCanvasElement | null {
  const idx = config.characterSet.indexOf(ch);
  if (idx < 0) return null;

  const grid = config.characters[idx];
  const w = config.characterWidth;
  const h = config.characterHeight;

  const canvas = document.createElement('canvas');
  canvas.className = 'glyph-canvas';
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    const line = grid[y] ?? '';
    for (let x = 0; x < w; x++) {
      if (line[x] === config.fillSymbol) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

export function createSystemGlyph(
  characterHeight: number,
  ch: string,
  scale: number,
): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = 'glyph-system';
  el.style.fontSize = `${characterHeight * scale * 0.85}px`;
  el.textContent = ch;
  return el;
}

export function createMissingPlaceholder(
  scale: number,
  ref: { characterWidth: number; characterHeight: number },
): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'glyph-missing';
  el.style.width = `${ref.characterWidth * scale}px`;
  el.style.height = `${ref.characterHeight * scale}px`;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.textContent = '—';
  return el;
}
