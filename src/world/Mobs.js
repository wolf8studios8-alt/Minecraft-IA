import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { BLOCKS } from '../constants.js';

const MOB_COLORS = {
    pig: 0xf0a5a2,     
    sheep: 0xeaddda,   
    cow: 0x4d494d,     
    chicken: 0xffffff  
};

export class MobManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.mobs = [];
        this.maxMobs = 25; // Límite incrementado de forma segura
    }

    spawn(type, x, y, z) {
        if (this.mobs.length >= this.maxMobs) return;
        const mob = new Mob(type, x, y, z, this.scene);
        this.mobs.push(mob);
    }

    update(dt, playerPos) {
        for (let i = this.mobs.length - 1; i >= 0; i--) {
            let mob = this.mobs[i];
            mob.update(dt, this.world);
            
            let dist = mob.group.position.distanceTo(playerPos);
            // Se elimina si cae al vacío o si el jugador se aleja a más de 80 bloques
            if (mob.group.position.y < -10 || dist > 80) {
                this.scene.remove(mob.group);
                this.mobs.splice(i, 1);
            }
        }
    }
}

class Mob {
    constructor(type, x, y, z, scene) {
        this.type = type;
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        this.state = 'idle'; 
        this.timer = Math.random() * 3;
        this.targetRotation = Math.random() * Math.PI * 2;

        this.buildModel();
        scene.add(this.group);
        
        this.speed = type === 'chicken' ? 1.5 : 0.8;
    }

    buildModel() {
        let w = 0.6, h = 0.6, d = 0.9;
        let color = MOB_COLORS[this.type];
        let yOffset = h / 2;

        if (this.type === 'chicken') { w = 0.3; h = 0.4; d = 0.4; yOffset = 0.2; }
        if (this.type === 'cow') { w = 0.8; h = 0.9; d = 1.2; yOffset = 0.45; }

        const mat = new THREE.MeshLambertMaterial({ color: color });
        
        const bodyGeo = new THREE.BoxGeometry(w, h, d);
        const bodyMesh = new THREE.Mesh(bodyGeo, mat);
        bodyMesh.position.y = yOffset;
        
        const headGeo = new THREE.BoxGeometry(w * 0.8, w * 0.8, w * 0.8);
        const headMesh = new THREE.Mesh(headGeo, mat);
        headMesh.position.set(0, yOffset + h/2 + w * 0.1, d/2);
        
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.2, d * 1.2), shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.05;

        this.group.add(bodyMesh);
        this.group.add(headMesh);
        this.group.add(shadow);
    }

    checkCollision(pos, world) {
        let px = Math.floor(pos.x), py = Math.floor(pos.y), pz = Math.floor(pos.z);
        let feetBlock = world.getBlockGlobal(px, py, pz);
        let headBlock = world.getBlockGlobal(px, py + 1, pz);
        return (feetBlock !== BLOCKS.AIR && feetBlock !== BLOCKS.WATER) || 
               (headBlock !== BLOCKS.AIR && headBlock !== BLOCKS.WATER);
    }

    update(dt, world) {
        this.timer -= dt;
        
        if (this.timer <= 0) {
            if (this.state === 'idle') {
                this.state = 'wander';
                this.timer = 1 + Math.random() * 4;
                this.targetRotation = Math.random() * Math.PI * 2;
            } else {
                this.state = 'idle';
                this.timer = 1 + Math.random() * 3;
            }
        }

        this.velocity.y -= 25.0 * dt;

        if (this.state === 'wander') {
            let diff = this.targetRotation - this.group.rotation.y;
            this.group.rotation.y += diff * 3 * dt;
            
            let dir = new THREE.Vector3(0, 0, 1).applyEuler(this.group.rotation);
            this.velocity.x = dir.x * this.speed;
            this.velocity.z = dir.z * this.speed;
        } else {
            this.velocity.x *= 0.5;
            this.velocity.z *= 0.5;
        }

        let pos = this.group.position.clone();
        
        pos.x += this.velocity.x * dt;
        if (this.checkCollision(pos, world)) pos.x -= this.velocity.x * dt;
        
        pos.z += this.velocity.z * dt;
        if (this.checkCollision(pos, world)) pos.z -= this.velocity.z * dt;
        
        pos.y += this.velocity.y * dt;
        if (this.checkCollision(pos, world)) {
            pos.y -= this.velocity.y * dt;
            this.velocity.y = 0; 
            
            if (this.state === 'wander') {
                let frontPos = pos.clone();
                frontPos.x += Math.sin(this.group.rotation.y) * 0.8;
                frontPos.z += Math.cos(this.group.rotation.y) * 0.8;
                frontPos.y += 0.5;
                if (this.checkCollision(frontPos, world)) {
                    this.velocity.y = 7.5; 
                }
            }
        }

        this.group.position.copy(pos);
    }
}
