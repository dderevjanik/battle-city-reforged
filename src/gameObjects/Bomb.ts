import { GameObject } from "../core/GameObject";
import { SpritePainter } from "../core/painters/SpritePainter";
import { GameContext } from "../game/GameUpdateArgs";
import { BombState, initBomb, stepBomb } from "../sim/bomb";
import * as config from "../config";

import { BombBlast } from "./BombBlast";
import { Explosion } from "./Explosion";

const BOMB_WIDTH = 64;
const BOMB_HEIGHT = 32;

export class Bomb extends GameObject {
  public painter = new SpritePainter();
  public zIndex = config.BOMB_Z_INDEX;
  private state: BombState = initBomb();

  constructor(private readonly ownerPartyIndex: number) {
    super(BOMB_WIDTH, BOMB_HEIGHT);
    this.pivot.set(0.5, 0.5);
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.painter.sprite = spriteLoader.load("bomb");
  }

  protected update(deltaTime: number): void {
    const decision = stepBomb(this.state);
    this.state = decision.state;
    this.painter.opacity = decision.opacity;
    if (decision.detonate) this.detonate();
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
