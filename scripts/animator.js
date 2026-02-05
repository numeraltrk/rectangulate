import { solveQuadratic } from './solver.js';
import { Tile } from './Tile.js';
import { TILE_CONFIG } from './constants.js';

/**
 * Generates initial tiles based on coefficients a, b, c
 */
export const generateTiles = (app, a, b, c) => {
    app.tiles = [];
    let startX = 50;
    let startY = 50;
    const gap = TILE_CONFIG.GAP;

    // Add x^2 tiles
    for (let i = 0; i < Math.abs(a); i++) {
        app.tiles.push(new Tile('x2', startX, startY, a < 0));
        startX += TILE_CONFIG.SIZES.x + gap;
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
 * Main Solver Entry Point
 */
export const solveAndAnimate = (app) => {
    const { a, b, c } = app.getCoefficients();

    generateTiles(app, a, b, c);

    const solution = solveQuadratic(a, b, c);

    if (!solution.found) {
        app.showFeedback("This equation doesn't favor nice integer rectangles!", false);
        return;
    }

    // Add Zero Pairs if needed
    handleZeroPairs(app, solution);

    // Sort tiles for correct Z-index (smaller on top)
    const typeScore = { 'x2': 1, 'x': 2, 'one': 3 };
    app.tiles.sort((t1, t2) => typeScore[t1.type] - typeScore[t2.type]);

    // Dispatch to specific case handler
    // Case 1: b >= 0, c >= 0
    if (b >= 0 && c >= 0) {
        animateCasePP(app, solution);
    }
    // Case 2: b >= 0, c < 0
    else if (b >= 0 && c < 0) {
        animateCasePN(app, solution);
    }
    // Case 3: b < 0, c >= 0
    else if (b < 0 && c >= 0) {
        animateCaseNP(app, solution);
    }
    // Case 4: b < 0, c < 0
    else {
        animateCaseNN(app, solution);
    }

    app.isAnimating = true;
    app.requestRender();
};

/**
 * Adds necessary zero pairs to the board before animation
 */
const handleZeroPairs = (app, solution) => {
    const { m, n, p, q } = solution;

    // Calculate required positive and negative AREAS (not just linear counts)
    // The previous logic estimated x-tiles needed based on factors.
    // Vertical X area: p * n (rows of x) ?? No, p columns of height nX.
    // Wait, m and n are scaling factors for X dimensions. p and q are unit add-ons.
    // Width = mX + p
    // Height = nX + q
    // Total X area term = (m*q + n*p)x

    // We check how many 'x' tiles we HAVE vs how many we NEED.

    // Current counts
    let currentPos = app.tiles.filter(t => t.type === 'x' && !t.isNegative).length;
    let currentNeg = app.tiles.filter(t => t.type === 'x' && t.isNegative).length;

    // Required counts from factors
    // We split the x coeff (b) into two parts: m*q and n*p
    const term1 = m * q;
    const term2 = n * p;

    // Sum positive requirements and negative requirements
    let reqPos = 0;
    let reqNeg = 0;

    if (term1 > 0) reqPos += term1; else reqNeg += Math.abs(term1);
    if (term2 > 0) reqPos += term2; else reqNeg += Math.abs(term2);

    const deficitPos = Math.max(0, reqPos - currentPos);
    const deficitNeg = Math.max(0, reqNeg - currentNeg);

    // Add zero pairs (pairs of 1 pos and 1 neg)
    // Actually, simply adding the deficit is enough if we assume we started with 'b' tiles.
    // If b = 5, and we need 6 pos and 1 neg (total net 5), we possess 5 pos, 0 neg.
    // deficitPos = 1, deficitNeg = 1. So we add 1 of each. Correct.

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
}

// ==========================================
// CASE HANDLERS
// ==========================================

// Case 1: All Positive (x^2 + bx + c)
const animateCasePP = (app, solution) => {
    const { m, n, p, q } = solution;
    const X = TILE_CONFIG.SIZES.x;
    const U = TILE_CONFIG.SIZES.u;

    // Layout: Standard Grid
    // Width: m*X + p*U
    // Height: n*X + q*U

    const gridW = m * X + p * U;
    const gridH = n * X + q * U;
    const startX = (app.canvas.width - gridW) / 2;
    const startY = (app.canvas.height - gridH) / 2;

    distributeTiles(app, startX, startY, m, n, p, q, false, false);
};

// Case 2: Positive b, Negative c (x^2 + bx - c)
// One factor has +p, one has -q (or vice versa)
const animateCasePN = (app, solution) => {
    const { m, n, p, q } = solution;
    const X = TILE_CONFIG.SIZES.x;
    const U = TILE_CONFIG.SIZES.u;

    // Identify overlap direction based on sign of p and q
    // Width: mX + p, Height: nX + q
    // Since c < 0, either p or q is negative (not both, not neither)

    const w = m * X + Math.abs(p) * U;
    const h = n * X + Math.abs(q) * U;

    // If p is negative, visual width is compressed? No, "overlap" visual logic.
    // Logic: Drawn Width is the positive hull.
    // If factor is (x+6)(x-1), we build (x+6) by x, then overlap 1 from bottom.

    // Dimensions without overlap subtraction (Full Hull)
    // Actually, solveQuadratic returns signed p, q.
    // Example: (x+6)(x-1) -> p=6, q=-1.

    // We visualize the "Positive" bounding box, then place negatives on top/edge.
    const isOverlapX = p < 0;
    const isOverlapY = q < 0; // In this case, one is true.

    let gridW = m * X;
    if (p > 0) gridW += p * U; // Add positive extension
    // If p < 0, we don't add width, we will overlap later.

    let gridH = n * X;
    if (q > 0) gridH += q * U;

    const startX = (app.canvas.width - gridW) / 2;
    const startY = (app.canvas.height - gridH) / 2;

    distributeTiles(app, startX, startY, m, n, p, q, isOverlapX, isOverlapY);
};

// Case 3: Negative b, Positive c (x^2 - bx + c)
// Both p and q are negative. (x-2)(x-3)
const animateCaseNP = (app, solution) => {
    const { m, n, p, q } = solution;
    const X = TILE_CONFIG.SIZES.x;
    // Both factors subtract.
    // Visual: x^2 base, then overlap from Right and Bottom.

    // Base grid is just mX by nX (the x^2 part).
    // The -bx parts are formed by overlapping vertical/horizontal -x strips? 
    // No, standard algebra tile representation for (x-2)(x-3):
    // You lay out x^2.
    // You place 2 negative x bars to the right? OR you cover the right edge with negative x bars.
    // You place 3 negative x bars on the bottom.
    // The corner is filled with positive 1s (negative * negative).

    // Our logic handles overlap if p, q < 0.
    const startX = (app.canvas.width - m * X) / 2;
    const startY = (app.canvas.height - n * X) / 2;

    distributeTiles(app, startX, startY, m, n, p, q, true, true);
};

// Case 4: Negative b, Negative c (x^2 - bx - c)
// One is positive, one is negative, but dominant term is negative?
// E.g. (x-5)(x+1) = x^2 - 4x - 5. p=-5, q=1.
const animateCaseNN = (app, solution) => {
    const { m, n, p, q } = solution;
    const X = TILE_CONFIG.SIZES.x;
    const U = TILE_CONFIG.SIZES.u;

    const isOverlapX = p < 0;
    const isOverlapY = q < 0;

    let gridW = m * X;
    if (!isOverlapX) gridW += p * U;

    let gridH = n * X;
    if (!isOverlapY) gridH += q * U;

    const startX = (app.canvas.width - gridW) / 2;
    const startY = (app.canvas.height - gridH) / 2;

    distributeTiles(app, startX, startY, m, n, p, q, isOverlapX, isOverlapY);
};

/**
 * Shared Helper to distribute tiles to targets
 */
const distributeTiles = (app, startX, startY, m, n, p, q, overlapX, overlapY) => {
    const X = TILE_CONFIG.SIZES.x;
    const U = TILE_CONFIG.SIZES.u;

    let x2List = app.tiles.filter(t => t.type === 'x2');
    let oneList = app.tiles.filter(t => t.type === 'one');
    let xListPos = app.tiles.filter(t => t.type === 'x' && !t.isNegative);
    let xListNeg = app.tiles.filter(t => t.type === 'x' && t.isNegative);

    // 1. Place Base x^2
    let x2Idx = 0;
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < m; col++) {
            if (x2Idx < x2List.length) {
                const t = x2List[x2Idx++];
                t.targetX = startX + col * X;
                t.targetY = startY + row * X;
            }
        }
    }

    // 2. Vertical Column (associated with p)
    // If p > 0, place to the right.
    // If p < 0 (overlapX), place ON the right edge (overlapping).

    const pAbs = Math.abs(p);

    let vStartX;
    if (overlapX) {
        // Overlap: align right edge of X-tile with right edge of base
        // base width = m * X
        // x-tile width = U (10)
        // We want x-tile to cover the rightmost strip of the x^2.
        // Actually, for (x-p), we usually align it inside.
        // Let's use standard grid logic:
        // If p is negative, target position shifts left?
        // standard: startX + m*X (Right edge).
        // overlap: startX + m*X - pAbs*U ?
        vStartX = startX + m * X - pAbs * U;
    } else {
        vStartX = startX + m * X;
    }

    // Determine which pool to pull from for vertical column
    // The sign of the term is derived from n * p.
    // m is typically positive approx 1. n is 1.
    // So if p is negative, we use negative tiles.
    const usePosV = (n * p) > 0;

    let posIdx = 0;
    let negIdx = 0;

    for (let col = 0; col < pAbs; col++) {
        for (let row = 0; row < n; row++) {
            let t = null;
            if (usePosV) {
                if (posIdx < xListPos.length) t = xListPos[posIdx++];
            } else {
                if (negIdx < xListNeg.length) t = xListNeg[negIdx++];
            }

            if (t) {
                t.targetX = vStartX + col * U;
                t.targetY = startY + row * X;
                if (t.rotation === 0) t.rotate(); // Vertical
            }
        }
    }

    // 3. Horizontal Row (associated with q)
    const qAbs = Math.abs(q);

    let hStartY;
    if (overlapY) {
        hStartY = startY + n * X - qAbs * U;
    } else {
        hStartY = startY + n * X;
    }

    const usePosH = (m * q) > 0;

    for (let row = 0; row < qAbs; row++) {
        for (let col = 0; col < m; col++) {
            let t = null;
            if (usePosH) {
                if (posIdx < xListPos.length) t = xListPos[posIdx++];
            } else {
                if (negIdx < xListNeg.length) t = xListNeg[negIdx++];
            }

            if (t) {
                t.targetX = startX + col * X;
                t.targetY = hStartY + row * U;
                if (t.rotation !== 0) t.rotate(); // Horizontal
            }
        }
    }

    // 4. Corner (Ones)
    // Placed at intersection of vStartX and hStartY
    // Sign depends on p * q

    const oneStartX = vStartX;
    const oneStartY = hStartY;
    let oneIdx = 0;

    for (let row = 0; row < qAbs; row++) {
        for (let col = 0; col < pAbs; col++) {
            if (oneIdx < oneList.length) {
                const t = oneList[oneIdx++];
                t.targetX = oneStartX + col * U;
                t.targetY = oneStartY + row * U;
            }
        }
    }
}
