import { Difficulty } from "../game/Difficulty";
import { MapConfig } from "../map/MapConfig";
import { TankKind } from "../tank/TankTypes";

export class DifficultyModifier {
  public static apply(mapConfig: MapConfig, difficulty: Difficulty): void {
    if (difficulty === Difficulty.Classic) {
      return;
    }

    const originalList = mapConfig.getEnemySpawnList();
    const originalDelay = mapConfig.getEnemySpawnDelay();
    const originalMaxAlive = mapConfig.getEnemyMaxAliveCount();

    if (difficulty === Difficulty.Hard) {
      mapConfig.setEnemySpawnDelay(originalDelay * 0.8);
      mapConfig.setEnemyMaxAliveCount(Math.max(originalMaxAlive, 6));

      // Upgrade every 3rd tank: basic/fast → medium
      for (let i = 0; i < originalList.length; i += 1) {
        if (i % 3 === 0) {
          const kind = originalList[i].kind;
          if (kind === TankKind.Basic || kind === TankKind.Fast) {
            mapConfig.setEnemySpawnListItem(
              i,
              originalList[i].clone().increaseKind(TankKind.Medium),
            );
          }
        }
      }

      // Append 4 extra enemies from original list
      for (let i = 0; i < 4; i += 1) {
        const source = originalList[i % originalList.length];
        mapConfig.appendToEnemySpawnList({ type: source.kind, ai: undefined });
      }
    }

    if (difficulty === Difficulty.Extreme) {
      mapConfig.setEnemySpawnDelay(originalDelay * 0.6);
      mapConfig.setEnemyMaxAliveCount(Math.max(originalMaxAlive, 8));

      // Upgrade every 2nd tank: basic/fast/medium → heavy
      for (let i = 0; i < originalList.length; i += 1) {
        if (i % 2 === 0) {
          const kind = originalList[i].kind;
          if (kind !== TankKind.Heavy) {
            mapConfig.setEnemySpawnListItem(
              i,
              originalList[i].clone().increaseKind(TankKind.Heavy),
            );
          }
        }
      }

      // Append 8 extra enemies from original list
      for (let i = 0; i < 8; i += 1) {
        const source = originalList[i % originalList.length];
        mapConfig.appendToEnemySpawnList({ type: source.kind, ai: undefined });
      }
    }
  }
}
