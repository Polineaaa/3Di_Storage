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

  // Сцена
  const scene = new THREE.Scene();
  scene.background = null; // прозрачный фон

  // Камера
  const w0 = container.clientWidth || 1;
  const h0 = container.clientHeight || 1;
  const camera = new THREE.PerspectiveCamera(45, w0 / h0, 0.1, 1000);

  // Рендерер
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w0, h0);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Кинематографичная картинка
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Environment light (реалистичный свет)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnvironment = new RoomEnvironment();
  scene.environment = pmremGenerator.fromScene(roomEnvironment).texture;

  // Loading overlay
  const loaderDiv = document.createElement('div');
  loaderDiv.className = 'loader-overlay';
  loaderDiv.innerHTML = `
    <div class="loader-title">Загрузка...</div>
    <div class="progress-bar"><div class="progress-fill"></div></div>
  `;
  container.appendChild(loaderDiv);

  const progressFill = loaderDiv.querySelector('.progress-fill');

  // Загрузка модели
  const loader = new GLTFLoader();
  let loadedModel = null;

  loader.load(
    modelUrl,

    // onLoad
    (gltf) => {
      loadedModel = gltf.scene;
      scene.add(loadedModel);

      fitCameraToObject(camera, controls, loadedModel, 1.5);

      // Скрываем лоадер
      loaderDiv.classList.add('is-done');
      setTimeout(() => loaderDiv.remove(), 300);
    },

    // onProgress
    (xhr) => {
      if (!progressFill) return;

      // Иногда total = 0 (сервер не отдал длину) - тогда просто крутим "псевдо"
      if (xhr.total && xhr.total > 0) {
        const percent = Math.min(100, (xhr.loaded / xhr.total) * 100);
        progressFill.style.width = percent.toFixed(1) + '%';
      } else {
        // плавно растём до 90%, пока не будет onLoad
        const cur = parseFloat(progressFill.style.width) || 0;
        const next = Math.min(90, cur + 1.5);
        progressFill.style.width = next + '%';
      }
    },

    // onError
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

  // Рендер-цикл
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Resize (на размер контейнера)
  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function fitCameraToObject(camera, controls, object, offset = 1.25) {
  // гарантируем корректные матрицы
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Центруем модель
  object.position.set(-center.x, -center.y, -center.z);

  // Дистанция камеры по FOV
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
  cameraZ *= offset;

  // Защита от слишком маленьких моделей
  cameraZ = Math.max(cameraZ, 1);

  // Подстройка клиппинга под размер
  camera.near = Math.max(0.01, maxDim / 100);
  camera.far = Math.max(1000, maxDim * 100);

  // Ставим камеру чуть выше центра
  camera.position.set(0, maxDim * 0.5, cameraZ);
  camera.updateProjectionMatrix();

  // Orbit вокруг центра
  controls.target.set(0, 0, 0);

  // Ограничения зума под размер модели (важно!)
  controls.minDistance = Math.max(0.05, maxDim / 100);
  controls.maxDistance = Math.max(50, maxDim * 10);

  controls.update();
}
