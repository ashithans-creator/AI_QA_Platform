import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Sparkles, FileText, Upload, Copy, FileSpreadsheet,
  Save, Trash2, RefreshCw, Database
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const TestGenerator = () => {
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'saved'
  const [requirements, setRequirements] = useState('');
  const [jiraTicket, setJiraTicket] = useState('');
  const [jiraFetching, setJiraFetching] = useState(false);
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState(['Functional']);
  const [loading, setLoading] = useState(false);
  const [generatedCases, setGeneratedCases] = useState([]);
  const [savedCases, setSavedCases] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const { showNotification } = useNotification();

  const availableCategories = ['Functional', 'Negative', 'Boundary', 'Regression', 'API', 'UI'];

  const toggleCategory = (cat) => {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter(c => c !== cat));
      } else {
        showNotification('Select at least one category', 'warning');
      }
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      showNotification(`PRD file selected: ${e.target.files[0].name}`, 'info');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!requirements.trim() && !file) {
      showNotification('Please enter requirements text or upload a PRD file', 'warning');
      return;
    }

    setLoading(true);
    setGeneratedCases([]);

    const formData = new FormData();
    if (file) {
      formData.append('prd', file);
    } else {
      formData.append('requirements', requirements);
    }
    categories.forEach(cat => formData.append('categories', cat));

    try {
      const res = await axios.post('/api/testcases/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const cases = res.data.testCases;
      setGeneratedCases(Array.isArray(cases) ? cases : []);
      showNotification(`Successfully generated ${Array.isArray(cases) ? cases.length : 0} test cases!`, 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to generate test cases.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDb = async () => {
    if (!generatedCases.length) return;
    try {
      setLoading(true);
      await axios.post('/api/testcases/save', {
        testCases: generatedCases,
        requirements: requirements || (file ? file.name : '')
      });
      showNotification('Test cases saved to database successfully!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to save test cases', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedCases = async () => {
    setSavedLoading(true);
    try {
      const res = await axios.get('/api/testcases/saved');
      setSavedCases(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load saved test cases', 'error');
    } finally {
      setSavedLoading(false);
    }
  };

  const handleDeleteSaved = async (id) => {
    try {
      await axios.delete(`/api/testcases/${id}`);
      setSavedCases(prev => prev.filter(tc => tc.id !== id));
      showNotification('Test case deleted', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete test case', 'error');
    }
  };

  const fetchJiraTicket = async () => {
    const ticketId = jiraTicket.trim();
    if (!ticketId) {
      showNotification('Enter a Jira ticket ID', 'warning');
      return;
    }
    setJiraFetching(true);
    try {
      const res = await axios.get(`/api/jira/issue/${encodeURIComponent(ticketId)}`);
      const data = res.data.story;
      const filledContent = `Title: ${data.title}\n\nDescription:\n${data.description}\n\nAcceptance Criteria:\n${data.acceptanceCriteria}`;
      setRequirements(filledContent);
      showNotification('Jira ticket fetched successfully', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to fetch Jira ticket. Check if it exists and credentials are correct.', 'error');
    } finally {
      setJiraFetching(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedCases();
    }
  }, [activeTab]);

  const handleCopyToClipboard = () => {
    if (!generatedCases.length) return;
    let text = '';
    generatedCases.forEach(tc => {
      text += `ID: ${tc.testCaseId}\nTitle: ${tc.title}\nPreconditions: ${tc.preconditions}\n`;
      text += `Steps:\n${Array.isArray(tc.steps) ? tc.steps.join('\n') : tc.steps}\n`;
      text += `Expected: ${tc.expectedResult}\nPriority: ${tc.priority} | Severity: ${tc.severity}\n`;
      text += `--------------------------------------------------\n\n`;
    });
    navigator.clipboard.writeText(text);
    showNotification('Test cases copied to clipboard!', 'success');
  };

  const handleExportCsv = (data = generatedCases) => {
    if (!data.length) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Test Case ID,Title,Preconditions,Steps,Expected Result,Priority,Severity\n';
    data.forEach(tc => {
      const escape = (str) => `"${String(str || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const steps = Array.isArray(tc.steps) ? tc.steps.join('; ') : (tc.steps || '');
      const id = tc.testCaseId || tc.test_case_id || '';
      const expected = tc.expectedResult || tc.expected_result || '';
      csvContent += `${escape(id)},${escape(tc.title)},${escape(tc.preconditions)},${escape(steps)},${escape(expected)},${escape(tc.priority)},${escape(tc.severity)}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'test_cases.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('CSV exported successfully!', 'success');
  };

  const priorityBadge = (p) => p === 'High' ? 'danger' : p === 'Medium' ? 'warning' : 'info';
  const severityBadge = (s) => (s === 'Critical' || s === 'Major') ? 'danger' : 'warning';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {[
          { id: 'generate', label: 'Generate Test Cases', icon: <Sparkles size={16} /> },
          { id: 'saved',    label: 'Saved Test Cases',    icon: <Database size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'saved' && savedCases.length > 0 && (
              <span style={{
                background: 'var(--primary)', color: 'white',
                borderRadius: '50px', fontSize: '0.7rem',
                padding: '1px 7px', fontWeight: 700
              }}>
                {savedCases.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ── */}
      {activeTab === 'generate' && (
        <>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
              AI Test Suite Builder
            </h3>

            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ flexGrow: 1 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Fetch from Jira
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter Ticket ID (e.g., KAN-123)"
                    value={jiraTicket}
                    onChange={(e) => setJiraTicket(e.target.value)}
                    disabled={jiraFetching}
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchJiraTicket}
                  className="btn btn-secondary"
                  style={{ height: '44px', padding: '0 24px', fontWeight: 600, border: '2px solid var(--primary)', color: 'var(--primary)' }}
                  disabled={jiraFetching || !jiraTicket.trim()}
                >
                  {jiraFetching ? 'Fetching...' : 'Fetch Story'}
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
                  Paste Product Requirements (PRD) or User Stories
                </label>
                <textarea
                  placeholder="Example: Users should be able to log in to SauceDemo using standard credentials..."
                  rows={6}
                  className="input-field"
                  style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  disabled={file !== null}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flexGrow: 1 }}>
                  <label className="btn btn-secondary" style={{ width: '100%', borderStyle: 'dashed', borderWidth: '2px', display: 'flex', flexDirection: 'column', padding: '1.5rem', cursor: 'pointer' }}>
                    <Upload size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Upload PRD File (.pdf, .txt, .md)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drag &amp; drop or browse</span>
                    <input type="file" accept=".txt,.md,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>
                {file && (
                  <div className="badge badge-info" style={{ display: 'flex', gap: '8px', padding: '10px' }}>
                    <FileText size={14} />
                    <span>{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>
                  Select Test Case Coverage Types
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {availableCategories.map(cat => {
                    const isSelected = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="btn"
                        style={{
                          padding: '8px 16px', borderRadius: '50px', fontSize: '0.85rem',
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                          color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', padding: '12px 24px', background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
                disabled={loading}
              >
                <Sparkles size={16} />
                <span>{loading ? 'Generating test cases...' : 'Generate Test Cases'}</span>
              </button>
            </form>
          </div>

          {/* Generated Results */}
          {generatedCases && generatedCases.length > 0 && (
            <div className="card animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Generated Scenarios</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    AI compiled {generatedCases.length} scenarios. Click <strong>Save Suite</strong> to persist them.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopyToClipboard} className="btn btn-secondary">
                    <Copy size={16} /><span>Copy</span>
                  </button>
                  <button onClick={() => handleExportCsv(generatedCases)} className="btn btn-secondary">
                    <FileSpreadsheet size={16} /><span>Export CSV</span>
                  </button>
                  <button onClick={handleSaveToDb} className="btn btn-primary">
                    <Save size={16} /><span>Save Suite</span>
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Title</th><th>Preconditions</th>
                      <th>Steps</th><th>Expected Result</th><th>Priority</th><th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedCases.map(tc => (
                      <tr key={tc.testCaseId}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)', verticalAlign: 'top' }}>{tc.testCaseId}</td>
                        <td style={{ fontWeight: 600, verticalAlign: 'top', maxWidth: '180px' }}>{tc.title}</td>
                        <td style={{ fontSize: '0.85rem', verticalAlign: 'top', color: 'var(--text-secondary)', maxWidth: '160px' }}>{tc.preconditions}</td>
                        <td style={{ fontSize: '0.85rem', verticalAlign: 'top', maxWidth: '300px' }}>
                          <ol style={{ paddingLeft: '15px' }}>
                            {(Array.isArray(tc.steps) ? tc.steps : [tc.steps]).map((step, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                            ))}
                          </ol>
                        </td>
                        <td style={{ fontSize: '0.85rem', verticalAlign: 'top', maxWidth: '180px' }}>{tc.expectedResult}</td>
                        <td style={{ verticalAlign: 'top' }}>
                          <span className={`badge badge-${priorityBadge(tc.priority)}`}>{tc.priority}</span>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <span className={`badge badge-${severityBadge(tc.severity)}`}>{tc.severity}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SAVED TEST CASES TAB ── */}
      {activeTab === 'saved' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Saved Test Cases</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {savedCases.length} test case{savedCases.length !== 1 ? 's' : ''} saved in the database.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleExportCsv(savedCases)} className="btn btn-secondary" disabled={!savedCases.length}>
                <FileSpreadsheet size={16} /><span>Export CSV</span>
              </button>
              <button onClick={fetchSavedCases} className="btn btn-secondary">
                <RefreshCw size={16} /><span>Refresh</span>
              </button>
            </div>
          </div>

          {savedLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading saved test cases...
            </div>
          ) : savedCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Database size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600 }}>No saved test cases yet.</p>
              <p style={{ fontSize: '0.85rem' }}>Generate test cases and click <strong>Save Suite</strong> to persist them here.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Title</th><th>Category</th>
                    <th>Preconditions</th><th>Steps</th><th>Expected Result</th>
                    <th>Priority</th><th>Severity</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedCases.map(tc => {
                    const steps = Array.isArray(tc.steps) ? tc.steps : (tc.steps ? tc.steps.split('\n') : []);
                    return (
                      <tr key={tc.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)', verticalAlign: 'top' }}>{tc.test_case_id}</td>
                        <td style={{ fontWeight: 600, verticalAlign: 'top', maxWidth: '180px' }}>{tc.title}</td>
                        <td style={{ verticalAlign: 'top' }}>
                          <span className="badge badge-info">{tc.category || 'Functional'}</span>
                        </td>
                        <td style={{ fontSize: '0.85rem', verticalAlign: 'top', color: 'var(--text-secondary)', maxWidth: '160px' }}>{tc.preconditions}</td>
                        <td style={{ fontSize: '0.85rem', verticalAlign: 'top', maxWidth: '280px' }}>
                          <ol style={{ paddingLeft: '15px' }}>
                            {steps.filter(Boolean).map((step, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                            ))}
                          </ol>
                        </td>
                        <td style={{ fontSize: '0.85rem', verticalAlign: 'top', maxWidth: '180px' }}>{tc.expected_result}</td>
                        <td style={{ verticalAlign: 'top' }}>
                          <span className={`badge badge-${priorityBadge(tc.priority)}`}>{tc.priority}</span>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <span className={`badge badge-${severityBadge(tc.severity)}`}>{tc.severity}</span>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <button
                            onClick={() => handleDeleteSaved(tc.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestGenerator;
