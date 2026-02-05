/**
 * Constants and Configuration
 */
export let TILE_CONFIG = {
    // Visual multiplier (pixels per unit)
    UNIT: 60,
    // Gap for initial layout
    GAP: 10,
    SIZES: {
        x: 200, // x tile length (and x^2 side)
        u: 25   // unit tile side (and x tile width)
    },
    COLORS: {
        x2: '#4ade80',
        x: '#4ade80',
        one: '#4ade80',
        neg: '#ef4444',
        stroke: 'rgba(255,255,255,0.4)'
    },
    // Interaction Config
    INTERACTION: {
        SNAP_DIST: 15,
        DRAG_EASE: 0.1
    },
    // Input Constraints
    LIMITS: {
        MIN_COEFF: -10,
        MAX_COEFF: 10
    }
};

export const updateTileConfig = () => {
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

// Initialize config based on current width. 
// Note: We might want to call this explicitly in main, but keeping it here ensures defaults are set on import.
updateTileConfig();
