# Contributing

Thanks for your interest in Battle City Reforged! This is a non-commercial learning project, but contributions — bug reports, fixes, features, docs — are welcome.

## Prerequisites

- **Node.js >= 24** (see `engines` in [package.json](package.json))
- npm (ships with Node)
- A modern browser for manual testing

## Getting Started

```bash
git clone https://github.com/dderevjanik/battle-city-reforged.git
cd battle-city-reforged
npm install
npm start          # dev server, opens browser
```

Once the dev server is running, the following pages are served alongside the game:

- `/editor.html` — map editor
- `/fonts.html` — sprite-font / rect-font / system-font comparison tool (useful when auditing the bitmap font sheet)

## Workflow

1. Fork the repo and create a branch off `main` (e.g. `feat/new-powerup`, `fix/tank-collision`).
2. Make your changes — keep them focused. One logical change per PR.
3. Run the local checks (see below).
4. Open a PR against `main` with a clear description of *what* changed and *why*.

## Local Checks

Before opening a PR, run:

```bash
npm run typecheck  # tsc --noEmit, must pass
npm test           # tsx --test, must pass
npm run build      # production build, must succeed
```

CI runs the same checks (see [.github/workflows/deploy.yml](.github/workflows/deploy.yml)) and will block the PR if any fail.

## Commit Messages

The project uses [Conventional Commits](https://www.conventionalcommits.org/) prefixes. Examples from history:

- `feat: add difficulty and lives to level load screen`
- `fix: package lock`
- `refactor: get IS_DEV and IS_PROD from import.meta.env`
- `test: add 3 more test`
- `docs: update`
- `chore: add dependabot`
- `cicd: improve pipeline`
- `feat(editor): correct player spawn color` (scoped)

Keep the subject line short and in imperative mood. Body is optional but useful for non-obvious *why*.

## Code Style

- **TypeScript strict mode** is on. Don't loosen it; fix the types instead.
- **No linter yet** — see [docs/production-readiness.md](docs/production-readiness.md) item #1. Match the surrounding style of the file you're editing.
- Don't add `any` to silence the type checker — narrow with type guards or fix the underlying type.
- Don't introduce abstractions beyond what the task needs. Inline duplication is fine until there's a third caller.
- Don't add comments that just restate the code. Comments should explain *why*, not *what*.

## Tests

Tests live next to the code they cover (`Foo.ts` → `Foo.test.ts`) and use Node's built-in test runner via `tsx`:

```bash
npm test
npm run test:coverage
```

**Phaser caveat:** anything that imports Phaser directly (or transitively via `Vector`, `BoundingBox`, `Rect`, `GameObject`, etc.) currently can't be unit-tested in Node — Phaser touches `window` at import time. Stick to pure modules for now (math/array utils, `Timer`, `Subject`, `State`, `RotationMap`-style logic). See [docs/production-readiness.md](docs/production-readiness.md) item #2 for context.

## Project Structure

```
src/
  achievements/   achievement definitions and tracking
  core/           framework-agnostic primitives (Timer, Subject, State, utils...)
  debug/          debug overlays and dev tools
  editor/         map editor scenes and UI
  game/           game-world objects, AI, world state
  gameObjects/    Phaser game-object subclasses
  input/          keyboard / gamepad / touch handling
  level/          level loading, progress, continue
  map/            tile map and serialization
  points/         scoring and highscores
  powerup/        powerups
  progress/       per-run progression state
  scenes/         Phaser scenes (Menu, Bridge, etc.)
  stats/          run stats
  tank/           tank types, tiers, behavior
  terrain/        terrain tiles
  types/          ambient TS types
  config.ts       build-time and runtime config
  main.ts         entry point
data/             original Battle City levels (JSON)
public/           static assets served as-is
docs/             screenshots, design docs, production-readiness
```

## Reporting Bugs

Open an issue at <https://github.com/dderevjanik/battle-city-reforged/issues> with:

- What you did (steps to reproduce)
- What you expected
- What actually happened
- Browser + OS
- Console errors, if any

For gameplay/balance bugs, a save state or screenshot helps.

## Proposing Features

For anything beyond a small fix, open an issue first to discuss scope. Big features without prior agreement may not get merged. Keep in mind the project's spirit: a faithful Battle City remake with sensible modern extensions, not a different game.

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE.md), the same license as the rest of the project.
