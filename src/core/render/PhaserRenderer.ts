import Phaser from 'phaser';

import { GameObject } from '../GameObject';
import { SpritePainter } from '../painters/SpritePainter';
import { RectPainter } from '../painters/RectPainter';
import { LinePainter } from '../painters/LinePainter';
import { SpriteTextPainter } from '../painters/SpriteTextPainter';
import { SpriteAlignment } from '../SpriteAlignment';
import { Rect } from '../Rect';

interface SpriteManifest {
  [id: string]: { file: string; rect: number[] };
}

/**
 * Associates each GameObject with its flat Phaser container.
 * All containers live as direct children of the Phaser scene (flat, no nesting).
 * Depth (zIndex) drives draw order — Phaser sorts by depth automatically.
 */
const displayMap = new WeakMap<GameObject, Phaser.GameObjects.Container>();

export class PhaserRenderer {
  private readonly scene: Phaser.Scene;

  /** All live containers we created, so we can destroy stale ones. */
  private liveContainers = new Set<Phaser.GameObjects.Container>();

  /**
   * Cache: canvas element + sourceRect → Phaser texture key.
   * Key format: `canvas:<canvasId>:<x>:<y>:<w>:<h>`.
   */
  private canvasTextureCache = new Map<string, string>();

  /**
   * Maps canvas element → a stable numeric ID (assigned on first encounter).
   */
  private canvasIdMap = new WeakMap<HTMLCanvasElement, number>();
  private canvasIdCounter = 0;

  /**
   * Tracks the last known dimensions of each canvas so we can detect resizes
   * and invalidate the cached Phaser texture.
   */
  private canvasDimensionCache = new Map<number, { w: number; h: number }>();

  /**
   * Absolute image URL → Phaser texture key.
   * Built from the sprite manifest so we never rely on Phaser's internal
   * TextureSource.image reference (which WebGL mode may release after GPU upload).
   */
  private srcToTextureKey = new Map<string, string>();

  /**
   * `${textureKey}:${x}:${y}:${w}:${h}` → frame key (sprite ID or rect string).
   * Lets us look up the pre-registered frame without touching the texture source.
   */
  private rectToFrameKey = new Map<string, string>();

  /** Counter for unique keys when creating textures from non-manifest images. */
  private fallbackTextureCounter = 0;

  constructor(scene: Phaser.Scene, manifest: SpriteManifest) {
    this.scene = scene;
    this.buildMapsFromManifest(manifest);
  }

  /**
   * Build src→textureKey and rect→frameKey maps directly from the sprite manifest.
   * This avoids relying on Phaser's TextureSource.image, which WebGL mode may
   * null out after uploading the texture to the GPU.
   */
  private buildMapsFromManifest(manifest: SpriteManifest): void {
    for (const [id, item] of Object.entries(manifest)) {
      // Resolve to absolute URL so it matches HTMLImageElement.src later
      const absoluteUrl = new URL(item.file, window.location.href).href;
      if (!this.srcToTextureKey.has(absoluteUrl)) {
        this.srcToTextureKey.set(absoluteUrl, item.file);
      }

      const [x, y, w, h] = item.rect;
      const rectKey = `${item.file}:${x}:${y}:${w}:${h}`;
      this.rectToFrameKey.set(rectKey, id);
    }
  }

  /**
   * Get the Phaser texture key for an HTMLImageElement. If the image is in the
   * sprite manifest the pre-registered key is returned; otherwise a new Phaser
   * texture is created on demand from the element (handles sprite fonts, etc.).
   */
  private getOrCreateTextureKey(element: HTMLImageElement): string {
    let textureKey = this.srcToTextureKey.get(element.src);
    if (textureKey !== undefined) return textureKey;

    // Not in manifest (e.g. sprite-font.png) — create a texture from the element
    textureKey = `img_fallback:${this.fallbackTextureCounter++}`;
    this.scene.textures.addImage(textureKey, element);
    this.srcToTextureKey.set(element.src, textureKey);
    return textureKey;
  }

  /**
   * Get or create the Phaser frame key for a given texture + source rect.
   * For manifest sprites the pre-registered sprite ID is returned; for dynamic
   * images (e.g. font glyphs) the frame is added to the texture on demand.
   */
  private getOrCreateFrameKey(textureKey: string, sourceRect: Rect): string {
    const rectKey = `${textureKey}:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;
    let frameKey = this.rectToFrameKey.get(rectKey);
    if (frameKey !== undefined) return frameKey;

    frameKey = `frame:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;
    const texture = this.scene.textures.get(textureKey);
    if (texture && !texture.has(frameKey)) {
      texture.add(frameKey, 0, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height);
    }
    this.rectToFrameKey.set(rectKey, frameKey);
    return frameKey;
  }

