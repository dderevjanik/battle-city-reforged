import { GameObject } from '../../core/GameObject';
import { RectPainter } from '../../core/painters/RectPainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { EditorInputHint } from '../../gameObjects/EditorInputHint';
import { SceneInputHint } from '../../gameObjects/text/SceneInputHint';
import { SpriteText } from '../../gameObjects/text/SpriteText';
import { EditorControlsInputContext } from '../../input/InputContexts';
import * as config from '../../config';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

import { EditorLocationParams } from './EditorLocationParams';

export class EditorControlsScene extends GameScene<EditorLocationParams> {
  private background!: GameObject;
  private title!: SpriteText;
  private editorHint!: EditorInputHint;
  private continueHint!: GameObject;

  protected setup({ inputHintSettings, inputManager }: GameContext): void {
    inputHintSettings.setSeenEditorHint();

    const activeBindingType = inputManager.getActiveBindingType();

    this.background = new GameObject();
    this.background.size.copyFrom(this.root.size);
    this.background.painter = new RectPainter(config.COLOR_GRAY);
    this.root.add(this.background);

    this.title = new SpriteText('CONTROLS', {
      color: config.COLOR_YELLOW,
    });
    this.title.origin.set(0.5, 0.5);
    this.title.setCenterX(this.root.getSelfCenter().x);
    this.title.position.setY(64);
    this.root.add(this.title);

    this.editorHint = new EditorInputHint(activeBindingType);
    this.editorHint.position.setY(200);
    this.root.add(this.editorHint);

    const continueDisplayedCode = inputManager.getDisplayedControlCode(
      activeBindingType,
      EditorControlsInputContext.Skip[0],
    );
    this.continueHint = new SceneInputHint(
      `${continueDisplayedCode} TO CONTINUE`,
    );
    this.root.add(this.continueHint);
  }

  protected onUpdate(deltaTime: number): void {
    const { inputManager } = this.context;

    const inputMethod = inputManager.getActiveMethod();

    if (inputMethod.isDownAny(EditorControlsInputContext.Skip)) {
      // Forward params
      this.navigator.replace(GameSceneType.EditorMap, this.params);
      return;
    }

    super.onUpdate(deltaTime);
  }
}
