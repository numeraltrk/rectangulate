import { Tile } from './Tile.js';
import { TILE_CONFIG, updateTileConfig } from './constants.js';
import { solveAndAnimate } from './animator.js';
import { validateArrangement, checkSolution } from './validator.js';

/**
 * Main Application Logic
 */
export class App {
    constructor() {
        this.canvas = document.getElementById('app-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tiles = [];
        this.dragTarget = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isAnimating = false;

        // Add lastTap for double tap detection
        this.lastTap = null;

        this.resize();

        // Debounce resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 100);
        });

        this.setupInputListeners();
        this.setupCanvasListeners();

        // Initial render
        this.requestRender();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        updateTileConfig(); // Check scale on resize
        this.updateAllTileDimensions(); // Update existing tiles
        this.requestRender();
    }

    updateAllTileDimensions() {
        this.tiles.forEach(tile => {
            tile.uSize = TILE_CONFIG.SIZES.u;
            tile.xSize = TILE_CONFIG.SIZES.x;
            tile.updateDimensions();
        });
    }

    setupInputListeners() {

        document.getElementById('btn-solve').addEventListener('click', () => {
            this.tiles = [];
            this.requestRender();
            this.hideFeedback();
            // Call imported function
            solveAndAnimate(this);
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            this.tiles = [];
            this.requestRender();
            this.hideFeedback();
        });

        document.getElementById('btn-check').addEventListener('click', () => {
            // Call imported function
            validateArrangement(this);
        });

        // Tile Bank Controls
        document.querySelectorAll('.ctrl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = btn.getAttribute('data-type');
                const isNeg = btn.getAttribute('data-neg') === 'true';

                if (btn.classList.contains('add')) {
                    this.addTile(type, isNeg);
                } else if (btn.classList.contains('remove')) {
                    this.removeTile(type, isNeg);
                }
            });
        });

        // Feedback Close Button
        document.querySelector('.feedback-area .close-btn').addEventListener('click', () => {
            this.hideFeedback();
        });

        // Input listeners for Equation Display updates
        ['coeff-a', 'coeff-b', 'coeff-c'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateEquationDisplay());
        });

        // Initial update
        this.updateEquationDisplay();
    }

    hideFeedback() {
        const fb = document.getElementById('feedback');
        fb.classList.add('hidden');
        fb.classList.remove('show');
    }

    showFeedback(message, isSuccess) {
        const fb = document.getElementById('feedback');
        const msg = fb.querySelector('.message');
        msg.textContent = message;
        fb.classList.remove('hidden');
        fb.classList.add('show');

        if (isSuccess) {
            fb.style.borderColor = 'var(--success)';
            fb.style.background = 'rgba(16, 185, 129, 0.1)';
        } else {
            fb.style.borderColor = 'var(--error)';
            fb.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    }

    setupCanvasListeners() {
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        window.addEventListener('pointermove', this.handlePointerMove.bind(this));
        window.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }

    handlePointerDown(e) {
        if (!e.isPrimary) return;
        this.canvas.setPointerCapture(e.pointerId);

        const { x, y } = this.getMousePos(e);
        // Check processing in reverse order (top first)
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            if (this.tiles[i].contains(x, y)) {
                this.dragTarget = this.tiles[i];
                // Move to top of stack
                this.tiles.splice(i, 1);
                this.tiles.push(this.dragTarget);

                this.dragTarget.isDragging = true;
                this.dragOffset = {
                    x: x - this.dragTarget.x,
                    y: y - this.dragTarget.y
                };
                this.requestRender();
                return;
            }
        }
    }

    handlePointerMove(e) {
        if (!this.dragTarget) return;
        if (e.pointerId !== undefined && !this.canvas.hasPointerCapture(e.pointerId) && e.pointerType !== 'mouse') {
            // Ensure capture if not mouse (sometimes lost on weird interactions)
            // But usually capture is enough
        }

        const { x, y } = this.getMousePos(e);
        // Boundary Constraints
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        const tW = this.dragTarget.w;
        const tH = this.dragTarget.h;

        this.dragTarget.x = Math.max(0, Math.min(canvasW - tW, x - this.dragOffset.x));
        this.dragTarget.y = Math.max(0, Math.min(canvasH - tH, y - this.dragOffset.y));

        this.requestRender();
    }

    handlePointerUp(e) {
        if (this.dragTarget) {
            this.snapToNeighbors(this.dragTarget);
            this.dragTarget.isDragging = false;
            this.dragTarget = null;
            this.requestRender();
            // Call imported function
            checkSolution(this);
            if (e.pointerId) this.canvas.releasePointerCapture(e.pointerId);
        }
    }

    addTile(type, isNegative) {
        // Random spawn position near center
        const rect = this.canvas.getBoundingClientRect();
        const startX = rect.width / 2 + (Math.random() * 40 - 20);
        const startY = rect.height / 2 + (Math.random() * 40 - 20);

        const newTile = new Tile(type, startX, startY, isNegative);

        // Center adjustment not strictly needed if we spawn random, but ensures center of tile is at point
        newTile.x -= newTile.w / 2;
        newTile.y -= newTile.h / 2;

        this.tiles.push(newTile);

        // Pulse animation or highlight could be added here
        this.requestRender();
        checkSolution(this);
    }

    removeTile(type, isNegative) {
        // Remove the last added tile of this type
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const t = this.tiles[i];
            if (t.type === type && t.isNegative === isNegative) {
                this.tiles.splice(i, 1);
                this.requestRender();
                checkSolution(this);
                return;
            }
        }
    }



    getCoefficients() {
        const limit = TILE_CONFIG.LIMITS;
        const clamp = (val) => Math.max(limit.MIN_COEFF, Math.min(limit.MAX_COEFF, val));

        const a = clamp(parseInt(document.getElementById('coeff-a').value) || 0);
        const b = clamp(parseInt(document.getElementById('coeff-b').value) || 0);
        const c = clamp(parseInt(document.getElementById('coeff-c').value) || 0);

        return { a, b, c };
    }

    updateEquationDisplay() {
        const { a, b, c } = this.getCoefficients();

        // Format terms
        const termA = a !== 0 ? (a === 1 ? 'x^2' : (a === -1 ? '-x^2' : `${a}x^2`)) : '';

        let termB = '';
        if (b !== 0) {
            if (b > 0) termB = a !== 0 ? ` + ${b === 1 ? 'x' : `${b}x`}` : `${b === 1 ? 'x' : `${b}x`}`;
            else termB = ` - ${Math.abs(b) === 1 ? 'x' : `${Math.abs(b)}x`}`;
        }

        let termC = '';
        if (c !== 0) {
            if (c > 0) termC = (a !== 0 || b !== 0) ? ` + ${c}` : `${c}`;
            else termC = ` - ${Math.abs(c)}`;
        }

        let eq = `${termA}${termB}${termC}`;
        if (!eq) eq = '0';

        const display = document.getElementById('equation-display');
        display.innerHTML = `$${eq}$`;

        if (window.MathJax) {
            MathJax.typesetPromise([display]);
        }
    }

    snapToNeighbors(tile) {
        const snapDist = TILE_CONFIG.INTERACTION.SNAP_DIST;
        let snapped = false;

        for (const other of this.tiles) {
            if (other === tile) continue;

            const tL = tile.x;
            const tR = tile.x + tile.w;
            const tT = tile.y;
            const tB = tile.y + tile.h;

            const oL = other.x;
            const oR = other.x + other.w;
            const oT = other.y;
            const oB = other.y + other.h;

            // --- Outer Snapping ---
            // 1. Right of 'other'
            if (Math.abs(tL - oR) < snapDist) {
                if (Math.abs(tT - oT) < snapDist) { tile.x = oR; tile.y = oT; snapped = true; }
                else if (Math.abs(tB - oB) < snapDist) { tile.x = oR; tile.y = oB - tile.h; snapped = true; }
            }
            // 2. Left of 'other'
            if (!snapped && Math.abs(tR - oL) < snapDist) {
                if (Math.abs(tT - oT) < snapDist) { tile.x = oL - tile.w; tile.y = oT; snapped = true; }
                else if (Math.abs(tB - oB) < snapDist) { tile.x = oL - tile.w; tile.y = oB - tile.h; snapped = true; }
            }
            // 3. Bottom of 'other'
            if (!snapped && Math.abs(tT - oB) < snapDist) {
                if (Math.abs(tL - oL) < snapDist) { tile.y = oB; tile.x = oL; snapped = true; }
                else if (Math.abs(tR - oR) < snapDist) { tile.y = oB; tile.x = oR - tile.w; snapped = true; }
            }
            // 4. Top of 'other'
            if (!snapped && Math.abs(tB - oT) < snapDist) {
                if (Math.abs(tL - oL) < snapDist) { tile.y = oT - tile.h; tile.x = oL; snapped = true; }
                else if (Math.abs(tR - oR) < snapDist) { tile.y = oT - tile.h; tile.x = oR - tile.w; snapped = true; }
            }

            // --- Inner Snapping (Overlap Support) ---
            if (!snapped) {
                // Left-Left Align
                if (Math.abs(tL - oL) < snapDist) {
                    if (Math.abs(tT - oT) < snapDist) { tile.x = oL; tile.y = oT; snapped = true; }
                    else if (Math.abs(tB - oB) < snapDist) { tile.x = oL; tile.y = oB - tile.h; snapped = true; }
                    // Also snap stacked vertical bars
                    else if (Math.abs(tT - oB) < snapDist) { tile.x = oL; tile.y = oB; snapped = true; } // Stack down
                    else if (Math.abs(tB - oT) < snapDist) { tile.x = oL; tile.y = oT - tile.h; snapped = true; } // Stack up
                }

                // Top-Top Align
                if (!snapped && Math.abs(tT - oT) < snapDist) {
                    if (Math.abs(tL - oL) < snapDist) { tile.x = oL; tile.y = oT; snapped = true; }
                    else if (Math.abs(tR - oR) < snapDist) { tile.x = oR - tile.w; tile.y = oT; snapped = true; }
                    // Stacked horizontal bars
                    else if (Math.abs(tL - oR) < snapDist) { tile.x = oR; tile.y = oT; snapped = true; }
                    else if (Math.abs(tR - oL) < snapDist) { tile.x = oL - tile.w; tile.y = oT; snapped = true; }
                }
            }

            if (snapped) break;
        }
    }

    handleDoubleClick(e) {
        const { x, y } = this.getMousePos(e);
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            if (this.tiles[i].contains(x, y)) {
                this.tiles[i].rotate();
                this.requestRender();
                return;
            }
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    requestRender() {
        requestAnimationFrame(this.render.bind(this));
    }

    render() {
        // Animation Loop Step
        if (this.isAnimating) {
            let active = false;
            const ease = TILE_CONFIG.INTERACTION.DRAG_EASE;

            for (const t of this.tiles) {
                // Move x
                if (Math.abs(t.x - t.targetX) > 0.5) {
                    t.x += (t.targetX - t.x) * ease;
                    active = true;
                } else {
                    t.x = t.targetX;
                }

                // Move y
                if (Math.abs(t.y - t.targetY) > 0.5) {
                    t.y += (t.targetY - t.y) * ease;
                    active = true;
                } else {
                    t.y = t.targetY;
                }
            }

            if (active) {
                requestAnimationFrame(this.render.bind(this));
            } else {
                this.isAnimating = false;
                // Call imported function
                validateArrangement(this, true); // Auto-validate silently after solve
            }
        }

        // Clear
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw tiles
        for (const tile of this.tiles) {
            tile.draw(this.ctx);
        }
    }
}
