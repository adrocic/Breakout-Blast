import * as THREE from "three";
import { GAME } from "../GameConstants.js";

export const PowerUpType = Object.freeze({
  MULTIBALL: "multiball",
  LASER: "laser",
  GRAVITY_WELL: "gravity-well",
});

export class PowerUp {
  /**
   * @param {{ cx: number, cy: number, radius: number, type: string, texture: THREE.Texture, vyPerFrame: number }} init
   */
  constructor(init) {
    this.cx = init.cx;
    this.cy = init.cy;
    this.radius = init.radius;
    this.type = init.type;
    this.vyPerFrame = init.vyPerFrame;

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
  update(dtSeconds) {
    const frameMultiplier = dtSeconds * 60;
    this.cy += this.vyPerFrame * frameMultiplier;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.cx, GAME.HEIGHT - this.cy, 2);
  }

  dispose() {
    if (this.mesh?.geometry) this.mesh.geometry.dispose();
    if (this.mesh?.material) this.mesh.material.dispose();
  }
}
