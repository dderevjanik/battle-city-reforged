import { AchievementId } from './AchievementId';

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  points: number;
}
