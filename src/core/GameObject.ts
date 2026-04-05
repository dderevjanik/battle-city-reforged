import Phaser from 'phaser';

import { BoundingBox } from './BoundingBox';
import { Collider } from './collision/Collider';
import { Collision } from './collision/Collision';
import { Matrix3 } from './Matrix3';
import { Painter } from './painters/Painter';
import { SpritePainter } from './painters/SpritePainter';
import { RectPainter } from './painters/RectPainter';
import { LinePainter } from './painters/LinePainter';
import { SpriteTextPainter } from './painters/SpriteTextPainter';
import { SpriteAlignment } from './SpriteAlignment';
import { Rect } from './Rect';
import { Size } from './Size';
import { MathUtils } from './utils';
import { Vector } from './Vector';
import {
  _rendererScene,
  clearVisualChild,
  cssColorToHex,
  ensureCanvasTexture,
  getOrCreateFrameKey,
  getOrCreateTextureKey,
  getVisualChild,
  setVisualChild,
} from './GameObjectRenderer';

export { initRenderer } from './GameObjectRenderer';

// -1 is because coordinate system start is at top left
const X_AXIS = new Vector(1, 0);
const Y_AXIS = new Vector(0, -1);

// ---------------------------------------------------------------------------
// GameObject
// ---------------------------------------------------------------------------

/**
 * Base class for all game entities. Combines:
 * - Tree hierarchy (add/remove/traverse children)
 * - 2D transform (position, rotation, size, matrix math)
 * - Rendering properties (painter, visibility, z-index)
 * - Game lifecycle (setup/update/collide)
 */
export class GameObject {
  // --- Tree (formerly Node) ---

  public children: this[] = [];
  public parent: this | null = null;
  public removedChildren: this[] = [];
  public isRemoved = false;

  public add(...childrenToAdd: any[]): this {
    for (const childToAdd of childrenToAdd) {
      if (childToAdd.parent !== null) {
        childToAdd.parent.remove(childToAdd, false);
      }

      childToAdd.parent = this;
      this.children.push(childToAdd);
    }

    return this;
  }

  public replaceSelf(replacement: GameObject): this {
    if (this.parent === null) {
      return this;
    }

    this.parent.remove(this);
    this.parent.add(replacement);

    return this;
  }

  public remove(childToRemove: any, addToRemoved = true): boolean {
    const index = this.children.indexOf(childToRemove);

    if (index === -1) {
      return false;
    }

    if (addToRemoved) {
      childToRemove.isRemoved = true;
      this.removedChildren.push(childToRemove);
    }

    this.children.splice(index, 1);

    // Destroy the Phaser display node so it doesn't linger in the scene
    childToRemove._destroyDisplayTree();

    return true;
  }

  public removeSelf(): this {
    if (this.parent === null) {
      return this;
    }

    this.parent.remove(this);

    return this;
  }

  public removeAllChildren(): this {
    for (const child of this.children) {
      child.isRemoved = true;
      child._destroyDisplayTree();
    }
    this.children = [];
    return this;
  }

  public cleanupRemoved(): void {
    this.removedChildren = [];
  }

  public traverse(callback: (node: this) => void): this {
    callback(this);

    for (const child of this.children) {
      child.traverse(callback);
    }

    return this;
  }

  public traverseDescedants(callback: (node: this) => void): this {
    for (const child of this.children) {
      child.traverse(callback);
    }

    return this;
  }

  public hasParent(parentToFind: this): boolean {
    let parent = this.parent;

    while (parent !== null) {
      if (parent === parentToFind) {
        return true;
      }

      parent = parent.parent;
    }

    return false;
  }

  public traverseParents(callback: (node: this) => void): this {
    const parent = this.parent;

    if (parent !== null) {
      callback(parent);
      parent.traverseParents(callback);
    }

    return this;
  }

  public flatten(): this[] {
    const nodes: this[] = [];

    this.traverse((node) => {
      nodes.push(node);
    });

    return nodes;
  }

