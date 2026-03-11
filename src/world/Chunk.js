import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH, BLOCKS } from '../constants.js';
import { generateChunkData } from './Terrain.js';

const TEXTURE_MAP = {
    [BLOCKS.DIRT]: { all: [0, 15] }, [BLOCKS.GRASS]: { top: [1, 15], side: [2, 15], bottom: [0, 15] },
    [BLOCKS.STONE]: { all: [3, 15] }, [BLOCKS.WOOD]: { top: [4, 15], side: [5, 15], bottom: [4, 15] },
    [BLOCKS.LEAVES]: { all: [6, 15] }, [BLOCKS.SAND]: { all: [7, 15] }, [BLOCKS.WATER]: { all: [8, 15] },
    [BLOCKS.TORCH]: { all: [9, 15] }, [BLOCKS.CHEST]: { top: [11, 15], side: [10, 15], bottom: [4, 15] },
    [BLOCKS.GLASS]: { all: [12, 15] }
};

export class Chunk {
    constructor(cx, cz, world) {
        this.cx = cx; 
        this.cz = cz; 
        this.world = world;
        this.data = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
        this.meshOpaque = null; 
        this.meshTransparent = null;
        this.isDirty = false;
        
        generateChunkData(this);
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

    calculateAO(side1, side2, corner) { 
        if (side1 && side2) return 0; 
        return 3 - (side1 + side2 + corner); 
    }

    buildMesh(textureAtlas) {
        if (!this.isDirty) return;
        
        const buildGeo = (isTransparentPass) => {
            const pos=[], norm=[], uv=[], colors=[];
            
            const getUVs = (id, face) => { 
                let map = TEXTURE_MAP[id]; 
                let uvd = map.all || (face===2 ? map.top : (face===3 ? map.bottom : map.side)); 
                let c = uvd[0], r = uvd[1], s = 1/16; 
                return [c*s, r*s, (c+1)*s, r*s, (c+1)*s, (r+1)*s, c*s, (r+1)*s]; 
            };
            
            const isOpaque = (bx, by, bz) => { 
                let id = this.getBlock(bx, by, bz); 
                return id !== BLOCKS.AIR && id !== BLOCKS.WATER && id !== BLOCKS.GLASS && id !== BLOCKS.LEAVES && id !== BLOCKS.TORCH; 
            };

            const addFace = (x,y,z, fi, id) => {
                let px=x+this.cx*CHUNK_WIDTH, py=y, pz=z+this.cz*CHUNK_DEPTH;
                const v=[[px+1,py,pz+1],[px+1,py,pz],[px+1,py+1,pz],[px+1,py+1,pz+1], [px,py,pz],[px,py,pz+1],[px,py+1,pz+1],[px,py+1,pz], [px,py+1,pz+1],[px+1,py+1,pz+1],[px+1,py+1,pz],[px,py+1,pz], [px,py,pz],[px+1,py,pz],[px+1,py,pz+1],[px,py,pz+1], [px,py,pz+1],[px+1,py,pz+1],[px+1,py+1,pz+1],[px,py+1,pz+1], [px+1,py,pz],[px,py,pz],[px,py+1,pz],[px+1,py+1,pz]];
                const n=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
                const fv=v.slice(fi*4,fi*4+4), fn=n[fi], fuv=getUVs(id, fi);
                
                let aoValues = [1, 1, 1, 1];
                if (id !== BLOCKS.TORCH) {
                    if (fi === 2) {
                        aoValues[0] = this.calculateAO(isOpaque(x-1,y+1,z), isOpaque(x,y+1,z+1), isOpaque(x-1,y+1,z+1));
                        aoValues[1] = this.calculateAO(isOpaque(x+1,y+1,z), isOpaque(x,y+1,z+1), isOpaque(x+1,y+1,z+1));
                        aoValues[2] = this.calculateAO(isOpaque(x+1,y+1,z), isOpaque(x,y+1,z-1), isOpaque(x+1,y+1,z-1));
                        aoValues[3] = this.calculateAO(isOpaque(x-1,y+1,z), isOpaque(x,y+1,z-1), isOpaque(x-1,y+1,z-1));
                    } else { 
                        let sideShadow = (fi === 0 || fi === 1) ? 0.6 : 0.8; 
                        aoValues = [sideShadow, sideShadow, sideShadow, sideShadow]; 
                    }
                }

                let c0 = (aoValues[0] / 3) * 0.7 + 0.3; 
                let c1 = (aoValues[1] / 3) * 0.7 + 0.3; 
                let c2 = (aoValues[2] / 3) * 0.7 + 0.3; 
                let c3 = (aoValues[3] / 3) * 0.7 + 0.3;
                
                if (id === BLOCKS.TORCH) { c0=c1=c2=c3=1.2; }
                
                pos.push(...fv[0],...fv[1],...fv[2], ...fv[0],...fv[2],...fv[3]); 
                norm.push(...fn,...fn,...fn, ...fn,...fn,...fn); 
                uv.push(fuv[0],fuv[1],fuv[2],fuv[3],fuv[4],fuv[5], fuv[0],fuv[1],fuv[4],fuv[5],fuv[6],fuv[7]); 
                colors.push(c0,c0,c0, c1,c1,c1, c2,c2,c2, c0,c0,c0, c2,c2,c2, c3,c3,c3);
            };

            for (let y=0; y<CHUNK_HEIGHT; y++) {
                for (let x=0; x<CHUNK_WIDTH; x++) {
                    for (let z=0; z<CHUNK_DEPTH; z++) {
                        let id = this.getBlock(x,y,z); 
                        if (id === BLOCKS.AIR) continue;
                        
                        let isTrans = (id === BLOCKS.WATER || id === BLOCKS.LEAVES || id === BLOCKS.GLASS);
                        if ((isTransparentPass && !isTrans) || (!isTransparentPass && isTrans)) continue;

                        const checkNeighbor = (nx, ny, nz) => {
                            let nid = this.getBlock(nx,ny,nz); 
                            if (nid === BLOCKS.AIR) return true;
                            if (!isTrans && (nid === BLOCKS.WATER || nid === BLOCKS.LEAVES || nid === BLOCKS.GLASS)) return true; 
                            if (id === BLOCKS.WATER && nid === BLOCKS.WATER) return false; 
                            if (id === BLOCKS.GLASS && nid === BLOCKS.GLASS) return false;
                            return false;
                        };

                        if(checkNeighbor(x+1,y,z)) addFace(x,y,z,0,id); 
                        if(checkNeighbor(x-1,y,z)) addFace(x,y,z,1,id);
                        if(checkNeighbor(x,y+1,z)) addFace(x,y,z,2,id); 
                        if(checkNeighbor(x,y-1,z)) addFace(x,y,z,3,id);
                        if(checkNeighbor(x,y,z+1)) addFace(x,y,z,4,id); 
                        if(checkNeighbor(x,y,z-1)) addFace(x,y,z,5,id);
                    }
                }
            }
            if(pos.length === 0) return null;
            
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); 
            geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(norm), 3)); 
            geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2)); 
            geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
            return geo;
        };

        if(this.meshOpaque) { 
            this.world.scene.remove(this.meshOpaque); 
            this.meshOpaque.geometry.dispose(); 
        }
        if(this.meshTransparent) { 
            this.world.scene.remove(this.meshTransparent); 
            this.meshTransparent.geometry.dispose(); 
        }

        const matOpaque = new THREE.MeshLambertMaterial({ map: textureAtlas, vertexColors: true });
        // ARREGLO DE RAYOS X: alphaTest y depthWrite
        const matTrans = new THREE.MeshLambertMaterial({ 
            map: textureAtlas, 
            transparent: true, 
            opacity: 0.85, 
            side: THREE.DoubleSide, 
            vertexColors: true,
            alphaTest: 0.1, 
            depthWrite: false
        });

        let geoOpaque = buildGeo(false); 
        if(geoOpaque) { 
            this.meshOpaque = new THREE.Mesh(geoOpaque, matOpaque); 
            this.world.scene.add(this.meshOpaque); 
        }
        
        let geoTrans = buildGeo(true); 
        if(geoTrans) { 
            this.meshTransparent = new THREE.Mesh(geoTrans, matTrans); 
            this.world.scene.add(this.meshTransparent); 
        }
        
        this.isDirty = false;
    }

    dispose() {
        if(this.meshOpaque) { 
            this.world.scene.remove(this.meshOpaque); 
            this.meshOpaque.geometry.dispose(); 
            this.meshOpaque.material.dispose(); 
        }
        if(this.meshTransparent) { 
            this.world.scene.remove(this.meshTransparent); 
            this.meshTransparent.geometry.dispose(); 
            this.meshTransparent.material.dispose(); 
        }
    }
}
