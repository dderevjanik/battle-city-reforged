import { GameObject, Scene, SceneNavigator, SceneParams } from '../core';
import { GameContext } from '../game';
import * as config from '../config';

export abstract class GameScene<
  T extends SceneParams = {},
> extends Scene<T> {
  protected root: GameObject;
  protected context: GameContext;
  private needsSetup = true;

  constructor(navigator: SceneNavigator, params: T) {
    super(navigator, params);
  }

  public getRoot(): GameObject {
    return this.root;
  }

  public invokeUpdate(context: GameContext, deltaTime: number): void {
    if (this.needsSetup === true) {
      this.needsSetup = false;
      this.context = context;
      this.root = this.createRoot();
      this.root.invokeUpdate(context, deltaTime);
      this.setup(context);
    }

    this.update(deltaTime);
  }

  protected abstract setup(context: GameContext): void;

  protected update(deltaTime: number): void {
    this.root.traverseDescedants((child) => {
      child.invokeUpdate(this.context, deltaTime);
    });
  }

  protected createRoot(): GameObject {
    const root = new GameObject();
    root.size.set(config.CANVAS_WIDTH, config.CANVAS_HEIGHT);
    root.updateMatrix();
    return root;
  }
}
