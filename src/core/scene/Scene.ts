export type SceneType = number | string;

export type SceneParams = {
  [key: string]: any;
};

export interface SceneNavigator {
  push(type: SceneType, params?: SceneParams): void;
  replace(type: SceneType, params?: SceneParams): void;
  back(): void;
  clearAndPush(type: SceneType, params?: SceneParams): void;
}

export abstract class Scene<T extends SceneParams = {}> {
  protected navigator: SceneNavigator;
  protected params: T;

  constructor(navigator: SceneNavigator, params: T) {
    this.navigator = navigator;
    this.params = params;
  }
}
