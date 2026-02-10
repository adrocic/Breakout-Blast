import * as THREE from "three";
import { GAME } from "../GameConstants.js";

export class GravityWell {
  /**
   * @param {{ cx: number, cy: number, radius: number, texture: THREE.Texture }} init
   */
  constructor(init) {
    this.cx = init.cx;
    this.cy = init.cy;
    this.radius = init.radius;

    const size = this.radius * 2;
    const geom = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: init.texture,
      transparent: true,
      opacity: 0.85,
    });
    this.mesh = new THREE.Mesh(geom, mat);

    this.syncMesh();
  }

  setPosition(cx, cy) {
    this.cx = cx;
    this.cy = cy;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.cx, GAME.HEIGHT - this.cy, 1.5);
  }

  dispose() {
    if (this.mesh?.geometry) this.mesh.geometry.dispose();
    if (this.mesh?.material) this.mesh.material.dispose();
  }
}
