import { GamepadButtonCode } from '../core/input/GamepadButtonCode';
import { InputBinding } from '../core/input/InputBinding';
import { KeyboardButtonCode } from '../core/input/KeyboardButtonCode';
import { TouchButtonCode } from '../core/input/TouchButtonCode';

import { InputControl } from './InputControl';

// Suggested for single-player mode
export class PrimaryKeyboardInputBinding extends InputBinding {
  constructor() {
    super();

    this.setDefault(InputControl.Up, KeyboardButtonCode.Up);
    this.setDefault(InputControl.Down, KeyboardButtonCode.Down);
    this.setDefault(InputControl.Left, KeyboardButtonCode.Left);
    this.setDefault(InputControl.Right, KeyboardButtonCode.Right);
    this.setDefault(InputControl.Select, KeyboardButtonCode.Enter);
    this.setDefault(InputControl.PrimaryAction, KeyboardButtonCode.Z);
    this.setDefault(InputControl.SecondaryAction, KeyboardButtonCode.X);
    this.setDefault(InputControl.Rewind, KeyboardButtonCode.A);
    this.setDefault(InputControl.FastForward, KeyboardButtonCode.S);
    this.setDefault(InputControl.Back, KeyboardButtonCode.Escape);
  }
}

// Suggested for multi-player mode, first player, left side of the keyboard,
// because primary tank spawns on the left side of base
export class SecondaryKeyboardInputBinding extends InputBinding {
  constructor() {
    super();

    this.setDefault(InputControl.Up, KeyboardButtonCode.W);
    this.setDefault(InputControl.Down, KeyboardButtonCode.S);
    this.setDefault(InputControl.Left, KeyboardButtonCode.A);
    this.setDefault(InputControl.Right, KeyboardButtonCode.D);
    this.setDefault(InputControl.Select, KeyboardButtonCode.Space);
    this.setDefault(InputControl.PrimaryAction, KeyboardButtonCode.F);
    this.setDefault(InputControl.SecondaryAction, KeyboardButtonCode.G);
    this.setDefault(InputControl.Rewind, KeyboardButtonCode.R);
    this.setDefault(InputControl.FastForward, KeyboardButtonCode.T);
    this.setDefault(InputControl.Back, KeyboardButtonCode.Escape);
  }
}

// Suggested for multi-player mode, second player, right side of the keyboard,
// because secondary tank spawns on the right side of base
export class TertiaryKeyboardInputBinding extends InputBinding {
  constructor() {
    super();

    this.setDefault(InputControl.Up, KeyboardButtonCode.Up);
    this.setDefault(InputControl.Down, KeyboardButtonCode.Down);
    this.setDefault(InputControl.Left, KeyboardButtonCode.Left);
    this.setDefault(InputControl.Right, KeyboardButtonCode.Right);
    this.setDefault(InputControl.Select, KeyboardButtonCode.Enter);
    this.setDefault(InputControl.PrimaryAction, KeyboardButtonCode.K);
    this.setDefault(InputControl.SecondaryAction, KeyboardButtonCode.L);
    this.setDefault(InputControl.Rewind, KeyboardButtonCode.I);
    this.setDefault(InputControl.FastForward, KeyboardButtonCode.O);
    this.setDefault(InputControl.Back, KeyboardButtonCode.Escape);
  }
}

// Suggested for multi-player mode, third player (IJKL cluster)
export class QuaternaryKeyboardInputBinding extends InputBinding {
  constructor() {
    super();

    this.setDefault(InputControl.Up, KeyboardButtonCode.I);
    this.setDefault(InputControl.Down, KeyboardButtonCode.K);
    this.setDefault(InputControl.Left, KeyboardButtonCode.J);
    this.setDefault(InputControl.Right, KeyboardButtonCode.L);
    this.setDefault(InputControl.Select, KeyboardButtonCode.U);
    this.setDefault(InputControl.PrimaryAction, KeyboardButtonCode.U);
    this.setDefault(InputControl.SecondaryAction, KeyboardButtonCode.O);
  }
}

// Suggested for multi-player mode, fourth player (numpad)
export class QuinaryKeyboardInputBinding extends InputBinding {
  constructor() {
    super();

    this.setDefault(InputControl.Up, KeyboardButtonCode.Numpad8);
    this.setDefault(InputControl.Down, KeyboardButtonCode.Numpad2);
    this.setDefault(InputControl.Left, KeyboardButtonCode.Numpad4);
    this.setDefault(InputControl.Right, KeyboardButtonCode.Numpad6);
    this.setDefault(InputControl.Select, KeyboardButtonCode.Numpad5);
    this.setDefault(InputControl.PrimaryAction, KeyboardButtonCode.Numpad0);
    this.setDefault(InputControl.SecondaryAction, KeyboardButtonCode.NumpadDecimal);
  }
}

export class PrimaryGamepadInputBinding extends InputBinding {
  constructor() {
    super();

    this.setDefault(InputControl.Up, GamepadButtonCode.Up);
    this.setDefault(InputControl.Down, GamepadButtonCode.Down);
    this.setDefault(InputControl.Left, GamepadButtonCode.Left);
    this.setDefault(InputControl.Right, GamepadButtonCode.Right);
    this.setDefault(InputControl.Select, GamepadButtonCode.Start);
    this.setDefault(InputControl.PrimaryAction, GamepadButtonCode.X);
    this.setDefault(InputControl.SecondaryAction, GamepadButtonCode.Y);
    this.setDefault(InputControl.Rewind, GamepadButtonCode.A);
    this.setDefault(InputControl.FastForward, GamepadButtonCode.B);
  }
}

export class PrimaryTouchInputBinding extends InputBinding {
  constructor() {
    super();

    this.setDefault(InputControl.Up, TouchButtonCode.Up);
    this.setDefault(InputControl.Down, TouchButtonCode.Down);
    this.setDefault(InputControl.Left, TouchButtonCode.Left);
    this.setDefault(InputControl.Right, TouchButtonCode.Right);
    this.setDefault(InputControl.Select, TouchButtonCode.Select);
    this.setDefault(InputControl.PrimaryAction, TouchButtonCode.PrimaryAction);
    this.setDefault(InputControl.SecondaryAction, TouchButtonCode.SecondaryAction);
    this.setDefault(InputControl.Back, TouchButtonCode.Back);
  }
}

export class SecondaryGamepadInputBinding extends InputBinding {
  constructor() {
    super();

    this.setDefault(InputControl.Up, GamepadButtonCode.Up);
    this.setDefault(InputControl.Down, GamepadButtonCode.Down);
    this.setDefault(InputControl.Left, GamepadButtonCode.Left);
    this.setDefault(InputControl.Right, GamepadButtonCode.Right);
    this.setDefault(InputControl.Select, GamepadButtonCode.Start);
    this.setDefault(InputControl.PrimaryAction, GamepadButtonCode.X);
    this.setDefault(InputControl.SecondaryAction, GamepadButtonCode.Y);
    this.setDefault(InputControl.Rewind, GamepadButtonCode.A);
    this.setDefault(InputControl.FastForward, GamepadButtonCode.B);
  }
}
