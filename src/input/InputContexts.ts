import { InputContext } from './InputContext';
import { InputControl } from './InputControl';

export const EditorControlsInputContext: InputContext = {
  Skip: [InputControl.Select, InputControl.PrimaryAction],
};

export const EditorMapInputContext: InputContext = {
  MoveUp: [InputControl.Up],
  MoveDown: [InputControl.Down],
  MoveLeft: [InputControl.Left],
  MoveRight: [InputControl.Right],
  Draw: [InputControl.PrimaryAction],
  Erase: [InputControl.SecondaryAction],
  NextBrush: [InputControl.FastForward],
  PrevBrush: [InputControl.Rewind],
  Menu: [InputControl.Select],
};

export const LevelControlsInputContext: InputContext = {
  Continue: [InputControl.Select, InputControl.PrimaryAction],
};

export const LevelPlayInputContext: InputContext = {
  MoveUp: [InputControl.Up],
  MoveDown: [InputControl.Down],
  MoveLeft: [InputControl.Left],
  MoveRight: [InputControl.Right],
  Fire: [InputControl.PrimaryAction],
  RapidFire: [InputControl.SecondaryAction],
  Pause: [InputControl.Select],
};

export const LevelScoreInputContext: InputContext = {
  Skip: [InputControl.Select, InputControl.PrimaryAction],
};

export const LevelSelectionInputContext: InputContext = {
  Next: [InputControl.Right],
  Prev: [InputControl.Left],
  FastNext: [InputControl.Up],
  FastPrev: [InputControl.Down],
  Select: [InputControl.Select, InputControl.PrimaryAction],
};

export const MenuInputContext: InputContext = {
  VerticalPrev: [InputControl.Up],
  VerticalNext: [InputControl.Down],
  HorizontalNext: [InputControl.Right],
  HorizontalPrev: [InputControl.Left],
  Skip: [InputControl.PrimaryAction, InputControl.Select],
  Select: [InputControl.PrimaryAction, InputControl.Select],
};
