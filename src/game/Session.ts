import { SessionPlayer } from './SessionPlayer';

enum State {
  Idle,
  Playing,
  GameOver,
}

export class Session {
  public primaryPlayer = new SessionPlayer();
  public secondaryPlayer = new SessionPlayer();
  public players: SessionPlayer[] = [];
  private startLevelNumber!: number;
  private endLevelNumber!: number;
  private currentLevelNumber!: number;
  private playtest!: boolean;
  private playerCount!: number;
  private seenIntro!: boolean;
  private state!: State;

  constructor() {
    this.players.push(
      this.primaryPlayer,
      this.secondaryPlayer,
      new SessionPlayer(),
      new SessionPlayer(),
    );

    this.reset();
  }

  public start(startLevelNumber: number, endLevelNumber: number): void {
    if (this.state !== State.Idle) {
      return;
    }

    this.startLevelNumber = startLevelNumber;
    this.endLevelNumber = endLevelNumber;
    this.currentLevelNumber = startLevelNumber;
    this.state = State.Playing;
  }

  public reset(): void {
    this.seenIntro = false;
    this.startLevelNumber = 1;
    this.currentLevelNumber = 1;
    this.endLevelNumber = 1;
    this.state = State.Idle;
    this.playtest = false;
    this.playerCount = 1;

    for (const player of this.players) {
      player.reset();
    }
  }

  public getPlayer(playerIndex: number): SessionPlayer {
    return this.players[playerIndex];
  }

  public getPlayers(): SessionPlayer[] {
    return this.players;
  }

  public isAnyPlayerAlive(): boolean {
    return this.players.slice(0, this.playerCount).some((player) => {
      return player.isAlive();
    });
  }

  public resetExceptIntro(): void {
    this.startLevelNumber = 1;
    this.currentLevelNumber = 1;
    this.endLevelNumber = 1;
    this.state = State.Idle;
    this.playtest = false;

    for (const player of this.players) {
      player.reset();
    }
  }

  public activateNextLevel(): void {
    this.currentLevelNumber += 1;

    for (const player of this.players) {
      player.completeLevel();
    }
  }

  public getMaxLevelPoints(): number {
    let maxPoints = 0;

    for (const player of this.players) {
      const points = player.getLevelPoints();
      if (points > maxPoints) {
        maxPoints = points;
      }
    }

    return maxPoints;
  }

  public getMaxGamePoints(): number {
    let maxPoints = 0;

    for (const player of this.players) {
      const points = player.getGamePoints();
      if (points > maxPoints) {
        maxPoints = points;
      }
    }

    return maxPoints;
  }

  public anybodyHasBonusPoints(): boolean {
    return this.players.some((player) => {
      return player.hasBonusPoints();
    });
  }

  public getLevelNumber(): number {
    return this.currentLevelNumber;
  }

  public getStartLevelNumber(): number {
    return this.startLevelNumber;
  }

  public isLastLevel(): boolean {
    return this.currentLevelNumber === this.endLevelNumber;
  }

  public setGameOver(): void {
    this.state = State.GameOver;
  }

  public isGameOver(): boolean {
    return this.state === State.GameOver;
  }

  public setSeenIntro(seenIntro: boolean): void {
    this.seenIntro = seenIntro;
  }

  public haveSeenIntro(): boolean {
    return this.seenIntro;
  }

  public setPlaytest(): void {
    this.playtest = true;
  }

  public resetPlaytest(): void {
    this.playtest = false;
  }

  public isPlaytest(): boolean {
    return this.playtest;
  }

  public setPlayerCount(count: number): void {
    this.playerCount = Math.min(Math.max(count, 1), this.players.length);
  }

  public getPlayerCount(): number {
    return this.playerCount;
  }

  public setMultiplayer(): void {
    this.setPlayerCount(2);
  }

  public isMultiplayer(): boolean {
    return this.playerCount > 1;
  }
}
