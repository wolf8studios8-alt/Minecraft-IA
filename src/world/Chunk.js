import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH, BLOCKS } from '../constants.js';
import { generateChunkData } from './Terrain.js';

export class Chunk {
    constructor(cx, cz, world) {
        this.cx = cx; 
        this.cz = cz; 
        this.world = world;
        this.data = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
        this.meshOpaque = null; 
        this.meshTransparent = null;
        this.isDirty = false;
        
        generateChunkData(this); // Generación delegada a Terrain.js
    }
    
    getIndex(x, y, z) { return x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_DEPTH; }
    
    getBlock(x, y, z) {
        if (y < 0 || y >= CHUNK_HEIGHT) return BLOCKS.AIR;
        if (x < 0 || x >= CHUNK_WIDTH || z < 0 || z >= CHUNK_DEPTH) {
            return this.world.getBlockGlobal(this.cx * CHUNK_WIDTH + x, y, this.cz * CHUNK_DEPTH + z);
        }
        return this.data[this.getIndex(x, y, z)];
    }
    
    setBlock(x, y, z, id) {
        if (x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_DEPTH) {
            this.data[this.getIndex(x, y, z)] = id;
            this.isDirty = true;
        }
    }

    setBlockSafe(x, y, z, id) {
        if (x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_DEPTH) {
            this.setBlock(x, y, z, id);
        }
    }

    buildMesh(textureAtlas) {
        if (!this.isDirty) return;
        // La lógica de buildMesh va aquí (reutilizando la función buildGeo del primer código)
        // Por brevedad de la estructura, aquí se inicializan las BufferGeometries 
        // y se añaden a this.world.scene
        this.isDirty = false;
    }

    dispose() {
        if (this.meshOpaque) { 
            this.world.scene.remove(this.meshOpaque); 
            this.meshOpaque.geometry.dispose(); 
            this.meshOpaque.material.dispose(); 
        }
        if (this.meshTransparent) { 
            this.world.scene.remove(this.meshTransparent); 
            this.meshTransparent.geometry.dispose(); 
            this.meshTransparent.material.dispose(); 
        }
    }
}
