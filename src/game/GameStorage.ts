import { LocalStorage } from '../core/storage/LocalStorage';

export class GameStorage extends LocalStorage {
  public setBoolean(key: string, value: boolean): void {
    this.set(key, value.toString());
  }

  public getBoolean(key: string, defaultValue: boolean | null = null): boolean | null {
    const json = this.get(key);

    let value: boolean | null = defaultValue;

    try {
      value = JSON.parse(json);
    } catch {
      // Not parse-able
    }

    if (typeof value !== 'boolean') {
      return defaultValue;
    }

    return value;
  }

  public setNumber(key: string, value: number): void {
    this.set(key, value.toString());
  }

  public getNumber(key: string, defaultValue: number | null = null): number | null {
    const json = this.get(key);

    let value: number | null = defaultValue;

    try {
      value = JSON.parse(json);
    } catch {
      // Not parse-able
    }

    if (typeof value !== 'number') {
      return defaultValue;
    }

    return value;
  }
}
