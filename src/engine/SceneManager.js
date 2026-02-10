export class SceneManager {
  /**
   * @param {{ renderService: any }} deps
   */
  constructor({ renderService }) {
    this._renderService = renderService;
    /** @type {Map<string, any>} */
    this._scenes = new Map();
    /** @type {any} */
    this._active = null;
    this._activeKey = null;
    this._context = null;
  }

  /**
   * @template T
   * @param {string} key
   * @param {T} scene
   */
  register(key, scene) {
    if (!key) throw new Error("Scene key is required");
    this._scenes.set(key, scene);
  }

  /**
   * @param {string} key
   * @param {object} context
   */
  async setActive(key, context = {}) {
    const next = this._scenes.get(key);
    if (!next) {
      throw new Error(`Unknown scene: ${key}`);
    }

    if (this._active && typeof this._active.exit === "function") {
      await this._active.exit();
    }

    this._active = next;
    this._activeKey = key;
    this._context = context;

    if (this._active && typeof this._active.enter === "function") {
      await this._active.enter(context);
    }
  }

  /** @returns {string|null} */
  get activeKey() {
    return this._activeKey;
  }

  /** @returns {any|null} */
  get activeScene() {
    return this._active;
  }

  /**
   * @param {number} dtSeconds
   */
  update(dtSeconds) {
    if (this._active && typeof this._active.update === "function") {
      this._active.update(dtSeconds);
    }

    if (!this._active || typeof this._active.getRenderTarget !== "function") {
      return;
    }

    const target = this._active.getRenderTarget();
    if (!target) {
      return;
    }

    this._renderService.render(target.scene, target.camera, {
      viewport: target.viewport,
    });
  }
}
