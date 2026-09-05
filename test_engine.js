/**
 * Automated Test Suite for PEK (Цифровой Советчик СПО: Анодная Масса Содерберга)
 * Tests:
 * 1. Data Structures & Formula Config (9 equations, 6 presets, 38 tooltips)
 * 2. AnodeChemistryEngine physical bounds on all 6 standard presets
 * 3. Calibration of standard preset (nominal 28.0% main, 31.0% pin paste)
 * 4. Dosing scatter calculation and warning triggers
 * 5. Sieve fraction auto-balancing logic
 * 6. Full coverage of all 38 RESEARCH_TOOLTIPS against index.html DOM
 * 7. Formula customization and robustness under extreme edge cases
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`❌ FAIL [${totalTests}]: ${message}`);
        process.exitCode = 1;
    } else {
        passedTests++;
        console.log(`✅ PASS [${totalTests}]: ${message}`);
    }
}

console.log('='.repeat(65));
console.log('🚀 RUNNING PEK SUITE: Anode Chemistry & Interface Tests');
console.log('='.repeat(65));

// Load files
const appJsPath = path.join(__dirname, 'app.js');
const indexHtmlPath = path.join(__dirname, 'index.html');

if (!fs.existsSync(appJsPath)) {
    console.error(`app.js not found at ${appJsPath}`);
    process.exit(1);
}

const appCode = fs.readFileSync(appJsPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Mock browser window/document environment for Node execution
const mockElements = {};
function getOrCreateMockElement(id) {
    if (!mockElements[id]) {
        mockElements[id] = {
            id,
            value: '0',
            innerText: '',
            innerHTML: '',
            style: {},
            classList: { add: () => {}, remove: () => {} },
            addEventListener: () => {}
        };
    }
    return mockElements[id];
}

const sandbox = {
    console: console,
    Math: Math,
    parseFloat: parseFloat,
    parseInt: parseInt,
    isNaN: isNaN,
    isFinite: isFinite,
    localStorage: {
        _data: {},
        getItem(k) { return this._data[k] || null; },
        setItem(k, v) { this._data[k] = String(v); },
        removeItem(k) { delete this._data[k]; }
    },
    document: {
        getElementById: (id) => getOrCreateMockElement(id),
        querySelectorAll: () => [],
        addEventListener: () => {}
    },
    addEventListener: () => {},
    window: {
        addEventListener: () => {}
    },
    requestAnimationFrame: (cb) => setTimeout(cb, 16)
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

vm.createContext(sandbox);

const codeToRun = appCode + `
;globalThis.__PEK_EXPORTS__ = {
    FORMULA_DEFAULTS,
    FORMULA_CONFIG,
    RAW_MATERIAL_PRESETS,
    RESEARCH_TOOLTIPS,
    AnodeChemistryEngine,
    balanceSieveFractions,
    getCurrentState: () => currentState
};
`;

try {
    vm.runInContext(codeToRun, sandbox);
} catch (e) {
    console.error('Script evaluation error:', e);
    process.exit(1);
}

const {
    FORMULA_DEFAULTS,
    FORMULA_CONFIG,
    RAW_MATERIAL_PRESETS,
    RESEARCH_TOOLTIPS,
    AnodeChemistryEngine,
    balanceSieveFractions,
    getCurrentState
} = sandbox.__PEK_EXPORTS__;

// -------------------------------------------------------------
// Test 1: Data Structures Definition
// -------------------------------------------------------------
console.log('\n--- Test Suite 1: Structural Integrity ---');
assert(typeof FORMULA_DEFAULTS === 'object' && FORMULA_DEFAULTS !== null, 'FORMULA_DEFAULTS is defined');
assert(typeof FORMULA_CONFIG === 'object' && FORMULA_CONFIG !== null, 'FORMULA_CONFIG is defined');
assert(Object.keys(FORMULA_CONFIG).length >= 9, `FORMULA_CONFIG has 9+ formulas (found ${Object.keys(FORMULA_CONFIG).length})`);
assert(typeof RAW_MATERIAL_PRESETS === 'object', 'RAW_MATERIAL_PRESETS is defined');
assert(Object.keys(RAW_MATERIAL_PRESETS).length === 6, 'All 6 raw material presets are defined');
assert(typeof RESEARCH_TOOLTIPS === 'object', 'RESEARCH_TOOLTIPS is defined');
assert(typeof AnodeChemistryEngine === 'function' || typeof AnodeChemistryEngine === 'object', 'AnodeChemistryEngine is defined');
assert(typeof AnodeChemistryEngine.calculate === 'function', 'AnodeChemistryEngine.calculate is a function');
assert(typeof balanceSieveFractions === 'function', 'balanceSieveFractions is a function');

// -------------------------------------------------------------
// Test 2: Verify All 6 Presets Execute within Physical Bounds
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Preset Calculations & Physical Bounds ---');

const presetKeys = Object.keys(RAW_MATERIAL_PRESETS);
for (const key of presetKeys) {
    const preset = RAW_MATERIAL_PRESETS[key];
    const inputs = {
        ...preset,
        c1Max: 10.0,
        c1Min: 4.0,
        c2Min: 1.0,
        dDust: 0.071,
        feederTph: 25.0,
        feederErrCoke: 0.3,
        feederErrPitch: 0.4,
        tempCokePreheat: 190,
        tempPitchLiquid: 170,
        tempMixer: 195,
        mixerTime: 25
    };

    const res = AnodeChemistryEngine.calculate(inputs, 'main_paste');

    assert(!isNaN(res.wPitchOpt) && isFinite(res.wPitchOpt), `[Preset: ${key}] wPitchOpt is finite: ${res.wPitchOpt}%`);
    assert(res.wPitchOpt >= 25.0 && res.wPitchOpt <= 33.0, `[Preset: ${key}] wPitchOpt is realistic (25-33%): ${res.wPitchOpt}%`);
    assert(res.bakedDensity >= 1.35 && res.bakedDensity <= 1.65, `[Preset: ${key}] bakedDensity is realistic (1.35-1.65 g/cm³): ${res.bakedDensity}`);
    assert(res.resistivity >= 45 && res.resistivity <= 90, `[Preset: ${key}] resistivity is realistic (45-90 mkOhm*m): ${res.resistivity}`);
    assert(res.strength >= 18 && res.strength <= 50, `[Preset: ${key}] compressiveStrength is realistic (18-50 MPa): ${res.strength}`);
    assert(res.fluidity >= 0.5 && res.fluidity <= 5.0, `[Preset: ${key}] fluidity is realistic (0.5-5.0): ${res.fluidity}`);
    assert(res.dusting >= 1.0 && res.dusting <= 13.0, `[Preset: ${key}] dusting is realistic (1-13%): ${res.dusting}%`);
    assert(res.pahEmissions >= 0.2 && res.pahEmissions <= 1.0, `[Preset: ${key}] PAH is realistic (0.2-1.0 kg/t Al): ${res.pahEmissions}`);
    assert(res.vbdActual >= 0.75 && res.vbdActual <= 1.05, `[Preset: ${key}] VBD is realistic (0.75-1.05 g/cm³): ${res.vbdActual}`);
    assert(res.packingEfficiency >= 80.0, `[Preset: ${key}] packingEfficiency >= 80%: ${res.packingEfficiency}%`);
    assert(res.dosingScatter > 0 && res.dosingScatter < 2.0, `[Preset: ${key}] dosingScatter is positive and realistic: ±${res.dosingScatter}%`);
}

// -------------------------------------------------------------
// Test 3: Standard Preset Nominal Recipe & Pin Paste Mode
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Standard Calibration (Zero False Alarms) ---');

const stdInputs = {
    ...RAW_MATERIAL_PRESETS.standard,
    presetPitchRatio: 28.0,
    c1Max: 10.0,
    c1Min: 4.0,
    c2Min: 1.0,
    dDust: 0.071,
    feederTph: 25.0,
    feederErrCoke: 0.3,
    feederErrPitch: 0.4,
    tempCokePreheat: 190,
    tempPitchLiquid: 170,
    tempMixer: 195,
    mixerTime: 25
};

const stdRes = AnodeChemistryEngine.calculate(stdInputs, 'main_paste');
assert(Math.abs(stdRes.wPitchOpt - 28.0) < 0.05, `Standard preset advised pitch is nominal 28.0% (got ${stdRes.wPitchOpt}%)`);
assert(Math.abs(stdRes.pitchDelta) < 0.05, `Standard preset pitch delta is 0.0% (got ${stdRes.pitchDelta}%)`);
assert(stdRes.statusSeverity === 'NORMAL', `Standard preset status severity is NORMAL (got ${stdRes.statusSeverity})`);
assert(stdRes.packingEfficiency >= 88.0, `Standard packing efficiency satisfies plant standard >= 88% (got ${stdRes.packingEfficiency}%)`);

// Test pin paste mode
const pinInputs = { ...stdInputs, presetPitchRatio: 31.0 };
const pinRes = AnodeChemistryEngine.calculate(pinInputs, 'pin_paste');
assert(Math.abs(pinRes.wPitchOpt - 31.0) < 0.05, `Pin paste mode advised pitch is nominal 31.0% (got ${pinRes.wPitchOpt}%)`);
assert(Math.abs(pinRes.pitchDelta) < 0.05, `Pin paste mode pitch delta is 0.0% (got ${pinRes.pitchDelta}%)`);

// -------------------------------------------------------------
// Test 4: Tooltip Coverage & Field Verification
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Tooltip Database Coverage & Integrity ---');

// Extract all data-tooltip keys from index.html
const tooltipRegex = /data-tooltip="([^"]+)"/g;
const htmlTooltips = new Set();
let match;
while ((match = tooltipRegex.exec(indexHtml)) !== null) {
    htmlTooltips.add(match[1]);
}

assert(htmlTooltips.size === 38, `index.html contains 38 distinct tooltips (found ${htmlTooltips.size})`);

for (const key of htmlTooltips) {
    const tip = RESEARCH_TOOLTIPS[key];
    assert(tip !== undefined && tip !== null, `Tooltip '${key}' exists in RESEARCH_TOOLTIPS`);
    if (tip) {
        assert(tip.title && tip.title.trim().length > 0, `Tooltip '${key}' has valid title`);
        assert(tip.formula && tip.formula.trim().length > 0, `Tooltip '${key}' has formula`);
        assert(tip.source && tip.source.trim().length > 0, `Tooltip '${key}' has standard/citation`);
        assert(tip.accessStatus && tip.accessStatus.includes('доступ'), `Tooltip '${key}' has valid access status (${tip.accessStatus})`);
        assert(tip.sourceUrl && tip.sourceUrl.startsWith('http'), `Tooltip '${key}' has valid HTTP/HTTPS link`);
        assert(tip.excerpt && tip.excerpt.trim().length > 0, `Tooltip '${key}' has reference quote`);
    }
}

// -------------------------------------------------------------
// Test 5: Sieve Normalization and Extreme Edge Cases
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: Extreme Input Handling & Safety ---');

// Test freezing pitch temperature warning
const coldPitchInputs = { ...stdInputs, tempPitchLiquid: 130, pitchSoftening: 103 }; // 130 < 103 + 50 = 153
const coldPitchRes = AnodeChemistryEngine.calculate(coldPitchInputs, 'main');
assert(coldPitchRes.statusSeverity === 'WARNING' || coldPitchRes.statusSeverity === 'CRITICAL', `Freezing pitch triggers warning (${coldPitchRes.alerts[0].title})`);

// Test cold coke preheat warning
const coldCokeInputs = { ...stdInputs, tempCokePreheat: 160 }; // 160 < 180
const coldCokeRes = AnodeChemistryEngine.calculate(coldCokeInputs, 'main');
assert(coldCokeRes.statusSeverity === 'CRITICAL' || coldCokeRes.statusSeverity === 'WARNING', `Cold coke preheat triggers alert (${coldCokeRes.alerts[0].title})`);

// Test unnormalized fractions sum (e.g. 50% total)
const unnormInputs = { ...stdInputs, fracCoarse: 10, fracMedium: 10, fracFine: 15, fracDust: 15 };
const unnormRes = AnodeChemistryEngine.calculate(unnormInputs, 'main');
assert(!isNaN(unnormRes.packingEfficiency) && isFinite(unnormRes.packingEfficiency), 'Engine safely handles unnormalized fraction sum');
assert(!isNaN(unnormRes.wPitchOpt) && isFinite(unnormRes.wPitchOpt), 'Engine calculates pitch on unnormalized fractions without crashing');

// Test zero fractions (protection against 0/0)
const zeroInputs = { ...stdInputs, fracCoarse: 0, fracMedium: 0, fracFine: 0, fracDust: 0 };
const zeroRes = AnodeChemistryEngine.calculate(zeroInputs, 'main_paste');
assert(!isNaN(zeroRes.packingEfficiency) && isFinite(zeroRes.packingEfficiency), 'Engine survives 0% total fraction safely');

// -------------------------------------------------------------
// Test 6: Sieve Fraction Auto-Balancing Function
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: Sieve Auto-Balancing Verification ---');

const state = getCurrentState();
state.fracCoarse = 20;
state.fracMedium = 20;
state.fracFine = 20;
state.fracDust = 20; // total 80%

balanceSieveFractions();

const balancedSum = state.fracCoarse + state.fracMedium + state.fracFine + state.fracDust;
assert(balancedSum === 100, `Sieve auto-balancing produces exactly 100% total (got ${balancedSum}%)`);
assert(state.fracCoarse >= 5 && state.fracCoarse <= 30, 'Coarse fraction within physical boundaries (5-30%)');
assert(state.fracMedium >= 15 && state.fracMedium <= 45, 'Medium fraction within physical boundaries (15-45%)');
assert(state.fracFine >= 10 && state.fracFine <= 35, 'Fine fraction within physical boundaries (10-35%)');
assert(state.fracDust >= 20 && state.fracDust <= 55, 'Dust fraction within physical boundaries (20-55%)');

console.log('\n' + '='.repeat(65));
console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} checks passed successfully.`);
console.log('='.repeat(65));

if (passedTests === totalTests) {
    console.log('🎉 ALL ENGINE & INTERFACE TESTS PASSED!\n');
    process.exit(0);
} else {
    console.error(`💥 ${totalTests - passedTests} tests failed!\n`);
    process.exit(1);
}
