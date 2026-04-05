import { TankColor } from './TankTypes';

const PLAYER_COLORS = [
  TankColor.Primary,
  TankColor.Secondary,
  TankColor.Default,
  TankColor.Danger,
];

export class TankColorFactory {
  public static createPlayerColor(playerIndex: number): TankColor {
    return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
  }
}
