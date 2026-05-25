import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, Sparkles, Send, RefreshCw, 
  ExternalLink, Bug, Clipboard, Brain
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const DefectReporter = () => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [severity, setSeverity] = useState('Major');
  const [priority, setPriority] = useState('Medium');
  const [pushJira, setPushJira] = useState(true);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [defects, setDefects] = useState([]);
  const [syncingId, setSyncingId] = useState(null);

  const { showNotification } = useNotification();

  const fetchDefects = async () => {
    try {
      const res = await axios.get('/api/defects');
      setDefects(res.data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to retrieve defects list', 'error');
    }
  };

  useEffect(() => {
    fetchDefects();
  }, []);

  const handleAIAnalyze = async () => {
    if (!summary.trim() || !steps.trim() || !actual.trim()) {
      showNotification('Please fill in Summary, Steps, and Actual Result to run AI analysis', 'warning');
      return;
    }

    setAiLoading(true);
    setAiResult(null);

    try {
      const res = await axios.post('/api/defects/analyze', {
        summary,
        description,
        stepsToReproduce: steps,
        expectedResult: expected,
        actualResult: actual
      });
      
      setAiResult(res.data.analysis);
      showNotification('AI analysis and RCA recommendations generated!', 'success');
      
      // Auto-update recommendations
      if (res.data.analysis.suggestedSeverity) setSeverity(res.data.analysis.suggestedSeverity);
      if (res.data.analysis.suggestedPriority) setPriority(res.data.analysis.suggestedPriority);
    } catch (err) {
      console.error(err);
      showNotification('AI analysis failed. Using offline recommendations.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAISuggestions = () => {
    if (!aiResult) return;
    setSummary(aiResult.improvedSummary);
    setDescription(aiResult.improvedDescription);
    showNotification('AI improved summary and description applied!', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summary.trim()) {
      showNotification('Summary is required', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post('/api/defects/create', {
        summary,
        description: description || `Steps:\n${steps}\n\nExpected:\n${expected}\n\nActual:\n${actual}`,
        severity,
        priority,
        stepsToReproduce: steps,
        expectedResult: expected,
        actualResult: actual,
        pushToJira: pushJira
      });

      showNotification(
        res.data.jiraKey 
          ? `Defect logged locally and pushed to Jira as: ${res.data.jiraKey}` 
          : 'Defect logged successfully locally.',
        'success'
      );
      
      // Reset form
      setSummary('');
      setDescription('');
      setSteps('');
      setExpected('');
      setActual('');
      setAiResult(null);
      fetchDefects();
    } catch (err) {
      console.error(err);
      showNotification('Failed to log defect', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const syncJiraStatus = async (id) => {
    setSyncingId(id);
    try {
      const res = await axios.post(`/api/defects/${id}/sync`);
      showNotification(`Ticket status synced: ${res.data.status}`, 'success');
      fetchDefects();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Sync failed', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const updateDefectStatusLocal = async (id, status) => {
    try {
      await axios.put(`/api/defects/${id}/status`, { status });
      showNotification(`Status updated to ${status}`, 'success');
      fetchDefects();
    } catch (err) {
      console.error(err);
      showNotification('Failed to update status', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        
        {/* Defect Form */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
            Log Defect Report
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Defect Summary</label>
              <input 
                type="text" 
                placeholder="e.g. SauceDemo login error when password field is empty" 
                className="input-field"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Steps to Reproduce</label>
              <textarea 
                placeholder="1. Navigate to URL&#10;2. Input username standard_user&#10;3. Click login" 
                rows={3} 
                className="input-field"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Expected Result</label>
                <textarea 
                  placeholder="Expected validation warning..." 
                  rows={2} 
                  className="input-field"
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Actual Result</label>
                <textarea 
                  placeholder="Actual error message text..." 
                  rows={2} 
                  className="input-field"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Severity</label>
                <select className="input-field" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="Critical">Critical</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                  <option value="Trivial">Trivial</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Priority</label>
                <select className="input-field" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="jiraSync"
                checked={pushJira} 
                onChange={(e) => setPushJira(e.target.checked)} 
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="jiraSync" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Push to Jira (Jira REST Integration)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={handleAIAnalyze} 
                className="btn btn-secondary"
                disabled={aiLoading}
                style={{ flexGrow: 1 }}
              >
                <Brain size={16} style={{ color: 'var(--accent)' }} />
                <span>{aiLoading ? 'Analyzing...' : 'AI Defect Review'}</span>
              </button>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
                style={{ flexGrow: 1 }}
              >
                <Send size={16} />
                <span>{submitting ? 'Logging...' : 'Submit Defect'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* AI Recommendations Panel */}
        <div className="card panel-glass" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AI Defect Diagnostics</h3>
          </div>

          {aiResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, overflowY: 'auto' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>Root Cause Analysis (RCA) Suggestion</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: '6px' }}>
                  {aiResult.rcaSuggestions}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>Suggested Summary</span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {aiResult.improvedSummary}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>AI Suggested Severity</span>
                  <p style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '0.9rem' }}>{aiResult.suggestedSeverity}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>AI Suggested Priority</span>
                  <p style={{ fontWeight: 600, color: 'var(--warning)', fontSize: '0.9rem' }}>{aiResult.suggestedPriority}</p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={applyAISuggestions} 
                className="btn btn-secondary" 
                style={{ marginTop: 'auto', alignSelf: 'flex-start', fontSize: '0.85rem' }}
              >
                <Clipboard size={14} />
                <span>Apply Improved Summary & Description</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              <Brain size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem' }}>Fill in the defect report details and click <strong>"AI Defect Review"</strong> to get Root Cause suggestions and clear summary formats.</p>
            </div>
          )}
        </div>
      </div>

      {/* Defects List */}
      <div className="card">
        <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Logged Defects & Jira Integration</h4>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Summary</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Local Status</th>
                <th>Jira Key</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {defects.length > 0 ? (
                defects.map(d => (
                  <tr key={d.id}>
                    <td>#{d.id}</td>
                    <td style={{ fontWeight: 600, maxWidth: '240px' }}>{d.summary}</td>
                    <td>
                      <span className={`badge badge-${d.severity === 'Critical' || d.severity === 'Major' ? 'danger' : 'warning'}`}>
                        {d.severity}
                      </span>
                    </td>
                    <td>{d.priority}</td>
                    <td>
                      <select 
                        value={d.status} 
                        onChange={(e) => updateDefectStatusLocal(d.id, e.target.value)}
                        className="input-field"
                        style={{ padding: '4px 8px', fontSize: '0.85rem', width: '130px' }}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                    <td>
                      {d.jira_key ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{d.jira_key}</span>
                          <button 
                            onClick={() => syncJiraStatus(d.id)}
                            disabled={syncingId === d.id}
                            className="btn btn-secondary"
                            style={{ padding: '4px', borderRadius: '4px' }}
                            title="Sync Status with Jira Cloud"
                          >
                            <RefreshCw size={12} className={syncingId === d.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Local Only</span>
                      )}
                    </td>
                    <td>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => {
                          setSummary(d.summary);
                          setDescription(d.description);
                          setSteps(d.steps_to_reproduce || '');
                          setExpected(d.expected_result || '');
                          setActual(d.actual_result || '');
                          setSeverity(d.severity);
                          setPriority(d.priority);
                          showNotification('Defect loaded into editor', 'info');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No defects logged yet. Create a defect report above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DefectReporter;
