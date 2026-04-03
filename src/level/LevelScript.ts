import { GameContext, Session } from '../game';
import { MapConfig } from '../map';

import { LevelEventBus } from './LevelEventBus';
import { LevelWorld } from './LevelWorld';

export abstract class LevelScript {
  protected world: LevelWorld;
  protected eventBus: LevelEventBus;
  protected session: Session;
  protected mapConfig: MapConfig;
  protected enabled = true;
  private needsSetup = true;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public enable(): void {
    this.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
  }

  public invokeInit(
    world: LevelWorld,
    eventBus: LevelEventBus,
    session: Session,
    mapConfig: MapConfig,
  ): void {
    this.world = world;
    this.eventBus = eventBus;
    this.session = session;
    this.mapConfig = mapConfig;

    this.init();
  }

  public invokeUpdate(context: GameContext, deltaTime: number): void {
    if (this.enabled === false) {
      return;
    }

    if (this.needsSetup === true) {
      this.needsSetup = false;
      this.setup(context);
    }

    this.update(deltaTime);
  }

  protected init(): void {
    // Virtual
  }

  protected setup(context?: GameContext): void {
    // Virtual
  }

  protected update(deltaTime?: number): void {
    // Virtual
  }
}
