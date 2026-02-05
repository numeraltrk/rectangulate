import { findValidOverlap } from './solver.js';
import { TILE_CONFIG } from './constants.js';

export const validateArrangement = (app, silent = false) => {
    if (app.tiles.length === 0) {
        if (!silent) app.showFeedback("No tiles to check!", false);
        return;
    }

    // Get Input Coefficients
    const { a: valA, b: valB, c: valC } = app.getCoefficients();

    // Calculate Bounding Box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let totalTileArea = 0;
    let hasNegative = false;

    let positiveTiles = [];
    let negativeTiles = [];

    for (const t of app.tiles) {
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
            if (!silent) app.showFeedback("Great job! You formed a perfect rectangle.", true);
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

            const overlap = findValidOverlap(bboxWidth, bboxHeight, valA, valB, valC, X_SIZE, U_SIZE);

            if (overlap) {
                const [p, q] = overlap;

                // Verify Area match (Expected vs Actual Negative Area)
                // Expected Removed Area = Area(Before cuts) - Area(After cuts)
                // But doing simple p*Area + q*Area - overlap is easier.

                const expectedNegArea = (p * U_SIZE * bboxHeight) + (q * U_SIZE * bboxWidth) - (p * q * U_SIZE * U_SIZE);

                // Measure actual negative tile area
                let actualNegArea = 0;
                negativeTiles.forEach(t => actualNegArea += t.w * t.h);

                // Allow some slop
                if (Math.abs(expectedNegArea - actualNegArea) < 200) {
                    if (!silent) app.showFeedback("Valid Overlap Arrangement! Result area matches the equation.", true);
                    return;
                }
            }
        }
    }

    if (!silent) app.showFeedback("Not a valid rectangle or correct solution.", false);
};

export const checkSolution = (app) => {
    // Just updates readout now
    // Logic for updating readout removed

};
