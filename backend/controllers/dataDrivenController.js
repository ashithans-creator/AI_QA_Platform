const fs = require('fs');
const path = require('path');
const { parseCsvData } = require('../../automation/utils/csvHelper');
const automationRunner = require('../services/automation.runner');

const dataDir = path.join(__dirname, '..', '..', 'automation', 'data');

exports.getDataSets = async (req, res, next) => {
  try {
    const loginData = parseCsvData(path.join(dataDir, 'loginData.csv'));
    const checkoutData = parseCsvData(path.join(dataDir, 'checkoutData.csv'));

    res.json({
      loginData,
      checkoutData
    });
  } catch (error) {
    next(error);
  }
};

// Helper to convert array of objects back to CSV format and write to file
function saveCsvData(filePath, data) {
  if (!Array.isArray(data) || data.length === 0) {
    fs.writeFileSync(filePath, '', 'utf8');
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header] !== undefined ? String(row[header]) : '';
      // Escape commas, quotes, and newlines
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    csvRows.push(values.join(','));
  }
  fs.writeFileSync(filePath, csvRows.join('\n') + '\n', 'utf8');
}

exports.saveDataSet = async (req, res, next) => {
  const { datasetType, data } = req.body;
  if (!datasetType || !Array.isArray(data)) {
    return res.status(400).json({ message: 'datasetType (loginData or checkoutData) and data array are required' });
  }

  try {
    const fileName = datasetType === 'loginData' ? 'loginData.csv' : 'checkoutData.csv';
    const filePath = path.join(dataDir, fileName);
    saveCsvData(filePath, data);
    res.json({ message: `${datasetType} saved successfully` });
  } catch (error) {
    next(error);
  }
};

exports.executeScenario = async (req, res, next) => {
  const { datasetType, scenario } = req.body;
  if (!datasetType || !scenario) {
    return res.status(400).json({ message: 'datasetType and scenario name are required' });
  }

  let grepPattern = '';
  let suiteName = 'Regression';

  if (datasetType === 'loginData') {
    grepPattern = '@TC_AUTH_LOGIN';
    suiteName = 'Smoke';
  } else if (datasetType === 'checkoutData') {
    if (scenario === 'standard_purchase') {
      grepPattern = '@TC_PURCHASE_STANDARD';
    } else if (scenario === 'performance_purchase') {
      grepPattern = '@TC_PURCHASE_PERFORMANCE';
    } else if (scenario === 'problem_purchase') {
      grepPattern = '@TC_PURCHASE_PROBLEM';
    } else if (scenario.startsWith('empty_')) {
      grepPattern = '@TC_CHECKOUT_VALIDATIONS';
    } else {
      grepPattern = '@regression';
    }
  }

  try {
    const executionId = await automationRunner.startCustomExecution(
      suiteName, 
      grepPattern, 
      `Data-driven execution: ${scenario} (${datasetType})`
    );
    res.json({
      message: `Execution initiated for scenario ${scenario}`,
      executionId
    });
  } catch (error) {
    next(error);
  }
};