  // --- Transform ---

  public size = new Size();
  public position = new Vector(0, 0);
  public origin = new Vector(0, 0);
  public rotation = 0;
  public pivot = new Vector(0, 0);

  public matrix = new Matrix3();
  public worldMatrix = new Matrix3();

  public boundingBox = new BoundingBox();
  public worldBoundingBox = new BoundingBox();

  public matrixAutoUpdate = false;
  public worldMatrixNeedsUpdate = false;

  constructor(width = 0, height = 0) {
    this.size = new Size(width, height);
  }

  public rotate(rotation: number): void {
    this.rotation = rotation;
  }

  public attach(target: GameObject): this {
    this.updateWorldMatrix(true);

    const invSelfWorldTransformMatrix = this.worldMatrix.clone().invert();

    if (target.parent !== null) {
      target.parent.updateWorldMatrix(true);
      invSelfWorldTransformMatrix.premultiply(target.parent.worldMatrix);
    }

    target.updateMatrix();
    target.applyMatrix3(invSelfWorldTransformMatrix);

    this.add(target);

    return this;
  }

  public applyMatrix3(transformMatrix: Matrix3): void {
    if (this.matrixAutoUpdate) {
      this.updateMatrix();
    }

    this.matrix.multiply(transformMatrix);

    const { rotation, position } = this.decomposeTransformMatrix(
      this.matrix,
      this.getPivotOffset(),
      this.getOriginOffset(),
    );

    this.rotation = rotation;
    this.position = position;
  }

  public translateX(distance: number): this {
    this.translateOnAxis(X_AXIS, distance);
    return this;
  }

  public translateY(distance: number): this {
    this.translateOnAxis(Y_AXIS, distance);
    return this;
  }

  public translateOnAxis(axis: Vector, distance: number): this {
    const d = Matrix3.createRotation(this.rotation)
      .applyToVector(axis.clone())
      .multScalar(distance);

    this.position.add(d);

    return this;
  }

  public getWorldPosition(): Vector {
    const { position: worldPosition } = this.decomposeTransformMatrix(
      this.worldMatrix,
      this.getPivotOffset(),
      this.getOriginOffset(),
    );

    return worldPosition;
  }

  public getWorldRotation(): number {
    const { rotation: worldRotation } = this.decomposeTransformMatrix(
      this.worldMatrix,
      this.getPivotOffset(),
      this.getOriginOffset(),
    );

    return worldRotation;
  }

  public getCenter(): Vector {
    return this.getBoundingBox().getCenter();
  }

  public setCenter(v: Vector): void {
    const size = this.getBoundingBox().getSize();
    this.position.set(v.x - size.width / 2, v.y - size.height / 2);
  }

  public setCenterX(x: number): void {
    const size = this.getBoundingBox().getSize();
    this.position.setX(x - size.width / 2);
  }

  public setCenterY(y: number): void {
    const size = this.getBoundingBox().getSize();
    this.position.setY(y - size.height / 2);
  }

  public getSelfCenter(): Vector {
    return this.size.toVector().divideScalar(2);
  }

  public getBoundingBox(): BoundingBox {
    if (this.matrixAutoUpdate) {
      this.updateMatrix();
    }

    return this.boundingBox;
  }

  public getWorldBoundingBox(): BoundingBox {
    this.updateWorldMatrix(true);

    return this.worldBoundingBox;
  }

  public getSelfPoints(): Vector[] {
    const { width, height } = this.size;

    return [
      new Vector(0, 0),
      new Vector(width, 0),
      new Vector(width, height),
      new Vector(0, height),
    ];
  }

  public getPoints(): Vector[] {
    const selfPoints = this.getSelfPoints();

    return selfPoints.map((point) => {
      return this.matrix.applyToVector(point);
    });
  }

  public getWorldPoints(): Vector[] {
    const selfPoints = this.getSelfPoints();

    return selfPoints.map((point) => {
      return this.worldMatrix.applyToVector(point);
    });
  }

