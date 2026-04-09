import { GameStorage } from '../game/GameStorage';
import * as config from '../config';

export class DebugSettings {
  private storage: GameStorage;

  constructor(storage: GameStorage) {
    this.storage = storage;
  }

  public getDevPanelEnabled(): boolean {
    return this.storage.getBoolean(
      config.STORAGE_KEY_SETTINGS_DEV_PANEL_ENABLED,
      false,
    );
  }

  public setDevPanelEnabled(enabled: boolean): void {
    this.storage.setBoolean(
      config.STORAGE_KEY_SETTINGS_DEV_PANEL_ENABLED,
      enabled,
    );
    this.storage.save();
  }
}
