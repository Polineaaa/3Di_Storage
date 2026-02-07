import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadModel(containerId, modelUrl) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Контейнер не найден:", containerId);
    return;
  }
  if (!modelUrl) {
    console.error("modelUrl пустой для контейнера:", containerId);
    container.innerHTML = '❌ No URL';
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Свет
  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  let loadedModel = null;

  // Загрузка модели
  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      loadedModel = gltf.scene;
      fitCameraToObject(camera, loadedModel, 1.5);
      scene.add(loadedModel);
    },
    undefined,
    (error) => {
      console.error('Ошибка загрузки:', error);
      container.innerHTML = '❌ Error';
    }
  );

  function animate() {
    requestAnimationFrame(animate);

    // Если модель уже загружена - слегка вращаем
    if (loadedModel) {
      loadedModel.rotation.y += 0.005;
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (h === 0) return; // защита на случай сломанного CSS

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function fitCameraToObject(camera, object, offset = 1.25) {
  const boundingBox = new THREE.Box3().setFromObject(object);
  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  object.position.set(-center.x, -center.y, -center.z);

  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= offset;

  camera.position.set(0, maxDim * 0.5, cameraZ);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
