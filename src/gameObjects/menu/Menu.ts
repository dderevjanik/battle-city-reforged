import { GameObject } from '../../core/GameObject';
import { Subject } from '../../core/Subject';
import { GameContext } from '../../game/GameUpdateArgs';
import { MenuInputContext } from '../../input/InputContexts';
import { _rendererScene } from '../../core/GameObjectRenderer';

import { MenuCursor } from './MenuCursor';
import { MenuItem } from './MenuItem';

export interface MenuOptions {
  initialIndex?: number;
  itemHeight?: number;
}

const DEFAULT_OPTIONS = {
  initialIndex: 0,
  itemHeight: 60,
};

const CURSOR_OFFSET = 96;
const ITEM_OFFSET = 16;

export class Menu extends GameObject {
  public focused = new Subject<number>();
  public selected = new Subject<number>();
  public back = new Subject<void>();
  private items: MenuItem[] = [];
  private options: MenuOptions;
  private cursor: MenuCursor = new MenuCursor();
  private focusedIndex = -1;
  private context!: GameContext;
  private prevPointerX = -1;
  private prevPointerY = -1;
  // Tracks wasDown per Phaser pointer id so each finger/button is independent
  private prevPointerStates = new Map<number, boolean>();

  constructor(options: MenuOptions = {}) {
    super();

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.focusedIndex = this.options.initialIndex!;
  }

  protected setup(context: GameContext): void {
    this.context = context;
  }

  public setItems(items: MenuItem[]): void {
    this.items = items;
    // TODO: dynamic width and height
    this.size.set(480, items.length * this.options.itemHeight!);
    this.updateMatrix();

    this.removeAllChildren();

    this.items.forEach((menuItem, index) => {
      menuItem.position.set(
        CURSOR_OFFSET,
        index * this.options.itemHeight! + ITEM_OFFSET,
      );
      this.add(menuItem);
    });

    this.add(this.cursor);

    this.focusItem(0);
  }

  public hideCursor(): void {
    this.cursor.setVisible(false);
  }

  public showCursor(): void {
    // Reset to default so it could be overriden by parent visibility
    this.cursor.setVisible(null);
  }

  public reset(): void {
    this.focusItem(0);
  }

  protected update(_deltaTime: number): void {
    const { inputManager } = this.context;

    const inputMethod = inputManager.getActiveMethod();

    if (inputMethod.isDownAny(MenuInputContext.VerticalPrev)) {
      this.focusPrev();
    }

    if (inputMethod.isDownAny(MenuInputContext.VerticalNext)) {
      this.focusNext();
    }

    if (inputMethod.isDownAny(MenuInputContext.Select)) {
      this.notifyItemSelected();
    }

    if (inputMethod.isDownAny(MenuInputContext.Back)) {
      this.back.notify();
    }

    this.items.forEach((menuItem, index) => {
      if (index === this.focusedIndex) {
        menuItem.updateFocused(this.context);
      }
    });

    this.updatePointerInput();
  }

  private updatePointerInput(): void {
    if (_rendererScene === null) return;

    const pointers: Phaser.Input.Pointer[] = _rendererScene.input.manager.pointers;

    const menuBox = this.getWorldBoundingBox();
    const itemHeight = this.options.itemHeight!;

    let anyMoved = false;
    let justReleasedIndex = -1;
    let hoveredIndex = -1;

    for (const pointer of pointers) {
      // Skip pointers that have never been used
      if (pointer.x === 0 && pointer.y === 0 && !pointer.isDown) continue;

      const px = pointer.x;
      const py = pointer.y;
      const id = pointer.id;
      const wasDown = this.prevPointerStates.get(id) ?? false;

      const moved = px !== this.prevPointerX || py !== this.prevPointerY;
      // Only fire on release, and only if this menu saw the press first
      // Ignore releases that originated on the touch gamepad overlay so that
      // tapping a virtual button never also triggers a menu selection.
      const eventTarget = (pointer.event?.target ?? null) as Element | null;
      const onTouchOverlay = eventTarget?.closest('.touch-gamepad') !== null;
      const justReleased = !pointer.isDown && wasDown && !onTouchOverlay;

      this.prevPointerStates.set(id, pointer.isDown);

      if (moved) {
        this.prevPointerX = px;
        this.prevPointerY = py;
        anyMoved = true;
      }

      // Find which row this pointer is over
      let idx = -1;
      this.items.forEach((item, index) => {
        if (!item.isFocusable()) return;
        const rowTop = menuBox.min.y + index * itemHeight;
        const rowBottom = rowTop + itemHeight;
        if (px >= menuBox.min.x && px <= menuBox.max.x && py >= rowTop && py < rowBottom) {
          idx = index;
        }
      });

      if (idx !== -1) hoveredIndex = idx;
      if (justReleased && idx !== -1) justReleasedIndex = idx;
    }

    if (anyMoved) {
      _rendererScene.game.canvas.style.cursor = hoveredIndex !== -1 ? 'pointer' : '';
    }

    if (anyMoved && hoveredIndex !== -1 && hoveredIndex !== this.focusedIndex) {
      this.focusItem(hoveredIndex);
    }

    if (justReleasedIndex !== -1) {
      this.focusItem(justReleasedIndex);
      const focusedItem = this.items[this.focusedIndex];
      if (!focusedItem?.pointerReleaseConsumed) {
        this.notifyItemSelected();
      }
    }
  }

  private focusItem(index: number): void {
    const prevFocusedItem = this.items[this.focusedIndex];
    if (prevFocusedItem !== undefined) {
      prevFocusedItem.unfocus();
    }

    if (index === -1) {
      this.focusedIndex = -1;
      this.hideCursor();
      return;
    }

    this.focusedIndex = index;
    this.showCursor();

    this.cursor.position.setY(this.options.itemHeight! * this.focusedIndex);
    this.cursor.updateMatrix(true);

    this.focused.notify(this.focusedIndex);

    const focusedItem = this.items[this.focusedIndex];
    focusedItem.focus();
  }

  private notifyItemSelected(): void {
    if (this.focusedIndex === -1) {
      return;
    }

    const focusedItem = this.items[this.focusedIndex];
    focusedItem.select();

    this.selected.notify(this.focusedIndex);
  }

  private focusPrev(): void {
    const prevIndex = this.getPrevFocusableIndex();
    this.focusItem(prevIndex);
  }

  private focusNext(): void {
    const nextIndex = this.getNextFocusableIndex();
    this.focusItem(nextIndex);
  }

  private getPrevFocusableIndex(): number {
    if (!this.hasFocusableItems()) {
      return -1;
    }

    let prevIndex = this.focusedIndex;
    let prevItem = null;

    do {
      prevIndex -= 1;
      if (prevIndex < 0) {
        prevIndex = this.items.length - 1;
      }
      prevItem = this.items[prevIndex];
    } while (prevItem.isFocusable() === false);

    return prevIndex;
  }

  private getNextFocusableIndex(): number {
    if (!this.hasFocusableItems()) {
      return -1;
    }

    let nextIndex = this.focusedIndex;
    let nextItem = null;

    do {
      nextIndex += 1;
      if (nextIndex > this.items.length - 1) {
        nextIndex = 0;
      }
      nextItem = this.items[nextIndex];
    } while (nextItem.isFocusable() === false);

    return nextIndex;
  }

  private hasFocusableItems(): boolean {
    return this.items.some((item) => item.isFocusable());
  }
}
