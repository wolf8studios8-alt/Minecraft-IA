import { BLOCKS } from '../constants.js';

export class Hotbar {
    constructor() {
        this.selectedIndex = 0;
        // 36 slots: 0-8 Hotbar, 9-35 Inventario principal
        this.slots = new Array(36).fill(null);
        this.chestSlots = new Array(27).fill(null);
        this.activeChestKey = null;

        // Inventario base si es la primera vez
        let savedData = JSON.parse(localStorage.getItem('voxel_player_inventory'));
        if (savedData) {
            this.slots = savedData;
        } else {
            this.slots[0] = { id: BLOCKS.DIRT, count: 64 };
            this.slots[1] = { id: BLOCKS.STONE, count: 64 };
            this.slots[2] = { id: BLOCKS.WOOD, count: 64 };
            this.slots[3] = { id: BLOCKS.GLASS, count: 64 };
            this.slots[4] = { id: BLOCKS.TORCH, count: 99 };
            this.slots[5] = { id: BLOCKS.CHEST, count: 5 };
        }

        document.addEventListener('keydown', (e) => {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 9) { 
                this.selectedIndex = num - 1; 
                this.render(); 
            }
        });
        
        this.render();
    }

    save() {
        localStorage.setItem('voxel_player_inventory', JSON.stringify(this.slots));
    }

    getSelectedBlock() {
        return this.slots[this.selectedIndex] ? this.slots[this.selectedIndex].id : BLOCKS.AIR;
    }

    consumeSelected() {
        let slot = this.slots[this.selectedIndex];
        if (slot && slot.count > 0) {
            slot.count--;
            if (slot.count <= 0) this.slots[this.selectedIndex] = null;
            this.render();
            this.save();
            return true;
        }
        return false;
    }

    addBlock(id, amount = 1) {
        // Intentar apilar
        for (let i = 0; i < 36; i++) {
            if (this.slots[i] && this.slots[i].id === id && this.slots[i].count < 64) {
                this.slots[i].count += amount;
                this.render();
                this.save();
                return;
            }
        }
        // Buscar hueco vacío
        for (let i = 0; i < 36; i++) {
            if (!this.slots[i]) {
                this.slots[i] = { id: id, count: amount };
                this.render();
                this.save();
                return;
            }
        }
    }

    openChest(chestKey) {
        this.activeChestKey = chestKey;
        let savedChests = JSON.parse(localStorage.getItem('voxel_chests')) || {};
        this.chestSlots = savedChests[chestKey] || new Array(27).fill(null);
        document.getElementById('chest-section').style.display = 'block';
        this.render();
    }

    closeChest() {
        if (this.activeChestKey) {
            let savedChests = JSON.parse(localStorage.getItem('voxel_chests')) || {};
            savedChests[this.activeChestKey] = this.chestSlots;
            localStorage.setItem('voxel_chests', JSON.stringify(savedChests));
        }
        this.activeChestKey = null;
        document.getElementById('chest-section').style.display = 'none';
        this.render();
    }

    render() {
        const hotbarEl = document.getElementById('hotbar');
        const mainEl = document.getElementById('main-inventory');
        const chestEl = document.getElementById('chest-inventory');
        
        hotbarEl.innerHTML = '';
        if(mainEl) mainEl.innerHTML = '';
        if(chestEl) chestEl.innerHTML = '';

        const createSlotUI = (type, index, dataArray) => {
            const div = document.createElement('div');
            let isHotbar = (type === 'inv' && index < 9);
            div.className = isHotbar ? 'slot' : 'inv-slot';
            if (isHotbar && index === this.selectedIndex) div.classList.add('active');
            
            div.draggable = true;
            
            let slotData = dataArray[index];
            if (slotData) {
                div.innerText = slotData.count;
                let c = '';
                if(slotData.id === BLOCKS.DIRT) c = '#5C4033';
                if(slotData.id === BLOCKS.STONE) c = '#7D7D7D';
                if(slotData.id === BLOCKS.WOOD) c = '#75502b';
                if(slotData.id === BLOCKS.GLASS) c = '#aadfff';
                if(slotData.id === BLOCKS.TORCH) c = '#ffaa00';
                if(slotData.id === BLOCKS.CHEST) c = '#8f563b';
                if(slotData.id === BLOCKS.SAND) c = '#d2b48c';
                div.style.borderBottomColor = c;
            }

            // Lógica Drag & Drop
            div.ondragstart = (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: type, index: index }));
            };
            div.ondragover = (e) => e.preventDefault();
            div.ondrop = (e) => {
                e.preventDefault();
                let dragged = JSON.parse(e.dataTransfer.getData('application/json'));
                let sourceArray = dragged.type === 'inv' ? this.slots : this.chestSlots;
                let targetArray = type === 'inv' ? this.slots : this.chestSlots;
                
                // Intercambio de objetos
                let temp = sourceArray[dragged.index];
                sourceArray[dragged.index] = targetArray[index];
                targetArray[index] = temp;
                
                this.render();
                this.save();
            };
            return div;
        };

        // Renderizar Inventario
        for (let i = 0; i < 36; i++) {
            let el = createSlotUI('inv', i, this.slots);
            if (i < 9) hotbarEl.appendChild(el);
            else if (mainEl) mainEl.appendChild(el);
        }

        // Renderizar Cofre si está abierto
        if (this.activeChestKey && chestEl) {
            for (let i = 0; i < 27; i++) {
                chestEl.appendChild(createSlotUI('chest', i, this.chestSlots));
            }
        }
    }
}
