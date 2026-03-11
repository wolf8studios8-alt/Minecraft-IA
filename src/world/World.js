import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH, RENDER_DISTANCE, UNLOAD_DISTANCE, BLOCKS, WATER_LEVEL } from '../constants.js';
import { Chunk } from './Chunk.js';

export class World {
    constructor(scene, textureAtlas) {
        this.scene = scene; 
        this.textureAtlas = textureAtlas;
        this.mobManager = null; // Se enlazará desde main.js
        this.chunks = new Map();
        this.modifiedBlocks = JSON.parse(localStorage.getItem('voxel_world_data')) || {};
        this.saveTimeout = null;
    }

    getChunkKey(cx, cz) { return `${cx},${cz}`; }
    loadChunkData(cx, cz) { return this.modifiedBlocks[this.getChunkKey(cx, cz)]; }

    saveBlockModification(x, y, z, id) {
        let cx = Math.floor(x / CHUNK_WIDTH), cz = Math.floor(z / CHUNK_DEPTH);
        let key = this.getChunkKey(cx, cz);
        let lx = x - cx * CHUNK_WIDTH, lz = z - cz * CHUNK_DEPTH;
        let blockKey = `${lx},${y},${lz}`;
        if (!this.modifiedBlocks[key]) this.modifiedBlocks[key] = {};
        this.modifiedBlocks[key][blockKey] = id;
        
        const saveIcon = document.getElementById('save-icon');
        if(saveIcon) saveIcon.style.display = 'block';
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            localStorage.setItem('voxel_world_data', JSON.stringify(this.modifiedBlocks));
            if(saveIcon) saveIcon.style.display = 'none';
        }, 1000);
    }

    getBlockGlobal(x, y, z) {
        if (y < 0 || y >= CHUNK_HEIGHT) return BLOCKS.AIR;
        let cx = Math.floor(x / CHUNK_WIDTH), cz = Math.floor(z / CHUNK_DEPTH);
        let chunk = this.chunks.get(this.getChunkKey(cx, cz));
        return chunk ? chunk.getBlock(x - cx * CHUNK_WIDTH, y, z - cz * CHUNK_DEPTH) : BLOCKS.AIR;
    }

    setBlockGlobal(x, y, z, id) {
        if (y < 0 || y >= CHUNK_HEIGHT) return;
        this.saveBlockModification(x, y, z, id);
        let cx = Math.floor(x / CHUNK_WIDTH), cz = Math.floor(z / CHUNK_DEPTH);
        let chunk = this.chunks.get(this.getChunkKey(cx, cz));
        if (chunk) {
            chunk.setBlock(x - cx * CHUNK_WIDTH, y, z - cz * CHUNK_DEPTH, id);
            chunk.isDirty = true;
            let lx = x - cx * CHUNK_WIDTH, lz = z - cz * CHUNK_DEPTH;
            if (lx === 0) { let n = this.chunks.get(this.getChunkKey(cx-1, cz)); if(n) n.isDirty = true; }
            if (lx === CHUNK_WIDTH-1) { let n = this.chunks.get(this.getChunkKey(cx+1, cz)); if(n) n.isDirty = true; }
            if (lz === 0) { let n = this.chunks.get(this.getChunkKey(cx, cz-1)); if(n) n.isDirty = true; }
            if (lz === CHUNK_DEPTH-1) { let n = this.chunks.get(this.getChunkKey(cx, cz+1)); if(n) n.isDirty = true; }
        }
    }

    updateChunks(playerPos) {
        let pcx = Math.floor(playerPos.x / CHUNK_WIDTH), pcz = Math.floor(playerPos.z / CHUNK_DEPTH);
        
        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                let cx = pcx + x, cz = pcz + z;
                let key = this.getChunkKey(cx, cz);
                
                if (!this.chunks.has(key)) {
                    let chunk = new Chunk(cx, cz, this);
                    this.chunks.set(key, chunk);

                    // --- NUEVO: GENERACIÓN DE MOBS POR CHUNK ---
                    // 25% de probabilidad de generar animales en este chunk
                    if (this.mobManager && Math.random() < 0.25) {
                        let numMobs = Math.floor(Math.random() * 3) + 1; // De 1 a 3 animales
                        const types = ['pig', 'sheep', 'cow', 'chicken'];
                        let selectedType = types[Math.floor(Math.random() * types.length)]; // Manada del mismo tipo
                        
                        for(let i = 0; i < numMobs; i++) {
                            let lx = Math.floor(Math.random() * CHUNK_WIDTH);
                            let lz = Math.floor(Math.random() * CHUNK_DEPTH);
                            
                            // Buscar la superficie del chunk
                            for (let y = CHUNK_HEIGHT - 2; y > WATER_LEVEL; y--) {
                                if (chunk.getBlock(lx, y, lz) === BLOCKS.GRASS && chunk.getBlock(lx, y + 1, lz) === BLOCKS.AIR) {
                                    let gx = cx * CHUNK_WIDTH + lx;
                                    let gz = cz * CHUNK_DEPTH + lz;
                                    this.mobManager.spawn(selectedType, gx, y + 1.5, gz);
                                    break;
                                }
                            }
                        }
                    }
                    // -------------------------------------------
                }
            }
        }
        
        for (let [key, chunk] of this.chunks.entries()) {
            let dx = Math.abs(chunk.cx - pcx), dz = Math.abs(chunk.cz - pcz);
            if (dx > UNLOAD_DISTANCE || dz > UNLOAD_DISTANCE) {
                chunk.dispose(); this.chunks.delete(key);
            } else if (chunk.isDirty) {
                chunk.buildMesh(this.textureAtlas);
            }
        }
    }
}
