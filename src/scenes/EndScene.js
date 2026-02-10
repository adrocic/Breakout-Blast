import { Scene } from "../engine/Scene.js";
import { MenuBackground } from "../menu/MenuBackground.js";

export class EndScene extends Scene {
  /**
   * @param {{ ui: any, input: any, audio?: any, actions: { retry: Function, mainMenu: Function } }} deps
   */
  constructor({ ui, input, audio, actions }) {
    super();
    this._ui = ui;
    this._input = input;
    this._audio = audio;
    this._actions = actions;

    this._bg = new MenuBackground();
    this._elapsed = 0;
    this._result = "defeat";
  }

  /**
   * @param {{ result: 'victory'|'defeat', summaryHtml?: string }} context
   */
  async enter(context) {
    this._result = context?.result || "defeat";
    const isVictory = this._result === "victory";

    this._audio?.setMusicMode?.(isVictory ? "victory" : "defeat");

    this._bg.setTheme(isVictory ? "victory" : "defeat");

    this._ui.setState({
      mode: "end",
      end: {
        title: isVictory ? "Course Cleared!" : "Cloudy Crash!",
        subtitle: isVictory
          ? "You bounced through every block in style."
          : "You got close — jump back in for another run.",
        summaryHtml:
          context?.summaryHtml || "<li>Play a round to track your stats!</li>",
      },
    });
  }

  update(dtSeconds) {
    this._elapsed += dtSeconds;

    this._bg.resize(window.innerWidth, window.innerHeight);
    this._bg.update(this._elapsed);

    if (
      this._input.wasPressed("Enter") ||
      this._input.wasPressed("NumpadEnter")
    ) {
      this._actions.retry();
    }

    // Match existing behavior: 'M' returns to main menu.
    if (this._input.wasPressed("KeyM")) {
      this._actions.mainMenu();
    }
  }

  getRenderTarget() {
    return { scene: this._bg.scene, camera: this._bg.camera };
  }
}
