import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// AQUÍ ESTABAN LOS ERRORES DE RUTA:
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { raycastDDA } from './player/Raycast.js';
import { Hotbar } from './ui/Hotbar.js';
// La importación de constants debe ser exactamente ./constants.js
import { BLOCKS, RENDER_DISTANCE, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './constants.js';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87CEEB, (RENDER_DISTANCE - 1) * CHUNK_WIDTH, RENDER_DISTANCE * CHUNK_WIDTH + 10);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xfffff0, 0.8); 
dirLight.position.set(100, 200, 100);
scene.add(dirLight);

function generateTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const ts = 16; 
    function noise(x, y, c1, c2, c3 = null) {
        for(let i=0; i<ts; i++) for(let j=0; j<ts; j++) {
            let r = Math.random(); ctx.fillStyle = r < 0.4 ? c1 : (!c3 || r < 0.8) ? c2 : c3;
            ctx.fillRect(x*ts+i, y*ts+j, 1, 1);
        }
    }
    noise(0, 0, '#5C4033', '#4A3225'); noise(1, 0, '#41980a', '#52b015', '#327a05'); noise(2, 0, '#5C4033', '#4A3225');
    for(let i=0; i<ts; i++) { let d = Math.random()*5+3; for(let j=0; j<d; j++) { ctx.fillStyle = Math.random()>.5 ? '#41980a':'#52b015'; ctx.fillRect(2*ts+i, j, 1, 1); } }
    noise(3, 0, '#7D7D7D', '#696969', '#8A8A8A'); noise(4, 0, '#75502b', '#8f653b'); 
    ctx.fillStyle='#4a3015'; ctx.beginPath(); ctx.arc(4*ts+8, 8, 6, 0, Math.PI*2); ctx.stroke(); 
    for(let i=0; i<ts; i++) { ctx.fillStyle = i%2===0 ? '#4a3015':'#36220e'; ctx.fillRect(5*ts+i, 0, 1, ts); }
    noise(6, 0, '#1e5912', '#2a781a', 'rgba(0,0,0,0.8)'); noise(7, 0, '#d2b48c', '#e6cda3'); noise(8, 0, '#2b65ec', '#15317e', '#3bb9ff');
    ctx.clearRect(9*ts, 0, ts, ts); ctx.fillStyle = '#6b4226'; ctx.fillRect(9*ts+6, 6, 4, 10); ctx.fillStyle = '#ffaa00'; ctx.fillRect(9*ts+6, 2, 4, 4); ctx.fillStyle = '#ff0000'; ctx.fillRect(9*ts+7, 3, 2, 2);
    noise(10, 0, '#8f563b', '#663931'); ctx.fillStyle = '#222'; ctx.fillRect(10*ts, 0, ts, 2); ctx.fillRect(10*ts, ts-2, ts, 2); ctx.fillRect(10*ts, 0, 2, ts); ctx.fillRect(10*ts+ts-2, 0, 2, ts);
    noise(11, 0, '#8f563b', '#663931'); ctx.fillStyle = '#222'; ctx.fillRect(11*ts, 0, ts, 2); ctx.fillRect(11*ts, ts-2, ts, 2); ctx.fillRect(11*ts, 0, 2, ts); ctx.fillRect(11*ts+ts-2, 0, 2, ts); ctx.fillStyle = '#bbb'; ctx.fillRect(10*ts+6, 6, 4, 4); 
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(12*ts, 0, ts, ts);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(12*ts, 0, ts, 2); ctx.fillRect(12*ts, ts-2, ts, 2); ctx.fillRect(12*ts, 0, 2, ts); ctx.fillRect(12*ts+ts-2, 0, 2, ts); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(12*ts+3, 3, 4, 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
    return texture;
}

const textureAtlas = generateTextureAtlas();
const world = new World(scene, textureAtlas);
const player = new Player(camera, world);
const hotbar = new Hotbar();

let savedPlayer = JSON.parse(localStorage.getItem('voxel_player_data'));
if (savedPlayer && savedPlayer.pos) {
    camera.position.set(savedPlayer.pos.x, savedPlayer.pos.y, savedPlayer.pos.z);
} else {
    camera.position.set(CHUNK_WIDTH / 2, CHUNK_HEIGHT - 5, CHUNK_DEPTH / 2);
}

world.updateChunks(camera.position);

const pauseScreen = document.getElementById('pause-screen');
let euler = new THREE.Euler(0, 0, 0, 'YXZ');

pauseScreen.addEventListener('click', () => document.body.requestPointerLock());

document.addEventListener('pointerlockchange', () => {
    const isLocked = document.pointerLockElement === document.body;
    pauseScreen.style.display = isLocked ? 'none' : 'flex';
    if (!isLocked) {
        player.keys = { w: false, a: false, s: false, d: false, space: false };
        localStorage.setItem('voxel_player_data', JSON.stringify({
            pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            inventory: hotbar.inventory
        }));
    }
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= e.movementX * 0.002; euler.x -= e.movementY * 0.002;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        camera.quaternion.setFromEuler(euler);
    }
});

document.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement !== document.body) return;
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const hitResult = raycastDDA(camera.position, dir, 6, world); 
    
    if (hitResult.hit) {
        if (e.button === 0) { 
            let brokenBlock = hitResult.blockId;
            world.setBlockGlobal(hitResult.pos.x, hitResult.pos.y, hitResult.pos.z, BLOCKS.AIR);
            hotbar.addBlock(brokenBlock); 
        } else if (e.button === 2) { 
            let blockToPlace = hotbar.getSelectedBlock();
            const placePos = hitResult.pos.clone().add(hitResult.normal);
            if ((hotbar.inventory[blockToPlace] || 0) > 0) {
                if (!player.checkCollision(placePos) || blockToPlace === BLOCKS.TORCH) { 
                    world.setBlockGlobal(placePos.x, placePos.y, placePos.z, blockToPlace);
                    hotbar.consumeBlock();
                }
            }
        }
    }
});

window.addEventListener('contextmenu', e => e.preventDefault());

let lastTime = performance.now();
let frameCount = 0;
let lastFpsTime = performance.now();
const debugUI = document.getElementById('debug');

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

    frameCount++;
    if (time - lastFpsTime >= 1000) {
        debugUI.innerHTML = `FPS: ${frameCount} | XYZ: ${Math.floor(camera.position.x)}, ${Math.floor(camera.position.y)}, ${Math.floor(camera.position.z)} | Chunks: ${world.chunks.size}`;
        frameCount = 0; lastFpsTime = time;
    }
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
