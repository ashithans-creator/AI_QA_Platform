const fs = require('fs');
const path = require('path');
const { sauceDemoTests } = require('./testCatalog');

const SUITES = ['Smoke', 'Sanity', 'Regression'];
const registryPath = path.join(__dirname, '..', 'data', 'suiteRegistry.json');

const allTests = sauceDemoTests;
const executableIds = new Set(allTests.map(testCase => testCase.id));

function defaultRegistry() {
  return SUITES.reduce((registry, suite) => {
    registry[suite] = allTests
      .filter(testCase => testCase.defaultSuites.includes(suite))
      .map(testCase => testCase.id);
    return registry;
  }, {});
}

function ensureRegistry() {
  if (!fs.existsSync(path.dirname(registryPath))) {
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  }
  if (!fs.existsSync(registryPath)) {
    fs.writeFileSync(registryPath, JSON.stringify(defaultRegistry(), null, 2));
  }
}

function readRegistry() {
  ensureRegistry();
  const saved = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  return { ...defaultRegistry(), ...saved };
}

function writeRegistry(registry) {
  ensureRegistry();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

function getSuitePayload(catalog = allTests) {
  const registry = readRegistry();
  return {
    suites: SUITES.map(name => ({
      name,
      testIds: registry[name] || [],
      tests: catalog.map(testCase => ({
        ...testCase,
        executable: executableIds.has(testCase.id),
        selected: (registry[name] || []).includes(testCase.id)
      }))
    })),
    allTests: catalog.map(testCase => ({
      ...testCase,
      executable: executableIds.has(testCase.id)
    }))
  };
}

function getSuiteTestIds(suiteName) {
  const suite = SUITES.find(name => name.toLowerCase() === String(suiteName).toLowerCase());
  if (!suite) return [];
  return readRegistry()[suite] || [];
}

function getExecutableSuiteTestIds(suiteName) {
  return getSuiteTestIds(suiteName).filter(id => executableIds.has(id));
}

function updateSuiteTests(suiteName, testIds) {
  const suite = SUITES.find(name => name.toLowerCase() === String(suiteName).toLowerCase());
  if (!suite) {
    throw new Error('Invalid suite name');
  }

  const uniqueIds = [...new Set(testIds)].filter(id => /^[A-Za-z0-9_-]+$/.test(id));
  const registry = readRegistry();
  registry[suite] = uniqueIds;
  writeRegistry(registry);
  return {
    name: suite,
    testIds: uniqueIds
  };
}

module.exports = {
  SUITES,
  allTests,
  getSuitePayload,
  getSuiteTestIds,
  getExecutableSuiteTestIds,
  updateSuiteTests
};
