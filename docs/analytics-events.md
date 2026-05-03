# Analytics Events

All events flow through [src/analytics/Analytics.ts](../src/analytics/Analytics.ts) and are sent to **both** Google Analytics 4 and PostHog (when their respective env vars are configured at build time). Events fire only in production builds (`config.IS_PROD`); local `npm run dev` is a no-op.

Demo (attract mode) and playtest sessions are excluded from gameplay events to keep data clean.

## Page views

Fired automatically on every scene transition.

| Field | Description |
|---|---|
| **Event name** | `page_view` (GA4) / `$pageview` (PostHog) |
| **Fired from** | [src/scenes/GameSceneRouter.ts](../src/scenes/GameSceneRouter.ts) — `push()`, `replace()`, `back()` |
| **Properties** | `scene_name` / `$pathname` (e.g. `/MainMenu`, `/LevelPlay`, `/LevelScore`) |

Scene names come from the [GameSceneType](../src/scenes/GameSceneType.ts) enum: `LevelControls`, `LevelLoad`, `LevelPlay`, `LevelScore`, `LevelSelection`, `MainAbout`, `MainAchievements`, `MainGameOver`, `MainHighscore`, `MainMenu`, `MainMultiplayer`, `MainVictory`, `ModesMenu`, `ModesCustom`, `SettingsAudio`, `SettingsInterface`, `SettingsKeybinding`, `SettingsMenu`, `SettingsResetAchievements`.

## Custom events

### `difficulty_selected`

User picked a difficulty on the level-selection screen.

| Field | Description |
|---|---|
| **Fired from** | [LevelSelectionScene.ts:115](../src/scenes/level/LevelSelectionScene.ts#L115) |
| `difficulty` | `'classic' \| 'hard' \| 'extreme'` |

### `game_start`

A play session is starting. Fires on both new games and continue.

| Field | Description |
|---|---|
| **Fired from** | [LevelSelectionScene.ts:116](../src/scenes/level/LevelSelectionScene.ts#L116) (new), [MainMenuScene.ts:236](../src/scenes/main/MainMenuScene.ts#L236) (continue) |
| `via` | `'new' \| 'continue'` |
| `difficulty` | `'classic' \| 'hard' \| 'extreme'` |
| `party_size` | `1`–`4` |
| `start_level` | starting level number |
| `enemy_powerups` | `boolean` |
| `friendly_fire` | `boolean` (only on `via='new'`) |

### `level_start`

Player entered a level (after the intro screen, demo/playtest excluded).

| Field | Description |
|---|---|
| **Fired from** | [LevelPlayScene.ts:110](../src/scenes/level/LevelPlayScene.ts#L110) |
| `level` | current level number |
| `difficulty` | `'classic' \| 'hard' \| 'extreme'` |
| `party_size` | `1`–`4` |

### `powerup_picked`

Any player picked up a powerup tile.

| Field | Description |
|---|---|
| **Fired from** | [LevelPlayScene.ts:404](../src/scenes/level/LevelPlayScene.ts#L404) |
| `type` | `PowerupType` (`Helmet`, `Clock`, `Shovel`, `Star`, `Grenade`, `Tank`, `Wipeout`, `Life`, `Upgrade`) — see [PowerupType](../src/powerup/PowerupType.ts) |
| `level` | current level number |
| `party_index` | `0`–`3` (which player picked it) |

### `level_complete`

Player(s) destroyed all enemies and the win sequence finished.

| Field | Description |
|---|---|
| **Fired from** | [LevelPlayScene.ts:473](../src/scenes/level/LevelPlayScene.ts#L473) |
| `level` | level number that was just completed |
| `difficulty` | `'classic' \| 'hard' \| 'extreme'` |
| `party_size` | `1`–`4` |
| `kills` | enemies killed in that level (aggregated) |
| `deaths` | player deaths in that level (aggregated) |
| `time_sec` | wall-clock seconds from level setup to win |

### `game_over`

All players lost their lives, or the base was destroyed.

| Field | Description |
|---|---|
| **Fired from** | [LevelPlayScene.ts:451](../src/scenes/level/LevelPlayScene.ts#L451) |
| `level` | level reached |
| `score` | highest player's total game points (`session.getMaxGamePoints()`) |
| `kills` | enemies killed in the final level |
| `deaths` | player deaths in the final level |
| `difficulty` | `'classic' \| 'hard' \| 'extreme'` |

### `achievement_unlocked`

An achievement transitioned from locked to unlocked.

| Field | Description |
|---|---|
| **Fired from** | [LevelAchievementsScript.ts:108](../src/level/scripts/LevelAchievementsScript.ts#L108) |
| `id` | `AchievementId` enum value — see [AchievementId](../src/achievements/AchievementId.ts) |

## Aggregation note

Per-kill and per-death events are intentionally **not** sent. The `kills` / `deaths` counters in `level_complete` and `game_over` are running tallies summed in [LevelPlayScene.ts](../src/scenes/level/LevelPlayScene.ts). At ~100 enemies per level, per-kill events would burn through PostHog's free-tier quota (1M events/month) far too quickly.

## Where keys live

- Build-time env vars: `VITE_GA_MEASUREMENT_ID`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (optional, defaults to `https://us.i.posthog.com`).
- See [.env.production.example](../.env.production.example) for local prod-mode testing.
- For deploys, set the same names as repository secrets in GitHub Actions; they're injected by [.github/workflows/deploy.yml](../.github/workflows/deploy.yml).
