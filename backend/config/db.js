const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

let dbType = 'mysql';
let mysqlPool = null;
let sqliteDb = null;

// Promisified SQLite functions
const sqliteRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ insertId: this.lastID, changes: this.changes });
    });
  });
};

const sqliteAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

async function initDatabase() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'ai_qa_platform';
  const port = process.env.DB_PORT || 3306;

  if (!host || !user) {
    console.log('⚠️ MySQL credentials missing. Falling back to local SQLite database.');
    return initSQLite();
  }

  try {
    // Attempt connecting to MySQL (with a timeout)
    mysqlPool = mysql.createPool({
      host,
      user,
      password,
      database,
      port: parseInt(port),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000
    });

    // Test the connection
    const connection = await mysqlPool.getConnection();
    console.log('✅ Connected to MySQL database successfully.');
    connection.release();
    dbType = 'mysql';

    // Create tables if they don't exist
    await initMySQLTables();
  } catch (error) {
    console.warn(`⚠️ MySQL connection failed: ${error.message}. Falling back to SQLite.`);
    return initSQLite();
  }
}

async function initMySQLTables() {
  const tableQueries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'QA_ENGINEER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS executions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      suite_name VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      duration INT DEFAULT 0,
      logs TEXT,
      report_path VARCHAR(500),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS execution_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      execution_id INT NOT NULL,
      test_name VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      duration INT DEFAULT 0,
      error_message TEXT,
      screenshot_path VARCHAR(500),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS defects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      summary TEXT NOT NULL,
      description TEXT,
      severity VARCHAR(50),
      priority VARCHAR(50),
      steps_to_reproduce TEXT,
      expected_result TEXT,
      actual_result TEXT,
      status VARCHAR(50) DEFAULT 'Open',
      jira_key VARCHAR(100),
      rca_suggestions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS generated_testcases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      test_case_id VARCHAR(100) NOT NULL UNIQUE,
      title TEXT NOT NULL,
      requirements TEXT,
      preconditions TEXT,
      steps TEXT,
      expected_result TEXT,
      priority VARCHAR(50),
      severity VARCHAR(50),
      category VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS api_collections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      endpoint VARCHAR(500) NOT NULL,
      method VARCHAR(20) NOT NULL,
      swagger_spec TEXT,
      test_scenarios TEXT,
      code_generated TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tableQueries) {
    await mysqlPool.execute(sql);
  }

  // Seed admin user if not present
  const [rows] = await mysqlPool.execute("SELECT id FROM users WHERE username = 'admin'");
  if (rows.length === 0) {
    const hash = '$2a$10$gEvyTz4H.r/sXG3Y.5j2.eH0/p335FqY2l6C9l/90t/9b5o0o7LKu';
    await mysqlPool.execute("INSERT INTO users (username, password, role) VALUES ('admin', ?, 'ADMIN')", [hash]);
    console.log('✅ Seeded MySQL admin user');
  }

  console.log('✅ MySQL tables initialized.');
}

async function initSQLite() {

  dbType = 'sqlite';
  const dbPath = path.join(__dirname, '..', 'qa_platform.db');
  
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to open SQLite database:', err.message);
    } else {
      console.log(`✅ Connected to SQLite database at ${dbPath}`);
    }
  });

  // Create tables inside SQLite
  try {
    await sqliteRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'QA_ENGINEER',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await sqliteRun(`
      CREATE TABLE IF NOT EXISTS executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        suite_name TEXT NOT NULL,
        status TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        logs TEXT,
        report_path TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME
      )
    `);

    await sqliteRun(`
      CREATE TABLE IF NOT EXISTS execution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id INTEGER NOT NULL,
        test_name TEXT NOT NULL,
        status TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        error_message TEXT,
        screenshot_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
      )
    `);

    await sqliteRun(`
      CREATE TABLE IF NOT EXISTS defects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary TEXT NOT NULL,
        description TEXT,
        severity TEXT,
        priority TEXT,
        steps_to_reproduce TEXT,
        expected_result TEXT,
        actual_result TEXT,
        status TEXT DEFAULT 'Open',
        jira_key TEXT,
        rca_suggestions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await sqliteRun(`
      CREATE TABLE IF NOT EXISTS generated_testcases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_case_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        requirements TEXT,
        preconditions TEXT,
        steps TEXT,
        expected_result TEXT,
        priority TEXT,
        severity TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await sqliteRun(`
      CREATE TABLE IF NOT EXISTS api_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        swagger_spec TEXT,
        test_scenarios TEXT,
        code_generated TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert admin user if not exists
    const admin = await sqliteAll("SELECT * FROM users WHERE username = 'admin'");
    if (admin.length === 0) {
      // password is 'admin123'
      const hash = '$2a$10$gEvyTz4H.r/sXG3Y.5j2.eH0/p335FqY2l6C9l/90t/9b5o0o7LKu';
      await sqliteRun("INSERT INTO users (username, password, role) VALUES ('admin', ?, 'ADMIN')", [hash]);
      console.log('✅ Seeded SQLite admin user');
    }
  } catch (err) {
    console.error('❌ Error setting up SQLite tables:', err.message);
  }
}

// Unified query wrapper
async function query(sql, params = []) {
  if (!dbType) {
    await initDatabase();
  }

  // Rewrite positional placeholder for SQLite ? vs MySQL ? is fine.
  // But MySQL might return rows & fields, SQLite returns rows. We normalize it to return rows array.
  if (dbType === 'mysql') {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows;
  } else {
    // If it's SQLite, convert MySQL insert/update characteristics if needed.
    // However, basic CRUD commands are fully compatible.
    const isWriteQuery = sql.trim().toUpperCase().startsWith('INSERT') || 
                         sql.trim().toUpperCase().startsWith('UPDATE') || 
                         sql.trim().toUpperCase().startsWith('DELETE') ||
                         sql.trim().toUpperCase().startsWith('CREATE') ||
                         sql.trim().toUpperCase().startsWith('DROP');
    if (isWriteQuery) {
      const result = await sqliteRun(sql, params);
      // Mock MySQL insertId structure
      return { insertId: result.insertId, affectedRows: result.changes };
    } else {
      return await sqliteAll(sql, params);
    }
  }
}

module.exports = {
  initDatabase,
  query,
  getDbType: () => dbType,
  getMysqlPool: () => mysqlPool,
  getSqliteDb: () => sqliteDb
};
