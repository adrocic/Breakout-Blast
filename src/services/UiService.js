export class UiService {
  /**
   * @param {{ onStart: Function, onRetry: Function, onMainMenu: Function, onResume: Function, onVolume: Function }} handlers
   */
  constructor(handlers) {
    this._handlers = handlers;

    const root = document.getElementById("menu-ui");
    if (!root) throw new Error("Missing #menu-ui");

    this._els = {
      root,
      titlePanel: document.getElementById("menu-title-panel"),
      endPanel: document.getElementById("menu-end-panel"),
      pausePanel: document.getElementById("menu-pause-panel"),
      endTitle: document.getElementById("menu-end-title"),
      endSubtitle: document.getElementById("menu-end-subtitle"),
      summary: document.getElementById("menu-summary"),
      startButton: document.getElementById("menu-start-button"),
      retryButton: document.getElementById("menu-retry-button"),
      mainMenuButton: document.getElementById("menu-main-button"),
      resumeButton: document.getElementById("menu-resume-button"),
      pauseRetryButton: document.getElementById("menu-pause-retry-button"),
      pauseMainButton: document.getElementById("menu-pause-main-button"),
      volumeRange: document.getElementById("menu-volume-range"),
    };

    this._wire();
  }

  notifyStart() {
    this._handlers.onStart?.();
  }

  notifyRetry() {
    this._handlers.onRetry?.();
  }

  notifyMainMenu() {
    this._handlers.onMainMenu?.();
  }

  notifyResume() {
    this._handlers.onResume?.();
  }

  _wire() {
    const {
      startButton,
      retryButton,
      mainMenuButton,
      resumeButton,
      pauseRetryButton,
      pauseMainButton,
      volumeRange,
    } = this._els;

    if (startButton) {
      startButton.addEventListener("click", () => this._handlers.onStart?.());
    }

    if (retryButton) {
      retryButton.addEventListener("click", () => this._handlers.onRetry?.());
    }

    if (mainMenuButton) {
      mainMenuButton.addEventListener("click", () =>
        this._handlers.onMainMenu?.(),
      );
    }

    if (resumeButton) {
      resumeButton.addEventListener("click", () => this._handlers.onResume?.());
    }

    if (pauseRetryButton) {
      pauseRetryButton.addEventListener("click", () =>
        this._handlers.onRetry?.(),
      );
    }

    if (pauseMainButton) {
      pauseMainButton.addEventListener("click", () =>
        this._handlers.onMainMenu?.(),
      );
    }

    if (volumeRange) {
      volumeRange.addEventListener("input", (event) => {
        const raw = /** @type {HTMLInputElement} */ (event.target).value;
        const value = parseFloat(raw);
        if (!Number.isNaN(value)) {
          this._handlers.onVolume?.(value);
        }
      });
    }
  }

  /**
   * @param {{ mode: 'title'|'end'|'pause'|'hidden', end?: { title: string, subtitle: string, summaryHtml: string }, theme?: 'title'|'victory'|'defeat' }} state
   */
  setState(state) {
    const {
      root,
      titlePanel,
      endPanel,
      pausePanel,
      endTitle,
      endSubtitle,
      summary,
    } = this._els;

    const isTitle = state.mode === "title";
    const isEnd = state.mode === "end";
    const isPause = state.mode === "pause";

    root.classList.toggle("visible", isTitle || isEnd || isPause);
    root.classList.toggle("end-state", isEnd);

    if (titlePanel) titlePanel.classList.toggle("hidden", !isTitle);
    if (endPanel) endPanel.classList.toggle("hidden", !isEnd);
    if (pausePanel) pausePanel.classList.toggle("hidden", !isPause);

    if (isEnd && state.end) {
      if (endTitle) endTitle.textContent = state.end.title;
      if (endSubtitle) endSubtitle.textContent = state.end.subtitle;
      if (summary) summary.innerHTML = state.end.summaryHtml;
    }
  }
}
