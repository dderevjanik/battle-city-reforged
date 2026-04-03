import { GameObject, Subject } from '../../core';
import { GameUpdateArgs } from '../../game';

export abstract class MenuItem extends GameObject {
  public focused = new Subject();
  public unfocused = new Subject();
  public selected = new Subject();
  protected focusable = true;
  public isFocused = false;

  public updateFocused(updateArgs?: GameUpdateArgs): void {
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
}
