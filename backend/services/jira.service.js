const axios = require('axios');

class JiraService {
  constructor() {
    this.host = process.env.JIRA_HOST;
    this.email = process.env.JIRA_EMAIL;
    this.apiToken = process.env.JIRA_API_TOKEN;
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'QA';
    
    this.isEnabled = this.host && this.email && this.apiToken;
    if (!this.isEnabled) {
      console.warn('⚠️ Jira environment variables are missing. Running Jira service in MOCK mode.');
    }
  }

  getHeaders() {
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async createIssue(summary, description, severity, priority) {
    if (!this.isEnabled) {
      // Simulate Jira ticket creation
      const mockKey = `${this.projectKey}-${Math.floor(Math.random() * 1000) + 100}`;
      console.log(`[Mock Jira] Created issue ${mockKey}: ${summary}`);
      return {
        id: Math.floor(Math.random() * 10000).toString(),
        key: mockKey,
        self: `https://mock-jira.atlassian.net/browse/${mockKey}`
      };
    }

    try {
      const url = `${this.host}/rest/api/3/issue`;
      const data = {
        fields: {
          project: {
            key: this.projectKey
          },
          summary: summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: description
                  }
                ]
              }
            ]
          },
          issuetype: {
            name: 'Bug'
          },
          // Map priority and severity labels if custom fields are set, or use standard priority
          priority: {
            name: this.mapPriority(priority)
          }
        }
      };

      try {
        const response = await axios.post(url, data, { headers: this.getHeaders() });
        return response.data;
      } catch (err) {
        if (err.response && err.response.data && err.response.data.errors && err.response.data.errors.issuetype) {
          console.warn('⚠️ Issue type "Bug" not valid for this project. Falling back to "Task".');
          data.fields.issuetype.name = 'Task';
          const retryResponse = await axios.post(url, data, { headers: this.getHeaders() });
          return retryResponse.data;
        }
        throw err;
      }
    } catch (error) {
      console.error('❌ Jira createIssue failed:', error.response ? error.response.data : error.message);
      throw new Error(`Failed to create Jira issue: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
  }

  async getIssue(issueKey) {
    if (!this.isEnabled) {
      return {
        key: issueKey,
        fields: {
          summary: `Mock Defect: ${issueKey}`,
          status: { name: 'To Do' },
          priority: { name: 'Medium' },
          description: 'This is a mock Jira issue description.'
        }
      };
    }

    try {
      const url = `${this.host}/rest/api/3/issue/${issueKey}`;
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error(`❌ Jira getIssue (${issueKey}) failed:`, error.response ? error.response.data : error.message);
      throw new Error(`Failed to fetch Jira issue: ${error.message}`);
    }
  }

  async updateIssueStatus(issueKey, statusName) {
    if (!this.isEnabled) {
      console.log(`[Mock Jira] Transitioned issue ${issueKey} to: ${statusName}`);
      return { success: true, status: statusName };
    }

    try {
      // Step 1: Find transitions for the issue
      const urlTransitions = `${this.host}/rest/api/3/issue/${issueKey}/transitions`;
      const transResponse = await axios.get(urlTransitions, { headers: this.getHeaders() });
      
      const transitions = transResponse.data.transitions || [];
      const targetTransition = transitions.find(t => 
        t.name.toLowerCase() === statusName.toLowerCase() ||
        t.to.name.toLowerCase() === statusName.toLowerCase()
      );

      if (!targetTransition) {
        throw new Error(`No transition found matching status "${statusName}". Available: ${transitions.map(t => t.name).join(', ')}`);
      }

      // Step 2: Trigger transition
      await axios.post(urlTransitions, {
        transition: { id: targetTransition.id }
      }, { headers: this.getHeaders() });

      return { success: true, status: statusName };
    } catch (error) {
      console.error(`❌ Jira updateIssueStatus (${issueKey}) failed:`, error.response ? error.response.data : error.message);
      throw new Error(`Failed to update Jira status: ${error.message}`);
    }
  }

  async fetchStoryForTestCases(issueKey) {
    if (!this.isEnabled) {
      return {
        title: `Mock Story: ${issueKey}`,
        description: 'As a user, I want to login so that I can access the dashboard.',
        acceptanceCriteria: 'Given valid credentials, the user should be logged in successfully.'
      };
    }

    try {
      const url = `${this.host}/rest/api/3/issue/${issueKey}`;
      const response = await axios.get(url, { headers: this.getHeaders() });
      const data = response.data;
      
      const description = this.extractJiraFieldText(data.fields.description);
      const acceptanceCriteria = 
        data.fields.customfield_10020 || 
        data.fields.customfield_10021 || 
        this.extractAcceptanceCriteria(description);

      return {
        title: data.fields.summary,
        description,
        acceptanceCriteria: acceptanceCriteria || 'Not specified'
      };
    } catch (error) {
      console.error(`❌ Jira fetchStoryForTestCases (${issueKey}) failed:`, error.response ? error.response.data : error.message);
      throw new Error(`Failed to fetch Jira story: ${error.message}`);
    }
  }

  extractJiraFieldText(field) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field)) {
      return field
        .map(f => this.extractJiraFieldText(f))
        .filter(Boolean)
        .join('\n');
    }
    if (typeof field === 'object') {
      if (field.type === 'text') {
        return field.text || '';
      }
      if (field.content) {
        return this.extractJiraFieldText(field.content);
      }
      return Object.values(field)
        .map(v => this.extractJiraFieldText(v))
        .filter(Boolean)
        .join(' ');
    }
    return '';
  }

  extractAcceptanceCriteria(text) {
    const marker = 'acceptance criteria';
    const lower = text.toLowerCase();
    const index = lower.indexOf(marker);
    if (index === -1) return '';
    const after = text.slice(index + marker.length);
    return after.trim();
  }

  mapPriority(p) {
    const priority = String(p).toLowerCase();
    if (priority.includes('high')) return 'High';
    if (priority.includes('low')) return 'Low';
    return 'Medium';
  }
}

module.exports = new JiraService();
