-- Database Schema for AI QA Engineering Platform

CREATE DATABASE IF NOT EXISTS ai_qa_platform;
USE ai_qa_platform;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'QA_ENGINEER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Executions Table
CREATE TABLE IF NOT EXISTS executions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suite_name VARCHAR(50) NOT NULL, -- Smoke, Sanity, Regression
  status VARCHAR(50) NOT NULL, -- PENDING, RUNNING, PASSED, FAILED
  duration INT DEFAULT 0, -- in ms
  logs LONGTEXT,
  report_path VARCHAR(255),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL
);

-- Execution History Detail Table (individual tests)
CREATE TABLE IF NOT EXISTS execution_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  execution_id INT NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- PASSED, FAILED, SKIPPED
  duration INT DEFAULT 0, -- in ms
  error_message TEXT,
  screenshot_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
);

-- Defects Table
CREATE TABLE IF NOT EXISTS defects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  summary VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(50),
  priority VARCHAR(50),
  steps_to_reproduce TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status VARCHAR(50) DEFAULT 'Open', -- Open, In Progress, Resolved, Closed
  jira_key VARCHAR(50) NULL,
  rca_suggestions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated Test Cases Table
CREATE TABLE IF NOT EXISTS generated_testcases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_case_id VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  requirements TEXT,
  preconditions TEXT,
  steps TEXT,
  expected_result TEXT,
  priority VARCHAR(50),
  severity VARCHAR(50),
  category VARCHAR(50), -- Functional, Negative, Boundary, Regression, API, UI
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Collections Table
CREATE TABLE IF NOT EXISTS api_collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
  swagger_spec LONGTEXT,
  test_scenarios TEXT,
  code_generated LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Admin User (password is 'admin123' bcrypt hashed: $2a$10$gEvyTz4H.r/sXG3Y.5j2.eH0/p335FqY2l6C9l/90t/9b5o0o7LKu)
INSERT INTO users (username, password, role) VALUES 
('admin', '$2a$10$gEvyTz4H.r/sXG3Y.5j2.eH0/p335FqY2l6C9l/90t/9b5o0o7LKu', 'ADMIN')
ON DUPLICATE KEY UPDATE id=id;
