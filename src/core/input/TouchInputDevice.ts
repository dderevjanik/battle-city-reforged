import { TouchButtonCode } from './TouchButtonCode';
import { InputDevice } from './InputDevice';

interface ButtonConfig {
  code: TouchButtonCode;
  label: string;
  className: string;
}

const DPAD_BUTTONS: ButtonConfig[] = [
  { code: TouchButtonCode.Up, label: '▲', className: 'touch-btn-up' },
  { code: TouchButtonCode.Down, label: '▼', className: 'touch-btn-down' },
  { code: TouchButtonCode.Left, label: '◄', className: 'touch-btn-left' },
  { code: TouchButtonCode.Right, label: '►', className: 'touch-btn-right' },
];

const ACTION_BUTTONS: ButtonConfig[] = [
  { code: TouchButtonCode.PrimaryAction, label: 'FIRE', className: 'touch-btn-fire' },
  { code: TouchButtonCode.SecondaryAction, label: 'SEC', className: 'touch-btn-secondary' },
  { code: TouchButtonCode.Select, label: 'START', className: 'touch-btn-select' },
  { code: TouchButtonCode.Back, label: 'BACK', className: 'touch-btn-back' },
];

export class TouchInputDevice implements InputDevice {
  private overlay: HTMLElement;
  private pressedCodes: Set<number> = new Set();
  private prevPressedCodes: Set<number> = new Set();

  private downCodes: number[] = [];
  private holdCodes: number[] = [];
  private upCodes: number[] = [];

  private isListening = false;

  constructor() {
    this.overlay = this.buildOverlay();
    document.body.appendChild(this.overlay);
    this.suppressBrowserZoomGestures();
  }

  // iOS Safari ignores `user-scalable=no` since iOS 10, so the viewport tag
  // alone does not block pinch or double-tap zoom on the canvas. These document
  // listeners cover what the meta tag can't.
  private suppressBrowserZoomGestures(): void {
    // iOS-only gesture events fire for pinch/rotate before any pointer events.
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);

    // Double-tap zoom: dedupe a second touchend that lands within 350ms of the
    // first. Passive must be false so preventDefault is honoured.
    let lastTouchEnd = 0;
    document.addEventListener(
      'touchend',
      (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 350) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      },
      { passive: false },
    );
  }

  public isConnected(): boolean {
    return true;
  }

  public listen(): void {
    if (this.isListening) return;
    this.isListening = true;
    this.overlay.style.display = 'flex';
  }

  public unlisten(): void {
    if (!this.isListening) return;
    this.isListening = false;
    this.overlay.style.display = 'none';
  }

  public update(): void {
    const downCodes: number[] = [];
    const holdCodes: number[] = [];
    const upCodes: number[] = [];

    for (const code of this.pressedCodes) {
      if (!this.prevPressedCodes.has(code)) {
        downCodes.push(code);
      } else {
        holdCodes.push(code);
      }
    }

    for (const code of this.prevPressedCodes) {
      if (!this.pressedCodes.has(code)) {
        upCodes.push(code);
      }
    }

    this.downCodes = downCodes;
    this.holdCodes = holdCodes;
    this.upCodes = upCodes;

    this.prevPressedCodes = new Set(this.pressedCodes);
  }

  public getDownCodes(): number[] {
    return this.downCodes;
  }

  public getHoldCodes(): number[] {
    return this.holdCodes;
  }

  public getUpCodes(): number[] {
    return this.upCodes;
  }

  private buildOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'touch-gamepad';
    overlay.style.display = 'none';

    const dpad = document.createElement('div');
    dpad.className = 'touch-dpad';
    const dpadButtons: Array<{ code: number; element: HTMLElement }> = [];
    for (const btn of DPAD_BUTTONS) {
      const element = this.createButtonElement(btn);
      dpad.appendChild(element);
      dpadButtons.push({ code: btn.code, element });
    }
    // d-pad uses container-level hit-testing so a thumb sliding from one
    // direction to another smoothly switches the active code.
    this.attachSlidingHandlers(dpad, dpadButtons);

    const actions = document.createElement('div');
    actions.className = 'touch-actions';
    for (const btn of ACTION_BUTTONS) {
      const element = this.createButtonElement(btn);
      actions.appendChild(element);
      // action buttons use isolated per-button capture: sliding off Fire
      // shouldn't accidentally trigger Secondary/Start/Back.
      this.attachIsolatedHandlers(element, btn.code);
    }

    overlay.appendChild(dpad);
    overlay.appendChild(actions);

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    return overlay;
  }

  private createButtonElement(config: ButtonConfig): HTMLElement {
    const btn = document.createElement('button');
    btn.className = `touch-btn ${config.className}`;
    btn.textContent = config.label;
    btn.setAttribute('aria-label', config.label);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    return btn;
  }

  private attachIsolatedHandlers(element: HTMLElement, code: number): void {
    element.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      element.setPointerCapture(e.pointerId);
      this.pressedCodes.add(code);
      element.classList.add('pressed');
    });
    const release = (e: PointerEvent) => {
      e.preventDefault();
      this.pressedCodes.delete(code);
      element.classList.remove('pressed');
    };
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
  }

  private attachSlidingHandlers(
    container: HTMLElement,
    buttons: Array<{ code: number; element: HTMLElement }>,
  ): void {
    // Per-pointer mapping so multitouch on the d-pad (rare but possible)
    // doesn't release a sibling's code when one finger lifts.
    const activeByPointer = new Map<number, number>();

    const codeAt = (clientX: number, clientY: number): number | null => {
      for (const { code, element } of buttons) {
        const rect = element.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return code;
        }
      }
      return null;
    };

    const updateVisuals = () => {
      const held = new Set(activeByPointer.values());
      for (const { code, element } of buttons) {
        element.classList.toggle('pressed', held.has(code));
      }
    };

    const setPointerCode = (pointerId: number, nextCode: number | null) => {
      const prev = activeByPointer.get(pointerId);
      if (prev === nextCode || (prev === undefined && nextCode === null)) return;

      if (prev !== undefined) {
        // Only release the code from pressedCodes if no other pointer holds it.
        let stillHeld = false;
        for (const [otherId, otherCode] of activeByPointer) {
          if (otherId !== pointerId && otherCode === prev) {
            stillHeld = true;
            break;
          }
        }
        if (!stillHeld) this.pressedCodes.delete(prev);
      }

      if (nextCode !== null) {
        this.pressedCodes.add(nextCode);
        activeByPointer.set(pointerId, nextCode);
      } else {
        activeByPointer.delete(pointerId);
      }

      updateVisuals();
    };

    container.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      container.setPointerCapture(e.pointerId);
      setPointerCode(e.pointerId, codeAt(e.clientX, e.clientY));
    });

    container.addEventListener('pointermove', (e) => {
      if (!activeByPointer.has(e.pointerId)) return;
      e.preventDefault();
      setPointerCode(e.pointerId, codeAt(e.clientX, e.clientY));
    });

    const release = (e: PointerEvent) => {
      if (!activeByPointer.has(e.pointerId)) return;
      e.preventDefault();
      setPointerCode(e.pointerId, null);
    };
    container.addEventListener('pointerup', release);
    container.addEventListener('pointercancel', release);
  }
}
