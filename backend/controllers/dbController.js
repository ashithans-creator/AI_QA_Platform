const db = require('../config/db');
const aiService = require('../services/ai.service');
const dbSchemaService = require('../services/dbSchema.service');
const { DB_ASSISTANT_NL_SQL, buildDbAssistantSystemPrompt } = require('../prompts/templates');

exports.generateSql = async (req, res, next) => {
  const { prompt } = req.body;

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ message: 'Natural language prompt is required' });
  }

  try {
    const schema = await dbSchemaService.getSchema();
    const directMatch = dbSchemaService.buildSelectAllForMention(prompt, schema);

    if (directMatch) {
      return res.json({
        message: 'SQL query generated successfully',
        sql: directMatch.sql,
        explanation: directMatch.explanation
      });
    }

    const systemPrompt = buildDbAssistantSystemPrompt(dbSchemaService.formatSchemaForPrompt(schema));
    const userPrompt = DB_ASSISTANT_NL_SQL.user(prompt);

    console.log(`Translating natural language prompt to SQL: "${prompt}"`);
    const result = await aiService.generate(systemPrompt, userPrompt, 'db-assistant');

    res.json({
      message: 'SQL query generated successfully',
      sql: result.sql,
      explanation: result.explanation
    });
  } catch (error) {
    next(error);
  }
};

exports.executeQuery = async (req, res, next) => {
  const { sql } = req.body;

  if (!sql || sql.trim() === '') {
    return res.status(400).json({ message: 'SQL query is required to execute' });
  }

  // 1. Strict SQL Validation / Injection Prevention
  try {
    const schema = await dbSchemaService.getSchema();
    validateSqlQuery(sql, schema);
  } catch (validationErr) {
    return res.status(400).json({ 
      message: 'SQL Security Validation Failed', 
      error: validationErr.message 
    });
  }

  const startTime = Date.now();

  try {
    console.log(`Executing SQL Query: ${sql}`);
    const results = await db.query(sql);
    const duration = Date.now() - startTime;

    // Detect format of return value (MySQL write query vs read query)
    const isWrite = Array.isArray(results) === false;

    res.json({
      message: 'Query executed successfully',
      duration: `${duration}ms`,
      isWrite,
      results: isWrite ? [results] : results,
      dbType: db.getDbType()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database query execution failed',
      error: error.message,
      sql
    });
  }
};

exports.getSchema = async (req, res, next) => {
  try {
    const schema = await dbSchemaService.getSchema();
    res.json({
      dbType: db.getDbType(),
      tables: schema
    });
  } catch (error) {
    next(error);
  }
};

// SQL Validation rules to prevent malicious operations
function validateSqlQuery(sql, schema) {
  const upperSql = sql.trim().toUpperCase();
  
  // Prohibit schema altering, dropping, or database destruction
  const forbiddenPatterns = [
    'DROP DATABASE', 'DROP TABLE', 'ALTER TABLE', 
    'TRUNCATE TABLE', 'CREATE DATABASE', 'GRANT ', 
    'REVOKE ', 'SHUTDOWN',
    'MYSQL.', 'PG_', 'SQLITE_MASTER'
  ];

  for (const pattern of forbiddenPatterns) {
    if (upperSql.includes(pattern)) {
      throw new Error(`Command or pattern "${pattern}" is prohibited for security reasons.`);
    }
  }

  const tokens = upperSql.split(/[\s,();]+/);
  const tableReferenceKeywords = new Set(['FROM', 'JOIN', 'INTO', 'UPDATE']);
  const referencedTables = [];
  
  tokens.forEach((token, idx) => {
    if (tableReferenceKeywords.has(token) && idx + 1 < tokens.length) {
      referencedTables.push(tokens[idx + 1]);
    }
  });

  referencedTables.forEach(tableName => {
    if (!tableName) return;
    const cleanName = tableName.replace(/[^a-zA-Z0-9_`.]/g, '');
    if (
      cleanName &&
      !dbSchemaService.isKnownTable(cleanName, schema) &&
      !dbSchemaService.isInternalTable(cleanName)
    ) {
      throw new Error(`Table "${cleanName}" is not present in the connected database schema.`);
    }
  });
}
