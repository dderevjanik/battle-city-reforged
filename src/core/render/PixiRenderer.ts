import * as PIXI from 'pixi.js';

import { RenderObject } from '../RenderObject';
import { SpritePainter } from '../painters/SpritePainter';
import { RectPainter } from '../painters/RectPainter';
import { LinePainter } from '../painters/LinePainter';
import { SpriteTextPainter } from '../painters/SpriteTextPainter';
import { SpriteAlignment } from '../SpriteAlignment';
import { Rect } from '../Rect';

import { PixiTextureManager } from './PixiTextureManager';

/**
 * WeakMap associating each RenderObject with its flat PixiJS display object.
 * All display objects live as direct children of pixiRoot (no nesting),
 * matching the original GameRenderer which flattened the tree and globally
 * z-sorted everything.
 */
const displayMap = new WeakMap<RenderObject, PIXI.Container>();

export interface PixiRendererOptions {
  width: number;
  height: number;
  app: PIXI.Application;
  textureManager: PixiTextureManager;
}

export class PixiRenderer {
  private readonly app: PIXI.Application;
  private readonly textureManager: PixiTextureManager;
  private readonly pixiRoot: PIXI.Container;

  constructor(options: PixiRendererOptions) {
    this.app = options.app;
    this.textureManager = options.textureManager;

    this.pixiRoot = new PIXI.Container();
    this.pixiRoot.sortableChildren = true;
    this.app.stage.addChild(this.pixiRoot);
  }

  public getDomElement(): HTMLElement {
    return this.app.view as HTMLCanvasElement;
  }

  public render(root: RenderObject): void {
    // 1. Update world matrices (needed for collision + position readout)
    root.updateWorldMatrix(false, true);

    // 2. Flatten the scene graph (excluding root), exactly like the
    //    original GameRenderer did.
    const objects: RenderObject[] = [];
    root.traverse((object) => {
      if (object === root) return;
      objects.push(object);
    });

    // 3. Track which PixiJS containers are still active this frame
    const activeSet = new Set<PIXI.Container>();

    // 4. For each object, ensure a PixiJS display object exists and sync it
    for (const node of objects) {
      let pixiNode = displayMap.get(node);
      if (pixiNode === undefined) {
        pixiNode = new PIXI.Container();
        displayMap.set(node, pixiNode);
      }

      // All display objects are direct children of pixiRoot (flat)
      if (pixiNode.parent !== this.pixiRoot) {
        this.pixiRoot.addChild(pixiNode);
      }

      this.syncTransform(node, pixiNode);
      this.syncPainter(node, pixiNode);

      activeSet.add(pixiNode);
    }

    // 5. Remove PixiJS children that are no longer in the scene graph
    for (let i = this.pixiRoot.children.length - 1; i >= 0; i--) {
      const child = this.pixiRoot.children[i] as PIXI.Container;
      if (!activeSet.has(child)) {
        this.pixiRoot.removeChild(child);
        child.destroy({ children: true });
      }
    }

    // 6. Let PixiJS render (sortableChildren handles z-order)
    this.app.renderer.render(this.app.stage);
  }

  private syncTransform(
    node: RenderObject,
    pixiNode: PIXI.Container,
  ): void {
    // The original engine never visually rotates sprites — painters draw
    // into an axis-aligned bounding box. Rotation is game-logic only
    // (movement direction, sprite selection via sprite swapping).
    // Use the world bounding box as absolute position, matching what the
    // original painters read via getWorldBoundingBox().toRect().
    const worldBox = node.getWorldBoundingBox();
    pixiNode.position.set(worldBox.min.x, worldBox.min.y);

    // Visibility
    const worldVisible = node.getWorldVisible();
    pixiNode.visible = worldVisible !== false;

    // Z-index (global sort, matching original GameRenderer behavior)
    pixiNode.zIndex = node.getWorldZIndex() ?? 0;
  }

