import { BLOCKS } from '../constants.js';

export class Hotbar {
    constructor() {
        this.blocks = [BLOCKS.DIRT, BLOCKS.STONE, BLOCKS.WOOD, BLOCKS.GLASS, BLOCKS.SAND, BLOCKS.TORCH, BLOCKS.CHEST];
        this.selectedIndex = 0;
        
        // Recuperamos inventario si existe en LocalStorage, si no, damos uno por defecto
        let savedData = JSON.parse(localStorage.getItem('voxel_player_data'));
        this.inventory = savedData?.inventory || { 
            [BLOCKS.DIRT]: 64, [BLOCKS.STONE]: 64, [BLOCKS.WOOD]: 64, 
            [BLOCKS.GLASS]: 64, [BLOCKS.TORCH]: 99, [BLOCKS.CHEST]: 2 
        };
        
        this.uiElement = document.getElementById('hotbar');

        // Escuchar teclado numérico (1-7)
        document.addEventListener('keydown', (e) => {
            const num = parseInt(e.key);
            if (num >= 1 && num <= this.blocks.length) { 
                this.selectedIndex = num - 1; 
                this.render(); 
            }
        });

        this.render();
    }

    getSelectedBlock() {
        return this.blocks[this.selectedIndex];
    }

    consumeBlock() {
        let block = this.getSelectedBlock();
        if ((this.inventory[block] || 0) > 0) {
            this.inventory[block]--;
            this.render();
            return true;
        }
        return false;
    }

    addBlock(blockId) {
        this.inventory[blockId] = (this.inventory[blockId] || 0) + 1;
        this.render();
    }

    render() {
        this.uiElement.innerHTML = '';
        this.blocks.forEach((blockId, index) => {
            const slot = document.createElement('div');
            slot.className = 'slot' + (index === this.selectedIndex ? ' active' : '');
            
            let count = this.inventory[blockId] || 0;
            slot.innerText = count;
            if (count === 0) slot.style.opacity = '0.3';
            
            // Colores característicos para identificar rápido los bloques
            if (blockId === BLOCKS.DIRT) slot.style.borderBottomColor = '#5C4033';
            if (blockId === BLOCKS.STONE) slot.style.borderBottomColor = '#7D7D7D';
            if (blockId === BLOCKS.GLASS) slot.style.borderBottomColor = '#aadfff';
            if (blockId === BLOCKS.TORCH) slot.style.borderBottomColor = '#ffaa00';
            
            this.uiElement.appendChild(slot);
        });
    }
}
