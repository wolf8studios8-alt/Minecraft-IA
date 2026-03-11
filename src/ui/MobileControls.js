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
                    let maxDist = rect.width / 2 - 25;

                    if (distance > maxDist) {
                        dx = (dx / distance) * maxDist;
                        dy = (dy / distance) * maxDist;
                    }

                    stick.style.transform = `translate(${dx}px, ${dy}px)`;

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
        document.addEventListener('touchstart', (e) => {
            if (!this.touchLookEnabled) return;
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
        btnJump.addEventListener('touchcancel', (e) => { e.preventDefault(); this.player.keys.space = false; });

        const dispatchMouse = (type, buttonType) => {
            if(!this.touchLookEnabled) return;
            const mouseEvent = new MouseEvent(type, { button: buttonType });
            document.dispatchEvent(mouseEvent);
        };

        // ARREGLO DEL MINADO: Ahora puedes mantener pulsado el botón táctil
        btnMine.addEventListener('touchstart', (e) => { e.preventDefault(); dispatchMouse('mousedown', 0); });
        btnMine.addEventListener('touchend', (e) => { e.preventDefault(); dispatchMouse('mouseup', 0); });
        btnMine.addEventListener('touchcancel', (e) => { e.preventDefault(); dispatchMouse('mouseup', 0); });

        btnPlace.addEventListener('touchstart', (e) => { e.preventDefault(); dispatchMouse('mousedown', 2); });
        btnPlace.addEventListener('touchend', (e) => { e.preventDefault(); dispatchMouse('mouseup', 2); });
        btnPlace.addEventListener('touchcancel', (e) => { e.preventDefault(); dispatchMouse('mouseup', 2); });

        btnInv.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Simula pulsar la tecla 'X' de PC para abrir el inventario
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' }));
            setTimeout(() => {
                const invScreen = document.getElementById('inventory-screen');
                this.touchLookEnabled = (invScreen.style.display !== 'flex');
            }, 10);
        });
    }
}
