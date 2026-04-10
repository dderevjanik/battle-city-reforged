import { GameObject } from '../../core/GameObject';
import { RectPainter } from '../../core/painters/RectPainter';
import { _rendererScene } from '../../core/GameObjectRenderer';
import { GameContext } from '../../game/GameUpdateArgs';
import { Session } from '../../game/Session';
import { LevelInputHint } from '../../gameObjects/LevelInputHint';
import { SelectorMenuItem, SelectorMenuItemChoice } from '../../gameObjects/menu/SelectorMenuItem';
import { SceneInputHint } from '../../gameObjects/text/SceneInputHint';
import { SpriteText } from '../../gameObjects/text/SpriteText';
import { InputDeviceType } from '../../input/InputDeviceType';
import { InputVariant } from '../../input/InputVariant';
import { LevelControlsInputContext } from '../../input/InputContexts';
import * as config from '../../config';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

import { LevelControlsLocationParams } from './LevelControlsLocationParams';
import { LevelPlayLocationParams } from './LevelPlayLocationParams';

export class LevelControlsScene extends GameScene<LevelControlsLocationParams> {
  private background!: GameObject;
  private title!: SpriteText;
  private selector!: SelectorMenuItem<InputVariant>;
  private levelHint!: LevelInputHint;
  private continueHint!: GameObject;
  private session!: Session;
  private prevPointerStates = new Map<number, boolean>();

  protected setup({
    inputHintSettings,
    inputManager,
    session,
  }: GameContext): void {
    this.session = session;

    inputHintSettings.setSeenLevelHint();

    // Keyboard is always available
    let variantChoices: SelectorMenuItemChoice<InputVariant>[] = [
      { value: InputVariant.PrimaryKeyboard0, text: 'KEYBOARD - BINDING 1' },
      { value: InputVariant.SecondaryKeyboard0, text: 'KEYBOARD - BINDING 2' },
      { value: InputVariant.TertiaryKeyboard0, text: 'KEYBOARD - BINDING 3' },
      { value: InputVariant.QuaternaryKeyboard0, text: 'KEYBOARD - BINDING 4' },
      { value: InputVariant.QuinaryKeyboard0, text: 'KEYBOARD - BINDING 5' },
    ];

    const gamepadDevice0 = inputManager.getDevice(InputDeviceType.Gamepad, 0);
    if (gamepadDevice0.isConnected()) {
      variantChoices.push({
        value: InputVariant.PrimaryGamepad0,
        text: 'GAMEPAD 1 - BINDING 1',
      });
      variantChoices.push({
        value: InputVariant.SecondaryGamepad0,
        text: 'GAMEPAD 1 - BINDING 2',
      });
    }

    const gamepadDevice1 = inputManager.getDevice(InputDeviceType.Gamepad, 1);
    if (gamepadDevice1.isConnected()) {
      variantChoices.push({
        value: InputVariant.PrimaryGamepad1,
        text: 'GAMEPAD 2 - BINDING 1',
      });
      variantChoices.push({
        value: InputVariant.SecondaryGamepad1,
        text: 'GAMEPAD 2 - BINDING 2',
      });
    }

    // Default variant suggestions per player index
    const defaultVariantsByIndex = [
      InputVariant.SecondaryKeyboard0,
      InputVariant.TertiaryKeyboard0,
      InputVariant.QuaternaryKeyboard0,
      InputVariant.QuinaryKeyboard0,
    ];

    // By default it is single-player and we pick active device and binding.
    let defaultVariant = new InputVariant(
      inputManager.getActiveBindingType(),
      0,
    );

    if (this.params.canSelectVariant) {
      if (this.session.isMultiplayer()) {
        defaultVariant =
          defaultVariantsByIndex[this.params.playerIndex] ??
          InputVariant.PrimaryKeyboard0;
      } else {
        defaultVariant = InputVariant.PrimaryKeyboard0;
      }
    }

    // For players after the first: remove variants already picked by previous players
    if (this.params.canSelectVariant && this.params.playerIndex > 0) {
      const pickedVariants = this.session.players
        .slice(0, this.params.playerIndex)
        .map((p) => p.getInputVariant())
        .filter((v) => v !== null);

      variantChoices = variantChoices.filter((choice) => {
        const choiceVariant = choice.value;

        for (const picked of pickedVariants) {
          // Remove all variants that use the same gamepad device
          const pickedDeviceType = picked.bindingType.deviceType;
          const choiceDeviceType = choiceVariant.bindingType.deviceType;
          const isSameGamepadDevice =
            pickedDeviceType === InputDeviceType.Gamepad &&
            choiceDeviceType === InputDeviceType.Gamepad &&
            picked.deviceIndex === choiceVariant.deviceIndex;
          if (isSameGamepadDevice) {
            return false;
          }

          if (choiceVariant === picked) {
            return false;
          }
        }

        return true;
      });

      // Adjust default if it was already taken
      if (pickedVariants.includes(defaultVariant)) {
        defaultVariant =
          variantChoices[0]?.value ?? InputVariant.PrimaryKeyboard0;
      }
    }

    this.background = new GameObject();
    this.background.size.copyFrom(this.root.size);
    this.background.painter = new RectPainter(config.COLOR_GRAY);
    this.root.add(this.background);

    let titleText = 'CONTROLS';
    if (this.params.canSelectVariant) {
      const playerNumber = this.params.playerIndex + 1;
      titleText = `PLAYER ${playerNumber}`;
    }

    this.title = new SpriteText(titleText, {
      color: config.COLOR_YELLOW,
    });
    this.title.origin.set(0.5, 0.5);
    this.title.setCenterX(this.root.getSelfCenter().x);
    this.title.position.setY(64);
    this.root.add(this.title);

    this.selector = new SelectorMenuItem(variantChoices, {
      color: config.COLOR_WHITE,
      containerWidth: 700,
    });
    this.selector.origin.set(0.5, 0.5);
    this.selector.setCenterX(this.root.getSelfCenter().x);
    this.selector.position.setY(144);
    this.selector.changed.addListener(this.handleSelectorChanged);

    if (this.params.canSelectVariant) {
      this.selector.setValue(defaultVariant);
      this.root.add(this.selector);
    }

    this.levelHint = new LevelInputHint(defaultVariant.bindingType);
    this.levelHint.position.setY(200);
    this.root.add(this.levelHint);

    const continueDisplayedCode = inputManager.getDisplayedControlCode(
      inputManager.getActiveBindingType(),
      LevelControlsInputContext.Continue[0],
    );
    const actionWord = this.params.canSelectVariant ? 'SELECT' : 'CONTINUE';
    this.continueHint = new SceneInputHint(
      `${continueDisplayedCode} TO ${actionWord}`,
    );
    this.root.add(this.continueHint);
  }

