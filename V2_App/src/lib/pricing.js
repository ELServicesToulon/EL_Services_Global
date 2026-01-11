
/**
 * EL Services Pricing Logic (V2 Port)
 */

export const TARIFS = {
    'Normal': {
        base: 15,
        arrets: [5, 4, 3, 4, 5]
    },
    'Samedi': {
        base: 25,
        arrets: [5, 4, 3, 4, 5]
    },
    'Urgent': {
        base: 20,
        arrets: [5, 4, 3, 4, 5]
    },
    'Special': {
        base: 30,
        arrets: [5, 4, 3, 4, 5]
    }
};

export const FORFAIT_RESIDENT = {
    STANDARD_LABEL: 'Pré-collecte veille + livraison lendemain',
    STANDARD_PRICE: 30,
    URGENCE_LABEL: 'Retrait et livraison sous 4 h',
    URGENCE_PRICE: 50,
    DURATION_HOURS: 4
};

// Helper to build stop totals logic
function buildStopTotals(base, supplements) {
    base = Number(base) || 0;
    const totals = [];
    let acc = base;
    totals.push(acc); // Stop 1 (Base)

    // Default last supplement if array exhausted
    const lastSupp = supplements.length ? Number(supplements[supplements.length - 1]) : 0;

    // Logic for subsequent stops
    // Note: The V1/V2 loop in GAS seems to handle up to supplements.length then extrapolate.
    // Here we will just provide a function to get price for N stops.
    return {
        getAt: (nStops) => { // 1-based index
            if (nStops <= 1) return base;

            let current = base;
            for (let i = 0; i < nStops - 1; i++) {
                // supplement for stop (i+2) is at index i in supplements array?
                // GAS logic: 
                // for (var i = 0; i < supplements.length; i++) { ... }
                // It builds an array. 

                // Let's mimic exact accumulation:
                const supp = (i < supplements.length) ? supplements[i] : lastSupp;
                current += supp;
            }
            return current;
        },
        returnFee: (supplements.length ? supplements[0] : lastSupp)
    };
}

export function computePrice({ stops = 1, isReturn = false, isSaturday = false, isUrgent = false }) {
    const type = isSaturday ? 'Samedi' : (isUrgent ? 'Urgent' : 'Normal');
    const ruleConfig = TARIFS[type];

    // Normal config for return fee reference (logic from GAS uses Normal rules for return fee usually)
    const normalConfig = TARIFS['Normal'];

    if (!ruleConfig) return null;

    const calculator = buildStopTotals(ruleConfig.base, ruleConfig.arrets);
    const normalCalculator = buildStopTotals(normalConfig.base, normalConfig.arrets);

    const stopPrice = calculator.getAt(stops);

    // Return fee logic: "resolveReturnSurcharge_(typeRules, normalRules)"
    // In GAS: returnFee is derived from supplements[0].
    const returnFee = isReturn ? normalCalculator.returnFee : 0;

    return {
        total: stopPrice + returnFee,
        details: {
            base: ruleConfig.base,
            stopsPrice: stopPrice,
            returnFee
        }
    };
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}
