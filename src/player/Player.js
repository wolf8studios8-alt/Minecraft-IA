import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { BLOCKS, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../constants.js';

export class Player {
    constructor(camera, world) {
        this.camera = camera; 
        this.world = world;
        this.velocity = new THREE.Vector3(); 
        this.isGrounded = false;
        
        this.width = 0.6; this.height = 1.6; this.depth = 0.6;
        this.speed = 8.0; this.jumpStrength = 9.0; this.gravity = -25.0; 
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        
        // --- SISTEMA DE SUPERVIVENCIA ---
        let savedData = JSON.parse(localStorage.getItem('voxel_player_data'));
        this.health = savedData?.health ?? 20;
        this.hunger = savedData?.hunger ?? 20;
        this.maxHealth = 20;
        this.maxHunger = 20;
        
        this.highestY = 0; // Para el daño por caída
        this.fallDamageThreshold = 3.5;
        this.hungerTimer = 0;
        this.regenTimer = 0;
        
        this.updateHUD();

        document.addEventListener('keydown', (e) => this.onKey(e.code, true));
        document.addEventListener('keyup', (e) => this.onKey(e.code, false));
    }

    onKey(code, isDown) {
        if(code === 'KeyW') this.keys.w = isDown; if(code === 'KeyA') this.keys.a = isDown;
        if(code === 'KeyS') this.keys.s = isDown; if(code === 'KeyD') this.keys.d = isDown;
        if(code === 'Space') this.keys.space = isDown;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) this.die();
        this.updateHUD();
    }

    die() {
        this.health = this.maxHealth;
        this.hunger = this.maxHunger;
        this.velocity.set(0, 0, 0);
        this.camera.position.set(CHUNK_WIDTH / 2, CHUNK_HEIGHT, CHUNK_DEPTH / 2);
        this.highestY = this.camera.position.y;
    }

    updateHUD() {
        const healthBar = document.getElementById('health-bar');
        const hungerBar = document.getElementById('hunger-bar');
        if (!healthBar || !hungerBar) return;

        healthBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            let heart = document.createElement('div');
            heart.className = 'heart ' + (this.health >= (i + 1) * 2 ? 'full' : 'empty');
            healthBar.appendChild(heart);
        }

        hungerBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            let drumstick = document.createElement('div');
            drumstick.className = 'drumstick ' + (this.hunger >= (i + 1) * 2 ? 'full' : 'empty');
            hungerBar.appendChild(drumstick);
        }
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
        this.camera.getWorldDirection(dir); 
        dir.normalize(); 
        
        const flatDir = new THREE.Vector3(dir.x, 0, dir.z).normalize();
        const right = new THREE.Vector3().crossVectors(flatDir, new THREE.Vector3(0, 1, 0)).normalize();
        
        let moveDir = new THREE.Vector3();
        if (this.keys.w) moveDir.add(flatDir); 
        if (this.keys.s) moveDir.sub(flatDir);
        if (this.keys.a) moveDir.sub(right); 
        if (this.keys.d) moveDir.add(right);
        
        let isMoving = moveDir.lengthSq() > 0;
        if (isMoving) moveDir.normalize();

        // Lógica de Hambre y Regeneración
        this.hungerTimer += dt * (isMoving ? 1.5 : 0.5); // Quema más rápido si te mueves
        if (this.hungerTimer > 30) { 
            this.hunger = Math.max(0, this.hunger - 1);
            this.hungerTimer = 0;
            this.updateHUD();
        }

        if (this.hunger >= 18 && this.health < this.maxHealth) {
            this.regenTimer += dt;
            if (this.regenTimer > 4) {
                this.health = Math.min(this.maxHealth, this.health + 1);
                this.regenTimer = 0;
                this.updateHUD();
            }
        }

        let headY = Math.floor(this.camera.position.y);
        let feetY = Math.floor(this.camera.position.y - this.height);
        let inWater = this.world.getBlockGlobal(Math.floor(this.camera.position.x), headY, Math.floor(this.camera.position.z)) === BLOCKS.WATER || 
                      this.world.getBlockGlobal(Math.floor(this.camera.position.x), feetY, Math.floor(this.camera.position.z)) === BLOCKS.WATER;

        let wasGrounded = this.isGrounded;

        if (inWater) {
            let swimSpeed = this.speed * 0.6;
            this.highestY = this.camera.position.y; // El agua reinicia el daño de caída
            
            if (this.keys.w) {
                this.velocity.x = dir.x * swimSpeed;
                this.velocity.y = dir.y * swimSpeed;
                this.velocity.z = dir.z * swimSpeed;
            } else {
                this.velocity.x = moveDir.x * swimSpeed;
                this.velocity.z = moveDir.z * swimSpeed;
                this.velocity.y -= this.gravity * 0.02 * dt; 
                this.velocity.y = Math.max(this.velocity.y, -2.0); 
            }
            if (this.keys.space) this.velocity.y = 4.0; 
            
        } else {
            this.velocity.x = moveDir.x * this.speed; 
            this.velocity.z = moveDir.z * this.speed;
            this.velocity.y += this.gravity * dt;
            
            if (this.keys.space && this.isGrounded) { 
                this.velocity.y = this.jumpStrength; 
                this.isGrounded = false; 
                this.hungerTimer += 1.0; // Saltar da hambre
            }
        }

        let pos = this.camera.position.clone(); pos.y -= this.height; 

        pos.x += this.velocity.x * dt; if (this.checkCollision(pos)) { pos.x -= this.velocity.x * dt; }
        pos.z += this.velocity.z * dt; if (this.checkCollision(pos)) { pos.z -= this.velocity.z * dt; }
        pos.y += this.velocity.y * dt;
        
        this.isGrounded = false;
        if (this.checkCollision(pos)) {
            pos.y -= this.velocity.y * dt;
            
            // CÁLCULO DE DAÑO POR CAÍDA AL ATERRIZAR
            if (this.velocity.y < 0) {
                this.isGrounded = true; 
                if (!wasGrounded) {
                    let fallDistance = this.highestY - (pos.y + this.height);
                    if (fallDistance > this.fallDamageThreshold) {
                        let damage = Math.floor((fallDistance - 3) * 2); // 1 corazón (2 pts) por bloque de más
                        this.takeDamage(damage);
                    }
                }
                this.highestY = pos.y + this.height; // Reset tras tocar suelo
            }
            this.velocity.y = 0;
        }

        // Seguimiento del punto más alto mientras se cae
        if (!this.isGrounded && !inWater) {
            if (pos.y + this.height > this.highestY) this.highestY = pos.y + this.height;
        }

        this.camera.position.set(pos.x, pos.y + this.height, pos.z);
    }
}
