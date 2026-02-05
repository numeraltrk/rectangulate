import { solveQuadratic } from './solver.js';
import { Tile } from './Tile.js';
import { TILE_CONFIG } from './constants.js';

/**
 * Generates tiles based on coefficients a, b, c
 * @param {Object} app - The main App instance
 * @param {number} a 
 * @param {number} b 
 * @param {number} c 
 */
export const generateTiles = (app, a, b, c) => {
    app.tiles = [];
    let startX = 50;
    let startY = 50;
    const gap = TILE_CONFIG.GAP;

    // Add x^2 tiles
    for (let i = 0; i < Math.abs(a); i++) {
        app.tiles.push(new Tile('x2', startX, startY, a < 0));
        startX += TILE_CONFIG.SIZES.x + gap; // Simple layout spacing
    }

    // Add x tiles
    startX = 50;
    startY += 120;
    for (let i = 0; i < Math.abs(b); i++) {
        app.tiles.push(new Tile('x', startX, startY, b < 0));
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
        app.tiles.push(new Tile('one', startX, startY, c < 0));
        startX += 50;
    }

    app.requestRender();
};

/**
 * Solves the quadratic equation and sets up animation targets
 * @param {Object} app - The main App instance
 */
export const solveAndAnimate = (app) => {
    const limit = TILE_CONFIG.LIMITS;
    const clamp = (val) => Math.max(limit.MIN_COEFF, Math.min(limit.MAX_COEFF, val));

    const a = clamp(parseInt(document.getElementById('coeff-a').value) || 0);
    const b = clamp(parseInt(document.getElementById('coeff-b').value) || 0);
    const c = clamp(parseInt(document.getElementById('coeff-c').value) || 0);

    generateTiles(app, a, b, c);

    const solution = solveQuadratic(a, b, c);

    if (!solution.found) {
        app.showFeedback("This equation doesn't favor nice integer rectangles!", false);
        return;
    }

    const { m, n, p, q } = solution;

    // Check for Zero Pairs Requirement
    const vCount = m * q;
    const vPos = vCount > 0 ? vCount : 0;
    const vNeg = vCount < 0 ? -vCount : 0;

    const hCount = p * n;
    const hPos = hCount > 0 ? hCount : 0;
    const hNeg = hCount < 0 ? -hCount : 0;

    const requiredPos = vPos + hPos;
    const requiredNeg = vNeg + hNeg;

    let currentPos = app.tiles.filter(t => t.type === 'x' && !t.isNegative).length;
    let currentNeg = app.tiles.filter(t => t.type === 'x' && t.isNegative).length;

    const deficitPos = Math.max(0, requiredPos - currentPos);
    const deficitNeg = Math.max(0, requiredNeg - currentNeg);

    const pairsNeeded = Math.max(deficitPos, deficitNeg);

    if (pairsNeeded > 0) {
        const cx = app.canvas.width / 2;
        const cy = 50;
        for (let k = 0; k < deficitPos; k++) {
            app.tiles.push(new Tile('x', cx - 60, cy, false));
        }
        for (let k = 0; k < deficitNeg; k++) {
            app.tiles.push(new Tile('x', cx + 60, cy, true));
        }
    }

    // Sort tiles by Z-index (x2 on bottom, x middle, one on top)
    const typeScore = { 'x2': 1, 'x': 2, 'one': 3 };
    app.tiles.sort((a, b) => typeScore[a.type] - typeScore[b.type]);

    // Re-assign Targets with new list
    let x2List = app.tiles.filter(t => t.type === 'x2');
    let oneList = app.tiles.filter(t => t.type === 'one');

    let xListPos = app.tiles.filter(t => t.type === 'x' && !t.isNegative);
    let xListNeg = app.tiles.filter(t => t.type === 'x' && t.isNegative);

    const X = TILE_CONFIG.SIZES.x;
    const U = TILE_CONFIG.SIZES.u;

    // Base Dimensions (Geometric size is absolute)
    const gridW = Math.abs(m) * X;
    const gridH = Math.abs(n) * X;

    // Overlap Logic & Visual Dimensions
    const isOverlapX = (m > 0) !== (p > 0) && p !== 0;
    const isOverlapY = (n > 0) !== (q > 0) && q !== 0;

    const pAbs = Math.abs(p);
    const qAbs = Math.abs(q);
    const mAbs = Math.abs(m);
    const nAbs = Math.abs(n);

    const totalW = isOverlapX ? gridW : gridW + pAbs * U;
    const totalH = isOverlapY ? gridH : gridH + qAbs * U;

    const startX = (app.canvas.width - totalW) / 2;
    const startY = (app.canvas.height - totalH) / 2;

    // 1. Place Base (x^2)
    let x2Idx = 0;
    for (let row = 0; row < nAbs; row++) {
        for (let col = 0; col < mAbs; col++) {
            if (x2Idx < x2List.length) {
                const t = x2List[x2Idx++];
                t.targetX = startX + col * t.xSize;
                t.targetY = startY + row * t.xSize;
            }
        }
    }

    const vStartX = isOverlapX ? (startX + gridW - pAbs * U) : (startX + gridW);
    const vSignPos = (p * n) > 0;

    // Shared indices
    let posIdx = 0;
    let negIdx = 0;

    // 2. Vertical X (p columns)
    for (let col = 0; col < pAbs; col++) {
        for (let row = 0; row < nAbs; row++) {
            let t = null;
            if (vSignPos) {
                if (posIdx < xListPos.length) t = xListPos[posIdx++];
            } else {
                if (negIdx < xListNeg.length) t = xListNeg[negIdx++];
            }

            if (t) {
                t.targetX = vStartX + col * t.uSize;
                t.targetY = startY + row * t.xSize;
                if (t.rotation === 0) t.rotate(); // Needs to be vertical
            }
        }
    }

    const hStartY = isOverlapY ? (startY + gridH - qAbs * U) : (startY + gridH);
    const hSignPos = (m * q) > 0;

    // 3. Horizontal X (q rows)
    for (let row = 0; row < qAbs; row++) {
        for (let col = 0; col < mAbs; col++) {
            let t = null;
            if (hSignPos) {
                if (posIdx < xListPos.length) t = xListPos[posIdx++];
            } else {
                if (negIdx < xListNeg.length) t = xListNeg[negIdx++];
            }

            if (t) {
                t.targetX = startX + col * t.xSize;
                t.targetY = hStartY + row * t.uSize;
                if (t.rotation !== 0) t.rotate(); // Needs to be horizontal
            }
        }
    }

    // 4. Ones (Corner)
    const oStartX = vStartX;
    const oStartY = hStartY;
    let oneIdx = 0;

    for (let row = 0; row < qAbs; row++) {
        for (let col = 0; col < pAbs; col++) {
            if (oneIdx < oneList.length) {
                const t = oneList[oneIdx++];
                t.targetX = oStartX + col * t.uSize;
                t.targetY = oStartY + row * t.uSize;
            }
        }
    }

    // Start Animation
    app.isAnimating = true;
    app.requestRender();
};
