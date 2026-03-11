import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { raycastDDA } from './player/Raycast.js';
import { Hotbar } from './ui/Hotbar.js';
import { BLOCKS, RENDER_DISTANCE, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './constants.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
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

// ==========================================
// TEXTURAS PROCEDIMENTALES (Atlas y Grietas)
// ==========================================
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

function generateCrackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 16; 
    const ctx = canvas.getContext('2d');
    for(let i=1; i<=10; i++) {
        let xOff = (i-1)*16;
        ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(xOff, 0, 16, 16);
        ctx.strokeStyle = `rgba(0,0,0,${i*0.09})`; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for(let j=0; j<i*3; j++) { ctx.moveTo(xOff+8, 8); ctx.lineTo(xOff + Math.random()*16, Math.random()*16); }
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(1/10, 1);
    return tex;
}

const textureAtlas = generateTextureAtlas();
const crackAtlas = generateCrackTexture();

const world = new World(scene, textureAtlas);
const player = new Player(camera, world);
const hotbar = new Hotbar();

let savedPlayer = JSON.parse(localStorage.getItem('voxel_player_data'));
if (savedPlayer && savedPlayer.pos) camera.position.set(savedPlayer.pos.x, savedPlayer.pos.y, savedPlayer.pos.z);
else camera.position.set(CHUNK_WIDTH / 2, CHUNK_HEIGHT - 5, CHUNK_DEPTH / 2);
world.updateChunks(camera.position);

// ==========================================
// SISTEMA DE DAÑO Y ENTIDADES (ITEMS)
// ==========================================
const damageMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 1.02, 1.02),
    new THREE.MeshBasicMaterial({ map: crackAtlas, transparent: true, depthWrite: false, alphaTest: 0.1 })
);
damageMesh.visible = false;
scene.add(damageMesh);

const droppedItems = [];

function spawnItemEntity(id, pos) {
    const group = new THREE.Group();
    group.position.copy(pos).add(new THREE.Vector3(0.5, 0.5, 0.5));
    
    const geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const mat = new THREE.MeshLambertMaterial({ map: textureAtlas });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.3;
    group.add(shadow);
    
    scene.add(group);
    
    droppedItems.push({
        id: id, group: group, mesh: mesh, shadow: shadow,
        baseY: group.position.y,
        vx: (Math.random() - 0.5) * 3, vy: 4, vz: (Math.random() - 0.5) * 3
    });
}

// ==========================================
// CONTROLES E INTERACCIÓN
// ==========================================
const pauseScreen = document.getElementById('pause-screen');
const inventoryScreen = document.getElementById('inventory-screen');
let euler = new THREE.Euler(0, 0, 0, 'YXZ');

let mining = { active: false, timer: 0, pos: new THREE.Vector3(), blockId: 0 };

pauseScreen.addEventListener('click', () => {
    let p = document.body.requestPointerLock();
    if(p) p.catch(()=>{});
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyX') {
        if (inventoryScreen.style.display === 'flex') {
            inventoryScreen.style.display = 'none';
            hotbar.closeChest();
            document.body.requestPointerLock();
        } else {
            document.exitPointerLock();
            inventoryScreen.style.display = 'flex';
        }
    }
});

