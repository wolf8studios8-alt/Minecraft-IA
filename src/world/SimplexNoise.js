export class SimplexNoise {
    constructor() {
        this.p = new Uint8Array(256); 
        for (let i = 0; i < 256; i++) this.p[i] = Math.floor(Math.random() * 256);
        this.perm = new Uint8Array(512); 
        for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y, z) { 
        let h = hash & 15; 
        let u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; 
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v); 
    }
    noise3D(x, y, z) {
        let X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        let u = this.fade(x), v = this.fade(y), w = this.fade(z);
        let A = this.perm[X]+Y, AA = this.perm[A]+Z, AB = this.perm[A+1]+Z, B = this.perm[X+1]+Y, BA = this.perm[B]+Z, BB = this.perm[B+1]+Z;
        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x-1, y, z)), this.lerp(u, this.grad(this.perm[AB], x, y-1, z), this.grad(this.perm[BB], x-1, y-1, z))), this.lerp(v, this.lerp(u, this.grad(this.perm[AA+1], x, y, z-1), this.grad(this.perm[BA+1], x-1, y, z-1)), this.lerp(u, this.grad(this.perm[AB+1], x, y-1, z-1), this.grad(this.perm[BB+1], x-1, y-1, z-1))));
    }
    fbm3D(x, y, z, octaves, persistence, scale) {
        let total = 0, frequency = scale, amplitude = 1, maxValue = 0;
        for(let i = 0; i < octaves; i++) { 
            total += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude; 
            maxValue += amplitude; 
            amplitude *= persistence; 
            frequency *= 2; 
        }
        return total / maxValue;
    }
}
