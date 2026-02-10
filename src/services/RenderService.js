import * as THREE from "three";

export class RenderService {
  /**
   * @param {{ containerId: string }} options
   */
  constructor({ containerId }) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Render container not found: #${containerId}`);
    }

    this._container = container;

    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this._renderer.setClearColor(0x000000, 0);

    container.appendChild(this._renderer.domElement);

    this._resize = () => this.resize();
    window.addEventListener("resize", this._resize);
    this.resize();
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    this._renderer.dispose();
    if (this._renderer.domElement && this._renderer.domElement.parentElement) {
      this._renderer.domElement.parentElement.removeChild(
        this._renderer.domElement,
      );
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer.setSize(w, h);
  }

  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {{ viewport?: { x: number, y: number, width: number, height: number } }} [options]
   */
  render(scene, camera, options) {
    const viewport = options?.viewport;

    if (viewport) {
      this._renderer.setScissorTest(true);
      this._renderer.setViewport(
        viewport.x,
        viewport.y,
        viewport.width,
        viewport.height,
      );
      this._renderer.setScissor(
        viewport.x,
        viewport.y,
        viewport.width,
        viewport.height,
      );
    } else {
      this._renderer.setScissorTest(false);
      this._renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    }

    this._renderer.render(scene, camera);
  }

  /** @returns {THREE.WebGLRenderer} */
  get renderer() {
    return this._renderer;
  }
}
