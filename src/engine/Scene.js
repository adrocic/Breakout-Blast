export class Scene {
  /**
   * @param {object} context
   * @returns {void|Promise<void>}
   */
  enter(context) {}

  /** @returns {void|Promise<void>} */
  exit() {}

  /**
   * @param {number} dtSeconds
   * @returns {void}
   */
  update(dtSeconds) {}

  /**
   * @returns {{ scene: import('three').Scene, camera: import('three').Camera } | null}
   */
  getRenderTarget() {
    return null;
  }
}
