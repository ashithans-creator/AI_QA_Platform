const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const db = require('../config/db');
// dbType will be resolved at runtime per request
const aiService = require('../services/ai.service');
const { TEST_CASE_GENERATOR } = require('../prompts/templates');

exports.generateTestCases = async (req, res, next) => {
  let { requirements, categories } = req.body;

  // Handle uploaded PRD file
  if (req.file) {
    try {
      requirements = await extractRequirementsFromUpload(req.file);
      // Clean up temp file
      fs.unlinkSync(req.file.path);
    } catch (fileErr) {
      return res.status(500).json({ message: `Failed to read uploaded PRD: ${fileErr.message}` });
    }
  }

  if (!requirements || requirements.trim() === '') {
    return res.status(400).json({ message: 'Requirements text or PRD file upload is required' });
  }

  const selectedCategories = categories ? (Array.isArray(categories) ? categories : [categories]) : ['Functional'];

  try {
    const systemPrompt = TEST_CASE_GENERATOR.system;
    const userPrompt = TEST_CASE_GENERATOR.user(requirements, selectedCategories);

    console.log(`Generating test cases for categories: ${selectedCategories.join(', ')}`);
    const analysis = await aiService.generate(systemPrompt, userPrompt, 'testcase');

    // The AI should return an object: { testCases: [...] }
    const cases = analysis.testCases || analysis || [];

    res.json({
      message: 'Test cases generated successfully',
      testCases: cases
    });
  } catch (error) {
    next(error);
  }
};

async function extractRequirementsFromUpload(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (ext === '.pdf') {
    const parser = new PDFParse({ data: fs.readFileSync(file.path) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  return fs.readFileSync(file.path, 'utf8');
}

exports.saveTestCases = async (req, res, next) => {
  const { testCases, requirements } = req.body;

  if (!testCases || !Array.isArray(testCases)) {
    return res.status(400).json({ message: 'Valid test cases array is required to save' });
  }

  try {
    const savedIds = [];
    for (const tc of testCases) {

      // Handle steps as string or array
      const stepsStr = Array.isArray(tc.steps) ? tc.steps.join('\n') : tc.steps;
      
      // Use correct upsert syntax depending on DB type
      const currentDbType = db.getDbType();
      const insertSql = currentDbType === 'sqlite'
        ? `INSERT OR REPLACE INTO generated_testcases (test_case_id, title, requirements, preconditions, steps, expected_result, priority, severity, category)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        : `INSERT INTO generated_testcases (test_case_id, title, requirements, preconditions, steps, expected_result, priority, severity, category)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             requirements = VALUES(requirements),
             preconditions = VALUES(preconditions),
             steps = VALUES(steps),
             expected_result = VALUES(expected_result),
             priority = VALUES(priority),
             severity = VALUES(severity),
             category = VALUES(category)`;
      const sql = insertSql;
      await db.query(sql, [
        tc.testCaseId || `TC-${Math.floor(Math.random() * 900) + 100}`,
        tc.title || 'Untitled Test Case',
        requirements || '',
        tc.preconditions || '',
        stepsStr || '',
        tc.expectedResult || '',
        tc.priority || 'Medium',
        tc.severity || 'Major',
        tc.category || 'Functional'
      ]);
      savedIds.push(tc.testCaseId);
    }

    res.json({
      message: `${savedIds.length} test cases saved/updated in database.`,
      savedIds
    });
  } catch (error) {
    next(error);
  }
};

exports.getSavedTestCases = async (req, res, next) => {
  try {
    const rows = await db.query('SELECT * FROM generated_testcases ORDER BY created_at DESC');
    
    // Convert steps back into array for UI if requested
    const formatted = rows.map(r => ({
      ...r,
      steps: r.steps ? r.steps.split('\n') : []
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

exports.deleteTestCase = async (req, res, next) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM generated_testcases WHERE id = ?', [id]);
    res.json({ message: 'Test case deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.exportCsv = async (req, res, next) => {
  try {
    const rows = await db.query('SELECT * FROM generated_testcases ORDER BY created_at DESC');
    
    let csv = 'Test Case ID,Title,Preconditions,Steps,Expected Result,Priority,Severity,Category\n';
    rows.forEach(r => {
      const escape = (val) => `"${String(val || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      csv += `${escape(r.test_case_id)},${escape(r.title)},${escape(r.preconditions)},${escape(r.steps)},${escape(r.expected_result)},${escape(r.priority)},${escape(r.severity)},${escape(r.category)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=test_cases.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
