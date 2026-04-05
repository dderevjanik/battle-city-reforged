import { Achievement } from './Achievement';
import { AchievementId } from './AchievementId';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: AchievementId.StartingTrenches,
    name: 'Starting Trenches',
    description: 'Clear Stage 1',
    points: 3,
  },
  {
    id: AchievementId.MouseOfBattlefield,
    name: 'Mouse of the Battlefield',
    description: 'Clear Stages 1-10',
    points: 10,
  },
  {
    id: AchievementId.TreadingWater,
    name: 'Treading Water',
    description: 'Clear Stages 11-20',
    points: 10,
  },
  {
    id: AchievementId.BrickhouseBoss,
    name: 'Brickhouse Boss',
    description: 'Clear Stages 21-35',
    points: 10,
  },
  {
    id: AchievementId.MilitaryMaze,
    name: 'Military Maze',
    description: 'Clear Stage 50',
    points: 25,
  },
  {
    id: AchievementId.BrushBattleground,
    name: 'Brush Battleground',
    description: 'Clear Stage 60',
    points: 25,
  },
  {
    id: AchievementId.NewRevolution,
    name: 'New Revolution',
    description: 'Clear Stage 70',
    points: 50,
  },
  {
    id: AchievementId.DeathlessDriver1,
    name: 'Deathless Driver I',
    description: 'Clear Stages 1-5 without dying',
    points: 10,
  },
  {
    id: AchievementId.DeathlessDriver2,
    name: 'Deathless Driver II',
    description: 'Clear Stages 16-25 without dying',
    points: 25,
  },
  {
    id: AchievementId.ConfidentCommander1,
    name: 'Confident Commander I',
    description:
      'Clear Stages 6-15 using the default gun without collecting any powerups or getting a game over',
    points: 25,
  },
  {
    id: AchievementId.ConfidentCommander2,
    name: 'Confident Commander II',
    description:
      'Clear Stages 25-35 using the default gun without collecting any powerups or getting a game over',
    points: 25,
  },
  {
    id: AchievementId.CombatClear,
    name: '1-Combat Clear',
    description: 'Clear Stages 1-35 without getting a game over',
    points: 25,
  },
  {
    id: AchievementId.StarSoldier,
    name: 'Star Soldier',
    description: "Max out your tank's gun powerups",
    points: 5,
  },
  {
    id: AchievementId.VacantBattlefield,
    name: 'Vacant Battlefield',
    description: 'Use a Grenade without destroying any enemy tanks',
    points: 5,
  },
  {
    id: AchievementId.FullArsenal,
    name: 'Full Arsenal',
    description:
      'Collect one of every powerup without getting a game over',
    points: 5,
  },
  {
    id: AchievementId.BattleBrigadier,
    name: 'Battle Brigadier',
    description: 'Score 20,000 points',
    points: 10,
  },
  {
    id: AchievementId.CityChampion,
    name: 'City Champion',
    description: 'Score 100,000 points',
    points: 25,
  },
];
