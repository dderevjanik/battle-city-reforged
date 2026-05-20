# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Battle City Reforged — a TypeScript remake of Battle City (Namco, 1985), built on **Phaser 4 + Vite 8**. Forked from `cattle-bity` by Michael Radionov; extends it with up to 4 players, difficulty levels, achievements, multiple campaigns, a level editor, custom AI, and PWA offline support. Requires **Node >= 24**.

## Commands

```bash
npm start                 # vite dev server, opens browser (also: npm run dev)
npm run build             # production build (outputs dist/)
npm run typecheck         # tsc --noEmit  (strict mode; must pass for CI)
npm test                  # tsx --test 'src/**/*.test.ts'
npm run test:coverage     # tests with experimental coverage
npm run nes:import -- path/to/rom.nes [--out <dir>] [--stage N] [--all]
npm run nes:extract-sprites
```

Run a single test file: `npx tsx --test src/core/Timer.test.ts`.

CI runs `typecheck`, `test`, and `build` — all three must pass.

## Entry Points (multi-page Vite build)

Defined in `vite.config.ts`:
- `index.html` — the game (`src/main.ts`)
- `editor.html` — map editor
- `fonts.html` — bitmap font viewer
- `src/nes/` — Node CLI for extracting stages from original Battle City `.nes` ROMs

## Architecture

### Bootstrap (src/main.ts)
`main.ts` is the composition root. It instantiates every manager/loader/system (audio, sprites, fonts, input, storage, achievements, progress, points, stats, collision, session, etc.), assembles them into a single `GameContext` object, preloads assets, then calls `createPhaserGame()`. The `GameContext` is injected into the Phaser registry under the key `'gameContext'` **before** any scene runs — every scene pulls its dependencies from there. When adding a new manager, wire it through both `GameContext` (`src/game/GameUpdateArgs.ts`) and `main.ts`.

### Scenes (src/scenes/)
Phaser scenes are organized by area: `main/` (menus, highscores), `level/` (gameplay), `modes/` (single/multi/custom/demo), `settings/`. Routing lives in `GameSceneRouter.ts` + `GameSceneType.ts`. `GameScene.ts` is the base.

### Layers (rough)
- `src/core/` — framework-agnostic primitives: `Timer`, `Subject`, `State`, math (`Vector`, `Rect`, `BoundingBox`, `Matrix3`), `CollisionSystem`, loaders (audio/image/sprite/font), Phaser glue (`render/PhaserGame.ts`). The pure-TS pieces are what the test suite covers.
- `src/game/` — world-level state and settings (`GameState`, `Session`, `RunState`, `Difficulty`, `AudioManager`, `GameStorage`, `RotationMap`).
- `src/gameObjects/` — Phaser `GameObject` subclasses (tanks, bullets, walls, powerups, etc.).
- `src/tank/`, `src/terrain/`, `src/powerup/` — gameplay entity domains.
- `src/level/`, `src/map/` — level loading, tile maps, serialization (`MapDto`).
- `src/progress/` — `LevelProgressManager`, `ContinueManager` (single-player resume; auto-saves at level start, cleared on death).
- `src/points/`, `src/stats/`, `src/achievements/` — scoring, run stats, 17 achievements based on RetroAchievements.
- `src/input/` — keyboard, gamepad, touch; user-customizable bindings persisted via `GameStorage`.
- `src/net/` — PeerJS-based multiplayer (host/connect).
- `src/sim/` — deterministic simulation (referenced by recent commits on "predictable collision" / sim tests).
- `src/editor/`, `src/fonts-viewer/` — secondary apps.
- `src/nes/` + `scripts/nes-*.ts` — NES ROM parsing utilities (run via `tsx`).
- `data/` — JSON manifests (audio, sprites, fonts, maps) imported at build time by `main.ts`.

### Persistence
All persistent state (settings, bindings, progress, continue, highscores, stats, achievements) goes through `GameStorage` (a single localStorage-backed key namespaced by `config.STORAGE_NAMESPACE`). Managers load/save themselves against it; do not reach into `localStorage` directly.

### Service Worker / PWA
A custom `sw.js` is registered from `main.ts` in production only (`config.IS_PROD`). The game is installable and fully playable offline after first load.

## Testing constraints

Tests use **Node's built-in test runner via `tsx`** (not Jest/Vitest). Files colocate with source: `Foo.ts` ↔ `Foo.test.ts`.

**Phaser cannot be imported in tests.** Phaser touches `window` at import time, so anything that imports it — directly or transitively via `Vector`, `BoundingBox`, `Rect`, `GameObject`, etc. — won't run under Node. Keep unit tests scoped to pure modules (math/array utils, `Timer`, `Subject`, `State`, `RotationMap`, `assertNever`, etc.). When designing new code that needs test coverage, isolate the pure logic from the Phaser-coupled layer.

## Code style

- **TypeScript strict mode is on.** Don't loosen it; fix the types. Don't add `any` to silence the checker — narrow with type guards.
- No linter is configured yet. Match the surrounding file's style.
- Don't introduce abstractions beyond what the task needs; inline duplication is fine until a third caller appears.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `cicd:`, optional scopes like `feat(editor):`).
- PRs target `main`; keep one logical change per PR.

## Tech stack reference

TypeScript 6 · Phaser 4 · Vite 8 · PeerJS (multiplayer) · Ajv (JSON validation) · posthog-js (analytics) · custom Service Worker.
