import { GameStorage } from './GameStorage';
import * as config from '../config';

export class ScreenShakeSettings {
  private storage: GameStorage;

  constructor(storage: GameStorage) {
    this.storage = storage;
  }

  public getEnabled(): boolean {
    return (
      this.storage.getBoolean(
        config.STORAGE_KEY_SETTINGS_SCREEN_SHAKE_ENABLED,
        true,
      ) ?? true
    );
  }

  public setEnabled(enabled: boolean): void {
    this.storage.setBoolean(
      config.STORAGE_KEY_SETTINGS_SCREEN_SHAKE_ENABLED,
      enabled,
    );
    this.storage.save();
  }
}
