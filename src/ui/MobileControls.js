export class MobileControls {
    constructor(player, camera) {
        this.player = player;
        this.camera = camera;
        this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        
        this.touchLookEnabled = false;
        this.lookTouchId = null;
        this.lastTouchX = 0;
        this.lastTouchY = 0;

        if (this.isMobile) {
            this.initUI();
            this.initJoystick();
            this.initLook();
            this.initButtons();
        }
    }

    initUI() {
        document.getElementById('mobile-controls').style.display = 'block';
        // En móvil, tocar la pantalla de pausa quita el menú pero no bloquea el cursor
        const pauseScreen = document.getElementById('pause-screen');
        pauseScreen.addEventListener('touchstart', (e) => {
            e.preventDefault();
            pauseScreen.style.display = 'none';
            this.touchLookEnabled = true;
        });
    }

    initJoystick() {
        const zone = document.getElementById('joystick-zone');
        const stick = document.getElementById('joystick-stick');
        const base = document.getElementById('joystick-base');
        let stickId = null;

        const resetJoystick = () => {
            stick.style.transform = `translate(0px, 0px)`;
            this.player.keys.w = false; this.player.keys.s = false;
            this.player.keys.a = false; this.player.keys.d = false;
            stickId = null;
        };

        zone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            stickId = e.changedTouches[0].identifier;
        });

        zone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === stickId) {
                    let touch = e.changedTouches[i];
                    let rect = base.getBoundingClientRect();
                    let centerX = rect.left + rect.width / 2;
                    let centerY = rect.top + rect.height / 2;
                    
                    let dx = touch.clientX - centerX;
                    let dy = touch.clientY - centerY;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    let maxDist = rect.width / 2 - 25; // 25 es la mitad del stick

                    if (distance > maxDist) {
                        dx = (dx / distance) * maxDist;
                        dy = (dy / distance) * maxDist;
                    }

                    stick.style.transform = `translate(${dx}px, ${dy}px)`;

                    // Traducir a teclado virtual para el Player
                    let threshold = 15;
                    this.player.keys.w = dy < -threshold;
                    this.player.keys.s = dy > threshold;
                    this.player.keys.a = dx < -threshold;
                    this.player.keys.d = dx > threshold;
                }
            }
        });

        zone.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === stickId) resetJoystick();
            }
        });
        zone.addEventListener('touchcancel', resetJoystick);
    }

    initLook() {
        // Deslizar el dedo por la pantalla (fuera de los controles) rota la cámara
        document.addEventListener('touchstart', (e) => {
            if (!this.touchLookEnabled) return;
            // Evitar conflictos con joystick o botones
            if (e.target.closest('#mobile-controls') || e.target.closest('#inventory-screen') || e.target.closest('#hotbar')) return;
            
            this.lookTouchId = e.changedTouches[0].identifier;
            this.lastTouchX = e.changedTouches[0].clientX;
            this.lastTouchY = e.changedTouches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.touchLookEnabled || this.lookTouchId === null) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.lookTouchId) {
                    let touch = e.changedTouches[i];
                    let deltaX = touch.clientX - this.lastTouchX;
                    let deltaY = touch.clientY - this.lastTouchY;

                    // Despachar un evento falso de movimiento de ratón para que main.js lo capture
                    const mouseEvent = new MouseEvent('mousemove', {
                        movementX: deltaX * 1.5,
                        movementY: deltaY * 1.5
                    });
                    document.dispatchEvent(mouseEvent);

                    this.lastTouchX = touch.clientX;
                    this.lastTouchY = touch.clientY;
                }
            }
        });

        const endLook = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.lookTouchId) this.lookTouchId = null;
            }
        };

        document.addEventListener('touchend', endLook);
        document.addEventListener('touchcancel', endLook);
    }

    initButtons() {
        const btnJump = document.getElementById('btn-jump');
        const btnMine = document.getElementById('btn-mine');
        const btnPlace = document.getElementById('btn-place');
        const btnInv = document.getElementById('btn-inv');

        btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); this.player.keys.space = true; });
        btnJump.addEventListener('touchend', (e) => { e.preventDefault(); this.player.keys.space = false; });

        // Eventos sintéticos para minar y colocar (simulan clics izquierdo y derecho)
        const dispatchMouse = (buttonType) => {
            if(!this.touchLookEnabled) return;
            const mouseEvent = new MouseEvent('mousedown', { button: buttonType });
            document.dispatchEvent(mouseEvent);
            setTimeout(() => { document.dispatchEvent(new MouseEvent('mouseup', { button: buttonType })); }, 50);
        };

        btnMine.addEventListener('touchstart', (e) => { e.preventDefault(); dispatchMouse(0); });
        btnPlace.addEventListener('touchstart', (e) => { e.preventDefault(); dispatchMouse(2); });

        // Inventario
        btnInv.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const invScreen = document.getElementById('inventory-screen');
            if (invScreen.style.display === 'flex') {
                invScreen.style.display = 'none';
                this.touchLookEnabled = true;
            } else {
                invScreen.style.display = 'flex';
                this.touchLookEnabled = false;
                this.player.keys = { w: false, a: false, s: false, d: false, space: false };
            }
        });
    }
}
