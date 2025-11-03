// Degradation Functions
// Functions that calculate performance degradation based on overload factor

function linearDegradation(overloadFactor) {
    // Returns 0 when overloadFactor is 0, and 0.9 when overloadFactor >= 8
    // Linear interpolation between these points
    if (overloadFactor <= 0) {
        return 0;
    }
    if (overloadFactor >= 10) {
        return 0.9;
    }
    // Linear interpolation: y = (0.9/8) * x = 0.1125 * x
    return (0.9 / 10) * overloadFactor;
}

function zeroDegradation(overloadFactor) {
    return 0;
}

function exponentialDegradation(overloadFactor) {
    // Returns 0 when overloadFactor is 0, and 0.9 when overloadFactor >= 8
    // Exponential curve between these points
    if (overloadFactor <= 0) {
        return 0;
    }
    if (overloadFactor >= 8) {
        return 0.9;
    }
    // Exponential interpolation: using e^(k*x) normalized to [0, 0.9]
    // Using growth rate k=0.4 for reasonable curve steepness
    const k = 0.4;
    const maxX = 8;
    const maxY = 0.9;
    // Normalized exponential: y = maxY * (e^(k*x) - 1) / (e^(k*maxX) - 1)
    return maxY * (Math.exp(k * overloadFactor) - 1) / (Math.exp(k * maxX) - 1);
}

function hardExponentialDegradation(overloadFactor) {
    // Returns 0 when overloadFactor is 0, and 0.9 when overloadFactor >= 8
    // Exponential curve between these points
    if (overloadFactor <= 0) {
        return 0;
    }
    if (overloadFactor >= 6) {
        return 0.95;
    }
    // Exponential interpolation: using e^(k*x) normalized to [0, 0.9]
    // Using growth rate k=0.4 for reasonable curve steepness
    const k = 0.6;
    const maxX = 6;
    const maxY = 0.95;
    // Normalized exponential: y = maxY * (e^(k*x) - 1) / (e^(k*maxX) - 1)
    return maxY * (Math.exp(k * overloadFactor) - 1) / (Math.exp(k * maxX) - 1);
}

// Export for Node.js modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { linearDegradation, zeroDegradation, exponentialDegradation, hardExponentialDegradation };
}

