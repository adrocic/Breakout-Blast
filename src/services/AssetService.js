import * as THREE from "three";

export class AssetService {
  constructor() {
    this._textures = new Map();
    this._loader = new THREE.TextureLoader();
  }

  /**
   * @param {string} url
   * @returns {Promise<THREE.Texture>}
   */
  loadTexture(url) {
    if (this._textures.has(url)) {
      return Promise.resolve(this._textures.get(url));
    }

    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.needsUpdate = true;
          this._textures.set(url, texture);
          resolve(texture);
        },
        undefined,
        (err) => reject(err),
      );
    });
  }
}