  protected onUpdate(deltaTime: number): void {
    const { inputManager } = this.context;

    const inputMethod = inputManager.getActiveMethod();

    if (inputMethod.isDownAny(LevelControlsInputContext.Continue)) {
      this.finish();
      return;
    }

    super.onUpdate(deltaTime);

    // Usually it is handled by menu, but here we are using it outside menu
    if (this.params.canSelectVariant) {
      this.selector.updateFocused(this.context);
    }

    this.updatePointerContinue();
  }

  private updatePointerContinue(): void {
    if (_rendererScene === null) return;

    const pointers: Phaser.Input.Pointer[] = _rendererScene.input.manager.pointers;

    for (const pointer of pointers) {
      if (pointer.x === 0 && pointer.y === 0 && !pointer.isDown) continue;

      const wasDown = this.prevPointerStates.get(pointer.id) ?? false;
      const eventTarget = (pointer.event?.target ?? null) as Element | null;
      const onTouchOverlay = eventTarget?.closest('.touch-gamepad') !== null;
      const justReleased = !pointer.isDown && wasDown && !onTouchOverlay;

      this.prevPointerStates.set(pointer.id, pointer.isDown);

      if (justReleased && !this.selector.wasArrowClicked()) {
        this.finish();
        return;
      }
    }
  }

  private handleSelectorChanged = (
    choice: SelectorMenuItemChoice<InputVariant>,
  ): void => {
    const selectedInputVariant = choice.value;
    this.levelHint.setBindingType(selectedInputVariant.bindingType);
  };

  private finish(): void {
    if (this.params.canSelectVariant) {
      // Once player is done selecting, set his input variant
      const selectedInputVariant = this.selector.getValue();

      const playerSession = this.session.getPlayer(this.params.playerIndex);
      playerSession.setInputVariant(selectedInputVariant!);

      // Configure next player if there are more players left
      const nextPlayerIndex = this.params.playerIndex + 1;
      if (this.session.isMultiplayer() && nextPlayerIndex < this.session.getPlayerCount()) {
        const params: LevelControlsLocationParams = {
          canSelectVariant: true,
          mapConfig: this.params.mapConfig,
          playerIndex: nextPlayerIndex,
        };
        this.navigator.replace(GameSceneType.LevelControls, params);
        return;
      }
    }

    // Map config is forwarded from level load scene
    const params: LevelPlayLocationParams = {
      mapConfig: this.params.mapConfig,
    };
    this.navigator.replace(GameSceneType.LevelPlay, params);
  }
}
