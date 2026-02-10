import * as THREE from "three";

export class MenuBackground {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      120,
    );
    this.camera.position.set(0, 2.2, 13);

    const ambient = new THREE.AmbientLight(0xffffff, 1.25);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xb8f0ff, 1.4);
    keyLight.position.set(-3, 6, 7);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff9ad2, 0.75);
    rimLight.position.set(8, 2, -4);
    this.scene.add(rimLight);

    this._cloudGroup = new THREE.Group();
    this.scene.add(this._cloudGroup);

    const bubbleGeometry = new THREE.SphereGeometry(1, 28, 24);

    this._cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      roughness: 0.22,
      metalness: 0.04,
    });

    this._accentMaterial = new THREE.MeshStandardMaterial({
      color: 0xffb8e6,
      transparent: true,
      opacity: 0.45,
      roughness: 0.32,
      metalness: 0.03,
    });

    /** @type {THREE.Mesh[]} */
    this._clouds = [];
    const cloudCount = 26;
    for (let i = 0; i < cloudCount; i++) {
      const isAccent = i % 6 === 0;
      const mesh = new THREE.Mesh(
        bubbleGeometry,
        (isAccent ? this._accentMaterial : this._cloudMaterial).clone(),
      );
      const scale = 0.5 + Math.random() * 1.8;
      mesh.scale.set(scale * 1.5, scale, scale);
      mesh.position.set(
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 16,
      );
      mesh.userData = {
        velocityX: 0.1 + Math.random() * 0.35,
        bobSpeed: 0.35 + Math.random() * 0.6,
        bobOffset: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      };
      this._cloudGroup.add(mesh);
      this._clouds.push(mesh);
    }

    this._gradientPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 40),
      new THREE.MeshBasicMaterial({
        color: 0x90d8ff,
        transparent: true,
        opacity: 0.3,
      }),
    );
    this._gradientPlane.position.set(0, 0, -18);
    this.scene.add(this._gradientPlane);

    this._theme = "title";
    this._themeColors = {
      title: { bg: 0x8fd8ff, accent: 0xffb8e6 },
      victory: { bg: 0x9debb8, accent: 0x95d9ff },
      defeat: { bg: 0xffb2c8, accent: 0x8ec8ff },
    };

    this.applyTheme();
  }

  /**
   * @param {'title'|'victory'|'defeat'} theme
   */
  setTheme(theme) {
    this._theme = theme;
    this.applyTheme();
  }

  applyTheme() {
    const selected = this._themeColors[this._theme] || this._themeColors.title;
    this._gradientPlane.material.color.setHex(selected.bg);

    this._clouds.forEach((mesh, index) => {
      if (index % 6 === 0) {
        mesh.material.color.setHex(selected.accent);
        return;
      }
      mesh.material.color.setHex(0xffffff);
    });
  }

  /**
   * @param {number} timeSeconds
   */
  update(timeSeconds) {
    const t = timeSeconds;

    this._cloudGroup.rotation.y = Math.sin(t * 0.09) * 0.1;

    this._clouds.forEach((mesh) => {
      mesh.position.x += mesh.userData.velocityX * 0.008;
      mesh.position.y +=
        Math.sin(t * mesh.userData.bobSpeed + mesh.userData.bobOffset) * 0.0028;
      mesh.rotation.y += mesh.userData.rotationSpeed * 0.01;

      if (mesh.position.x > 14) {
        mesh.position.x = -14;
      }
    });
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
