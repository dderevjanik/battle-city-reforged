import { Collider, Collision } from './collision';

import { RenderObject } from './RenderObject';

export class GameObject extends RenderObject {
  public collider: Collider = null;
  public ignorePause = false;
  public tags: string[] = [];

  private needsSetup = true;

  public invokeUpdate(...args: any[]): void {
    if (this.needsSetup === true) {
      this.needsSetup = false;
      this.setup(...args);
      this.updateMatrix();
      this.updateWorldVisible(true);
      this.updateWorldZIndex(true);
    }

    this.update(...args);
  }

  public invokeCollide(collision: Collision): void {
    // Can't collide if not setup yet
    if (this.needsSetup === true) {
      return;
    }

    this.collide(collision);
  }

  protected hasBeenSetup(): boolean {
    return !this.needsSetup;
  }

  protected setup(...args: any[]): void {
    return undefined;
  }

  protected update(...args: any[]): void {
    return undefined;
  }

  protected collide(collision: Collision): void {
    return undefined;
  }

}
