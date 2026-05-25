const fs = require('fs');
const db = require('../config/db');
const swaggerParser = require('../utils/swaggerParser');
const codeGenerator = require('../utils/codeGenerator');
const aiService = require('../services/ai.service');
const { API_SCENARIOS, REST_ASSURED_GENERATOR } = require('../prompts/templates');

exports.uploadSwagger = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Swagger JSON or YAML file upload is required' });
  }

  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    // Clean up temp file
    fs.unlinkSync(req.file.path);

    const parsed = swaggerParser.parseSwagger(fileContent);
    res.json(parsed);
  } catch (error) {
    next(error);
  }
};

exports.analyzeEndpoint = async (req, res, next) => {
  const { endpoint, method, spec } = req.body;

  if (!endpoint || !method) {
    return res.status(400).json({ message: 'Endpoint path and HTTP method are required' });
  }

  try {
    const inputContent = spec ? JSON.stringify(spec) : `${method} ${endpoint}`;
    
    // Call AI to generate test scenarios
    const systemPrompt = API_SCENARIOS.system;
    const userPrompt = API_SCENARIOS.user(inputContent);

    console.log(`Generating API test scenarios for ${method} ${endpoint}...`);
    const result = await aiService.generate(systemPrompt, userPrompt, 'api-scenario');

    res.json({
      message: 'Scenarios generated successfully',
      scenarios: result.endpoints || [
        {
          path: endpoint,
          method: method,
          description: `Test suite for ${method} ${endpoint}`,
          scenarios: [
            { type: 'Positive', description: 'Successful request returns 200 OK', expectedStatus: 200 },
            { type: 'Negative', description: 'Invalid request payload returns 400 Bad Request', expectedStatus: 400 }
          ]
        }
      ]
    });
  } catch (error) {
    next(error);
  }
};

exports.generateRestAssuredCode = async (req, res, next) => {
  const { path, method, scenarios } = req.body;

  if (!path || !method || !scenarios) {
    return res.status(400).json({ message: 'Path, method, and scenarios are required to generate code' });
  }

  try {
    let generatedCode = '';
    
    try {
      const systemPrompt = REST_ASSURED_GENERATOR.system;
      const userPrompt = REST_ASSURED_GENERATOR.user(path, method, scenarios);
      const aiResult = await aiService.generate(systemPrompt, userPrompt, 'rest-assured');
      generatedCode = aiResult.code;
    } catch (aiErr) {
      console.warn('AI RestAssured generation failed, using offline baseline generator:', aiErr.message);
      generatedCode = codeGenerator.generateRestAssured(path, method, scenarios);
    }

    res.json({
      message: 'RestAssured Java code generated successfully',
      code: generatedCode
    });
  } catch (error) {
    next(error);
  }
};

exports.saveCollection = async (req, res, next) => {
  const { name, endpoint, method, swaggerSpec, testScenarios, codeGenerated } = req.body;

  if (!name || !endpoint || !method) {
    return res.status(400).json({ message: 'Collection name, endpoint, and method are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO api_collections (name, endpoint, method, swagger_spec, test_scenarios, code_generated)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        endpoint,
        method,
        swaggerSpec || '',
        typeof testScenarios === 'object' ? JSON.stringify(testScenarios) : (testScenarios || ''),
        codeGenerated || ''
      ]
    );

    res.status(201).json({
      message: 'API Collection saved successfully',
      collectionId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

exports.getCollections = async (req, res, next) => {
  try {
    const collections = await db.query('SELECT * FROM api_collections ORDER BY created_at DESC');
    res.json(collections);
  } catch (error) {
    next(error);
  }
};
