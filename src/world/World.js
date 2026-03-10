import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH, RENDER_DISTANCE, UNLOAD_DISTANCE, BLOCKS } from '../constants.js';
import { Chunk } from './Chunk.js';

export class World {
    constructor(scene, textureAtlas) {
        this.scene = scene;
        this.textureAtlas = textureAtlas;
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
            // Aquí iría la lógica de actualización de chunks vecinos y luces
        }
    }

    updateChunks(playerPos) {
        let pcx = Math.floor(playerPos.x / CHUNK_WIDTH);
        let pcz = Math.floor(playerPos.z / CHUNK_DEPTH);
        
        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                let cx = pcx + x, cz = pcz + z;
                let key = this.getChunkKey(cx, cz);
                if (!this.chunks.has(key)) {
                    this.chunks.set(key, new Chunk(cx, cz, this));
                }
            }
        }

        for (let [key, chunk] of this.chunks.entries()) {
            let dx = Math.abs(chunk.cx - pcx);
            let dz = Math.abs(chunk.cz - pcz);
            if (dx > UNLOAD_DISTANCE || dz > UNLOAD_DISTANCE) {
                chunk.dispose();
                this.chunks.delete(key);
            } else if (chunk.isDirty) {
                chunk.buildMesh(this.textureAtlas);
            }
        }
    }
}
