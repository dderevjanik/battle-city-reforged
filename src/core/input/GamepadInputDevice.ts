import * as Phaser from 'phaser';

import { InputDevice } from './InputDevice';

export class GamepadInputDevice implements InputDevice {
  private readonly gamepadPlugin: Phaser.Input.Gamepad.GamepadPlugin;
  private readonly deviceIndex: number;

  private isListening = false;
  private downCodes: number[] = [];
  private holdCodes: number[] = [];
  private upCodes: number[] = [];

  constructor(
    gamepadPlugin: Phaser.Input.Gamepad.GamepadPlugin,
    deviceIndex: number,
  ) {
    this.gamepadPlugin = gamepadPlugin;
    this.deviceIndex = deviceIndex;
  }

  public isConnected(): boolean {
    return this.getPad() !== null;
  }

  public listen(): void {
    this.isListening = true;
  }

  public unlisten(): void {
    this.isListening = false;
  }

  public update(): void {
    if (!this.isListening) {
      return;
    }

    const pad = this.getPad();
    if (pad === null) {
      return;
    }

    const codes: number[] = [];

    for (let i = 0; i < pad.buttons.length; i += 1) {
      if (pad.buttons[i].pressed) {
        codes.push(i);
      }
    }

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

  private getPad(): Phaser.Input.Gamepad.Gamepad | null {
    const gamepads = this.gamepadPlugin.gamepads;
    return gamepads[this.deviceIndex] ?? null;
  }
}