  public render(root: GameObject): void {
    root.updateWorldMatrix(false, true);

    const objects: GameObject[] = [];
    root.traverse((object) => {
      if (object === root) return;
      objects.push(object);
    });

    const activeSet = new Set<Phaser.GameObjects.Container>();

    for (const node of objects) {
      let phaserNode = displayMap.get(node);
      if (phaserNode === undefined) {
        phaserNode = this.scene.add.container(0, 0);
        displayMap.set(node, phaserNode);
        this.liveContainers.add(phaserNode);
      }

      this.syncTransform(node, phaserNode);
      this.syncPainter(node, phaserNode);

      activeSet.add(phaserNode);
    }

    // Destroy containers that are no longer part of the scene graph
    for (const container of this.liveContainers) {
      if (!activeSet.has(container)) {
        container.destroy(true);
        this.liveContainers.delete(container);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Transform sync
  // ---------------------------------------------------------------------------

  private syncTransform(
    node: GameObject,
    phaserNode: Phaser.GameObjects.Container,
  ): void {
    const worldBox = node.getWorldBoundingBox();
    phaserNode.setPosition(worldBox.min.x, worldBox.min.y);

    const worldVisible = node.getWorldVisible();
    phaserNode.setVisible(worldVisible !== false);

    phaserNode.setDepth(node.getWorldZIndex() ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Painter sync dispatcher
  // ---------------------------------------------------------------------------

  private syncPainter(
    node: GameObject,
    phaserNode: Phaser.GameObjects.Container,
  ): void {
    const painter = node.painter;

    if (painter === null || !node.canRender()) {
      this.clearVisualChild(phaserNode);
      return;
    }

    if (painter instanceof SpritePainter) {
      this.syncSpritePainter(node, phaserNode, painter);
    } else if (painter instanceof RectPainter) {
      this.syncRectPainter(node, phaserNode, painter);
    } else if (painter instanceof LinePainter) {
      this.syncLinePainter(node, phaserNode, painter);
    } else if (painter instanceof SpriteTextPainter) {
      this.syncSpriteTextPainter(node, phaserNode, painter);
    }
  }

  // ---------------------------------------------------------------------------
  // SpritePainter
  // ---------------------------------------------------------------------------

  private syncSpritePainter(
    node: GameObject,
    phaserNode: Phaser.GameObjects.Container,
    painter: SpritePainter,
  ): void {
    if (painter.sprite === null || !painter.sprite.isImageLoaded()) {
      this.clearVisualChild(phaserNode);
      return;
    }

    const sprite = painter.sprite;
    const sourceRect = sprite.sourceRect;
    const element = sprite.image.getElement();

    let textureKey: string;
    let frameKey: string;

    if (element instanceof HTMLImageElement) {
      textureKey = this.getOrCreateTextureKey(element);
      frameKey = this.getOrCreateFrameKey(textureKey, sourceRect);
    } else if (element instanceof HTMLCanvasElement) {
      // Canvas-based sprite (e.g. colored sprite font glyph)
      const result = this.ensureCanvasTexture(element, sourceRect);
      textureKey = result.textureKey;
      frameKey = result.frameKey;
    } else {
      this.clearVisualChild(phaserNode);
      return;
    }

    // Get or create the Image visual child
    let image = this.getVisualChild(phaserNode, 'sprite') as Phaser.GameObjects.Image | null;
    if (image === null) {
      image = this.scene.add.image(0, 0, textureKey, frameKey);
      image.name = '__visual_sprite__';
      image.setOrigin(0, 0);
      this.setVisualChild(phaserNode, image);
    } else {
      // Update texture/frame if changed
      if (image.texture.key !== textureKey || String(image.frame.name) !== String(frameKey)) {
        image.setTexture(textureKey, frameKey);
      }
    }

    const worldBox = node.getWorldBoundingBox();
    const boxW = worldBox.max.x - worldBox.min.x;
    const boxH = worldBox.max.y - worldBox.min.y;
    const destRect = sprite.destinationRect;

    if (painter.alignment === SpriteAlignment.Stretch) {
      image.setPosition(0, 0);
      image.setDisplaySize(boxW, boxH);
    } else if (painter.alignment === SpriteAlignment.TopLeft) {
      image.setPosition(0, 0);
      image.setDisplaySize(destRect.width, destRect.height);
    } else if (painter.alignment === SpriteAlignment.MiddleCenter) {
      image.setPosition(
        boxW / 2 - destRect.width / 2,
        boxH / 2 - destRect.height / 2,
      );
      image.setDisplaySize(destRect.width, destRect.height);
    } else if (painter.alignment === SpriteAlignment.MiddleLeft) {
      image.setPosition(0, boxH / 2 - destRect.height / 2);
      image.setDisplaySize(destRect.width, destRect.height);
    }

    image.setAlpha(painter.opacity);
  }


  /**
   * Ensure a Phaser canvas texture exists for the given canvas element +
   * sourceRect combination. Returns { textureKey, frameKey }.
   *
   * Canvas textures are invalidated (and recreated) when the canvas is resized,
   * because Phaser's canvas texture source doesn't auto-update.
   */
  private ensureCanvasTexture(
    canvas: HTMLCanvasElement,
    sourceRect: Rect,
  ): { textureKey: string; frameKey: string } {
    let canvasId = this.canvasIdMap.get(canvas);
    if (canvasId === undefined) {
      canvasId = this.canvasIdCounter++;
      this.canvasIdMap.set(canvas, canvasId);
    }

    const currentDims = { w: canvas.width, h: canvas.height };
    const cachedDims = this.canvasDimensionCache.get(canvasId);

    // If canvas was resized, invalidate all frames that were cached for it
    if (
      cachedDims === undefined ||
      cachedDims.w !== currentDims.w ||
      cachedDims.h !== currentDims.h
    ) {
      // Remove all canvas texture cache entries for this canvas
      const prefix = `canvas:${canvasId}:`;
      for (const k of this.canvasTextureCache.keys()) {
        if (k.startsWith(prefix)) {
          this.canvasTextureCache.delete(k);
        }
      }
      // Also remove the base texture for this canvas if it exists
      const baseKey = `canvas_base:${canvasId}`;
      if (this.scene.textures.exists(baseKey)) {
        this.scene.textures.remove(baseKey);
      }
      this.canvasDimensionCache.set(canvasId, { ...currentDims });
    }

    const frameKey = `frame:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;
    const cacheKey = `canvas:${canvasId}:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;

    const cachedTextureKey = this.canvasTextureCache.get(cacheKey);
    if (cachedTextureKey !== undefined) {
      // The texture still exists — update its source in case the canvas was redrawn
      const texture = this.scene.textures.get(cachedTextureKey);
      if (texture && texture.source.length > 0) {
        (texture.source[0] as any).update();
      }
      return { textureKey: cachedTextureKey, frameKey };
    }

    // Create or retrieve the base canvas texture
    const baseKey = `canvas_base:${canvasId}`;
    if (!this.scene.textures.exists(baseKey)) {
      this.scene.textures.addCanvas(baseKey, canvas);
    }

    // Add the frame for this sourceRect
    const texture = this.scene.textures.get(baseKey);
    if (texture && !texture.has(frameKey)) {
      texture.add(frameKey, 0, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height);
    }

    this.canvasTextureCache.set(cacheKey, baseKey);

    return { textureKey: baseKey, frameKey };
  }

  // ---------------------------------------------------------------------------
  // RectPainter
  // ---------------------------------------------------------------------------

  private syncRectPainter(
    node: GameObject,
    phaserNode: Phaser.GameObjects.Container,
    painter: RectPainter,
  ): void {
    let graphics = this.getVisualChild(phaserNode, 'rect') as Phaser.GameObjects.Graphics | null;
    if (graphics === null) {
      graphics = this.scene.add.graphics();
      graphics.name = '__visual_rect__';
      this.setVisualChild(phaserNode, graphics);
    }

    graphics.clear();

    const worldBox = node.getWorldBoundingBox();
    const w = worldBox.max.x - worldBox.min.x;
    const h = worldBox.max.y - worldBox.min.y;

    if (painter.fillColor !== null) {
      graphics.fillStyle(cssColorToHex(painter.fillColor), 1);
      graphics.fillRect(0, 0, w, h);
    }

    if (painter.strokeColor !== null) {
      const lw = painter.lineWidth;
      graphics.lineStyle(lw, cssColorToHex(painter.strokeColor), 1);
      graphics.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    }
  }

  // ---------------------------------------------------------------------------
  // LinePainter
  // ---------------------------------------------------------------------------

  private syncLinePainter(
    node: GameObject,
    phaserNode: Phaser.GameObjects.Container,
    painter: LinePainter,
  ): void {
    if (painter.positions.length === 0) {
      this.clearVisualChild(phaserNode);
      return;
    }

    let graphics = this.getVisualChild(phaserNode, 'line') as Phaser.GameObjects.Graphics | null;
    if (graphics === null) {
      graphics = this.scene.add.graphics();
      graphics.name = '__visual_line__';
      this.setVisualChild(phaserNode, graphics);
    }

    graphics.clear();
    graphics.lineStyle(1, cssColorToHex(painter.strokeColor), 1);

    const first = painter.positions[0];
    graphics.beginPath();
    graphics.moveTo(first.x, first.y);
    for (let i = 1; i < painter.positions.length; i++) {
      graphics.lineTo(painter.positions[i].x, painter.positions[i].y);
    }
    graphics.strokePath();
  }

  // ---------------------------------------------------------------------------
  // SpriteTextPainter
  // ---------------------------------------------------------------------------

  private syncSpriteTextPainter(
    node: GameObject,
    phaserNode: Phaser.GameObjects.Container,
    painter: SpriteTextPainter,
  ): void {
    if (painter.text === null) {
      this.clearVisualChild(phaserNode);
      return;
    }

    // We use a Phaser Container as the glyph host
    let textContainer = this.getVisualChild(phaserNode, 'spritetext') as Phaser.GameObjects.Container | null;
    if (textContainer === null) {
      textContainer = this.scene.add.container(0, 0);
      textContainer.name = '__visual_spritetext__';
      this.setVisualChild(phaserNode, textContainer);
    }

    const glyphs = painter.text.build();

    // Grow or shrink the child pool
    while (textContainer.list.length < glyphs.length) {
      const placeholder = this.scene.add.image(0, 0, '__DEFAULT');
      placeholder.setOrigin(0, 0);
      textContainer.add(placeholder);
    }
    while (textContainer.list.length > glyphs.length) {
      const last = textContainer.list[textContainer.list.length - 1] as Phaser.GameObjects.Image;
      textContainer.remove(last, true);
    }

    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];
      const phaserGlyph = textContainer.list[i] as Phaser.GameObjects.Image;

      const element = glyph.image.getElement();
      let textureKey: string | null = null;
      let frameKey: string | null = null;

      if (element instanceof HTMLImageElement) {
        textureKey = this.getOrCreateTextureKey(element);
        frameKey = this.getOrCreateFrameKey(textureKey, glyph.sourceRect);
      } else if (element instanceof HTMLCanvasElement) {
        const result = this.ensureCanvasTexture(element, glyph.sourceRect);
        textureKey = result.textureKey;
        frameKey = result.frameKey;
      }

      if (textureKey !== null && frameKey !== null) {
        if (phaserGlyph.texture.key !== textureKey || String(phaserGlyph.frame.name) !== frameKey) {
          phaserGlyph.setTexture(textureKey, frameKey);
        }
      }

      phaserGlyph.setPosition(glyph.destinationRect.x, glyph.destinationRect.y);
      phaserGlyph.setDisplaySize(glyph.destinationRect.width, glyph.destinationRect.height);
    }

    textContainer.setAlpha(painter.opacity);
  }

  // ---------------------------------------------------------------------------
  // Visual child management (mirrors PixiRenderer's __visual_*__ pattern)
  // ---------------------------------------------------------------------------

  private getVisualChild(
    phaserNode: Phaser.GameObjects.Container,
    expectedType?: string,
  ): Phaser.GameObjects.GameObject | null {
    const expectedName = expectedType ? `__visual_${expectedType}__` : undefined;

    for (const child of phaserNode.list) {
      const go = child as Phaser.GameObjects.GameObject & { name?: string };
      if (go.name?.startsWith('__visual_')) {
        if (expectedName !== undefined && go.name !== expectedName) {
          // Wrong type — destroy it and return null so caller creates the right type
          phaserNode.remove(go as Phaser.GameObjects.GameObject, true);
          return null;
        }
        return go;
      }
    }
    return null;
  }

  private setVisualChild(
    phaserNode: Phaser.GameObjects.Container,
    visual: Phaser.GameObjects.GameObject,
  ): void {
    this.clearVisualChild(phaserNode);
    phaserNode.add(visual);
  }

  private clearVisualChild(phaserNode: Phaser.GameObjects.Container): void {
    for (let i = phaserNode.list.length - 1; i >= 0; i--) {
      const child = phaserNode.list[i] as Phaser.GameObjects.GameObject & { name?: string };
      if (child.name?.startsWith('__visual_')) {
        phaserNode.remove(child, true);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a CSS color string to a 24-bit integer (Phaser's format).
 */
function cssColorToHex(color: string): number {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return parseInt(hex, 16);
  }

  if (color.startsWith('rgb')) {
    const match = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      return (r << 16) | (g << 8) | b;
    }
  }

  const namedColors: Record<string, number> = {
    black: 0x000000,
    white: 0xffffff,
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
  };
  return namedColors[color] ?? 0x000000;
}
