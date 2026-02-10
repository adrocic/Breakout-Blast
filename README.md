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

## License

MIT
