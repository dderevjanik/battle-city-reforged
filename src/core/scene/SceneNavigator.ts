import { SceneType } from './SceneType';

export type SceneParams = {
  [key: string]: any;
};

export interface SceneNavigator {
  push(type: SceneType, params?: SceneParams): void;
  replace(type: SceneType, params?: SceneParams): void;
  back(): void;
  clearAndPush(type: SceneType, params?: SceneParams): void;
}
