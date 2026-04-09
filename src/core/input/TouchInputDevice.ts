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

    for (const btn of DPAD_BUTTONS) {
      dpad.appendChild(this.createButton(btn));
    }

    const actions = document.createElement('div');
    actions.className = 'touch-actions';

    for (const btn of ACTION_BUTTONS) {
      actions.appendChild(this.createButton(btn));
    }

    overlay.appendChild(dpad);
    overlay.appendChild(actions);

    return overlay;
  }

  private createButton(config: ButtonConfig): HTMLElement {
    const btn = document.createElement('button');
    btn.className = `touch-btn ${config.className}`;
    btn.textContent = config.label;
    btn.setAttribute('aria-label', config.label);

    const code = config.code;

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      this.pressedCodes.add(code);
    });

    btn.addEventListener('pointerup', (e) => {
      e.preventDefault();
      this.pressedCodes.delete(code);
    });

    btn.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      this.pressedCodes.delete(code);
    });

    return btn;
  }
}
