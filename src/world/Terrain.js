import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH, WATER_LEVEL, BLOCKS } from '../constants.js';
import { SimplexNoise } from './SimplexNoise.js'; 

const noiseGen = new SimplexNoise();

export function generateChunkData(chunk) {
    const wx = chunk.cx * CHUNK_WIDTH;
    const wz = chunk.cz * CHUNK_DEPTH;
    const modifiedData = chunk.world.loadChunkData(chunk.cx, chunk.cz);

    for (let x = 0; x < CHUNK_WIDTH; x++) {
        for (let z = 0; z < CHUNK_DEPTH; z++) {
            let gx = wx + x, gz = wz + z;
            
            // Relieve base con ruido Simplex
            let heightNoise = noiseGen.fbm3D(gx, 0, gz, 4, 0.5, 0.008);
            let surfaceY = Math.floor(Math.pow((heightNoise + 1) * 0.5, 2.5) * 60 + 20); 
            surfaceY = Math.max(1, Math.min(surfaceY, CHUNK_HEIGHT - 1));

            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                let key = `${x},${y},${z}`;
                
                // Prioridad a bloques guardados en LocalStorage
                if (modifiedData && modifiedData[key] !== undefined) {
                    chunk.setBlock(x, y, z, modifiedData[key]); 
                    continue;
                }
                
                let block = BLOCKS.AIR;
                
                // Terreno
                if (y === surfaceY) block = y <= WATER_LEVEL + 1 ? BLOCKS.SAND : BLOCKS.GRASS;
                else if (y < surfaceY && y > surfaceY - 4) block = BLOCKS.DIRT;
                else if (y <= surfaceY - 4) block = BLOCKS.STONE;
                
                // Generación de cuevas en 3D
                if (block !== BLOCKS.AIR && y < surfaceY - 2 && y > 2) {
                    if (noiseGen.fbm3D(gx, y * 1.5, gz, 3, 0.5, 0.04) > 0.35) block = BLOCKS.AIR; 
                }
                
                // Fondo indestructible y agua
                if (y === 0) block = BLOCKS.STONE; 
                if (block === BLOCKS.AIR && y <= WATER_LEVEL) block = BLOCKS.WATER;
                
                if (block !== BLOCKS.AIR) chunk.setBlock(x, y, z, block);
            }
            
            // Probabilidad de generar un árbol si estamos por encima del agua
            if (surfaceY > WATER_LEVEL && Math.random() < 0.02) {
                generateTree(chunk, x, surfaceY + 1, z);
            }
        }
    }
    chunk.isDirty = true;
}

function generateTree(chunk, x, y, z) {
    const height = 4 + Math.floor(Math.random() * 3);
    
    // Tronco
    for (let i = 0; i < height; i++) {
        if (y + i < CHUNK_HEIGHT) chunk.setBlockSafe(x, y + i, z, BLOCKS.WOOD);
    }
    
    // Hojas
    for (let lx = -2; lx <= 2; lx++) {
        for (let lz = -2; lz <= 2; lz++) {
            for (let ly = height - 2; ly <= height; ly++) {
                if (Math.abs(lx) + Math.abs(lz) < 4) {
                    let px = x + lx, py = y + ly, pz = z + lz;
                    if (chunk.getBlock(px, py, pz) === BLOCKS.AIR) {
                        chunk.setBlockSafe(px, py, pz, BLOCKS.LEAVES);
                    }
                }
            }
        }
    }
}
