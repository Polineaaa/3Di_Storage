import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// DOM
const fileInput = document.querySelector('input[type="file"]');
const previewContainer = document.getElementById('preview-container');
const hiddenInput = document.getElementById('id_image_data');
const submitBtn = document.getElementById('submit-btn');

if (submitBtn) {
  submitBtn.disabled = true;
  submitBtn.innerText = 'Сначала выбери файл';
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Сброс состояния
    if (hiddenInput) hiddenInput.value = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Генерация превью...';
    }

    const url = URL.createObjectURL(file);
    generateThumbnail(url);
  });
}

function generateThumbnail(modelUrl) {
  if (!previewContainer) return;

  // Размеры превью под карточку
  const width = 300;
  const height = 220;

  // UI
  previewContainer.innerHTML = '';
  const status = document.createElement('div');
  status.textContent = 'Генерация...';
  status.style.cssText = 'font-weight:700; opacity:.7; padding:10px;';
  previewContainer.appendChild(status);

  // Scene
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true, // нужно для toDataURL
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // прозрачный фон

  // Вставляем canvas
  previewContainer.innerHTML = '';
  previewContainer.appendChild(renderer.domElement);

  // Свет
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // Загрузка модели
  const loader = new GLTFLoader();

  loader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;

      // Центрируем модель
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      model.position.sub(center);
      scene.add(model);

      // Камера так, чтобы модель влезла
      const fov = (camera.fov * Math.PI) / 190;
      const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6;

      camera.position.set(cameraZ * 0.55, cameraZ * 0.45, cameraZ);
      camera.lookAt(0, 0, 0);

      // Рендер одного кадра
      renderer.render(scene, camera);

      // Сохраняем ТОЛЬКО PNG (с прозрачностью)
      const dataURL = renderer.domElement.toDataURL('image/png');

      if (hiddenInput) hiddenInput.value = dataURL;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Загрузить в базу';
      }

      URL.revokeObjectURL(modelUrl);
    },
    undefined,
    (err) => {
      console.error(err);
      previewContainer.innerHTML = 'Ошибка генерации превью';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Ошибка превью';
      }
      URL.revokeObjectURL(modelUrl);
    }
  );
}
