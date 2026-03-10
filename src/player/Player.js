import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { BLOCKS } from '../constants.js';

export class Player {
    constructor(camera, world) {
        this.camera = camera; 
        this.world = world;
        this.velocity = new THREE.Vector3();
        this.isGrounded = false;
        this.width = 0.6; this.height = 1.6; this.depth = 0.6;
        this.speed = 8.0; this.jumpStrength = 9.0; this.gravity = -25.0; 
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        
        document.addEventListener('keydown', (e) => this.onKey(e.code, true));
        document.addEventListener('keyup', (e) => this.onKey(e.code, false));
    }

    onKey(code, isDown) {
        if(code === 'KeyW') this.keys.w = isDown; 
        if(code === 'KeyA') this.keys.a = isDown;
        if(code === 'KeyS') this.keys.s = isDown; 
        if(code === 'KeyD') this.keys.d = isDown;
        if(code === 'Space') this.keys.space = isDown;
    }

    checkCollision(pos) {
        const minX = Math.floor(pos.x - this.width / 2), maxX = Math.floor(pos.x + this.width / 2);
        const minY = Math.floor(pos.y), maxY = Math.floor(pos.y + this.height);
        const minZ = Math.floor(pos.z - this.depth / 2), maxZ = Math.floor(pos.z + this.depth / 2);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    let block = this.world.getBlockGlobal(x, y, z);
                    if (block !== BLOCKS.AIR && block !== BLOCKS.WATER) return true;
                }
            }
        }
        return false;
    }

    update(dt) {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir); dir.y = 0; dir.normalize(); 
        const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
        
        let moveDir = new THREE.Vector3();
        if (this.keys.w) moveDir.add(dir); if (this.keys.s) moveDir.sub(dir);
        if (this.keys.a) moveDir.sub(right); if (this.keys.d) moveDir.add(right);
        if (moveDir.lengthSq() > 0) moveDir.normalize();

        let feetY = Math.floor(this.camera.position.y - this.height);
        let inWater = this.world.getBlockGlobal(Math.floor(this.camera.position.x), feetY, Math.floor(this.camera.position.z)) === BLOCKS.WATER;

        let currentSpeed = inWater ? this.speed * 0.4 : this.speed;
        this.velocity.x = moveDir.x * currentSpeed;
        this.velocity.z = moveDir.z * currentSpeed;

        if (inWater) {
            this.velocity.y -= this.gravity * 0.1 * dt; 
            this.velocity.y *= 0.9; 
            if (this.keys.space) this.velocity.y = 4.0; 
        } else {
            this.velocity.y += this.gravity * dt;
            if (this.keys.space && this.isGrounded) { this.velocity.y = this.jumpStrength; this.isGrounded = false; }
        }

        let pos = this.camera.position.clone(); pos.y -= this.height; 

        pos.x += this.velocity.x * dt; if (this.checkCollision(pos)) { pos.x -= this.velocity.x * dt; }
        pos.z += this.velocity.z * dt; if (this.checkCollision(pos)) { pos.z -= this.velocity.z * dt; }
        pos.y += this.velocity.y * dt;
        
        this.isGrounded = false;
        if (this.checkCollision(pos)) {
            pos.y -= this.velocity.y * dt;
            if (this.velocity.y < 0) this.isGrounded = true; 
            this.velocity.y = 0;
        }

        this.camera.position.set(pos.x, pos.y + this.height, pos.z);
    }
}
