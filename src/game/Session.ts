import { Difficulty } from './Difficulty';
import { GameSettings } from './GameSettings';
import { RunState } from './RunState';
import { SessionPlayer } from './SessionPlayer';

/**
 * Coordinates the player roster, the current run (`run`), and persistent
 * mode settings (`settings`). New code should reach for `session.run` or
 * `session.settings` directly when it only needs one slice; the legacy
 * delegating methods on Session are kept so existing call sites still work.
 */
export class Session {
  public primaryPlayer = new SessionPlayer();
  public secondaryPlayer = new SessionPlayer();
  public players: SessionPlayer[] = [];
  public readonly settings: GameSettings;
  public readonly run: RunState;

  constructor() {
    this.players.push(
      this.primaryPlayer,
      this.secondaryPlayer,
      new SessionPlayer(),
      new SessionPlayer(),
    );

    this.settings = new GameSettings(this.players.length);
    this.run = new RunState();

    this.reset();
  }

  public start(startLevelNumber: number, endLevelNumber: number): void {
    this.run.start(startLevelNumber, endLevelNumber);
  }

  public reset(): void {
    this.settings.reset();
    this.run.reset();

    for (const player of this.players) {
      player.reset();
    }
  }

  public resetExceptIntro(): void {
    const seenIntro = this.settings.haveSeenIntro();
    this.reset();
    this.settings.setSeenIntro(seenIntro);
  }

  public getPlayer(playerIndex: number): SessionPlayer {
    return this.players[playerIndex];
  }

  public getPlayers(): SessionPlayer[] {
    return this.players;
  }

  public isAnyPlayerAlive(): boolean {
    return this.players.slice(0, this.settings.getPlayerCount()).some((player) => {
      return player.isAlive();
    });
  }

  public activateNextLevel(): void {
    this.run.activateNextLevel(this.players);
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

  // ---------------------------------------------------------------------------
  // Delegating shims — preserve the legacy flat API so existing call sites
  // don't need to change. New code should use `session.run.*` and
  // `session.settings.*` directly.
  // ---------------------------------------------------------------------------

  public getLevelNumber(): number {
    return this.run.getLevelNumber();
  }
  public getStartLevelNumber(): number {
    return this.run.getStartLevelNumber();
  }
  public isLastLevel(): boolean {
    return this.run.isLastLevel();
  }
  public setGameOver(): void {
    this.run.setGameOver();
  }
  public isGameOver(): boolean {
    return this.run.isGameOver();
  }
  public setSeenIntro(seenIntro: boolean): void {
    this.settings.setSeenIntro(seenIntro);
  }
  public haveSeenIntro(): boolean {
    return this.settings.haveSeenIntro();
  }
  public setPlaytest(): void {
    this.settings.setPlaytest();
  }
  public resetPlaytest(): void {
    this.settings.resetPlaytest();
  }
  public isPlaytest(): boolean {
    return this.settings.isPlaytest();
  }
  public setDemo(enabled: boolean): void {
    this.settings.setDemo(enabled);
  }
  public isDemo(): boolean {
    return this.settings.isDemo();
  }
  public setPlayerCount(count: number): void {
    this.settings.setPlayerCount(count);
  }
  public getPlayerCount(): number {
    return this.settings.getPlayerCount();
  }
  public setMultiplayer(): void {
    this.settings.setPlayerCount(2);
  }
  public isMultiplayer(): boolean {
    return this.settings.isMultiplayer();
  }
  public setDifficulty(difficulty: Difficulty): void {
    this.settings.setDifficulty(difficulty);
  }
  public getDifficulty(): Difficulty {
    return this.settings.getDifficulty();
  }
  public setEnemyPowerupsEnabled(enabled: boolean): void {
    this.settings.setEnemyPowerupsEnabled(enabled);
  }
  public isEnemyPowerupsEnabled(): boolean {
    return this.settings.isEnemyPowerupsEnabled();
  }
  public setFriendlyFireEnabled(enabled: boolean): void {
    this.settings.setFriendlyFireEnabled(enabled);
  }
  public isFriendlyFireEnabled(): boolean {
    return this.settings.isFriendlyFireEnabled();
  }
}
