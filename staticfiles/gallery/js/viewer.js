import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function loadModel(containerId, modelUrl) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Контейнер не найден:', containerId);
    return;
  }

  if (!modelUrl) {
    console.error('modelUrl пустой для контейнера:', containerId);
    container.innerHTML = '❌ No URL';
    return;
  }

  // --- Сцена ---
  const scene = new THREE.Scene();
  scene.background = null;

  // --- Камера ---
  const w0 = container.clientWidth || 1;
  const h0 = container.clientHeight || 1;
  const camera = new THREE.PerspectiveCamera(45, w0 / h0, 0.1, 2000);

  // --- Рендерер ---
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setSize(w0, h0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  renderer.shadowMap.enabled = false;
  renderer.physicallyCorrectLights = false;

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // --- Controls ---
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = true;

  // --- Environment (мягкий равномерный свет) ---
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  // ===== Равномерное освещение + лёгкий голубой контровой =====

  // Мягкая общая заливка, чтобы не было жёстких перепадов
  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambient);

  // 3 "студийных" источника вокруг, с небольшой мощностью
  const lightTop = new THREE.DirectionalLight(0xffffff, 0.35);
  lightTop.position.set(0, 6, 0);
  scene.add(lightTop);

  const lightFront = new THREE.DirectionalLight(0xffffff, 0.45);
  lightFront.position.set(0, 1.5, 6);
  scene.add(lightFront);

  const lightSide = new THREE.DirectionalLight(0xffffff, 0.35);
  lightSide.position.set(6, 1.5, 0);
  scene.add(lightSide);

  // Лёгкий голубой контровой сзади (очень слабый, чисто обводка)
  const rimBlue = new THREE.DirectionalLight(0x9fd6ff, 0.28);
  rimBlue.position.set(-3, 3.5, -6);
  scene.add(rimBlue);


  // --- Loading overlay ---
  const loaderDiv = document.createElement('div');
  loaderDiv.className = 'loader-overlay';
  loaderDiv.innerHTML = `
    <div class="loader-title">Загрузка...</div>
    <div class="progress-bar"><div class="progress-fill"></div></div>
  `;
  container.appendChild(loaderDiv);
  const progressFill = loaderDiv.querySelector('.progress-fill');

  // --- Load model ---
  const loader = new GLTFLoader();
  let loadedModel = null;
  let stopped = false;

  loader.load(
    modelUrl,
    (gltf) => {
      if (stopped) return;

      loadedModel = gltf.scene;

      // нормализация материалов, чтобы все модели выглядели “в одном мире”
      loadedModel.traverse((obj) => {
        if (!obj.isMesh) return;

        obj.castShadow = false;
        obj.receiveShadow = false;

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;

          if ('envMapIntensity' in m) m.envMapIntensity = 0.85;
          if ('roughness' in m) m.roughness = clamp(m.roughness ?? 0.7, 0.25, 1.0);
          if ('metalness' in m) m.metalness = clamp(m.metalness ?? 0.0, 0.0, 1.0);

          m.needsUpdate = true;
        });
      });

      scene.add(loadedModel);
      fitCameraToObject(camera, controls, loadedModel, 1.55);

      if (progressFill) progressFill.style.width = '100%';
      loaderDiv.classList.add('is-done');
      setTimeout(() => loaderDiv.remove(), 250);
    },
    (xhr) => {
      if (!progressFill) return;

      if (xhr.total && xhr.total > 0) {
        const percent = Math.min(99, (xhr.loaded / xhr.total) * 100);
        progressFill.style.width = percent.toFixed(1) + '%';
      } else {
        const cur = parseFloat(progressFill.style.width) || 0;
        const next = Math.min(90, cur + 1.2);
        progressFill.style.width = next + '%';
      }
    },
    (error) => {
      console.error('Ошибка загрузки:', error);
      loaderDiv.innerHTML = `
        <div class="error-msg">
          ❌ Ошибка загрузки<br>
          <small>Проверь файл и путь</small>
        </div>
      `;
    }
  );

  // --- Animate ---
  function animate() {
    if (stopped) return;
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // --- Resize ---
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // --- Cleanup when user clicks again / page changes ---
  // (без этого у тебя со временем будет утечка canvas/рендеров)
  container.__disposeViewer?.();
  container.__disposeViewer = () => {
    stopped = true;
    window.removeEventListener('resize', onResize);
    controls.dispose();

    if (loadedModel) {
      loadedModel.traverse((obj) => {
        if (!obj.isMesh) return;
        if (obj.geometry) obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          if (m.map) m.map.dispose();
          if (m.normalMap) m.normalMap.dispose();
          if (m.roughnessMap) m.roughnessMap.dispose();
          if (m.metalnessMap) m.metalnessMap.dispose();
          m.dispose?.();
        });
      });
      scene.remove(loadedModel);
    }

    envRT.texture.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}

function fitCameraToObject(camera, controls, object, offset = 1.25) {
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  object.position.set(-center.x, -center.y, -center.z);

  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * offset;
  cameraZ = Math.max(cameraZ, 1);

  camera.near = Math.max(0.01, maxDim / 100);
  camera.far = Math.max(2000, maxDim * 100);
  camera.updateProjectionMatrix();

  camera.position.set(0, maxDim * 0.45, cameraZ);
  controls.target.set(0, 0, 0);

  controls.minDistance = Math.max(0.05, maxDim / 100);
  controls.maxDistance = Math.max(50, maxDim * 10);

  controls.update();
}

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}
