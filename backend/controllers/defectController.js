const db = require('../config/db');
const aiService = require('../services/ai.service');
const jiraService = require('../services/jira.service');
const { DEFECT_ANALYSIS } = require('../prompts/templates');

exports.analyzeDefect = async (req, res, next) => {
  const { summary, description, stepsToReproduce, expectedResult, actualResult } = req.body;

  if (!summary || !stepsToReproduce || !actualResult) {
    return res.status(400).json({ message: 'Summary, steps to reproduce, and actual result are required.' });
  }

  try {
    const systemPrompt = DEFECT_ANALYSIS.system;
    const userPrompt = DEFECT_ANALYSIS.user(summary, description || '', stepsToReproduce, expectedResult || '', actualResult);

    console.log('Analyzing defect and generating RCA suggestions...');
    const analysis = await aiService.generate(systemPrompt, userPrompt, 'defect');

    res.json({
      message: 'Defect analysis complete',
      analysis
    });
  } catch (error) {
    next(error);
  }
};

exports.createDefect = async (req, res, next) => {
  const { 
    summary, description, severity, priority, 
    stepsToReproduce, expectedResult, actualResult, 
    pushToJira 
  } = req.body;

  if (!summary) {
    return res.status(400).json({ message: 'Summary is required' });
  }

  try {
    let jiraKey = null;
    let rcaSuggestions = '';

    // Run AI analysis if description is basic or to get RCA
    try {
      const systemPrompt = DEFECT_ANALYSIS.system;
      const userPrompt = DEFECT_ANALYSIS.user(summary, description || '', stepsToReproduce || '', expectedResult || '', actualResult || '');
      const analysis = await aiService.generate(systemPrompt, userPrompt, 'defect');
      rcaSuggestions = analysis.rcaSuggestions;
    } catch (aiErr) {
      console.warn('AI analysis skipped during defect creation:', aiErr.message);
    }

    // Sync to Jira if requested
    if (pushToJira) {
      try {
        const jiraTicket = await jiraService.createIssue(
          summary, 
          `${description || ''}\n\n*Steps to Reproduce:*\n${stepsToReproduce || ''}\n\n*Expected:*\n${expectedResult || ''}\n\n*Actual:*\n${actualResult || ''}\n\n*RCA Suggestions:*\n${rcaSuggestions}`, 
          severity, 
          priority
        );
        jiraKey = jiraTicket.key;
      } catch (jiraErr) {
        console.error('Failed to create ticket in Jira, saving defect locally only:', jiraErr.message);
      }
    }

    const result = await db.query(
      `INSERT INTO defects (summary, description, severity, priority, steps_to_reproduce, expected_result, actual_result, status, jira_key, rca_suggestions)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?)`,
      [
        summary,
        description || '',
        severity || 'Major',
        priority || 'Medium',
        stepsToReproduce || '',
        expectedResult || '',
        actualResult || '',
        jiraKey,
        rcaSuggestions
      ]
    );

    res.status(201).json({
      message: 'Defect logged successfully',
      defectId: result.insertId,
      jiraKey
    });
  } catch (error) {
    next(error);
  }
};

exports.getDefects = async (req, res, next) => {
  try {
    const defects = await db.query('SELECT * FROM defects ORDER BY created_at DESC');
    res.json(defects);
  } catch (error) {
    next(error);
  }
};

exports.syncJira = async (req, res, next) => {
  const { id } = req.params;

  try {
    const defects = await db.query('SELECT jira_key FROM defects WHERE id = ?', [id]);
    if (defects.length === 0) {
      return res.status(404).json({ message: 'Defect not found' });
    }

    const jiraKey = defects[0].jira_key;
    if (!jiraKey) {
      return res.status(400).json({ message: 'Defect is not linked to a Jira issue' });
    }

    const jiraIssue = await jiraService.getIssue(jiraKey);
    const jiraStatus = jiraIssue.fields.status.name;

    // Map Jira status to local status
    await db.query('UPDATE defects SET status = ? WHERE id = ?', [jiraStatus, id]);

    res.json({
      message: 'Jira status synced successfully',
      jiraKey,
      status: jiraStatus
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // e.g. "In Progress", "Done", "Resolved"

  try {
    const defects = await db.query('SELECT jira_key FROM defects WHERE id = ?', [id]);
    if (defects.length === 0) {
      return res.status(404).json({ message: 'Defect not found' });
    }

    const jiraKey = defects[0].jira_key;

    if (jiraKey) {
      try {
        await jiraService.updateIssueStatus(jiraKey, status);
      } catch (jiraErr) {
        console.error(`Jira status transition failed for ${jiraKey}:`, jiraErr.message);
      }
    }

    await db.query('UPDATE defects SET status = ? WHERE id = ?', [status, id]);

    res.json({
      message: 'Status updated successfully',
      status
    });
  } catch (error) {
    next(error);
  }
};
