# Breakout Blast

A modern Breakout-style arcade game with custom pixel art, power-ups, and procedural audio.

## Live Demo

- https://jade-quokka-d2f928.netlify.app

## Tech Stack

- Rendering: Three.js
- Tooling: Vite (ES modules)
- Audio: Tone.js (WebAudio)

## How to Play

- Start: **Enter** (or click **Start Adventure**)
- Move: **A / D** or **← / →**
- Pause: **Space** (includes a pause menu)
- Laser: **F** (after collecting the Laser power-up)

Power-ups (catch them with the paddle):

- Multi-ball: spawns extra balls
- Laser: grants limited laser volleys
- Gravity Well: attracts balls toward your pointer for a short time

## Run Locally

1. Install dependencies:

   ```shell
   npm install
   ```

2. Start the dev server:

   ```shell
   npm run dev
   ```

3. Open the local URL printed by Vite.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run preview` — preview the production build

## Project Notes

- Game code lives in `src/`.
- Art/audio assets are served from `public/Assets/`.
- This project started as a p5.js prototype and has been rewritten into a scene-based Three.js engine.

## Architecture

This codebase is intentionally structured like a tiny engine so new gameplay features can be added without turning `PlayScene` into a monolith.

### High-Level Flow

1. `src/main.js` bootstraps services and registers scenes.
2. `Engine` runs a `requestAnimationFrame` loop.
3. Each frame:
   - `InputService` updates edge-triggered input (`wasPressed(...)`, `leftPressedThisFrame`).
   - `SceneManager` calls `activeScene.update(dtSeconds)`.
   - `RenderService` draws whatever the active scene returns from `getRenderTarget()`.

Key files:

- `src/engine/Engine.js` — the RAF loop (never stops on a scene exception)
- `src/engine/SceneManager.js` — scene switching + update/render routing
- `src/engine/Scene.js` — base scene interface

### Scenes

Scenes are responsible for orchestrating gameplay and drawing:

- `src/scenes/TitleScene.js` — animated menu background + title UI
- `src/scenes/PlayScene.js` — gameplay loop (paddle/balls/bricks/power-ups)
- `src/scenes/EndScene.js` — end screen + summary UI

Scenes depend on services (input/audio/ui/assets) but are not tightly coupled to the renderer.

### Services

Services are single-purpose utilities shared across scenes:

- `src/services/RenderService.js` — Three renderer setup, resize, render
- `src/services/InputService.js` — keyboard + pointer state with per-frame edges
- `src/services/UiService.js` — DOM overlay panels (title / pause / end)
- `src/services/AssetService.js` — texture loading + caching
- `src/services/AudioService.js` — Tone.js synth music + SFX

### Entities (Game Objects)

Game entities are small classes that own:

- their simulation state (position/velocity/health/etc)
- a Three mesh
- a `syncMesh()` method that pushes state → render

Examples:

- `src/game/entities/Paddle.js`
- `src/game/entities/Ball.js`
- `src/game/entities/Brick.js`
- `src/game/entities/PowerUp.js`
- `src/game/entities/LaserShot.js`
- `src/game/entities/GravityWell.js`

### Coordinate System

Gameplay simulation uses a **Y-down** coordinate system (top-left origin) to match the original mental model.
Three.js uses **Y-up**, so entities convert when syncing meshes:

- simulation `(x, y)` becomes render `(x, GAME.HEIGHT - y)`

This keeps collision math intuitive while still rendering correctly.

### Adding Features

Common extension points:

- **New scene**: create `src/scenes/MyScene.js`, register it in `src/main.js`, and swap via `SceneManager.setActive(...)`.
- **New power-up**:
  1.  Add a new type in `src/game/entities/PowerUp.js` (`PowerUpType`).
  2.  Add constants in `src/game/GameConstants.js`.
  3.  Load a texture in `PlayScene._loadTextures()`.
  4.  Spawn/apply it in `PlayScene._maybeSpawnPowerUp()` / `_applyPowerUp()`.
- **New SFX**: add a method in `AudioService` (Tone synth) and trigger it from the relevant scene.

### Debug Tips

- `window.__BB` is exposed in dev for quick scene/audio poking.
- If something appears to “pause” unexpectedly, check the browser console; the engine logs update exceptions as `Engine tick error:`.

## License

MIT
