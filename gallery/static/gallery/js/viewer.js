import * as THREE from 'three';
// 2. Экспортируем главную функцию
// Она принимает ID HTML-элемента, в который нужно вставить 3D
export function mountSimpleCube(containerId) {
const container = document.getElementById(containerId);
if (!container) {
console.error("Контейнер не найден:", containerId);
return;
}
// --- А. СЦЕНА ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0); // Светло-серый фон
// --- Б. КАМЕРА ---
// Угол обзора 75, пропорции как у контейнера, видеть от 0.1 до 1000 метров
const camera = new THREE.PerspectiveCamera(
75,
container.clientWidth / container.clientHeight,
0.1,
1000
);
camera.position.z = 2; // Отодвигаем камеру чуть назад
// --- В. РЕНДЕРЕР (Художник) ---
const renderer = new THREE.WebGLRenderer({ antialias: true }); 
renderer.setSize(container.clientWidth, container.clientHeight);
// Вставляем "холст" (canvas) внутрь нашего div
container.innerHTML = ''; // Очищаем текст "Wait..."
container.appendChild(renderer.domElement);
// --- Г. ОБЪЕКТ (Куб) ---
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x007bff }); // Синий
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
// --- Д. СВЕТ ---
const light = new THREE.DirectionalLight(0xffffff, 2); // Белый мощный свет
light.position.set(5, 5, 5);
scene.add(light);
// Добавим еще мягкий свет, чтобы тени не были черными
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
// --- Е. АНИМАЦИЯ (Loop) ---
function animate() {
requestAnimationFrame(animate); // Запрашиваем следующий кадр
// Вращаем куб
cube.rotation.x += 0.01;
cube.rotation.y += 0.01;
// Рисуем кадр
renderer.render(scene, camera);
}
// Запуск
animate();
console.log("3D сцена запущена в", containerId);
}