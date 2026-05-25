const db = require('../config/db');

const INTERNAL_TABLES = new Set([
  'users',
  'executions',
  'execution_history',
  'defects',
  'generated_testcases',
  'api_collections'
]);

let schemaCache = null;
let schemaCacheTime = 0;
const CACHE_MS = 30000;

async function getSchema() {
  if (schemaCache && Date.now() - schemaCacheTime < CACHE_MS) {
    return schemaCache;
  }

  const dbType = db.getDbType();
  const schema = dbType === 'mysql' ? await getMysqlSchema() : await getSqliteSchema();
  schemaCache = schema;
  schemaCacheTime = Date.now();
  return schema;
}

async function getMysqlSchema() {
  const rows = await db.query(`
    SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);

  return groupColumns(rows);
}

async function getSqliteSchema() {
  const tables = await db.query(`
    SELECT name AS tableName
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

  const schema = [];
  for (const table of tables) {
    const columns = await db.query(`PRAGMA table_info("${table.tableName}")`);
    schema.push({
      name: table.tableName,
      columns: columns.map(column => ({
        name: column.name,
        type: column.type || 'TEXT'
      }))
    });
  }
  return schema;
}

function groupColumns(rows) {
  const byTable = new Map();
  rows.forEach(row => {
    if (!byTable.has(row.tableName)) {
      byTable.set(row.tableName, {
        name: row.tableName,
        columns: []
      });
    }
    byTable.get(row.tableName).columns.push({
      name: row.columnName,
      type: row.dataType
    });
  });
  return [...byTable.values()];
}

function formatSchemaForPrompt(schema) {
  return schema.map((table, index) => {
    const columns = table.columns.map(column => `${column.name} (${column.type})`).join(', ');
    return `${index + 1}. ${table.name}: ${columns}`;
  }).join('\n');
}

function findTableMention(prompt, schema) {
  const normalizedPrompt = normalize(prompt);
  return schema.find(table => {
    const normalizedTable = normalize(table.name);
    return normalizedPrompt.includes(normalizedTable);
  });
}

function buildSelectAllForMention(prompt, schema) {
  const table = findTableMention(prompt, schema);
  if (!table) return null;

  const lowerPrompt = prompt.toLowerCase();
  const isReadRequest = /\b(show|list|get|fetch|display|view|select|all)\b/.test(lowerPrompt);
  if (!isReadRequest) return null;

  return {
    sql: `SELECT * FROM ${quoteIdentifier(table.name)};`,
    explanation: `This query retrieves all rows and columns from the ${table.name} table.`
  };
}

function quoteIdentifier(identifier) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    return identifier;
  }
  return `\`${identifier.replace(/`/g, '``')}\``;
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getAllowedTableNames(schema) {
  return schema.map(table => table.name);
}

function isKnownTable(tableName, schema) {
  const clean = String(tableName).replace(/[`"'[\]]/g, '').split('.').pop();
  return schema.some(table => table.name.toLowerCase() === clean.toLowerCase());
}

function isInternalTable(tableName) {
  const clean = String(tableName).replace(/[`"'[\]]/g, '').split('.').pop().toLowerCase();
  return INTERNAL_TABLES.has(clean);
}

module.exports = {
  getSchema,
  formatSchemaForPrompt,
  buildSelectAllForMention,
  getAllowedTableNames,
  isKnownTable,
  isInternalTable
};
