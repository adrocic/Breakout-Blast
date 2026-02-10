import { Scene } from "../engine/Scene.js";
import { MenuBackground } from "../menu/MenuBackground.js";

export class TitleScene extends Scene {
  /**
   * @param {{ renderService: any, ui: any, input: any, audio?: any, actions: { startGame: Function } }} deps
   */
  constructor({ renderService, ui, input, audio, actions }) {
    super();
    this._renderService = renderService;
    this._ui = ui;
    this._input = input;
    this._audio = audio;
    this._actions = actions;

    this._bg = new MenuBackground();
    this._elapsed = 0;
  }

  async enter() {
    this._ui.setState({ mode: "title" });
    this._bg.setTheme("title");
    this._audio?.setMusicMode?.("menu");
  }

  update(dtSeconds) {
    this._elapsed += dtSeconds;

    // Keep camera aspect in sync with renderer size.
    this._bg.resize(window.innerWidth, window.innerHeight);

    this._bg.update(this._elapsed);

    // Enter starts the game.
    if (
      this._input.wasPressed("Enter") ||
      this._input.wasPressed("NumpadEnter")
    ) {
      this._actions.startGame();
    }
  }

  getRenderTarget() {
    return { scene: this._bg.scene, camera: this._bg.camera };
  }
}
