
const gcd = (a, b) => {
    return b === 0 ? a : gcd(b, a % b);
};

const getSimplestFraction = (num, den) => {
    const common = Math.abs(gcd(num, den));
    let n = num / common;
    let d = den / common;
    if (d < 0) {
        n = -n;
        d = -d;
    }
    return [n, d];
};


export const solveQuadratic = (a, b, c) => {
    const D = b * b - 4 * a * c;

    if (D < 0) {
        return { found: false, m: 0, n: 0, p: 0, q: 0 };
    }

    const sqrtD = Math.round(Math.sqrt(D));
    if (sqrtD * sqrtD !== D) {
        return { found: false, m: 0, n: 0, p: 0, q: 0 };
    }

    const [n1, d1] = getSimplestFraction(-b + sqrtD, 2 * a);
    const [n2, d2] = getSimplestFraction(-b - sqrtD, 2 * a);

    let m = d1;
    let p = -n1;
    let n = d2;
    let q = -n2;

    return { found: true, m, n, p, q };
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
