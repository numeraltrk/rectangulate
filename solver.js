/**
 * Solver Logic for Rectangulate
 * Handles the mathematical operations for factoring and validating arrangements.
 */

export const getClosestFactors = (num) => {
    num = Math.abs(num);
    let m = Math.floor(Math.sqrt(num));
    while (m > 0) {
        if (num % m === 0) return [m, num / m];
        m--;
    }
    return [1, num];
};

/**
 * Attempts to find integer factors (mx + p)(nx + q) that match the equation ax^2 + bx + c
 * returns { found: boolean, m, n, p, q }
 */
export const solveQuadratic = (a, b, c) => {
    const [m_abs, n_abs] = getClosestFactors(a);

    // Try sign configurations for m, n
    const configs = [];
    if (a >= 0) {
        configs.push({ m: m_abs, n: n_abs });
    } else {
        configs.push({ m: -m_abs, n: n_abs }); // One neg
        configs.push({ m: m_abs, n: -n_abs });
    }

    let m = 0, n = 0, p = 0, q = 0;
    let found = false;

    const limit = Math.abs(c) === 0 ? Math.abs(b) : Math.abs(c);

    // Grid search for valid factors
    for (const config of configs) {
        const tm = config.m;
        const tn = config.n;

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
                if (tm !== 0 && b % tm === 0) currentQ = b / tm;
                else currentQ = 0;
            }

            if ((tm * currentQ) + (tn * currentP) === b) {
                m = tm; n = tn;
                p = currentP; q = currentQ;
                found = true;
                break;
            }
        }
        if (found) break;
    }

    return { found, m, n, p, q };
};

/**
 * Validates if the given bounding box dimensions correspond to a valid arrangement
 * for the equation ax^2 + bx + c, considering potential negative overlaps.
 * 
 * @param {number} bboxWidth - Width of the bounding box in pixels
 * @param {number} bboxHeight - Height of the bounding box in pixels
 * @param {number} valA - Coefficient a
 * @param {number} valB - Coefficient b
 * @param {number} valC - Coefficient c
 * @param {number} xSize - Pixel size of x side
 * @param {number} uSize - Pixel size of unit side
 * @returns {Array|null} - Returns [p, q] (overlap amounts) if valid, or null if invalid
 */
export const findValidOverlap = (bboxWidth, bboxHeight, valA, valB, valC, xSize, uSize) => {

    // Helper to deduce grid dimensions from pixels
    const getGridDimensions = (pixels) => {
        let bestErr = Infinity;
        let bestA = 0, bestB = 0;
        // Search reasonable range for factors of a (base width usually small)
        for (let a = 1; a <= 5; a++) {
            for (let b = 0; b <= 15; b++) {
                const est = a * xSize + b * uSize;
                const err = Math.abs(est - pixels);
                if (err < bestErr) { bestErr = err; bestA = a; bestB = b; }
            }
        }
        if (bestErr < 30) return [bestA, bestB];
        return [0, 0];
    };

    const [baseX_A, base1_A] = getGridDimensions(bboxWidth);
    const [baseX_B, base1_B] = getGridDimensions(bboxHeight);

    // We assume clean cuts: Final Factors = (baseW - p)(baseH - q)
    // We check small integer p, q representing the negative cut amounts
    for (let p = 0; p <= 12; p++) {
        for (let q = 0; q <= 12; q++) {
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
                return [p, q];
            }
        }
    }

    return null;
};
