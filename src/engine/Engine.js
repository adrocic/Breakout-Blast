export class Engine {
  /**
   * @param {{ sceneManager: any, inputService: any }} deps
   */
  constructor({ sceneManager, inputService }) {
    this._sceneManager = sceneManager;
    this._input = inputService;

    this._running = false;
    this._lastTimeMs = 0;
    this._boundTick = (t) => this._tick(t);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTimeMs = performance.now();
    requestAnimationFrame(this._boundTick);
  }

  stop() {
    this._running = false;
  }

  _tick(timeMs) {
    if (!this._running) return;

    const dtMs = Math.min(100, Math.max(0, timeMs - this._lastTimeMs));
    this._lastTimeMs = timeMs;
    const dtSeconds = dtMs / 1000;

    this._input.beginFrame();
    try {
      this._sceneManager.update(dtSeconds);
    } catch (err) {
      // Never let a single scene bug kill the RAF loop.
      console.error("Engine tick error:", err);
    } finally {
      this._input.endFrame();
    }

    requestAnimationFrame(this._boundTick);
  }
}
