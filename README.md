# Lumen Drift

A neon arena survival shooter built for the [make.fun best-game-01 bounty](https://make.fun/bounty/best-game-01).

## Play

Open `game/index.html` in a desktop browser. Move with WASD or arrow keys, aim with the mouse, and survive ten waves of dark shapes. Collect energy orbs to grow stronger.

## Structure

- `main.ts` — Node 22 entrypoint; copies `game/` and `screenshots/` to the output dir and writes `dossier.json`.
- `game/` — static browser game (HTML + ES module JS, no network).
- `screenshots/` — three JPEG renders of the title, play, and game-over screens.
- `vendor/makefun-game.ts` — kit-provided dossier builder, unchanged.

## License

MIT
