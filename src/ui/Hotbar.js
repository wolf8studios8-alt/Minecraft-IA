import { BLOCKS } from '../constants.js';

export class Hotbar {
    constructor() {
        this.selectedIndex = 0;
        this.slots = new Array(36).fill(null);
        this.chestSlots = new Array(27).fill(null);
        this.activeChestKey = null;
        this.swapSource = null; 

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
        for (let i = 0; i < 36; i++) {
            if (this.slots[i] && this.slots[i].id === id && this.slots[i].count < 64) {
                this.slots[i].count += amount;
                this.render();
                this.save();
                return;
            }
        }
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
        this.swapSource = null; 
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
        this.swapSource = null;
        document.getElementById('chest-section').style.display = 'none';
        this.render();
    }

    getBlockColor(id) {
        switch(id) {
            case BLOCKS.DIRT: return '#5C4033';
            case BLOCKS.GRASS: return '#52b015';
            case BLOCKS.STONE: return '#7D7D7D';
            case BLOCKS.WOOD: return '#75502b';
            case BLOCKS.LEAVES: return '#2a781a';
            case BLOCKS.SAND: return '#d2b48c';
            case BLOCKS.TORCH: return '#ffaa00';
            case BLOCKS.CHEST: return '#8f563b';
            case BLOCKS.GLASS: return '#aadfff';
            default: return '#fff';
        }
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
            
            if (this.swapSource && this.swapSource.type === type && this.swapSource.index === index) {
                div.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                div.style.boxShadow = 'inset 0 0 10px #fff';
            }
            
            let slotData = dataArray[index];
            if (slotData) {
                // Generar Miniatura del bloque
                let icon = document.createElement('div');
                icon.className = 'block-icon';
                icon.style.backgroundColor = this.getBlockColor(slotData.id);
                div.appendChild(icon);

                // Etiqueta de cantidad
                let countTxt = document.createElement('span');
                countTxt.className = 'count';
                countTxt.innerText = slotData.count;
                div.appendChild(countTxt);
            }

            div.onclick = (e) => {
                const invScreen = document.getElementById('inventory-screen');
                const isInvOpen = invScreen && invScreen.style.display === 'flex';

                if (!isInvOpen && isHotbar) {
                    this.selectedIndex = index;
                    this.render();
                    return;
                }

                if (isInvOpen) {
                    if (!this.swapSource) {
                        this.swapSource = { type: type, index: index };
                        this.render();
                    } else {
                        let sArray = this.swapSource.type === 'inv' ? this.slots : this.chestSlots;
                        let tArray = type === 'inv' ? this.slots : this.chestSlots;
                        
                        let temp = sArray[this.swapSource.index];
                        sArray[this.swapSource.index] = tArray[index];
                        tArray[index] = temp;
                        
                        this.swapSource = null; 
                        this.render();
                        this.save();
                    }
                }
            };

            return div;
        };

        for (let i = 0; i < 36; i++) {
            let el = createSlotUI('inv', i, this.slots);
            if (i < 9) hotbarEl.appendChild(el);
            else if (mainEl) mainEl.appendChild(el);
        }

        if (this.activeChestKey && chestEl) {
            for (let i = 0; i < 27; i++) {
                chestEl.appendChild(createSlotUI('chest', i, this.chestSlots));
            }
        }
    }
}
