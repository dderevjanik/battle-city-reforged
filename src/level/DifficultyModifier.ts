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

      // Append 4 extra enemies first, then upgrade from the end so tougher tanks appear later
      for (let i = 0; i < 4; i += 1) {
        const source = originalList[i % originalList.length];
        mapConfig.appendToEnemySpawnList({ type: source.kind, ai: undefined });
      }

      // Upgrade every 3rd tank from the end: basic/fast → medium
      const hardList = mapConfig.getEnemySpawnList();
      for (let i = hardList.length - 1; i >= 0; i -= 1) {
        if ((hardList.length - 1 - i) % 3 === 0) {
          const kind = hardList[i].kind;
          if (kind === TankKind.Basic || kind === TankKind.Fast) {
            mapConfig.setEnemySpawnListItem(
              i,
              hardList[i].clone().increaseKind(TankKind.Medium),
            );
          }
        }
      }

      // Convert 2nd remaining fast enemy into fast_bomber
      let fastCount = 0;
      const hardListAfter = mapConfig.getEnemySpawnList();
      for (let i = 0; i < hardListAfter.length; i += 1) {
        if (hardListAfter[i].kind === TankKind.Fast) {
          fastCount += 1;
          if (fastCount === 2) {
            mapConfig.setEnemySpawnListItem(
              i,
              hardListAfter[i].clone().increaseKind(TankKind.FastBomber),
            );
            break;
          }
        }
      }
    }

    if (difficulty === Difficulty.Extreme) {
      mapConfig.setEnemySpawnDelay(originalDelay * 0.6);
      mapConfig.setEnemyMaxAliveCount(Math.max(originalMaxAlive, 8));

      // Append 8 extra enemies first, then upgrade from the end so tougher tanks appear later
      for (let i = 0; i < 8; i += 1) {
        const source = originalList[i % originalList.length];
        mapConfig.appendToEnemySpawnList({ type: source.kind, ai: undefined });
      }

      // Upgrade every 2nd tank from the end: basic/fast/medium → heavy
      const extremeList = mapConfig.getEnemySpawnList();
      for (let i = extremeList.length - 1; i >= 0; i -= 1) {
        if ((extremeList.length - 1 - i) % 2 === 0) {
          const kind = extremeList[i].kind;
          if (kind !== TankKind.Heavy) {
            mapConfig.setEnemySpawnListItem(
              i,
              extremeList[i].clone().increaseKind(TankKind.Heavy),
            );
          }
        }
      }

      // Convert 2nd remaining fast → fast_bomber, 3rd remaining fast → fast_armored
      let extremeFastCount = 0;
      const extremeListAfter = mapConfig.getEnemySpawnList();
      for (let i = 0; i < extremeListAfter.length; i += 1) {
        if (extremeListAfter[i].kind === TankKind.Fast) {
          extremeFastCount += 1;
          if (extremeFastCount === 2) {
            mapConfig.setEnemySpawnListItem(
              i,
              extremeListAfter[i].clone().increaseKind(TankKind.FastBomber),
            );
          } else if (extremeFastCount === 3) {
            mapConfig.setEnemySpawnListItem(
              i,
              extremeListAfter[i].clone().increaseKind(TankKind.FastArmored),
            );
            break;
          }
        }
      }
    }
  }
}