  public updateMatrix(childrenNeedUpdate = false): void {
    const transformMatrix = this.composeTransformMatrix(
      this.getPivotOffset(),
      this.getOriginOffset(),
      this.rotation,
      this.position,
    );
    this.matrix.copyFrom(transformMatrix);

    this.boundingBox.fromPoints(this.getPoints());

    this.setWorldMatrixNeedsUpdate(childrenNeedUpdate);
  }

  public setWorldMatrixNeedsUpdate(updateChildren = false): void {
    this.worldMatrixNeedsUpdate = true;

    if (updateChildren) {
      for (const child of this.children) {
        child.setWorldMatrixNeedsUpdate(updateChildren);
      }
    }
  }

  public updateWorldMatrix(
    updateParents = false,
    updateChildren = false,
  ): void {
    if (updateParents === true && this.parent !== null) {
      this.parent.updateWorldMatrix(true, false);
    }

    if (this.matrixAutoUpdate) {
      this.updateMatrix();
    }

    if (this.worldMatrixNeedsUpdate) {
      if (this.parent === null) {
        this.worldMatrix.copyFrom(this.matrix);
      } else {
        this.worldMatrix.multiplyMatrices(this.matrix, this.parent.worldMatrix);
      }

      this.worldBoundingBox.fromPoints(this.getWorldPoints());

      this.worldMatrixNeedsUpdate = false;
    }

    if (updateChildren === true) {
      for (const child of this.children) {
        child.updateWorldMatrix(false, true);
      }
    }
  }

  private getPivotOffset(): Vector {
    return new Vector(
      -this.pivot.x * this.size.width,
      -this.pivot.y * this.size.height,
    );
  }

  private getOriginOffset(): Vector {
    return new Vector(
      -this.origin.x * this.size.width,
      -this.origin.y * this.size.height,
    );
  }

  private composeTransformMatrix(
    pivotOffset: Vector,
    originOffset: Vector,
    rotation: number,
    position: Vector,
  ): Matrix3 {
    const pivX = pivotOffset.x;
    const pivY = pivotOffset.y;
    const orgX = originOffset.x;
    const orgY = originOffset.y;
    const posX = position.x;
    const posY = position.y;

    const cos = MathUtils.cosDegrees(rotation);
    const sin = MathUtils.sinDegrees(rotation);

    const tx = pivX * cos - pivY * sin - pivX + orgX + posX;
    const ty = pivX * sin + pivY * cos - pivY + orgY + posY;

    return new Matrix3().set(
      cos, sin, 0,
      -sin, cos, 0,
      tx, ty, 1,
    );
  }

  private decomposeTransformMatrix(
    transformMatrix: Matrix3,
    pivotOffset: Vector,
    originOffset: Vector,
  ): { rotation: number; position: Vector } {
    const pivX = pivotOffset.x;
    const pivY = pivotOffset.y;
    const orgX = originOffset.x;
    const orgY = originOffset.y;

    const cos = transformMatrix.elements[0];
    const sin = transformMatrix.elements[1];
    const tx = transformMatrix.elements[6];
    const ty = transformMatrix.elements[7];

    let rotation = MathUtils.atan2Degrees(sin, cos);
    if (rotation < 0) {
      rotation += 360;
    }

    const posX = tx - (pivX * cos - pivY * sin - pivX + orgX);
    const posY = ty - (pivX * sin + pivY * cos - pivY + orgY);

    return {
      rotation,
      position: new Vector(posX, posY),
    };
  }

  // --- Render properties (formerly RenderObject) ---

  public painter: Painter | null = null;

  protected zIndex: number | null = null;
  protected worldZIndex: number | null = null;

  protected visible: boolean | null = null;
  protected worldVisible: boolean | null = null;

  public canRender(): boolean {
    if (this.painter === null) {
      return false;
    }
    if (this.getWorldVisible() === false) {
      return false;
    }
    return true;
  }

