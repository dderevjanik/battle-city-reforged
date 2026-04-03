import Phaser from 'phaser';

import { InputDevice } from './InputDevice';

export class KeyboardInputDevice implements InputDevice {
  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin;

  private listenedDownCodes: number[] = [];

  private downCodes: number[] = [];
  private holdCodes: number[] = [];
  private upCodes: number[] = [];

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.keyboard = keyboard;
  }

  public isConnected(): boolean {
    return true;
  }

  public listen(): void {
    this.keyboard.on('keydown', this.handleKeyDown, this);
    this.keyboard.on('keyup', this.handleKeyUp, this);
  }

  public unlisten(): void {
    this.keyboard.off('keydown', this.handleKeyDown, this);
    this.keyboard.off('keyup', this.handleKeyUp, this);
  }

  public update(): void {
    const codes = this.listenedDownCodes;

    const downCodes = [];
    const holdCodes = [];

    for (const code of codes) {
      if (!this.downCodes.includes(code) && !this.holdCodes.includes(code)) {
        downCodes.push(code);
      }

      if (this.downCodes.includes(code) || this.holdCodes.includes(code)) {
        holdCodes.push(code);
      }
    }

    const upCodes = [];

    for (const code of this.downCodes) {
      if (!codes.includes(code)) {
        upCodes.push(code);
      }
    }

    for (const code of this.holdCodes) {
      if (!codes.includes(code)) {
        upCodes.push(code);
      }
    }

    this.downCodes = downCodes;
    this.holdCodes = holdCodes;
    this.upCodes = upCodes;
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

  private handleKeyDown = (event: KeyboardEvent): void => {
    const { keyCode } = event;

    if (!this.listenedDownCodes.includes(keyCode)) {
      this.listenedDownCodes.push(keyCode);
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const { keyCode } = event;

    const index = this.listenedDownCodes.indexOf(keyCode);
    if (index !== -1) {
      this.listenedDownCodes.splice(index, 1);
    }
  };
}
