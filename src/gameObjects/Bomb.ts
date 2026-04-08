import { GameObject } from "../core/GameObject";
import { Timer } from "../core/Timer";
import { SpritePainter } from "../core/painters/SpritePainter";
import { GameContext } from "../game/GameUpdateArgs";
import * as config from "../config";

import { BombBlast } from "./BombBlast";
import { Explosion } from "./Explosion";

const BOMB_WIDTH = 64;
const BOMB_HEIGHT = 32;
const DETONATE_DELAY = 2;
const BLINK_INTERVAL = 0.25;
const BLINK_INTERVAL_FAST = 0.1;
const BLINK_FAST_THRESHOLD = 1;

export class Bomb extends GameObject {
  public painter = new SpritePainter();
  public zIndex = config.BOMB_Z_INDEX;
  private detonateTimer = new Timer(DETONATE_DELAY);
  private blinkTimer = new Timer(BLINK_INTERVAL);
  private blinkVisible = true;

  constructor(private readonly ownerPartyIndex: number) {
    super(BOMB_WIDTH, BOMB_HEIGHT);
    this.pivot.set(0.5, 0.5);
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.painter.sprite = spriteLoader.load("bomb");
  }

  protected update(deltaTime: number): void {
    this.detonateTimer.update(deltaTime);
    this.blinkTimer.update(deltaTime);

    if (this.blinkTimer.isDone()) {
      this.blinkVisible = !this.blinkVisible;
      this.painter.opacity = this.blinkVisible ? 1 : 0;
      const isFinalSecond =
        this.detonateTimer.timeLeft !== null &&
        this.detonateTimer.timeLeft < BLINK_FAST_THRESHOLD;
      this.blinkTimer.reset(
        isFinalSecond ? BLINK_INTERVAL_FAST : BLINK_INTERVAL,
      );
    }

    if (this.detonateTimer.isDone()) {
      this.detonate();
    }
  }

  private detonate(): void {
    const center = this.getCenter();

    const explosion = new Explosion();
    explosion.updateMatrix();
    explosion.setCenter(center);
    this.parent!.add(explosion);

    const blast = new BombBlast(this.ownerPartyIndex);
    this.parent!.add(blast);
    blast.updateMatrix();
    blast.setCenter(center);
    blast.updateMatrix();

    this.removeSelf();
  }
}
