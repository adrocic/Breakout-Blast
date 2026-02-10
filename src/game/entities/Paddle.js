import * as THREE from "three";
import { clamp } from "../math/collisions.js";
import { GAME } from "../GameConstants.js";

export class Paddle {
  /**
   * @param {{ x: number, y: number, width: number, height: number, texture: THREE.Texture }} init
   */
  constructor(init) {
    this.x = init.x;
    this.y = init.y;
    this.width = init.width;
    this.height = init.height;

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
   * @param {{ left: boolean, right: boolean }} input
   * @param {{ minX: number, maxX: number }} bounds
   * @param {number} speedPerFrame
   */
  update(dtSeconds, input, bounds, speedPerFrame) {
    const frameMultiplier = dtSeconds * 60;
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (direction !== 0) {
      this.x += direction * speedPerFrame * frameMultiplier;
    }

    this.x = clamp(this.x, bounds.minX, bounds.maxX - this.width);
    this.syncMesh();
  }

  syncMesh() {
    // Three.js plane is centered; our world coordinates are top-left.
    this.mesh.position.set(
      this.x + this.width / 2,
      GAME.HEIGHT - (this.y + this.height / 2),
      0,
    );
  }
}
