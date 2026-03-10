import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { BLOCKS } from '../constants.js';

export function raycastDDA(origin, direction, maxDist, world) {
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    
    const stepX = Math.sign(direction.x);
    const stepY = Math.sign(direction.y);
    const stepZ = Math.sign(direction.z);
    
    let tDeltaX = stepX !== 0 ? Math.abs(1 / direction.x) : Infinity;
    let tDeltaY = stepY !== 0 ? Math.abs(1 / direction.y) : Infinity;
    let tDeltaZ = stepZ !== 0 ? Math.abs(1 / direction.z) : Infinity;
    
    let tMaxX = stepX > 0 ? (x + 1 - origin.x) * tDeltaX : (origin.x - x) * tDeltaX;
    let tMaxY = stepY > 0 ? (y + 1 - origin.y) * tDeltaY : (origin.y - y) * tDeltaY;
    let tMaxZ = stepZ > 0 ? (z + 1 - origin.z) * tDeltaZ : (origin.z - z) * tDeltaZ;
    
    let normal = new THREE.Vector3();

    for (let i = 0; i < maxDist * 3; i++) {
        if (tMaxX < tMaxY) {
            if (tMaxX < tMaxZ) { 
                x += stepX; tMaxX += tDeltaX; normal.set(-stepX, 0, 0); 
            } else { 
                z += stepZ; tMaxZ += tDeltaZ; normal.set(0, 0, -stepZ); 
            }
        } else {
            if (tMaxY < tMaxZ) { 
                y += stepY; tMaxY += tDeltaY; normal.set(0, -stepY, 0); 
            } else { 
                z += stepZ; tMaxZ += tDeltaZ; normal.set(0, 0, -stepZ); 
            }
        }

        let block = world.getBlockGlobal(x, y, z);
        // Ignoramos el aire y el agua para poder minar/construir a través del agua
        if (block !== BLOCKS.AIR && block !== BLOCKS.WATER) {
            return { hit: true, pos: new THREE.Vector3(x, y, z), normal: normal, blockId: block };
        }
        
        if (Math.min(tMaxX, tMaxY, tMaxZ) > maxDist) break;
    }
    return { hit: false };
}