  private syncPainter(
    node: RenderObject,
    pixiNode: PIXI.Container,
  ): void {
    const painter = node.painter;

    if (painter === null) {
      this.clearVisualChild(pixiNode);
      return;
    }

    if (!node.canRender()) {
      this.clearVisualChild(pixiNode);
      return;
    }

    if (painter instanceof SpritePainter) {
      this.syncSpritePainter(node, pixiNode, painter);
    } else if (painter instanceof RectPainter) {
      this.syncRectPainter(node, pixiNode, painter);
    } else if (painter instanceof LinePainter) {
      this.syncLinePainter(node, pixiNode, painter);
    } else if (painter instanceof SpriteTextPainter) {
      this.syncSpriteTextPainter(node, pixiNode, painter);
    }
  }

  private syncSpritePainter(
    node: RenderObject,
    pixiNode: PIXI.Container,
    painter: SpritePainter,
  ): void {
    if (painter.sprite === null || !painter.sprite.isImageLoaded()) {
      this.clearVisualChild(pixiNode);
      return;
    }

    const sprite = painter.sprite;
    const sourceRect = sprite.sourceRect;

    let texture = this.findTextureForSprite(sprite);

    if (texture === null) {
      // Fallback: create texture from the image source's canvas/element
      const element = sprite.image.getElement();
      if (element instanceof HTMLCanvasElement) {
        texture = this.getCanvasTexture(element, sourceRect);
      } else if (element instanceof HTMLImageElement) {
        const baseTexture = PIXI.BaseTexture.from(element, {
          scaleMode: PIXI.SCALE_MODES.NEAREST,
        });
        texture = new PIXI.Texture(
          baseTexture,
          new PIXI.Rectangle(
            sourceRect.x,
            sourceRect.y,
            sourceRect.width,
            sourceRect.height,
          ),
        );
      } else {
        this.clearVisualChild(pixiNode);
        return;
      }
    }

    let pixiSprite = this.getVisualChild(pixiNode, 'sprite') as PIXI.Sprite;
    if (pixiSprite === null) {
      pixiSprite = new PIXI.Sprite(texture);
      pixiSprite.name = '__visual_sprite__';
      this.setVisualChild(pixiNode, pixiSprite);
    }

    if (pixiSprite.texture !== texture) {
      pixiSprite.texture = texture;
    }

    // The original SpritePainter computes destinationRect based on alignment
    // relative to the object's worldBoundingBox. Since our pixiNode is already
    // positioned at worldBox.min, we offset the sprite within the container.
    const destRect = sprite.destinationRect;
    const worldBox = node.getWorldBoundingBox();
    const boxW = worldBox.max.x - worldBox.min.x;
    const boxH = worldBox.max.y - worldBox.min.y;

    if (painter.alignment === SpriteAlignment.Stretch) {
      pixiSprite.anchor.set(0, 0);
      pixiSprite.position.set(0, 0);
      pixiSprite.width = boxW;
      pixiSprite.height = boxH;
    } else if (painter.alignment === SpriteAlignment.TopLeft) {
      pixiSprite.anchor.set(0, 0);
      pixiSprite.position.set(0, 0);
      pixiSprite.width = destRect.width;
      pixiSprite.height = destRect.height;
    } else if (painter.alignment === SpriteAlignment.MiddleCenter) {
      pixiSprite.anchor.set(0, 0);
      pixiSprite.position.set(
        boxW / 2 - destRect.width / 2,
        boxH / 2 - destRect.height / 2,
      );
      pixiSprite.width = destRect.width;
      pixiSprite.height = destRect.height;
    } else if (painter.alignment === SpriteAlignment.MiddleLeft) {
      pixiSprite.anchor.set(0, 0);
      pixiSprite.position.set(0, boxH / 2 - destRect.height / 2);
      pixiSprite.width = destRect.width;
      pixiSprite.height = destRect.height;
    }

    pixiSprite.alpha = painter.opacity;
  }

