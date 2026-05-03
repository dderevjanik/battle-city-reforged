import { AchievementsManager } from '../achievements/AchievementsManager';
import { AchievementsTracker } from '../achievements/AchievementsTracker';
import { Analytics } from '../analytics/Analytics';
import { MapLoader } from '../map/MapLoader';
import { PointsHighscoreManager } from '../points/PointsHighscoreManager';
import { ContinueManager } from '../progress/ContinueManager';
import { LevelProgressManager } from '../progress/LevelProgressManager';
import { GameStatsManager } from '../stats/GameStatsManager';

/**
 * Persistence-shaped services: achievements, stats, highscores, level
 * progress, analytics, map catalog. Scenes that only read or persist progress
 * should depend on this slice.
 */
export interface ProgressContext {
  achievementsManager: AchievementsManager;
  achievementsTracker: AchievementsTracker;
  analytics: Analytics;
  continueManager: ContinueManager;
  gameStatsManager: GameStatsManager;
  levelProgressManager: LevelProgressManager;
  mapLoader: MapLoader;
  pointsHighscoreManager: PointsHighscoreManager;
}