  public setVisible(visible: boolean | null): void {
    this.visible = visible;
    this.updateWorldVisible(true);
    if (this._phaserNode !== null && this._phaserNode.active) {
      this._phaserNode.setVisible(visible !== false);
    }
  }

  public getVisible(): boolean | null {
    return this.visible;
  }

  public getWorldVisible(): boolean | null {
    return this.worldVisible;
  }

  protected updateWorldVisible(updateParents = false): void {
    if (this.parent !== null && updateParents === true) {
      this.parent.updateWorldVisible(true);
    }

    if (this.parent === null) {
      this.worldVisible = this.visible ?? true;
    } else {
      this.worldVisible = this.visible ?? this.parent.worldVisible;
    }

    for (const child of this.children) {
      child.updateWorldVisible();
    }
  }

  public setZIndex(zIndex: number): void {
    this.zIndex = zIndex;
    this.updateWorldZIndex(true);
  }

  public getZIndex(): number | null {
    return this.zIndex;
  }

  public getWorldZIndex(): number | null {
    return this.worldZIndex;
  }

  protected updateWorldZIndex(updateParents = false): void {
    if (this.parent !== null && updateParents === true) {
      this.parent.updateWorldZIndex(true);
    }

    if (this.parent === null) {
      this.worldZIndex = this.zIndex ?? 0;
    } else {
      this.worldZIndex = this.zIndex ?? this.parent.worldZIndex;
    }

    for (const child of this.children) {
      child.updateWorldZIndex();
    }
  }

  // Legacy no-ops kept for backward compatibility
  public dirtyPaintBox(): void {}
  public setNeedsPaint(): void {}
  public doesNeedPaint(): boolean { return false; }
  public resetNeedsPaint(): void {}

  // --- Phaser display node ---

  private _phaserNode: Phaser.GameObjects.Container | null = null;

  /**
   * Destroy the Phaser display container for this node and all descendants.
   * Called when a node is removed from the tree so stale containers don't
   * linger in the scene.
   */
  private _destroyDisplayTree(): void {
    if (this._phaserNode !== null) {
      this._phaserNode.destroy(true);
      this._phaserNode = null;
    }
    for (const child of this.children) {
      child._destroyDisplayTree();
    }
  }

  /**
   * Sync this object's painter to its Phaser display node.
   * Called once per frame from GameScene after world matrices are updated.
   * Assumes worldBoundingBox, worldVisible, and worldZIndex are up to date.
   */
  public _syncPainter(): void {
    if (_rendererScene === null) return;

    // Lazily create, or recreate if the container was destroyed by a scene transition
    if (this._phaserNode === null || !this._phaserNode.active) {
      this._phaserNode = _rendererScene.add.container(0, 0);
    }

    // Sync transform from world bounding box (already updated by caller)
    const worldBox = this.worldBoundingBox;
    this._phaserNode.setPosition(worldBox.min.x, worldBox.min.y);
    this._phaserNode.setVisible(this.worldVisible !== false);
    this._phaserNode.setDepth(this.worldZIndex ?? 0);

    // Sync painter
    const painter = this.painter;
    if (painter === null || !this.canRender()) {
      clearVisualChild(this._phaserNode);
      return;
    }

    if (painter instanceof SpritePainter) {
      this._syncSpritePainter(this._phaserNode, painter);
    } else if (painter instanceof RectPainter) {
      this._syncRectPainter(this._phaserNode, painter);
    } else if (painter instanceof LinePainter) {
      this._syncLinePainter(this._phaserNode, painter);
    } else if (painter instanceof SpriteTextPainter) {
      this._syncSpriteTextPainter(this._phaserNode, painter);
    }
  }