  private syncRectPainter(
    node: RenderObject,
    pixiNode: PIXI.Container,
    painter: RectPainter,
  ): void {
    let graphics = this.getVisualChild(pixiNode, 'rect') as PIXI.Graphics;
    if (graphics === null) {
      graphics = new PIXI.Graphics();
      graphics.name = '__visual_rect__';
      this.setVisualChild(pixiNode, graphics);
    }

    graphics.clear();

    const worldBox = node.getWorldBoundingBox();
    const w = worldBox.max.x - worldBox.min.x;
    const h = worldBox.max.y - worldBox.min.y;

    if (painter.fillColor !== null) {
      graphics.beginFill(cssColorToHex(painter.fillColor));
      graphics.drawRect(0, 0, w, h);
      graphics.endFill();
    }

    if (painter.strokeColor !== null) {
      const lw = painter.lineWidth;
      graphics.lineStyle(lw, cssColorToHex(painter.strokeColor));
      graphics.drawRect(lw, lw, w - lw * 2, h - lw * 2);
    }
  }

  private syncLinePainter(
    node: RenderObject,
    pixiNode: PIXI.Container,
    painter: LinePainter,
  ): void {
    if (painter.positions.length === 0) {
      this.clearVisualChild(pixiNode);
      return;
    }

    let graphics = this.getVisualChild(pixiNode, 'line') as PIXI.Graphics;
    if (graphics === null) {
      graphics = new PIXI.Graphics();
      graphics.name = '__visual_line__';
      this.setVisualChild(pixiNode, graphics);
    }

    graphics.clear();
    graphics.lineStyle(1, cssColorToHex(painter.strokeColor));

    const first = painter.positions[0];
    graphics.moveTo(first.x, first.y);
    for (let i = 1; i < painter.positions.length; i++) {
      graphics.lineTo(painter.positions[i].x, painter.positions[i].y);
    }
  }

  private syncSpriteTextPainter(
    node: RenderObject,
    pixiNode: PIXI.Container,
    painter: SpriteTextPainter,
  ): void {
    if (painter.text === null) {
      this.clearVisualChild(pixiNode);
      return;
    }

    let textContainer = this.getVisualChild(
      pixiNode,
      'spritetext',
    ) as PIXI.Container;
    if (textContainer === null) {
      textContainer = new PIXI.Container();
      textContainer.name = '__visual_spritetext__';
      this.setVisualChild(pixiNode, textContainer);
    }

    const glyphs = painter.text.build();

    // Resize children pool
    while (textContainer.children.length > glyphs.length) {
      textContainer.removeChildAt(textContainer.children.length - 1);
    }
    while (textContainer.children.length < glyphs.length) {
      textContainer.addChild(new PIXI.Sprite());
    }

    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];
      const pixiGlyph = textContainer.children[i] as PIXI.Sprite;

      let texture = this.findTextureForSprite(glyph);
      if (texture === null) {
        const element = glyph.image.getElement();
        if (element instanceof HTMLCanvasElement) {
          texture = this.getCanvasTexture(element, glyph.sourceRect);
        } else if (element instanceof HTMLImageElement) {
          const baseTex = PIXI.BaseTexture.from(element, {
            scaleMode: PIXI.SCALE_MODES.NEAREST,
          });
          texture = new PIXI.Texture(
            baseTex,
            new PIXI.Rectangle(
              glyph.sourceRect.x,
              glyph.sourceRect.y,
              glyph.sourceRect.width,
              glyph.sourceRect.height,
            ),
          );
        }
      }

      if (texture !== null) {
        pixiGlyph.texture = texture;
      }

