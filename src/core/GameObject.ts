import { BoundingBox } from './BoundingBox';
import { Collider, Collision } from './collision';
import { Matrix3 } from './Matrix3';
import { Painter } from './painters';
import { Size } from './Size';
import { MathUtils } from './utils';
import { Vector } from './Vector';

// -1 is because coordinate system start is at top left
const X_AXIS = new Vector(1, 0);
const Y_AXIS = new Vector(0, -1);

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
  public parent: this = null;
  public removedChildren: this[] = [];
  public isRemoved = false;

  public add(...childrenToAdd): this {
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

  public remove(childToRemove, addToRemoved = true): boolean {
    const index = this.children.indexOf(childToRemove);

    if (index === -1) {
      return false;
    }

    if (addToRemoved) {
      childToRemove.isRemoved = true;
      this.removedChildren.push(childToRemove);
    }

    this.children.splice(index, 1);

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
    const nodes = [];

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

  public painter: Painter = null;

  protected zIndex: number = null;
  protected worldZIndex: number = null;

  protected visible: boolean = null;
  protected worldVisible: boolean = null;

  public canRender(): boolean {
    if (this.painter === null) {
      return false;
    }
    if (this.getWorldVisible() === false) {
      return false;
    }
    return true;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.updateWorldVisible(true);
  }

  public getVisible(): boolean {
    return this.visible;
  }

  public getWorldVisible(): boolean {
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

  public getZIndex(): number {
    return this.zIndex;
  }

  public getWorldZIndex(): number {
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

  // --- Game lifecycle ---

  public collider: Collider = null;
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
