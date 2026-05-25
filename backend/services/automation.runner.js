const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const suiteRegistry = require('./suiteRegistry');

class AutomationRunner {
  constructor() {
    this.activeRuns = new Map(); // Track active runs by execution ID
  }

  async startExecution(suiteName) {
    const selectedTestIds = suiteRegistry.getExecutableSuiteTestIds(suiteName);
    if (selectedTestIds.length === 0) {
      throw new Error(`No automated testcases are selected for ${suiteName} suite.`);
    }
    const suiteGrep = selectedTestIds.map(id => `@${id}`).join('|');
    
    // 1. Create execution record in DB
    const insertResult = await db.query(
      `INSERT INTO executions (suite_name, status, logs, started_at) 
       VALUES (?, 'RUNNING', 'Starting test execution runner...', CURRENT_TIMESTAMP)`,
      [suiteName]
    );
    const executionId = insertResult.insertId;

    const automationPath = path.join(__dirname, '..', '..', 'automation');
    const resultsJsonPath = path.join(automationPath, 'reports', `results_${executionId}.json`);

    // Ensure reports folder exists
    const reportsDir = path.dirname(resultsJsonPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    console.log(`🚀 Starting Playwright Suite: ${suiteName} (ID: ${executionId})`);

    // Set environment variables for the test run
    const env = { 
      ...process.env, 
      PLAYWRIGHT_JSON_OUTPUT_NAME: resultsJsonPath,
      TEST_SUITE_NAME: suiteName
    };

    // Prepare arguments: npx playwright test --grep "@TC_AUTH_LOGIN|@TC_CATALOG_CART" --reporter=json
    const args = ['playwright', 'test', '--grep', suiteGrep, '--reporter=json'];

    // Use shell mode so that the appropriate npx command (npx.cmd on Windows) is resolved automatically
    const command = 'npx';
    const child = spawn(command, args, {
      cwd: automationPath,
      env: env,
      shell: true // Enable shell to handle .cmd wrappers and PATH resolution
    });

    let runLogs = `Started suite: ${suiteName} at ${new Date().toISOString()}\n`;
    runLogs += `Selected testcases: ${selectedTestIds.join(', ')}\n`;
    runLogs += `Running command: npx playwright test --grep "${suiteGrep}" --reporter=json\n\n`;

    this.activeRuns.set(executionId, {
      child,
      startTime: Date.now()
    });

    // Handle stdout/stderr
    child.stdout.on('data', (data) => {
      runLogs += data.toString();
      this.updateLogs(executionId, runLogs);
    });

    child.stderr.on('data', (data) => {
      runLogs += `[ERROR] ${data.toString()}`;
      this.updateLogs(executionId, runLogs);
    });

    // Handle process termination
    child.on('close', async (code) => {
      const runInfo = this.activeRuns.get(executionId);
      const duration = Date.now() - (runInfo ? runInfo.startTime : Date.now());
      this.activeRuns.delete(executionId);

      console.log(`🏁 Playwright Suite ${suiteName} finished with exit code ${code} (Duration: ${duration}ms)`);
      runLogs += `\nProcess finished with exit code ${code}\n`;

      let finalStatus = 'PASSED';
      
      // Parse results JSON if written
      try {
        if (fs.existsSync(resultsJsonPath)) {
          const resultsData = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf8'));
          
          let totalTests = 0;
          let failedTests = 0;

          // Recurse tests in JSON output
          const parseSuite = async (s) => {
            if (s.specs) {
              for (const spec of s.specs) {
                for (const test of spec.tests) {
                  totalTests++;
                  let testStatus = 'PASSED';
                  let errorMsg = null;
                  
                  // Playwright specs status checks
                  const result = test.results && test.results[0];
                  if (result) {
                    if (result.status === 'failed' || result.status === 'timedOut') {
                      testStatus = 'FAILED';
                      failedTests++;
                      errorMsg = result.error ? result.error.message : 'Unknown test failure';
                    } else if (result.status === 'skipped') {
                      testStatus = 'SKIPPED';
                    }
                  }

                  // Insert into execution history
                  await db.query(
                    `INSERT INTO execution_history (execution_id, test_name, status, duration, error_message)
                     VALUES (?, ?, ?, ?, ?)`,
                    [executionId, test.title || spec.title, testStatus, result ? result.duration : 0, errorMsg]
                  );
                }
              }
            }
            if (s.suites) {
              for (const childSuite of s.suites) {
                await parseSuite(childSuite);
              }
            }
          };

          if (resultsData.suites) {
            for (const rootSuite of resultsData.suites) {
              await parseSuite(rootSuite);
            }
          }

          if (failedTests > 0 || totalTests === 0) {
            finalStatus = 'FAILED';
          }
          
          runLogs += `\nSummary: ${totalTests} tests run. Passed: ${totalTests - failedTests}, Failed: ${failedTests}\n`;
        } else {
          // If no JSON report was created (e.g. build failure or compile error)
          finalStatus = 'FAILED';
          runLogs += `\n[CRITICAL ERROR] Playwright JSON report was not generated. Check logs above.\n`;
        }
      } catch (err) {
        console.error('❌ Failed to parse Playwright results JSON:', err);
        finalStatus = 'FAILED';
        runLogs += `\nError reading test report: ${err.message}\n`;
      }

      // Update parent execution entry
      await db.query(
        `UPDATE executions 
         SET status = ?, duration = ?, logs = ?, finished_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [finalStatus, duration, runLogs, executionId]
      );
    });

    child.on('error', async (err) => {
      console.error(`💥 Playwright spawn error:`, err);
      runLogs += `\n[CRITICAL ERROR] Failed to start Playwright runner: ${err.message}\n`;
      
      await db.query(
        `UPDATE executions 
         SET status = 'FAILED', logs = ?, finished_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [runLogs, executionId]
      );
      this.activeRuns.delete(executionId);
    });

    return executionId;
  }

  async startCustomExecution(suiteName, testGrep, description) {
    const insertResult = await db.query(
      `INSERT INTO executions (suite_name, status, logs, started_at) 
       VALUES (?, 'RUNNING', 'Starting test execution runner for custom run...', CURRENT_TIMESTAMP)`,
      [suiteName]
    );
    const executionId = insertResult.insertId;

    const automationPath = path.join(__dirname, '..', '..', 'automation');
    const resultsJsonPath = path.join(automationPath, 'reports', `results_${executionId}.json`);

    const reportsDir = path.dirname(resultsJsonPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    console.log(`🚀 Starting Playwright Custom Run: ${suiteName} - ${description} (ID: ${executionId})`);

    const env = { 
      ...process.env, 
      PLAYWRIGHT_JSON_OUTPUT_NAME: resultsJsonPath,
      TEST_SUITE_NAME: suiteName
    };

    const args = ['playwright', 'test', '--grep', testGrep, '--reporter=json'];
    const command = 'npx';
    const child = spawn(command, args, {
      cwd: automationPath,
      env: env,
      shell: true
    });

    let runLogs = `Started custom run: ${description} at ${new Date().toISOString()}\n`;
    runLogs += `Running command: npx playwright test --grep "${testGrep}" --reporter=json\n\n`;

    this.activeRuns.set(executionId, {
      child,
      startTime: Date.now()
    });

    child.stdout.on('data', (data) => {
      runLogs += data.toString();
      this.updateLogs(executionId, runLogs);
    });

    child.stderr.on('data', (data) => {
      runLogs += `[ERROR] ${data.toString()}`;
      this.updateLogs(executionId, runLogs);
    });

    child.on('close', async (code) => {
      const runInfo = this.activeRuns.get(executionId);
      const duration = Date.now() - (runInfo ? runInfo.startTime : Date.now());
      this.activeRuns.delete(executionId);

      console.log(`🏁 Custom run finished with exit code ${code} (Duration: ${duration}ms)`);
      runLogs += `\nProcess finished with exit code ${code}\n`;

      let finalStatus = 'PASSED';
      
      try {
        if (fs.existsSync(resultsJsonPath)) {
          const resultsData = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf8'));
          let totalTests = 0;
          let failedTests = 0;

          const parseSuite = async (s) => {
            if (s.specs) {
              for (const spec of s.specs) {
                for (const test of spec.tests) {
                  totalTests++;
                  let testStatus = 'PASSED';
                  let errorMsg = null;
                  const result = test.results && test.results[0];
                  if (result) {
                    if (result.status === 'failed' || result.status === 'timedOut') {
                      testStatus = 'FAILED';
                      failedTests++;
                      errorMsg = result.error ? result.error.message : 'Unknown test failure';
                    } else if (result.status === 'skipped') {
                      testStatus = 'SKIPPED';
                    }
                  }

                  await db.query(
                    `INSERT INTO execution_history (execution_id, test_name, status, duration, error_message)
                     VALUES (?, ?, ?, ?, ?)`,
                    [executionId, test.title || spec.title, testStatus, result ? result.duration : 0, errorMsg]
                  );
                }
              }
            }
            if (s.suites) {
              for (const childSuite of s.suites) {
                await parseSuite(childSuite);
              }
            }
          };

          if (resultsData.suites) {
            for (const rootSuite of resultsData.suites) {
              await parseSuite(rootSuite);
            }
          }

          if (failedTests > 0 || totalTests === 0) {
            finalStatus = 'FAILED';
          }
          runLogs += `\nSummary: ${totalTests} tests run. Passed: ${totalTests - failedTests}, Failed: ${failedTests}\n`;
        } else {
          finalStatus = 'FAILED';
          runLogs += `\n[CRITICAL ERROR] Playwright JSON report was not generated.\n`;
        }
      } catch (err) {
        console.error('❌ Failed to parse results JSON:', err);
        finalStatus = 'FAILED';
        runLogs += `\nError reading test report: ${err.message}\n`;
      }

      await db.query(
        `UPDATE executions SET status = ?, duration = ?, logs = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [finalStatus, duration, runLogs, executionId]
      );
    });

    child.on('error', async (err) => {
      runLogs += `\n[CRITICAL ERROR] Failed to start Playwright: ${err.message}\n`;
      await db.query(
        `UPDATE executions SET status = 'FAILED', logs = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [runLogs, executionId]
      );
      this.activeRuns.delete(executionId);
    });

    return executionId;
  }


  async updateLogs(executionId, logs) {
    try {
      await db.query('UPDATE executions SET logs = ? WHERE id = ?', [logs, executionId]);
    } catch (e) {
      console.error('Failed to update execution logs in database:', e.message);
    }
  }

  getActiveRun(executionId) {
    return this.activeRuns.get(executionId);
  }

  async stopExecution(executionId) {
    const runInfo = this.activeRuns.get(executionId);
    if (!runInfo) {
      console.warn(`No active run found for execution ID ${executionId}`);
      return false;
    }
    const { child } = runInfo;
    try {
      child.kill('SIGTERM');
      console.log(`🛑 Stopping suite execution ID ${executionId}`);
    } catch (err) {
      console.error('Error stopping child process:', err);
    }
    // Update DB status to STOPPED
    await db.query(
      `UPDATE executions SET status = 'STOPPED', finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [executionId]
    );
    this.activeRuns.delete(executionId);
    return true;
  }
}

module.exports = new AutomationRunner();