      pixiGlyph.position.set(
        glyph.destinationRect.x,
        glyph.destinationRect.y,
      );
      pixiGlyph.width = glyph.destinationRect.width;
      pixiGlyph.height = glyph.destinationRect.height;
    }

    textContainer.alpha = painter.opacity;
  }

  private findTextureForSprite(sprite: {
    image: { getElement(): CanvasImageSource };
    sourceRect: Rect;
  }): PIXI.Texture | null {
    // Build key from image source identity + sourceRect to avoid collisions
    // between sprites from different image files that share the same rect
    const element = sprite.image.getElement();
    const imgKey = this.getImageKey(element);
    if (imgKey === null) return null;

    const sr = sprite.sourceRect;
    const key = `${imgKey}:${sr.x}:${sr.y}:${sr.width}:${sr.height}`;

    const texture = this.rectKeyCache.get(key);
    if (texture !== undefined) {
      return texture;
    }

    return null;
  }

  private imageKeyMap = new WeakMap<CanvasImageSource, string>();

  private getImageKey(element: CanvasImageSource): string | null {
    let key = this.imageKeyMap.get(element);
    if (key !== undefined) return key;

    if (element instanceof HTMLImageElement) {
      key = element.src;
    } else if (element instanceof HTMLCanvasElement) {
      return null; // canvas-based sprites are handled separately
    } else {
      return null;
    }

    this.imageKeyMap.set(element, key);
    return key;
  }

  private rectKeyCache = new Map<string, PIXI.Texture>();
  private canvasTextureCache = new Map<string, PIXI.Texture>();
  private canvasBaseTextures = new Map<HTMLCanvasElement, PIXI.BaseTexture>();

  /**
   * Get or create a PIXI.Texture for a canvas-based sprite (e.g. sprite fonts).
   * Caches by canvas element + sourceRect to avoid creating new textures each frame.
   */
  private getCanvasTexture(
    canvas: HTMLCanvasElement,
    sourceRect: Rect,
  ): PIXI.Texture {
    const key = `canvas:${canvas.width}x${canvas.height}:${sourceRect.x}:${sourceRect.y}:${sourceRect.width}:${sourceRect.height}`;
    const cached = this.canvasTextureCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    let baseTex = this.canvasBaseTextures.get(canvas);
    if (baseTex === undefined) {
      baseTex = new PIXI.BaseTexture(canvas, {
        scaleMode: PIXI.SCALE_MODES.NEAREST,
      });
      this.canvasBaseTextures.set(canvas, baseTex);
    } else {
      // Canvas may have been resized/redrawn — update the base texture
      baseTex.setSize(canvas.width, canvas.height);
      baseTex.update();
    }

    const texture = new PIXI.Texture(
      baseTex,
      new PIXI.Rectangle(
        sourceRect.x,
        sourceRect.y,
        sourceRect.width,
        sourceRect.height,
      ),
    );
    this.canvasTextureCache.set(key, texture);
    return texture;
  }

  public buildTextureCache(manifest: {
    [id: string]: { file: string; rect: number[] };
  }): void {
    for (const [id, item] of Object.entries(manifest)) {
      const [x, y, w, h] = item.rect;
      // Resolve the file path to a full URL to match HTMLImageElement.src
      const fileUrl = new URL(item.file, window.location.href).href;
      const key = `${fileUrl}:${x}:${y}:${w}:${h}`;
      this.rectKeyCache.set(key, this.textureManager.get(id));
    }
  }

  // --- Visual child management ---

  private getVisualChild(
    pixiNode: PIXI.Container,
    expectedType?: string,
  ): PIXI.DisplayObject | null {
    const expectedName = expectedType
      ? `__visual_${expectedType}__`
      : undefined;

    for (const child of pixiNode.children) {
      if (child.name?.startsWith('__visual_')) {
        if (expectedName !== undefined && child.name !== expectedName) {
          pixiNode.removeChild(child);
          child.destroy({ children: true });
          return null;
        }
        return child;
      }
    }
    return null;
  }

  private setVisualChild(
    pixiNode: PIXI.Container,
    visual: PIXI.DisplayObject,
  ): void {
    this.clearVisualChild(pixiNode);
    pixiNode.addChild(visual);
  }

  private clearVisualChild(pixiNode: PIXI.Container): void {
    for (let i = pixiNode.children.length - 1; i >= 0; i--) {
      const child = pixiNode.children[i];
      if (child.name?.startsWith('__visual_')) {
        pixiNode.removeChild(child);
        child.destroy({ children: true });
      }
    }
  }
}

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
