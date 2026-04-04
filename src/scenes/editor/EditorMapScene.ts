import { DebugCollisionMenu } from '../../debug/DebugCollisionMenu';
import { GameContext } from '../../game/GameUpdateArgs';
import { EditorBorder } from '../../gameObjects/editor/EditorBorder';
import { EditorField } from '../../gameObjects/editor/EditorField';
import { EditorMap } from '../../gameObjects/editor/EditorMap';
import { EditorMapInputContext } from '../../input/InputContexts';
import { MapConfig } from '../../map/MapConfig';
import * as config from '../../config';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

import { EditorLocationParams } from './EditorLocationParams';

export class EditorMapScene extends GameScene<EditorLocationParams> {
  private field!: EditorField;
  private map!: EditorMap;
  private mapConfig!: MapConfig;
  private debugCollisionMenu!: DebugCollisionMenu;

  protected setup({ collisionSystem }: GameContext): void {

    this.debugCollisionMenu = new DebugCollisionMenu(
      collisionSystem,
      this.root,
      { top: 400 },
    );
    if (config.IS_DEV) {
      this.debugCollisionMenu.attach();
      this.debugCollisionMenu.show();
    }

    this.root.add(new EditorBorder());

    this.mapConfig = this.params.mapConfig;

    this.map = new EditorMap(this.mapConfig);
    this.map.position.set(
      config.BORDER_LEFT_WIDTH,
      config.BORDER_TOP_BOTTOM_HEIGHT,
    );
    this.root.add(this.map);

    this.field = new EditorField(this.mapConfig.getFieldWidth(), this.mapConfig.getFieldHeight());
    this.field.position.set(
      config.BORDER_LEFT_WIDTH,
      config.BORDER_TOP_BOTTOM_HEIGHT,
    );
    this.root.add(this.field);
  }

  protected onUpdate(deltaTime: number): void {
    const { collisionSystem, inputManager } = this.context;

    const inputMethod = inputManager.getActiveMethod();

    if (inputMethod.isDownAny(EditorMapInputContext.Menu)) {
      this.navigator.replace(GameSceneType.EditorMenu, this.params);
      return;
    }

    super.onUpdate(deltaTime);

    // Update all transforms before checking collisions
    this.root.updateWorldMatrix(false, true);

    collisionSystem.update();

    if (config.IS_DEV) {
      this.debugCollisionMenu.update();
    }

    collisionSystem.collide();
  }
}
