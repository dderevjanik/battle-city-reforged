# Battle City Reforged

Battle City (1985, Namco) remake written from scratch in TypeScript.

### [Play web version](https://dderevjanik.github.io/battle-city-reforged/) | [Map Editor](https://dderevjanik.github.io/battle-city-reforged/editor)

[Screenshots](docs/screenshots.md)

## About

This is a fork of the original [cattle-bity](https://github.com/dogballs/cattle-bity) by **Michael Radionov**, which was a faithful Battle City clone in TypeScript. This fork extends it with new features, game modes, and improvements.

Project is not commercial and was created for learning purposes only.

## What's Different from Battle City

- Up to 4 players on one PC (original supported 2)
- 3 difficulty levels: Classic, Hard, Extreme
- 17 unlockable achievements (based on [RetroAchievements](https://retroachievements.org/game/2420))
- Full level editor with JSON save/load
- Custom maps mode
- Gun powerup with instant max-tier upgrade and rare weighted spawning
- Toggleable friendly fire in multiplayer
- Multiple enemy AI behaviors: Hunter, Ambush, Attack Base, Patrol
- Special enemy variants: Fast Bomber, Fast Armored
- Demo mode (AI plays automatically)
- Gamepad, keyboard, and touch input support
- Customizable keybindings
- Modern and Classic tilesets
- Level progress tracking
- In-game score display and highscores

## Features

- Single player campaign (35 original maps)
- Multiplayer (up to 4 players, same PC)
- 3 difficulty modes (Classic / Hard / Extreme)
- 7 powerups with weighted spawn distribution
- 6 tank types (Basic, Fast, Fast Armored, Fast Bomber, Medium, Heavy)
- Multiple enemy AI behaviors
- 17 achievements (based on [RetroAchievements](https://retroachievements.org/game/2420))
- Level editor with save/load
- Custom maps mode
- Demo mode
- Keyboard, gamepad, and touch input
- Customizable keybindings and audio settings
- Score tracking and highscores

## Getting Started

Prerequisites: Node >= 22

```bash
npm install
npm start        # dev server (opens browser)
npm run build  # production build
npm run typecheck   # type checking
```

## Tech Stack

- TypeScript 5
- Phaser 3
- Vite 8

## Acknowledgments

- Original project [cattle-bity](https://github.com/dogballs/cattle-bity) by **Michael Radionov** — the foundation this fork builds upon
- Battle City by Namco (1985) — the classic game that inspired it all

## License

**MIT**

See `LICENSE.md` and `docs/legal/MIT`
