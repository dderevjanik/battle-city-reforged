import Phaser from 'phaser';

import { Rect } from './Rect';

// ---------------------------------------------------------------------------
// Module-level renderer state (shared across all GameObjects in the active
// scene — re-initialised each time a new GameScene starts via initRenderer()).
// ---------------------------------------------------------------------------

export interface SpriteManifest {
  [id: string]: { file: string; rect: number[] };
}

export let _rendererScene: Phaser.Scene | null = null;
let _srcToTextureKey = new Map<string, string>();
let _rectToFrameKey = new Map<string, string>();
let _canvasIdMap = new WeakMap<HTMLCanvasElement, number>();
let _canvasIdCounter = 0;
let _canvasTextureCache = new Map<string, string>();
let _canvasDimensionCache = new Map<number, { w: number; h: number }>();
let _canvasTextureUpdated = new Set<string>();
let _fallbackTextureCounter = 0;

/**
 * Called once per GameScene.create() to bind the renderer to the new scene
 * and rebuild manifest-based texture/frame lookup maps.
 */
export function initRenderer(scene: Phaser.Scene, manifest: SpriteManifest): void {
  _rendererScene = scene;
  _srcToTextureKey = new Map();
  _rectToFrameKey = new Map();
  _canvasIdMap = new WeakMap();
  _canvasIdCounter = 0;
  _canvasTextureCache = new Map();
  _canvasDimensionCache = new Map();
  _canvasTextureUpdated = new Set();
  _fallbackTextureCounter = 0;

  for (const [id, item] of Object.entries(manifest)) {
    const absoluteUrl = new URL(item.file, window.location.href).href;
    if (!_srcToTextureKey.has(absoluteUrl)) {
      _srcToTextureKey.set(absoluteUrl, item.file);
    }
    const [x, y, w, h] = item.rect;
    _rectToFrameKey.set(`${item.file}:${x}:${y}:${w}:${h}`, id);
  }
}

export function getOrCreateTextureKey(element: HTMLImageElement): string {
  let key = _srcToTextureKey.get(element.src);
  if (key !== undefined) return key;
  key = `img_fallback:${_fallbackTextureCounter++}`;
  _rendererScene!.textures.addImage(key, element);
  _srcToTextureKey.set(element.src, key);
  return key;
}

export function getOrCreateFrameKey(textureKey: string, sourceRect: Rect): string {
  const rectKey = `${textureKey}:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;
  let frameKey = _rectToFrameKey.get(rectKey);
  if (frameKey !== undefined) return frameKey;
  frameKey = `frame:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;
  const texture = _rendererScene!.textures.get(textureKey);
  if (texture && !texture.has(frameKey)) {
    texture.add(frameKey, 0, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height);
  }
  _rectToFrameKey.set(rectKey, frameKey);
  return frameKey;
}

export function ensureCanvasTexture(
  canvas: HTMLCanvasElement,
  sourceRect: Rect,
): { textureKey: string; frameKey: string } {
  let canvasId = _canvasIdMap.get(canvas);
  if (canvasId === undefined) {
    canvasId = _canvasIdCounter++;
    _canvasIdMap.set(canvas, canvasId);
  }

  const currentDims = { w: canvas.width, h: canvas.height };
  const cachedDims = _canvasDimensionCache.get(canvasId);

  if (!cachedDims || cachedDims.w !== currentDims.w || cachedDims.h !== currentDims.h) {
    const prefix = `canvas:${canvasId}:`;
    for (const k of _canvasTextureCache.keys()) {
      if (k.startsWith(prefix)) _canvasTextureCache.delete(k);
    }
    const baseKey = `canvas_base:${canvasId}`;
    _canvasTextureUpdated.delete(baseKey);
    if (_rendererScene!.textures.exists(baseKey)) _rendererScene!.textures.remove(baseKey);
    _canvasDimensionCache.set(canvasId, { ...currentDims });
  }

  const frameKey = `frame:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;
  const cacheKey = `canvas:${canvasId}:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;

  const cachedTextureKey = _canvasTextureCache.get(cacheKey);
  if (cachedTextureKey !== undefined) {
    // Only update the GPU texture once per canvas lifetime (font canvases are static after creation)
    if (!_canvasTextureUpdated.has(cachedTextureKey)) {
      const texture = _rendererScene!.textures.get(cachedTextureKey);
      if (texture && texture.source.length > 0) (texture.source[0] as any).update();
      _canvasTextureUpdated.add(cachedTextureKey);
    }
    return { textureKey: cachedTextureKey, frameKey };
  }

  const baseKey = `canvas_base:${canvasId}`;
  if (!_rendererScene!.textures.exists(baseKey)) {
    _rendererScene!.textures.addCanvas(baseKey, canvas);
  }
  const texture = _rendererScene!.textures.get(baseKey);
  if (texture && !texture.has(frameKey)) {
    texture.add(frameKey, 0, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height);
  }
  _canvasTextureCache.set(cacheKey, baseKey);
  return { textureKey: baseKey, frameKey };
}

export function cssColorToHex(color: string): number {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return parseInt(hex, 16);
  }
  if (color.startsWith('rgb')) {
    const match = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      return (parseInt(match[1], 10) << 16) | (parseInt(match[2], 10) << 8) | parseInt(match[3], 10);
    }
  }
  const named: Record<string, number> = {
    black: 0x000000, white: 0xffffff, red: 0xff0000, green: 0x00ff00, blue: 0x0000ff,
  };
  return named[color] ?? 0x000000;
}

export function getVisualChild(
  container: Phaser.GameObjects.Container,
  expectedType: string,
): Phaser.GameObjects.GameObject | null {
  const expectedName = `__visual_${expectedType}__`;
  for (const child of container.list) {
    const go = child as Phaser.GameObjects.GameObject & { name?: string };
    if (go.name?.startsWith('__visual_')) {
      if (go.name !== expectedName) {
        container.remove(go, true);
        return null;
      }
      return go;
    }
  }
  return null;
}

export function setVisualChild(
  container: Phaser.GameObjects.Container,
  visual: Phaser.GameObjects.GameObject,
): void {
  clearVisualChild(container);
  container.add(visual);
}

export function clearVisualChild(container: Phaser.GameObjects.Container): void {
  for (let i = container.list.length - 1; i >= 0; i--) {
    const child = container.list[i] as Phaser.GameObjects.GameObject & { name?: string };
    if (child.name?.startsWith('__visual_')) container.remove(child, true);
  }
}
