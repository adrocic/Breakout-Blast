import * as THREE from "three";
import { GAME } from "../GameConstants.js";

export class LaserShot {
  /**
   * @param {{ x: number, y: number, width: number, height: number, texture: THREE.Texture, vyPerFrame: number }} init
   */
  constructor(init) {
    this.x = init.x;
    this.y = init.y;
    this.width = init.width;
    this.height = init.height;
    this.vyPerFrame = init.vyPerFrame;

    const geom = new THREE.PlaneGeometry(this.width, this.height);
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
    this.y += this.vyPerFrame * frameMultiplier;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(
      this.x + this.width / 2,
      GAME.HEIGHT - (this.y + this.height / 2),
      3,
    );
  }

  dispose() {
    if (this.mesh?.geometry) this.mesh.geometry.dispose();
    if (this.mesh?.material) this.mesh.material.dispose();
  }
}