document.addEventListener('pointerlockchange', () => {
    const isLocked = document.pointerLockElement === document.body;
    pauseScreen.style.display = (!isLocked && inventoryScreen.style.display !== 'flex') ? 'flex' : 'none';
    
    if (!isLocked) {
        player.keys = { w: false, a: false, s: false, d: false, space: false };
        mining.active = false; damageMesh.visible = false;
        localStorage.setItem('voxel_player_data', JSON.stringify({ pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z } }));
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
        // Clic Izquierdo: Empezar a minar
        if (e.button === 0) { 
            mining.active = true; mining.timer = 0;
            mining.pos.copy(hitResult.pos);
            mining.blockId = hitResult.blockId;
            damageMesh.position.copy(hitResult.pos).addScalar(0.5);
            damageMesh.visible = true;
        } 
        // Clic Derecho: Colocar o abrir cofre
        else if (e.button === 2) { 
            if (hitResult.blockId === BLOCKS.CHEST) {
                let chestKey = `${hitResult.pos.x},${hitResult.pos.y},${hitResult.pos.z}`;
                document.exitPointerLock();
                inventoryScreen.style.display = 'flex';
                hotbar.openChest(chestKey);
                return;
            }
            let blockToPlace = hotbar.getSelectedBlock();
            const placePos = hitResult.pos.clone().add(hitResult.normal);
            if (blockToPlace !== BLOCKS.AIR && (!player.checkCollision(placePos) || blockToPlace === BLOCKS.TORCH)) { 
                world.setBlockGlobal(placePos.x, placePos.y, placePos.z, blockToPlace);
                hotbar.consumeSelected();
            }
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) { mining.active = false; damageMesh.visible = false; }
});
window.addEventListener('contextmenu', e => e.preventDefault());

// ==========================================
// GAME LOOP (Animaciones y Físicas)
// ==========================================
let lastTime = performance.now();
const debugUI = document.getElementById('debug');
let frameCount = 0, lastFpsTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const dt = Math.min((time - lastTime) / 1000, 0.1); 
    lastTime = time;

    if (document.pointerLockElement === document.body) {
        player.update(dt);
        if (Math.random() < 0.1) world.updateChunks(camera.position); 

        // Lógica de Minado
        if (mining.active) {
            const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
            const hitResult = raycastDDA(camera.position, dir, 6, world);
            // Si seguimos mirando al mismo bloque
            if (hitResult.hit && hitResult.pos.equals(mining.pos)) {
                mining.timer += dt * 6.5; // Velocidad de rotura
                crackAtlas.offset.x = Math.floor(mining.timer) / 10;
                
                if (mining.timer >= 10) { // Bloque roto
                    world.setBlockGlobal(mining.pos.x, mining.pos.y, mining.pos.z, BLOCKS.AIR);
                    spawnItemEntity(mining.blockId, mining.pos);
                    mining.active = false; damageMesh.visible = false;
                }
            } else { // Miramos hacia otro lado
                mining.active = false; damageMesh.visible = false;
            }
        }
    }

    // Físicas de los objetos soltados
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        let item = droppedItems[i];
        item.group.position.x += item.vx * dt;
        item.group.position.z += item.vz * dt;
        item.group.position.y += item.vy * dt;
        item.vy -= 15 * dt; // Gravedad
        
        // Colisión con el suelo
        let ix = Math.floor(item.group.position.x);
        let iy = Math.floor(item.group.position.y - 0.2);
        let iz = Math.floor(item.group.position.z);
        
        if (world.getBlockGlobal(ix, iy, iz) !== BLOCKS.AIR && world.getBlockGlobal(ix, iy, iz) !== BLOCKS.WATER) {
            item.vy = 0; item.vx *= 0.5; item.vz *= 0.5; // Fricción
            item.group.position.y = iy + 1.25; 
        }
        
        // Animación visual (Flotar y rotar)
        item.baseY = item.group.position.y;
        item.mesh.rotation.y += 2 * dt;
        item.mesh.position.y = Math.sin(time * 0.005) * 0.1;
        item.shadow.position.y = -0.24 - item.mesh.position.y; 

        // Recolección por proximidad
        if (camera.position.distanceTo(item.group.position) < 1.8) {
            hotbar.addBlock(item.id, 1);
            scene.remove(item.group);
            droppedItems.splice(i, 1);
        }
    }

    renderer.render(scene, camera);

    frameCount++;
    if (time - lastFpsTime >= 1000) {
        if(debugUI) debugUI.innerHTML = `FPS: ${frameCount} | Entidades: ${droppedItems.length} | Chunks: ${world.chunks.size}`;
        frameCount = 0; lastFpsTime = time;
    }
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
