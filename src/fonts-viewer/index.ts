import { RectFontConfig } from '../core/text/RectFont';
import { SpriteFontConfig } from '../core/text/SpriteFont';

import spriteFontJson from '../../data/fonts/sprite-font.json';
import rectFontJson from '../../data/fonts/rect-font.json';

import {
  createMissingPlaceholder,
  createRectGlyph,
  createSpriteGlyph,
  createSystemGlyph,
} from './glyphs';

const spriteCfg = spriteFontJson as SpriteFontConfig;
const rectCfg = rectFontJson as RectFontConfig;

const scaleInput = document.getElementById('scale') as HTMLInputElement;
const scaleVal = document.getElementById('scale-val') as HTMLSpanElement;
const textInput = document.getElementById('text-input') as HTMLInputElement;
const colorInput = document.getElementById('color') as HTMLInputElement;

const previewSystem = document.getElementById('preview-system') as HTMLDivElement;
const previewSprite = document.getElementById('preview-sprite') as HTMLDivElement;
const previewRect = document.getElementById('preview-rect') as HTMLDivElement;
const grid = document.getElementById('grid') as HTMLDivElement;

function currentColor(): string {
  return colorInput.value;
}

function applyColor(): void {
  document.documentElement.style.setProperty('--font-color', currentColor());
}

function getScale(): number {
  return parseInt(scaleInput.value, 10);
}

function renderPreview(): void {
  const text = textInput.value;
  const scale = getScale();

  previewSystem.innerHTML = '';
  previewSprite.innerHTML = '';
  previewRect.innerHTML = '';

  previewSystem.style.fontSize = `${spriteCfg.characterHeight * scale * 0.85}px`;
  previewSystem.textContent = text;

  for (const ch of text) {
    previewSprite.appendChild(
      createSpriteGlyph(spriteCfg, ch, scale) ??
        createMissingPlaceholder(scale, spriteCfg),
    );
    previewRect.appendChild(
      createRectGlyph(rectCfg, ch, scale, currentColor()) ??
        createMissingPlaceholder(scale, rectCfg),
    );
  }
}

function renderGrid(): void {
  const scale = Math.max(1, getScale() - 1);
  grid.innerHTML = '';

  // Union of both character sets, preserving sprite order first.
  const seen = new Set<string>();
  const order: string[] = [];
  for (const ch of spriteCfg.characterSet) {
    if (!seen.has(ch)) { seen.add(ch); order.push(ch); }
  }
  for (const ch of rectCfg.characterSet) {
    if (!seen.has(ch)) { seen.add(ch); order.push(ch); }
  }

  for (const ch of order) {
    const cell = document.createElement('div');
    cell.className = 'cell';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const chLabel = document.createElement('span');
    chLabel.className = 'ch';
    chLabel.textContent = ch === ' ' ? '␣' : ch;
    const code = document.createElement('span');
    code.textContent = 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
    meta.appendChild(chLabel);
    meta.appendChild(code);
    cell.appendChild(meta);

    const columns: Array<[string, HTMLElement]> = [
      ['sys', createSystemGlyph(spriteCfg.characterHeight, ch, scale)],
      ['spr', createSpriteGlyph(spriteCfg, ch, scale) ?? createMissingPlaceholder(scale, spriteCfg)],
      ['rct', createRectGlyph(rectCfg, ch, scale, currentColor()) ?? createMissingPlaceholder(scale, rectCfg)],
    ];

    for (const [label, glyph] of columns) {
      const col = document.createElement('div');
      col.className = 'col';
      col.appendChild(glyph);
      const lbl = document.createElement('div');
      lbl.className = 'col-label';
      lbl.textContent = label;
      col.appendChild(lbl);
      cell.appendChild(col);
    }

    grid.appendChild(cell);
  }
}

scaleInput.addEventListener('input', () => {
  scaleVal.textContent = `${scaleInput.value}x`;
  renderPreview();
  renderGrid();
});
textInput.addEventListener('input', renderPreview);
colorInput.addEventListener('input', () => {
  applyColor();
  // Rect glyphs are pre-rendered to canvas with the previous color, so re-render.
  renderPreview();
  renderGrid();
});

applyColor();
renderPreview();
renderGrid();
