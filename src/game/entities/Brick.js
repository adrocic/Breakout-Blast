import * as THREE from "three";
import { GAME } from "../GameConstants.js";

export class Brick {
  /**
   * @param {{ x: number, y: number, width: number, height: number, health: number, texturesByHealth: Map<number, THREE.Texture> }} init
   */
  constructor(init) {
    this.x = init.x;
    this.y = init.y;
    this.width = init.width;
    this.height = init.height;
    this.health = init.health;

    this._texturesByHealth = init.texturesByHealth;

    const geom = new THREE.PlaneGeometry(this.width, this.height);
    const tex =
      this._texturesByHealth.get(this.health) || this._texturesByHealth.get(1);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    this.mesh = new THREE.Mesh(geom, mat);

    this.syncMesh();
  }

  /**
   * @returns {boolean} true if destroyed
   */
  damage(amount) {
    this.health = Math.max(0, this.health - amount);

    if (this.health <= 0) {
      return true;
    }

    const nextTex = this._texturesByHealth.get(this.health);
    if (nextTex) {
      this.mesh.material.map = nextTex;
      this.mesh.material.needsUpdate = true;
    }

    return false;
  }

  syncMesh() {
    this.mesh.position.set(
      this.x + this.width / 2,
      GAME.HEIGHT - (this.y + this.height / 2),
      0,
    );
  }
}
