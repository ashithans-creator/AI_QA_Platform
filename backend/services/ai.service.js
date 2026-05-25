const axios = require('axios');
const { OpenAI } = require('openai');
const { sauceDemoTests, toGeneratedTestCase } = require('./testCatalog');

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'mock';
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY;
    this.groqKey = process.env.GROQ_API_KEY;
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    // Auto-detect mock fallback if provider set but credentials missing
    if (this.provider === 'openai' && !this.openaiKey) {
      console.warn('⚠️ OpenAI key missing. Defaulting to mock AI provider.');
      this.provider = 'mock';
    } else if (this.provider === 'gemini' && !this.geminiKey) {
      console.warn('⚠️ Gemini key missing. Defaulting to mock AI provider.');
      this.provider = 'mock';
    } else if (this.provider === 'groq' && !this.groqKey) {
      console.warn('⚠️ Groq key missing. Defaulting to mock AI provider.');
      this.provider = 'mock';
    }
  }

  async generate(systemPrompt, userPrompt, promptType = 'general') {
    if (this.provider === 'mock') {
      return this.getMockResponse(promptType, userPrompt);
    }

    try {
      let textResponse = '';

      switch (this.provider) {
        case 'openai':
          textResponse = await this.callOpenAI(systemPrompt, userPrompt);
          break;
        case 'gemini':
          textResponse = await this.callGemini(systemPrompt, userPrompt);
          break;
        case 'groq':
          textResponse = await this.callGroq(systemPrompt, userPrompt);
          break;
        case 'ollama':
          textResponse = await this.callOllama(systemPrompt, userPrompt);
          break;
        default:
          textResponse = await this.getMockResponse(promptType, userPrompt);
      }

      return this.parseJSONResponse(textResponse);
    } catch (error) {
      console.error(`💥 AI generation error with provider ${this.provider}:`, error.message);
      console.warn('⚠️ Falling back to Mock response due to error.');
      return this.parseJSONResponse(this.getMockResponse(promptType, userPrompt));
    }
  }

  // --- API Callers ---

  async callOpenAI(systemPrompt, userPrompt) {
    const openai = new OpenAI({ apiKey: this.openaiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });
    return response.choices[0].message.content;
  }

  async callGemini(systemPrompt, userPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiKey}`;
    const response = await axios.post(url, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nUser Input: ${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });
    
    return response.data.candidates[0].content.parts[0].text;
  }

  async callGroq(systemPrompt, userPrompt) {
    const client = new OpenAI({
      apiKey: this.groqKey,
      baseURL: 'https://api.groq.com/openai/v1'
    });
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });
    return response.choices[0].message.content;
  }

  async callOllama(systemPrompt, userPrompt) {
    const url = `${this.ollamaHost}/api/generate`;
    const response = await axios.post(url, {
      model: 'llama3',
      prompt: `${systemPrompt}\n\nUser Request:\n${userPrompt}`,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: 0.2
      }
    });
    return response.data.response;
  }

  // --- Helper: Parse JSON string, handling Markdown blocks ---
  parseJSONResponse(text) {
    let cleanText = text.trim();
    // Strip markdown JSON backticks if present
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();
    
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.error('❌ Failed to parse JSON from AI response. Raw text:', text);
      throw new Error('AI response was not valid JSON');
    }
  }

  // --- Mock Fallback Responses ---
  getMockResponse(promptType, userPrompt) {
    console.log(`[Mock AI] Simulating response for prompt type: ${promptType}`);
    
    if (promptType === 'testcase') {
      return JSON.stringify({
        testCases: sauceDemoTests.map(toGeneratedTestCase)
      });
    }

    if (promptType === 'defect') {
      return JSON.stringify({
        improvedSummary: '[BUG] SauceDemo: Unable to login with locked_out_user credentials',
        improvedDescription: `Summary:\nWhen a user attempts to log in with credentials for a locked-out account, they are correctly blocked, but we must verify that the error matches UX guidelines.\n\nPreconditions:\nNavigate to https://www.saucedemo.com/\n\nSteps to Reproduce:\n1. Enter username "locked_out_user"\n2. Enter password "secret_sauce"\n3. Click Login`,
        rcaSuggestions: 'Root Cause Analysis suggestion: The authentication backend successfully validates the password but checks the account active flag. It throws a locked account state which is caught by the Express server. The frontend receives a 403 Forbidden with custom error details, indicating security policies are functioning as expected.',
        suggestedSeverity: 'Major',
        suggestedPriority: 'High'
      });
    }

    if (promptType === 'api-scenario') {
      return JSON.stringify({
        endpoints: [
          {
            path: '/api/v1/login',
            method: 'POST',
            description: 'Authenticate user and return JWT token',
            scenarios: [
              { type: 'Positive', description: 'Valid username and password returns 200 OK and JWT', expectedStatus: 200 },
              { type: 'Negative', description: 'Invalid password returns 401 Unauthorized', expectedStatus: 401 },
              { type: 'Edge Case', description: 'SQL injection payload in username returns 400 Bad Request', expectedStatus: 400 }
            ]
          }
        ]
      });
    }

    if (promptType === 'rest-assured') {
      return JSON.stringify({
        code: `import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class ApiLoginTest {

    @BeforeAll
    public static void setup() {
        RestAssured.baseURI = "https://www.saucedemo.com";
    }

    @Test
    public void testPostLoginValidUser() {
        String requestBody = "{\\n" +
                "  \\"username\\": \\"standard_user\\",\\n" +
                "  \\"password\\": \\"secret_sauce\\"\\n" +
                "}";

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/v1/login")
        .then()
            .statusCode(200)
            .body("token", notNullValue())
            .body("role", equalTo("standard"));
    }

    @Test
    public void testPostLoginInvalidPassword() {
        String requestBody = "{\\n" +
                "  \\"username\\": \\"standard_user\\",\\n" +
                "  \\"password\\": \\"wrong_pass\\"\\n" +
                "}";

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/v1/login")
        .then()
            .statusCode(401)
            .body("message", equalTo("Invalid credentials"));
    }
}`
      });
    }

    if (promptType === 'db-assistant') {
      // Analyze user prompt to return plausible query
      let queryStr = 'SELECT * FROM executions ORDER BY started_at DESC LIMIT 10;';
      let expl = 'Retrieves the last 10 test execution runs ordered by start timestamp.';

      const lower = userPrompt.toLowerCase();
      if (lower.includes('fail') || lower.includes('error')) {
        queryStr = "SELECT * FROM executions WHERE status = 'FAILED' ORDER BY started_at DESC;";
        expl = 'Retrieves all failed test suite executions.';
      } else if (lower.includes('defect') || lower.includes('bug')) {
        queryStr = 'SELECT d.id, d.summary, d.severity, d.status, d.jira_key FROM defects d ORDER BY d.created_at DESC;';
        expl = 'Lists all logged defects from the defects table.';
      } else if (lower.includes('join') || lower.includes('defect') && lower.includes('execution')) {
        queryStr = `SELECT e.id AS execution_id, e.suite_name, d.id AS defect_id, d.summary, d.status 
FROM executions e 
LEFT JOIN defects d ON d.description LIKE CONCAT('%Execution #', e.id, '%') 
ORDER BY e.started_at DESC;`;
        expl = 'Attempts to join test executions with logged defects by checking execution ID in the description.';
      } else if (lower.includes('insert')) {
        queryStr = "INSERT INTO executions (suite_name, status) VALUES ('Smoke', 'PENDING');";
        expl = 'Inserts a new pending smoke execution.';
      } else if (lower.includes('update')) {
        queryStr = "UPDATE defects SET status = 'Resolved' WHERE id = 1;";
        expl = 'Updates status of defect #1 to Resolved.';
      }

      return JSON.stringify({
        sql: queryStr,
        explanation: expl
      });
    }

    return JSON.stringify({ message: 'General mock query response.' });
  }
}

module.exports = new AIService();
