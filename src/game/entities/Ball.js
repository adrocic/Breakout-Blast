import * as THREE from "three";
import { GAME } from "../GameConstants.js";

export class Ball {
  /**
   * @param {{ cx: number, cy: number, radius: number, texture: THREE.Texture, poweredTexture?: THREE.Texture, vxPerFrame: number, vyPerFrame: number }} init
   */
  constructor(init) {
    this.cx = init.cx;
    this.cy = init.cy;
    this.prevCx = init.cx;
    this.prevCy = init.cy;
    this.radius = init.radius;

    this.vxPerFrame = init.vxPerFrame;
    this.vyPerFrame = init.vyPerFrame;

    /** @type {1|2|3} */
    this.strengthTier = 1;
    this._normalTexture = init.texture;
    this._poweredTexture = init.poweredTexture || null;

    this.isCaught = false;
    /** @type {'left'|'right'|null} */
    this.caughtSide = null;
    this.caughtOffsetY = 0;
    this.aimAngle = -Math.PI / 2;

    const size = this.radius * 2;
    const geom = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: init.texture,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(geom, mat);

    this.syncMesh();
  }

  /**
   * @param {number} dtSeconds
   */
  move(dtSeconds) {
    this.prevCx = this.cx;
    this.prevCy = this.cy;

    if (this.isCaught) {
      return;
    }

    const frameMultiplier = dtSeconds * 60;
    this.cx += this.vxPerFrame * frameMultiplier;
    this.cy += this.vyPerFrame * frameMultiplier;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.cx, GAME.HEIGHT - this.cy, 1);
  }

  /** @returns {number} */
  getSpeedPerFrame() {
    return Math.hypot(this.vxPerFrame, this.vyPerFrame);
  }

  /**
   * @param {number} newSpeed
   */
  setSpeedPerFrame(newSpeed) {
    const speed = Math.max(0, Number(newSpeed) || 0);
    const cur = this.getSpeedPerFrame();
    if (cur <= 0.0001) {
      // Default up-right if somehow stopped.
      this.vxPerFrame = speed * 0.6;
      this.vyPerFrame = -speed * 0.8;
      return;
    }
    const nx = this.vxPerFrame / cur;
    const ny = this.vyPerFrame / cur;
    this.vxPerFrame = nx * speed;
    this.vyPerFrame = ny * speed;
  }

  /**
   * @param {1|2|3} tier
   */
  setStrengthTier(tier) {
    const next = tier === 3 ? 3 : tier === 2 ? 2 : 1;
    if (this.strengthTier === next) return;
    this.strengthTier = next;

    const mat = /** @type {THREE.MeshBasicMaterial} */ (this.mesh.material);
    if (this._poweredTexture && next >= 2) {
      mat.map = this._poweredTexture;
    } else {
      mat.map = this._normalTexture;
    }
    mat.needsUpdate = true;
  }
}
