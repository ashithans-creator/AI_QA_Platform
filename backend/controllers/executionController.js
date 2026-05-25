const db = require('../config/db');
const automationRunner = require('../services/automation.runner');
const suiteRegistry = require('../services/suiteRegistry');
const fs = require('fs');
const path = require('path');

exports.triggerSuite = async (req, res, next) => {
  const { suiteName } = req.body;

  if (!suiteName || !suiteRegistry.SUITES.includes(suiteName)) {
    return res.status(400).json({ message: 'Valid suiteName (Smoke, Sanity, Regression) is required.' });
  }

  try {
    const executionId = await automationRunner.startExecution(suiteName);
    res.json({
      message: `Test suite execution ${suiteName} initiated`,
      executionId
    });
  } catch (error) {
    next(error);
  }
};

exports.getExecutions = async (req, res, next) => {
  try {
    const executions = await db.query(
      'SELECT id, suite_name, status, duration, started_at, finished_at FROM executions ORDER BY started_at DESC'
    );
    res.json(executions);
  } catch (error) {
    next(error);
  }
};

exports.getExecutionDetails = async (req, res, next) => {
  const { id } = req.params;

  try {
    const execution = await db.query('SELECT * FROM executions WHERE id = ?', [id]);
    if (execution.length === 0) {
      return res.status(404).json({ message: 'Execution not found' });
    }

    const history = await db.query(
      'SELECT * FROM execution_history WHERE execution_id = ? ORDER BY created_at ASC',
      [id]
    );

    res.json({
      ...execution[0],
      history
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteExecution = async (req, res, next) => {
  const { id } = req.params;

  try {
    const execution = await db.query('SELECT id, status FROM executions WHERE id = ?', [id]);
    if (execution.length === 0) {
      return res.status(404).json({ message: 'Execution not found' });
    }

    if (execution[0].status === 'RUNNING' || execution[0].status === 'PENDING') {
      return res.status(400).json({ message: 'Cannot delete a run while it is still active.' });
    }

    await db.query('DELETE FROM execution_history WHERE execution_id = ?', [id]);
    await db.query('DELETE FROM executions WHERE id = ?', [id]);

    const reportPath = path.join(__dirname, '..', '..', 'automation', 'reports', `results_${id}.json`);
    if (fs.existsSync(reportPath)) {
      fs.unlinkSync(reportPath);
    }

    res.json({ message: `Execution #${id} deleted successfully`, id });
  } catch (error) {
    next(error);
  }
};

exports.stopSuite = async (req, res, next) => {
  const { executionId } = req.body;
  if (!executionId) {
    return res.status(400).json({ message: 'executionId is required' });
  }
  try {
    const stopped = await automationRunner.stopExecution(executionId);
    if (stopped) {
      return res.json({ message: 'Execution stopped', executionId });
    }
    return res.status(404).json({ message: 'No active execution found for given ID' });
  } catch (err) {
    return next(err);
  }
};

// List test titles for a given suite tag
exports.listTests = async (req, res, next) => {
  const { suiteName } = req.params;
  if (!suiteName) {
    return res.status(400).json({ message: 'suiteName param is required' });
  }
  try {
    const suite = suiteRegistry.getSuitePayload().suites
      .find(item => item.name.toLowerCase() === suiteName.toLowerCase());

    if (!suite) {
      return res.status(400).json({ message: 'Valid suiteName (Smoke, Sanity, Regression) is required.' });
    }

    res.json({
      suite: suite.name,
      tests: suite.tests.filter(testCase => testCase.selected)
    });
  } catch (err) {
    next(err);
  }
};

exports.getSuites = async (req, res, next) => {
  try {
    res.json(suiteRegistry.getSuitePayload(await getGeneratedTestCatalog()));
  } catch (err) {
    next(err);
  }
};

exports.updateSuiteTests = async (req, res, next) => {
  const { suiteName } = req.params;
  const { testIds } = req.body;

  if (!Array.isArray(testIds)) {
    return res.status(400).json({ message: 'testIds must be an array.' });
  }

  try {
    suiteRegistry.updateSuiteTests(suiteName, testIds);
    const payload = suiteRegistry.getSuitePayload(await getGeneratedTestCatalog());
    const suite = payload.suites.find(item => item.name.toLowerCase() === suiteName.toLowerCase());
    res.json({ message: `${suite.name} suite updated`, suite });
  } catch (err) {
    if (err.message === 'Invalid suite name') {
      return res.status(400).json({ message: 'Valid suiteName (Smoke, Sanity, Regression) is required.' });
    }
    next(err);
  }
};

async function getGeneratedTestCatalog() {
  const rows = await db.query(`
    SELECT test_case_id, title, preconditions, steps, expected_result, priority, severity, category
    FROM generated_testcases
    ORDER BY id ASC
  `);

  if (!rows.length) {
    return suiteRegistry.allTests;
  }

  const automationById = new Map(suiteRegistry.allTests.map(testCase => [testCase.id, testCase]));
  return rows.map(row => {
    const automationCase = automationById.get(row.test_case_id);
    const steps = row.steps ? String(row.steps).split('\n').filter(Boolean) : [];
    return {
      id: row.test_case_id,
      title: row.title,
      category: row.category || automationCase?.category || 'Functional',
      preconditions: row.preconditions || automationCase?.preconditions || '',
      steps,
      expectedResult: row.expected_result || automationCase?.expectedResult || '',
      priority: row.priority || automationCase?.priority || 'Medium',
      severity: row.severity || automationCase?.severity || 'Major',
      defaultSuites: automationCase?.defaultSuites || [],
      description: automationCase?.description || row.expected_result || 'Generated test case saved from AI Test Generator.'
    };
  });
}

exports.getDashboardMetrics = async (req, res, next) => {
  try {
    // 1. Total Executions, Passed, Failed counts
    const execStats = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) as running
      FROM executions
    `);

    // 2. Defect metrics by Severity and Status
    const defectStats = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as openBugs,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgressBugs,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolvedBugs,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closedBugs
      FROM defects
    `);

    // 3. Defect severity breakdown
    const severityStats = await db.query(`
      SELECT severity, COUNT(*) as count 
      FROM defects 
      GROUP BY severity
    `);

    // 4. Executions history timeline (last 10 runs)
    const recentExecs = await db.query(`
      SELECT id, suite_name, status, duration, started_at 
      FROM executions 
      ORDER BY started_at DESC 
      LIMIT 10
    `);

    // 5. Aggregate test steps counts
    const stepStats = await db.query(`
      SELECT 
        COUNT(*) as totalSteps,
        SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passedSteps,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failedSteps
      FROM execution_history
    `);

    res.json({
      executions: {
        total: execStats[0]?.total || 0,
        passed: execStats[0]?.passed || 0,
        failed: execStats[0]?.failed || 0,
        running: execStats[0]?.running || 0
      },
      defects: {
        total: defectStats[0]?.total || 0,
        open: defectStats[0]?.openBugs || 0,
        inProgress: defectStats[0]?.inProgressBugs || 0,
        resolved: defectStats[0]?.resolvedBugs || 0,
        closed: defectStats[0]?.closedBugs || 0,
        severityBreakdown: severityStats
      },
      recentExecutions: recentExecs,
      testSteps: {
        total: stepStats[0]?.totalSteps || 0,
        passed: stepStats[0]?.passedSteps || 0,
        failed: stepStats[0]?.failedSteps || 0
      }
    });
  } catch (error) {
    next(error);
  }
};