  private _syncSpritePainter(
    phaserNode: Phaser.GameObjects.Container,
    painter: SpritePainter,
  ): void {
    if (painter.sprite === null || !painter.sprite.isImageLoaded()) {
      clearVisualChild(phaserNode);
      return;
    }

    const sprite = painter.sprite;
    const sourceRect = sprite.sourceRect;
    const element = sprite.image.getElement();

    let textureKey: string;
    let frameKey: string;

    if (element instanceof HTMLImageElement) {
      textureKey = getOrCreateTextureKey(element);
      frameKey = getOrCreateFrameKey(textureKey, sourceRect);
    } else if (element instanceof HTMLCanvasElement) {
      const result = ensureCanvasTexture(element, sourceRect);
      textureKey = result.textureKey;
      frameKey = result.frameKey;
    } else {
      clearVisualChild(phaserNode);
      return;
    }

    let image = getVisualChild(phaserNode, 'sprite') as Phaser.GameObjects.Image | null;
    if (image === null) {
      image = _rendererScene!.add.image(0, 0, textureKey, frameKey);
      image.name = '__visual_sprite__';
      image.setOrigin(0, 0);
      setVisualChild(phaserNode, image);
    } else {
      if (image.texture.key !== textureKey || String(image.frame.name) !== String(frameKey)) {
        image.setTexture(textureKey, frameKey);
      }
    }

    const worldBox = this.worldBoundingBox;
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

  private _syncRectPainter(
    phaserNode: Phaser.GameObjects.Container,
    painter: RectPainter,
  ): void {
    let graphics = getVisualChild(phaserNode, 'rect') as Phaser.GameObjects.Graphics | null;
    if (graphics === null) {
      graphics = _rendererScene!.add.graphics();
      graphics.name = '__visual_rect__';
      setVisualChild(phaserNode, graphics);
    }

    graphics.clear();

    const worldBox = this.worldBoundingBox;
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

  private _syncLinePainter(
    phaserNode: Phaser.GameObjects.Container,
    painter: LinePainter,
  ): void {
    if (painter.positions.length === 0) {
      clearVisualChild(phaserNode);
      return;
    }

    let graphics = getVisualChild(phaserNode, 'line') as Phaser.GameObjects.Graphics | null;
    if (graphics === null) {
      graphics = _rendererScene!.add.graphics();
      graphics.name = '__visual_line__';
      setVisualChild(phaserNode, graphics);
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

  private _syncSpriteTextPainter(
    phaserNode: Phaser.GameObjects.Container,
    painter: SpriteTextPainter,
  ): void {
    if (painter.text === null) {
      clearVisualChild(phaserNode);
      return;
    }

    let textContainer = getVisualChild(phaserNode, 'spritetext') as Phaser.GameObjects.Container | null;
    if (textContainer === null) {
      textContainer = _rendererScene!.add.container(0, 0);
      textContainer.name = '__visual_spritetext__';
      setVisualChild(phaserNode, textContainer);
    }

    const glyphs = painter.text.build();

    while (textContainer.list.length < glyphs.length) {
      const placeholder = _rendererScene!.add.image(0, 0, '__DEFAULT');
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
        textureKey = getOrCreateTextureKey(element);
        frameKey = getOrCreateFrameKey(textureKey, glyph.sourceRect);
      } else if (element instanceof HTMLCanvasElement) {
        const result = ensureCanvasTexture(element, glyph.sourceRect);
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

  // --- Game lifecycle ---

  public collider: Collider | null = null;
  public ignorePause = false;
  public tags: string[] = [];

  private needsSetup = true;

  public invokeUpdate(context: any, deltaTime: number): void {
    if (this.needsSetup === true) {
      this.needsSetup = false;
      this.setup(context);
      this.updateMatrix();
      this.updateWorldVisible(true);
      this.updateWorldZIndex(true);
    }

    this.update(deltaTime);
  }

  public invokeCollide(collision: Collision): void {
    if (this.needsSetup === true) {
      return;
    }

    this.collide(collision);
  }

  protected hasBeenSetup(): boolean {
    return !this.needsSetup;
  }

  protected setup(context: any): void {
    return undefined;
  }

  protected update(deltaTime: number): void {
    return undefined;
  }

  protected collide(collision: Collision): void {
    return undefined;
  }
}
