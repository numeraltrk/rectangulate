import { TILE_CONFIG } from './constants.js';

/**
 * Represents a single Algebra Tile
 */
export class Tile {
    constructor(type, x, y, isNegative = false) {
        this.type = type; // 'x2', 'x', 'one'
        this.x = x;
        this.y = y;
        this.isNegative = isNegative;
        this.rotation = 0; // 0 or 90 degrees (Math.PI / 2)
        this.isDragging = false;

        this.uSize = TILE_CONFIG.SIZES.u;
        this.xSize = TILE_CONFIG.SIZES.x;

        this.updateDimensions();
    }

    updateDimensions() {
        if (this.type === 'x2') {
            this.w = this.xSize;
            this.h = this.xSize;
        } else if (this.type === 'x') {
            this.w = this.rotation === 0 ? this.xSize : this.uSize;
            this.h = this.rotation === 0 ? this.uSize : this.xSize;
        } else { // 'one'
            this.w = this.uSize;
            this.h = this.uSize;
        }
    }

    contains(mx, my) {
        return mx >= this.x && mx <= this.x + this.w &&
            my >= this.y && my <= this.y + this.h;
    }

    rotate() {
        if (this.type === 'x') {
            this.rotation = this.rotation === 0 ? 1 : 0;
            this.updateDimensions();
        }
    }

    draw(ctx) {
        ctx.save();

        ctx.fillStyle = this.getColor();
        ctx.strokeStyle = TILE_CONFIG.COLORS.stroke;
        ctx.lineWidth = 2;

        if (this.isDragging) {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;
        }

        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        // Label
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let label = '';
        if (this.type === 'x2') label = 'x²';
        else if (this.type === 'x') label = 'x';
        else label = '1';

        ctx.fillText(label, this.x + this.w / 2, this.y + this.h / 2);

        ctx.restore();
    }

    getColor() {
        if (this.isNegative) return TILE_CONFIG.COLORS.neg;
        return TILE_CONFIG.COLORS[this.type];
    }
}
