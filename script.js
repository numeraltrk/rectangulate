/**
 * Constants and Configuration
 */
let TILE_CONFIG = {
    // Visual multiplier (pixels per unit)
    UNIT: 60,
    // Gap for initial layout
    GAP: 10,
    SIZES: {
        x: 200, // x tile length (and x^2 side)
        u: 25   // unit tile side (and x tile width)
    },
    COLORS: {
        x2: '#facc15',
        x: '#4ade80',
        one: '#60a5fa',
        neg: '#ef4444',
        stroke: 'rgba(255,255,255,0.4)'
    }
};

const updateTileConfig = () => {
    if (window.innerWidth <= 768) {
        // Mobile Sizing
        TILE_CONFIG.SIZES.x = 100;
        TILE_CONFIG.SIZES.u = 20;
    } else {
        // Desktop Sizing
        TILE_CONFIG.SIZES.x = 200;
        TILE_CONFIG.SIZES.u = 25;
    }
};

// Initialize config based on current width
updateTileConfig();

/**
 * Represents a single Algebra Tile
 */
class Tile {
    constructor(type, x, y, isNegative = false) {
        this.type = type; // 'x2', 'x', 'one'
        this.x = x;
        this.y = y;
        this.isNegative = isNegative;
        this.rotation = 0; // 0 or 90 degrees (Math.PI / 2)
        this.isDragging = false;

        // Dimensions based on type
        // x2 = UNIT * UNIT
        // x = UNIT * (UNIT/4 approx? No, width must be distinct from unit to avoid confusion)
        // Actually, physically: 
        // If 1-tile is 1x1, x-tile is 1xX, x2-tile is XxX.
        // For visualization, we pick an arbitrary length for X that is NOT an integer multiple of 1.
        // Let's say Unit = 40px. X_Length = 100px.
        // Then:
        // 'one' = 40x40
        // 'x'   = 40x100
        // 'x2'  = 100x100

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

/**
 * Main Application Logic
 */
class App {
    constructor() {
        this.canvas = document.getElementById('app-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tiles = [];
        this.dragTarget = null;
        this.dragOffset = { x: 0, y: 0 };

        this.resize();
        window.addEventListener('resize', () => this.resize());

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

        document.getElementById('btn-confirm-equation').addEventListener('click', () => {
            this.updateEquationDisplay();
        });

        document.getElementById('btn-solve').addEventListener('click', () => {
            this.solveAndAnimate();
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            this.tiles = [];
            this.requestRender();
            this.hideFeedback();
        });

        document.getElementById('btn-check').addEventListener('click', () => {
            this.validateArrangement();
        });

        // Palette Listeners
        const paletteItems = document.querySelectorAll('.palette-item');
        paletteItems.forEach(item => {
            const handleStart = (e) => {
                e.preventDefault(); // Prevent scrolling/selection
                const type = item.getAttribute('data-type');

                // Get coordinates (Touch or Mouse)
                let clientX, clientY;
                if (e.touches && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                this.spawnTileFromMouse({ clientX, clientY }, type);
            };

            item.addEventListener('mousedown', handleStart);
            item.addEventListener('touchstart', handleStart, { passive: false });
        });

        // Feedback Close Button
        document.querySelector('.feedback-area .close-btn').addEventListener('click', () => {
            this.hideFeedback();
        });
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
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this)); // Window for drag out
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

        // Touch Listeners
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleTouchStart(e) {
        if (e.touches.length > 1) return; // Ignore multi-touch
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });

        // Double Tap Detection
        const now = Date.now();
        if (this.lastTap && (now - this.lastTap) < 300) {
            this.handleDoubleClick(mouseEvent);
            this.lastTap = null;
        } else {
            this.lastTap = now;
            this.handleMouseDown(mouseEvent);
        }
    }

    handleTouchMove(e) {
        if (e.touches.length > 1) return;

        // Only prevent default if we are actively dragging a tile
        if (this.dragTarget) {
            e.preventDefault();
        }

        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    handleTouchEnd(e) {
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }

    spawnTileFromMouse(e, type) {
        const isNeg = document.getElementById('chk-negative').checked;
        const rect = this.canvas.getBoundingClientRect();

        // Start position relative to canvas
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Center the tile on mouse slightly
        // We don't know dimensions perfectly until created, but we can guess.
        // It will snap to mouse in handleMouseMove anyway.

        const newTile = new Tile(type, x, y, isNeg);

        // Center it
        newTile.x -= newTile.w / 2;
        newTile.y -= newTile.h / 2;

        this.tiles.push(newTile);
        this.dragTarget = newTile;
        this.dragTarget.isDragging = true;

        // Calculate offset so it doesn't jump
        // Mouse is at x, y (canvas relative)
        // Tile is at newTile.x, newTile.y
        this.dragOffset = {
            x: x - newTile.x,
            y: y - newTile.y
        };

        this.requestRender();
    }

    generateTiles(a, b, c) {
        this.tiles = [];
        let startX = 50;
        let startY = 50;
        const gap = TILE_CONFIG.GAP;

        // Add x^2 tiles
        for (let i = 0; i < Math.abs(a); i++) {
            this.tiles.push(new Tile('x2', startX, startY, a < 0));
            startX += TILE_CONFIG.SIZES.x + gap; // Simple layout spacing
        }

        // Add x tiles
        startX = 50;
        startY += 120;
        for (let i = 0; i < Math.abs(b); i++) {
            this.tiles.push(new Tile('x', startX, startY, b < 0));
            startX += 50;
            if (i % 10 === 9) { // Wrap
                startX = 50;
                startY += 110;
            }
        }

        // Add 1 tiles
        startX = 50;
        startY += 120;
        for (let i = 0; i < Math.abs(c); i++) {
            this.tiles.push(new Tile('one', startX, startY, c < 0));
            startX += 50;
        }

        this.requestRender();
    }

    handleMouseDown(e) {
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

    handleMouseMove(e) {
        if (!this.dragTarget) return;
        const { x, y } = this.getMousePos(e);
        this.dragTarget.x = x - this.dragOffset.x;
        this.dragTarget.y = y - this.dragOffset.y;
        this.requestRender();
    }

    handleMouseUp(e) {
        if (this.dragTarget) {

            // Check Sidebar (Delete Zone)
            const trashZone = document.getElementById('trash-zone');
            const trashRect = trashZone.getBoundingClientRect();

            // Client coords
            const mx = e.clientX;
            const my = e.clientY;

            if (mx >= trashRect.left && mx <= trashRect.right &&
                my >= trashRect.top && my <= trashRect.bottom) {
                // Delete
                const idx = this.tiles.indexOf(this.dragTarget);
                if (idx > -1) this.tiles.splice(idx, 1);
            } else {
                this.snapToNeighbors(this.dragTarget);
            }

            this.dragTarget.isDragging = false;
            this.dragTarget = null;
            this.requestRender();
            this.checkSolution();
        }
    }

    updateEquationDisplay() {
        const a = parseInt(document.getElementById('coeff-a').value) || 0;
        const b = parseInt(document.getElementById('coeff-b').value) || 0;
        const c = parseInt(document.getElementById('coeff-c').value) || 0;

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
        const snapDist = 15;
        let snapped = false;

        // Sort tiles to snap to larger/base tiles first (stability)
        // actually existing order is fine

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

    validateArrangement(silent = false) {
        if (this.tiles.length === 0) {
            if (!silent) this.showFeedback("No tiles to check!", false);
            return;
        }

        // Get Input Coefficients
        const valA = parseInt(document.getElementById('coeff-a').value) || 0;
        const valB = parseInt(document.getElementById('coeff-b').value) || 0;
        const valC = parseInt(document.getElementById('coeff-c').value) || 0;

        // Calculate Bounding Box
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        let totalTileArea = 0;
        let hasNegative = false;

        let positiveTiles = [];
        let negativeTiles = [];

        for (const t of this.tiles) {
            minX = Math.min(minX, t.x);
            minY = Math.min(minY, t.y);
            maxX = Math.max(maxX, t.x + t.w);
            maxY = Math.max(maxY, t.y + t.h);
            totalTileArea += t.w * t.h; // Physical area (always positive)

            if (t.isNegative) {
                hasNegative = true;
                negativeTiles.push(t);
            } else {
                positiveTiles.push(t);
            }
        }

        const bboxWidth = maxX - minX;
        const bboxHeight = maxY - minY;
        const bboxArea = bboxWidth * bboxHeight;

        // --- Standard Positive Model ---
        // If no negatives, strict area match.
        if (!hasNegative) {
            // Tolerance for gaps
            if (Math.abs(bboxArea - totalTileArea) < 200) {
                if (!silent) this.showFeedback("Great job! You formed a perfect rectangle.", true);
                return;
            }
        }

        // --- Negative Overlap / Slicing Model ---
        if (hasNegative && positiveTiles.length > 0) {

            // 1. Calculate Base Area from ALL POSITIVE TILES
            // In a correct construction, positive tiles form the bounding box.
            let baseArea = 0;
            positiveTiles.forEach(t => baseArea += t.w * t.h);

            // 2. Base Integrity Check
            // The positive tiles should roughly fill the bounding box.
            if (Math.abs(bboxArea - baseArea) < 200) {

                const X_SIZE = TILE_CONFIG.SIZES.x;
                const U_SIZE = TILE_CONFIG.SIZES.u;

                // Let's deduce base dimensions in terms of x and 1
                const getGridDimensions = (pixels) => {
                    let bestErr = Infinity;
                    let bestA = 0, bestB = 0;
                    for (let a = 1; a <= 5; a++) {
                        for (let b = 0; b <= 10; b++) {
                            const est = a * X_SIZE + b * U_SIZE;
                            const err = Math.abs(est - pixels);
                            if (err < bestErr) { bestErr = err; bestA = a; bestB = b; }
                        }
                    }
                    if (bestErr < 30) return [bestA, bestB];
                    return [0, 0];
                };

                const [baseX_A, base1_A] = getGridDimensions(bboxWidth);
                const [baseX_B, base1_B] = getGridDimensions(bboxHeight);

                // Now, measure negative cuts.
                // We assume clean cuts: Final Factors = (baseW - p)(baseH - q)
                // We check small integer p, q.

                for (let p = 0; p <= 5; p++) {
                    for (let q = 0; q <= 5; q++) {
                        if (p === 0 && q === 0) continue;

                        // Proposed Factors
                        const f1_x = baseX_A;
                        const f1_c = base1_A - p;

                        const f2_x = baseX_B;
                        const f2_c = base1_B - q;

                        // Expand: (f1_x X + f1_c)(f2_x X + f2_c)
                        const resA = f1_x * f2_x;
                        const resB = (f1_x * f2_c) + (f1_c * f2_x);
                        const resC = f1_c * f2_c;

                        if (resA === valA && resB === valB && resC === valC) {
                            // Mathematical match found! 
                            // Verify Area match (Expected vs Actual Negative Area)
                            // Expected Removed Area = Area(Before cuts) - Area(After cuts)
                            // But doing simple p*Area + q*Area - overlap is easier.

                            const expectedNegArea = (p * U_SIZE * bboxHeight) + (q * U_SIZE * bboxWidth) - (p * q * U_SIZE * U_SIZE);

                            // Measure actual negative tile area
                            let actualNegArea = 0;
                            negativeTiles.forEach(t => actualNegArea += t.w * t.h);

                            // Allow some slop
                            if (Math.abs(expectedNegArea - actualNegArea) < 200) {
                                if (!silent) this.showFeedback("Valid Overlap Arrangement! Result area matches the equation.", true);
                                return;
                            }
                        }
                    }
                }
            }
        }

        if (!silent) this.showFeedback("Not a valid rectangle or correct solution.", false);
    }

    checkSolution() {
        // Just updates readout now
        const readout = document.getElementById('area-readout');

        // Calculate total area
        let totalArea = 0;
        let x2Count = 0;
        let xCount = 0;
        let oneCount = 0;

        for (const t of this.tiles) {
            if (t.type === 'x2') x2Count += (t.isNegative ? -1 : 1);
            if (t.type === 'x') xCount += (t.isNegative ? -1 : 1);
            if (t.type === 'one') oneCount += (t.isNegative ? -1 : 1);
        }

        // We can just display the counts for now
        // Format: ax^2 + bx + c
        readout.innerHTML = `Current: $${x2Count}x^2 + ${xCount}x + ${oneCount}$`;

        // Re-render MathJax if needed
        if (window.MathJax) {
            MathJax.typesetPromise([readout]);
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
            const ease = 0.1;

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
                this.validateArrangement(true); // Auto-validate silently after solve
            }
        }

        // Clear
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw tiles
        for (const tile of this.tiles) {
            tile.draw(this.ctx);
        }
    }
    solveAndAnimate() {
        const a = parseInt(document.getElementById('coeff-a').value) || 1;
        const b = parseInt(document.getElementById('coeff-b').value) || 5;
        const c = parseInt(document.getElementById('coeff-c').value) || 6;

        this.generateTiles(a, b, c);

        const [m, n] = this.getClosestFactors(a);

        let p = 0, q = 0;
        let found = false;

        const limit = Math.abs(c) === 0 ? Math.abs(b) : Math.abs(c);

        for (let i = -limit; i <= limit; i++) {
            let currentP = i;
            let currentQ;

            if (c !== 0) {
                if (currentP === 0) continue;
                if (c % currentP !== 0) continue;
                currentQ = c / currentP;
            } else {
                if (i !== 0) continue;
                currentP = 0;
                if (m !== 0 && b % m === 0) currentQ = b / m;
                else currentQ = 0;
            }

            if ((m * currentQ) + (n * currentP) === b) {
                p = currentP;
                q = currentQ;
                found = true;
                break;
            }
        }

        if (!found) {
            this.showFeedback("This equation doesn't favor nice integer rectangles!", false);
            return;
        }

        // Assign Targets
        // We separate lists to control render order (z-index essentially)
        // Usually, we want Base -> Overlaps -> Double Overlaps
        // So: Positive x^2 -> Positive Lists -> Negative Lists -> Units (if overlap)

        let x2List = this.tiles.filter(t => t.type === 'x2');
        let xList = this.tiles.filter(t => t.type === 'x');
        let oneList = this.tiles.filter(t => t.type === 'one');

        const X = TILE_CONFIG.SIZES.x;
        const U = TILE_CONFIG.SIZES.u;

        // Base Dimensions
        const gridW = m * X;
        const gridH = n * X;

        // Calculate Total Visual Dimensions to center it
        // If p > 0, width adds p*U. If p < 0, width is gridW (overlap is internal).
        // If q > 0, height adds q*U. If q < 0, height is gridH.

        const totalW = p > 0 ? gridW + p * U : gridW;
        const totalH = q > 0 ? gridH + q * U : gridH;

        const startX = (this.canvas.width - totalW) / 2;
        const startY = (this.canvas.height - totalH) / 2;

        // 1. Place x^2 (Always positive base in this simplified model?)
        // Assuming a > 0 for base geometry usually.
        let x2Idx = 0;
        for (let row = 0; row < n; row++) {
            for (let col = 0; col < m; col++) {
                if (x2Idx < x2List.length) {
                    const t = x2List[x2Idx++];
                    t.targetX = startX + col * t.xSize;
                    t.targetY = startY + row * t.xSize;
                }
            }
        }

        let xIdx = 0;

        // 2. Vertical X (p columns) - Associated with Width
        // If p > 0: Place to RIGHT of gridW.
        // If p < 0: Place to RIGHT EDGE of gridW, shifting Left (Overlap).

        const pAbs = Math.abs(p);
        const pIsNeg = p < 0;

        const vStartX = pIsNeg ? (startX + gridW - pAbs * U) : (startX + gridW);
        // If negative, we start at gridW - totalOverlap.
        // If we have multiple columns, we tile them.

        for (let col = 0; col < pAbs; col++) {
            for (let row = 0; row < n; row++) {
                if (xIdx < xList.length) {
                    const t = xList[xIdx++];
                    t.rotation = 1;
                    t.updateDimensions();
                    // Each col is U wide.
                    t.targetX = vStartX + col * U;
                    // n rows of height X
                    t.targetY = startY + row * X;
                }
            }
        }

        // 3. Horizontal X (q rows) - Associated with Height
        // If q > 0: Place BELOW gridH.
        // If q < 0: Place at BOTTOM EDGE of gridH, shifting Up (Overlap).

        const qAbs = Math.abs(q);
        const qIsNeg = q < 0;

        const hStartY = qIsNeg ? (startY + gridH - qAbs * U) : (startY + gridH);

        for (let row = 0; row < qAbs; row++) {
            for (let col = 0; col < m; col++) {
                if (xIdx < xList.length) {
                    const t = xList[xIdx++];
                    t.rotation = 0;
                    t.updateDimensions();
                    // m cols of width X
                    t.targetX = startX + col * X;
                    // Each row is U high
                    t.targetY = hStartY + row * U;
                }
            }
        }

        // 4. Units (Intersection of p and q blocks)
        // X Pos: Aligned with Vertical block.
        // Y Pos: Aligned with Horizontal block.

        let oneIdx = 0;
        const uStartX = vStartX;
        const uStartY = hStartY;

        for (let row = 0; row < qAbs; row++) {
            for (let col = 0; col < pAbs; col++) {
                if (oneIdx < oneList.length) {
                    const t = oneList[oneIdx++];
                    t.targetX = uStartX + col * U;
                    t.targetY = uStartY + row * U;
                }
            }
        }

        // Sort for render order
        // Sort for render order (Back to Front)
        this.tiles.sort((a, b) => {
            const getRank = (t) => {
                if (t.type === 'x2') return 1; // Base (Back)
                if (t.type === 'x') return 2;  // Middle
                if (t.type === 'one') return 3; // Top (Front)
                return 0;
            };
            return getRank(a) - getRank(b);
        });

        this.isAnimating = true;
        this.requestRender();
    }

    getClosestFactors(num) {
        num = Math.abs(num);
        let m = Math.floor(Math.sqrt(num));
        while (m > 0) {
            if (num % m === 0) return [m, num / m];
            m--;
        }
        return [1, num];
    }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
    new App();
});

