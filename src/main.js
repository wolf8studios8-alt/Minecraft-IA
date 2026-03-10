import { raycastDDA } from './player/Raycast.js';
import { Hotbar } from './ui/Hotbar.js';
import { BLOCKS } from './constants.js'; // Asegúrate de importar BLOCKS
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { RENDER_DISTANCE, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './constants.js';

// Inicialización Básica
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87CEEB, (RENDER_DISTANCE - 1) * CHUNK_WIDTH, RENDER_DISTANCE * CHUNK_WIDTH + 10);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Luces
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xfffff0, 0.8); 
scene.add(dirLight);

// Instancias principales
// Nota: Aquí se pasaría el textureAtlas generado al World
const textureAtlas = new THREE.Texture(); // Reemplazar con el atlas del código original
const world = new World(scene, textureAtlas);
const player = new Player(camera, world);

camera.position.set(CHUNK_WIDTH / 2, CHUNK_HEIGHT - 5, CHUNK_DEPTH / 2);

// Controles de puntero y pausa
const pauseScreen = document.getElementById('pause-screen');
pauseScreen.addEventListener('click', () => document.body.requestPointerLock());

document.addEventListener('pointerlockchange', () => {
    pauseScreen.style.display = document.pointerLockElement === document.body ? 'none' : 'flex';
});

let euler = new THREE.Euler(0, 0, 0, 'YXZ');
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= e.movementX * 0.002; 
        euler.x -= e.movementY * 0.002;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        camera.quaternion.setFromEuler(euler);
    }
});

// Bucle del juego
let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const dt = Math.min((time - lastTime) / 1000, 0.1); 
    lastTime = time;

    if (document.pointerLockElement === document.body) {
        player.update(dt);
        if (Math.random() < 0.1) world.updateChunks(camera.position); 
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
