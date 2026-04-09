import { GameObject } from '../../core/GameObject';
import { Subject } from '../../core/Subject';
import { GameContext } from '../../game/GameUpdateArgs';

export abstract class MenuItem extends GameObject {
  public focused = new Subject();
  public unfocused = new Subject();
  public selected = new Subject();
  protected focusable = true;
  public isFocused = false;

  public updateFocused(context?: GameContext): void {
    // Virtual
  }

  public setFocusable(focusable: boolean): void {
    this.focusable = focusable;
  }

  public isFocusable(): boolean {
    return this.focusable;
  }

  public focus(): void {
    this.isFocused = true;
    this.focused.notify(null);
  }

  public unfocus(): void {
    this.isFocused = false;
    this.unfocused.notify(null);
  }

  public select(): void {
    this.selected.notify(null);
  }

  // Set to true by subclasses when they fully handle a pointer release so that
  // the parent Menu skips calling select() for the same event.
  public pointerReleaseConsumed = false;
}
