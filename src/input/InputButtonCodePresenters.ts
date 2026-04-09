export interface InputButtonCodePresenter {
  asString(code: number): string;
}

export class KeyboardButtonCodePresenter implements InputButtonCodePresenter {
  public asString(code: number): string {
    // Numbers 0-9
    if (code >= 48 && code <= 57) {
      const numberCharacter = String.fromCharCode(code);
      return numberCharacter;
    }

    // English alphabet characters a-z (lower-case)
    if (code >= 65 && code <= 90) {
      const alphabetCharacter = String.fromCharCode(code).toUpperCase();
      return alphabetCharacter;
    }

    // Num lock numbers 0-9
    if (code >= 96 && code <= 105) {
      const number = code - 96;
      return `NUM ${number}`;
    }

    switch (code) {
      case 9:
        return 'TAB';
      case 13:
        return 'ENTER';
      case 16:
        return 'SHIFT';
      case 17:
        return 'CTRL';
      case 18:
        return 'ALT';
      case 20:
        return 'CAPS';
      case 32:
        return 'SPACE';
      case 32:
        return 'HOME';
      case 33:
        return 'PAGE UP';
      case 34:
        return 'PAGE DOWN';
      case 35:
        return 'END';
      case 37:
        return 'ARROW LEFT';
      case 38:
        return 'ARROW UP';
      case 39:
        return 'ARROW RIGHT';
      case 40:
        return 'ARROW DOWN';
    }

    return `KB[${code}]`;
  }
}

export class GamepadButtonCodePresenter implements InputButtonCodePresenter {
  public asString(code: number): string {
    switch (code) {
      case 0:
        return 'A';
      case 1:
        return 'B';
      case 2:
        return 'X';
      case 3:
        return 'Y';
      case 4:
        return 'LB';
      case 5:
        return 'RB';
      case 6:
        return 'LT';
      case 7:
        return 'RT';
      case 8:
        return 'SELECT/BACK';
      case 9:
        return 'START';
      case 10:
        return 'LEFT AXIS';
      case 11:
        return 'RIGHT AXIS';
      case 12:
        return 'D-UP';
      case 13:
        return 'D-DOWN';
      case 14:
        return 'D-LEFT';
      case 15:
        return 'D-RIGHT';
    }

    return `GP[${code}]`;
  }
}

export class TouchButtonCodePresenter implements InputButtonCodePresenter {
  public asString(code: number): string {
    switch (code) {
      case 2000:
        return 'TOUCH UP';
      case 2001:
        return 'TOUCH DOWN';
      case 2002:
        return 'TOUCH LEFT';
      case 2003:
        return 'TOUCH RIGHT';
      case 2004:
        return 'TOUCH FIRE';
      case 2005:
        return 'TOUCH SEC';
      case 2006:
        return 'TOUCH START';
      case 2007:
        return 'TOUCH BACK';
    }

    return `TOUCH[${code}]`;
  }
}
