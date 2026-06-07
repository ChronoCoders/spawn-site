import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';

export default function Hero3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(parent.clientWidth, parent.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080808);

    const camera = new THREE.PerspectiveCamera(45, parent.clientWidth / parent.clientHeight, 0.1, 100);
    camera.position.set(4, 2, 6);
    camera.lookAt(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rustLight = new THREE.PointLight(0xc1440e, 3.0, 15);
    rustLight.position.set(-3, 2, 3);
    scene.add(rustLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -5, -5);
    scene.add(rimLight);

    // Material — metallic dark
    const createMaterial = (roughness: number, metalness: number, color?: number) =>
      new THREE.MeshStandardMaterial({
        color: color || 0x1a1a1a,
        roughness,
        metalness,
        envMapIntensity: 1.5,
      });

    // Hexagonal prism geometry
    function createHexPrism(radius: number, height: number) {
      const shape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
      }
      shape.closePath();
      const extrudeSettings = {
        depth: height,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 3,
      };
      return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    // Create stacked hexagonal prisms
    const prisms: THREE.Mesh[] = [];
    const configs = [
      { radius: 1.6, height: 0.28, y: -1.8, roughness: 0.15, metalness: 0.95 },
      { radius: 1.35, height: 0.24, y: -1.1, roughness: 0.12, metalness: 0.95 },
      { radius: 1.1, height: 0.22, y: -0.48, roughness: 0.1, metalness: 0.98 },
      { radius: 0.85, height: 0.2, y: 0.08, roughness: 0.08, metalness: 0.98 },
      { radius: 0.62, height: 0.18, y: 0.58, roughness: 0.06, metalness: 1.0 },
      { radius: 0.42, height: 0.16, y: 1.0, roughness: 0.05, metalness: 1.0 },
    ];

    configs.forEach((cfg, i) => {
      const geo = createHexPrism(cfg.radius, cfg.height);
      const mat = createMaterial(cfg.roughness, cfg.metalness);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, cfg.y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { baseY: cfg.y, index: i, speed: 0.3 + i * 0.05 };
      scene.add(mesh);
      prisms.push(mesh);
    });

    // Rust accent ring on top prism
    const ringGeo = new THREE.TorusGeometry(0.46, 0.015, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xc1440e,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0xc1440e,
      emissiveIntensity: 0.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 1.18, 0);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Floor plane for shadows
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1, metalness: 0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle fog
    scene.fog = new THREE.Fog(0x080808, 12, 30);

    let time = 0;
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    parent.addEventListener('mousemove', onMouseMove);

    let frameId = 0;
    let revealed = false;

    function animate() {
      frameId = requestAnimationFrame(animate);
      time += 0.01;

      // Each prism rotates at slightly different speed
      prisms.forEach((p, i) => {
        p.rotation.z = time * (0.15 + i * 0.03) * (i % 2 === 0 ? 1 : -1);
        // Floating bob
        p.position.y = p.userData.baseY + Math.sin(time * 0.6 + i * 0.4) * 0.04;
      });

      ring.rotation.z = -time * 0.4;
      ring.position.y = 1.18 + Math.sin(time * 0.6 + 5 * 0.4) * 0.04;

      // Rust light pulse
      rustLight.intensity = 2.5 + Math.sin(time * 1.2) * 0.8;

      // Camera subtle mouse follow
      camera.position.x = 4 + mouseX * 0.6;
      camera.position.y = 2 + mouseY * 0.4;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      // Fade the canvas in on the first rendered frame so the 3D appears
      // smoothly instead of popping in once the bundle finishes loading.
      if (!revealed) {
        revealed = true;
        canvas.style.opacity = '1';
      }
    }

    animate();

    const onResize = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      parent.removeEventListener('mousemove', onMouseMove);
      prisms.forEach((p) => {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
      ringGeo.dispose();
      ringMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', background: 'transparent', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', opacity: 0, transition: 'opacity 0.8s ease' }}
      />
    </div>
  );
}
