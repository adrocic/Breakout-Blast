(function initMenuScene() {
    if (typeof THREE === 'undefined' || typeof document === 'undefined') {
        return;
    }

    const container = document.getElementById('three-menu-bg');
    if (!container) {
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 2.2, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xb8f0ff, 1.4);
    keyLight.position.set(-3, 6, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff9ad2, 0.75);
    rimLight.position.set(8, 2, -4);
    scene.add(rimLight);

    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);

    const bubbleGeometry = new THREE.SphereGeometry(1, 28, 24);
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.65,
        roughness: 0.22,
        metalness: 0.04
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
        color: 0xffb8e6,
        transparent: true,
        opacity: 0.45,
        roughness: 0.32,
        metalness: 0.03
    });

    const clouds = [];
    const cloudCount = 26;
    for (let i = 0; i < cloudCount; i++) {
        const isAccent = i % 6 === 0;
        const mesh = new THREE.Mesh(bubbleGeometry, isAccent ? accentMaterial.clone() : cloudMaterial.clone());
        const scale = 0.5 + Math.random() * 1.8;
        mesh.scale.set(scale * 1.5, scale, scale);
        mesh.position.set(
            (Math.random() - 0.5) * 24,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 16
        );
        mesh.userData = {
            velocityX: 0.1 + Math.random() * 0.35,
            bobSpeed: 0.35 + Math.random() * 0.6,
            bobOffset: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        };
        cloudGroup.add(mesh);
        clouds.push(mesh);
    }

    const gradientPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(70, 40),
        new THREE.MeshBasicMaterial({ color: 0x90d8ff, transparent: true, opacity: 0.3 })
    );
    gradientPlane.position.set(0, 0, -18);
    scene.add(gradientPlane);

    let active = true;
    let theme = 'title';
    const themeColors = {
        title: { bg: 0x8fd8ff, accent: 0xffb8e6 },
        victory: { bg: 0x9debb8, accent: 0x95d9ff },
        defeat: { bg: 0xffb2c8, accent: 0x8ec8ff }
    };

    function applyTheme() {
        const selected = themeColors[theme] || themeColors.title;
        gradientPlane.material.color.setHex(selected.bg);

        clouds.forEach((mesh, index) => {
            if (index % 6 === 0) {
                mesh.material.color.setHex(selected.accent);
                return;
            }
            mesh.material.color.setHex(0xffffff);
        });
    }

    function animate(timeMs) {
        const t = timeMs * 0.001;

        if (active) {
            cloudGroup.rotation.y = Math.sin(t * 0.09) * 0.1;

            clouds.forEach(mesh => {
                mesh.position.x += mesh.userData.velocityX * 0.008;
                mesh.position.y += Math.sin(t * mesh.userData.bobSpeed + mesh.userData.bobOffset) * 0.0028;
                mesh.rotation.y += mesh.userData.rotationSpeed * 0.01;

                if (mesh.position.x > 14) {
                    mesh.position.x = -14;
                }
            });

            renderer.render(scene, camera);
        }

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    applyTheme();
    requestAnimationFrame(animate);

    window.MenuScene = {
        setActive(value) {
            active = Boolean(value);
            container.classList.toggle('hidden', !active);
        },
        setTheme(nextTheme) {
            theme = nextTheme;
            applyTheme();
        }
    };
})();
