import { Engine } from "./engine/Engine.js";
import { SceneManager } from "./engine/SceneManager.js";
import { RenderService } from "./services/RenderService.js";
import { InputService } from "./services/InputService.js";
import { AudioService } from "./services/AudioService.js";
import { UiService } from "./services/UiService.js";
import { AssetService } from "./services/AssetService.js";

import { TitleScene } from "./scenes/TitleScene.js";
import { PlayScene } from "./scenes/PlayScene.js";
import { EndScene } from "./scenes/EndScene.js";

const SCENES = Object.freeze({
  TITLE: "title",
  PLAY: "play",
  END: "end",
});

function bootstrap() {
  const renderService = new RenderService({ containerId: "three-menu-bg" });
  const input = new InputService();
  const audio = new AudioService();
  const assets = new AssetService();

  const sceneManager = new SceneManager({ renderService });

  function resumeGame() {
    const scene = sceneManager.activeScene;
    if (scene && typeof scene.setPaused === "function") {
      audio.playUiConfirm();
      scene.setPaused(false);
    }
  }

  const ui = new UiService({
    onStart: () => startGame(),
    onRetry: () => retry(),
    onMainMenu: () => mainMenu(),
    onResume: () => resumeGame(),
    onVolume: (value) => audio.setMasterVolume(value),
  });

  async function startGame() {
    await audio.ensureUnlocked();
    audio.playUiConfirm();
    audio.setMusicMode("play");
    await sceneManager.setActive(SCENES.PLAY, {});
  }

  async function retry() {
    await audio.ensureUnlocked();
    audio.playUiConfirm();
    audio.setMusicMode("play");
    await sceneManager.setActive(SCENES.PLAY, {});
  }

  async function mainMenu() {
    audio.setMusicMode("menu");
    await sceneManager.setActive(SCENES.TITLE, {});
  }

  async function endRound(result, summaryHtml) {
    audio.setMusicMode(result === "victory" ? "victory" : "defeat");
    await sceneManager.setActive(SCENES.END, { result, summaryHtml });
  }

  const title = new TitleScene({
    renderService,
    ui,
    input,
    audio,
    actions: { startGame },
  });

  const play = new PlayScene({
    ui,
    input,
    assets,
    audio,
    actions: { end: endRound },
  });

  const end = new EndScene({
    ui,
    input,
    audio,
    actions: { retry, mainMenu },
  });

  sceneManager.register(SCENES.TITLE, title);
  sceneManager.register(SCENES.PLAY, play);
  sceneManager.register(SCENES.END, end);

  const engine = new Engine({ sceneManager, inputService: input });

  // Initial scene
  sceneManager.setActive(SCENES.TITLE, {}).then(() => engine.start());

  // Helpful for manual testing in-dev.
  window.__BB = {
    sceneManager,
    audio,
    goEndVictory: () =>
      sceneManager.setActive(SCENES.END, { result: "victory" }),
    goEndDefeat: () => sceneManager.setActive(SCENES.END, { result: "defeat" }),
  };
}

bootstrap();
