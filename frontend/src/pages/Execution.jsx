import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Play, Terminal, ExternalLink, RefreshCw, 
  CheckCircle2, XCircle, AlertCircle, Save, Trash2
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Execution = () => {
  const [suite, setSuite] = useState('Smoke');
  const [activeRunId, setActiveRunId] = useState(null);
  const [runDetails, setRunDetails] = useState(null);
  const [allRuns, setAllRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [suiteConfig, setSuiteConfig] = useState(null);
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [savingSuite, setSavingSuite] = useState(false);

  const terminalEndRef = useRef(null);
  const { showNotification } = useNotification();

  const fetchRuns = async () => {
    try {
      const res = await axios.get('/api/executions');
      setAllRuns(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuiteConfig = async () => {
    try {
      const res = await axios.get('/api/executions/suites/config');
      setSuiteConfig(res.data);
      const activeSuite = res.data.suites.find(item => item.name === suite);
      setSelectedTestIds(activeSuite?.testIds || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load suite testcases', 'error');
    }
  };

  useEffect(() => {
    fetchRuns();
    fetchSuiteConfig();
  }, []);

  useEffect(() => {
    if (!suiteConfig) return;
    const activeSuite = suiteConfig.suites.find(item => item.name === suite);
    setSelectedTestIds(activeSuite?.testIds || []);
  }, [suite, suiteConfig]);

  const toggleSuiteTest = (testId) => {
    setSelectedTestIds(currentIds => (
      currentIds.includes(testId)
        ? currentIds.filter(id => id !== testId)
        : [...currentIds, testId]
    ));
  };

  const saveSuiteTests = async () => {
    try {
      setSavingSuite(true);
      const res = await axios.put(`/api/executions/suites/${suite}/tests`, { testIds: selectedTestIds });
      setSuiteConfig(current => ({
        ...current,
        suites: current.suites.map(item => item.name === suite ? res.data.suite : item)
      }));
      showNotification(`${suite} suite updated`, 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to update suite', 'error');
    } finally {
      setSavingSuite(false);
    }
  };

  const triggerExecution = async () => {
    setLoading(true);
    setRunDetails(null);
    try {
      const res = await axios.post('/api/executions/trigger', { suiteName: suite });
      const execId = res.data.executionId;
      setActiveRunId(execId);
      showNotification(`Triggered ${suite} Suite execution!`, 'success');
      startPolling(execId);
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to trigger suite execution', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (execId) => {
    setPolling(true);
    fetchRuns();
    
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/executions/${execId}`);
        const details = res.data;
        setRunDetails(details);

        // Auto-scroll terminal
        if (terminalEndRef.current) {
          terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }

        if (details.status !== 'RUNNING' && details.status !== 'PENDING') {
          clearInterval(interval);
          setPolling(false);
          fetchRuns();
          showNotification(`Execution finished: ${details.status}`, details.status === 'PASSED' ? 'success' : 'error');
        }
      } catch (err) {
        console.error(err);
        clearInterval(interval);
        setPolling(false);
      }
    }, 1500);
  };

  const inspectRun = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/executions/${id}`);
      setRunDetails(res.data);
      setActiveRunId(id);
      
      if (res.data.status === 'RUNNING' || res.data.status === 'PENDING') {
        startPolling(id);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to retrieve run details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteRun = async (run) => {
    const confirmed = window.confirm(`Delete run #${run.id}? This removes the run log, test history, and JSON report.`);
    if (!confirmed) return;

    try {
      await axios.delete(`/api/executions/${run.id}`);
      setAllRuns(currentRuns => currentRuns.filter(item => item.id !== run.id));
      if (activeRunId === run.id) {
        setActiveRunId(null);
        setRunDetails(null);
      }
      showNotification(`Run #${run.id} deleted`, 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to delete run', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Execution Launcher Control panel */}
      <div className="card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
          Automation Execution Suite
        </h3>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Select Target Suite</label>
            <select 
              value={suite} 
              onChange={(e) => setSuite(e.target.value)} 
              className="input-field"
              style={{ width: '180px' }}
              disabled={polling}
            >
              <option value="Smoke">Smoke Suite</option>
              <option value="Sanity">Sanity Suite</option>
              <option value="Regression">Regression Suite</option>
            </select>
          </div>

          <button 
            onClick={triggerExecution} 
            className="btn btn-primary" 
            style={{ 
              marginTop: '1.5rem', 
              padding: '12px 24px', 
              background: 'linear-gradient(135deg, var(--primary), var(--accent))' 
            }}
            disabled={polling || loading}
          >
            <Play size={16} fill="white" />
            <span>{polling ? 'Execution Running...' : 'Execute Suite'}</span>
          </button>

          <button onClick={fetchRuns} className="btn btn-secondary" style={{ marginTop: '1.5rem', padding: '12px' }} disabled={polling}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Suite Testcases</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              {selectedTestIds.length} selected for {suite} Suite
            </p>
          </div>
          <button
            onClick={saveSuiteTests}
            className="btn btn-primary"
            style={{ padding: '10px 16px' }}
            disabled={polling || savingSuite || selectedTestIds.length === 0}
          >
            <Save size={16} />
            <span>{savingSuite ? 'Saving...' : 'Save Suite'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {(suiteConfig?.allTests || []).map(testCase => {
            const selected = selectedTestIds.includes(testCase.id);
            return (
              <label
                key={testCase.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  padding: '12px',
                  border: `1px solid ${selected ? 'var(--primary)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                  cursor: polling ? 'not-allowed' : 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSuiteTest(testCase.id)}
                  disabled={polling}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem' }}>{testCase.title}</span>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '4px' }}>{testCase.id}</span>
                  <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '6px', lineHeight: 1.4 }}>
                    {testCase.description || testCase.expectedResult}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Main Console and Spec detail columns */}
      {runDetails && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
          
          {/* Live stdout Logger */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Console Log Stream</h4>
              </div>
              <span className={`badge badge-${
                runDetails.status === 'PASSED' ? 'success' : 
                runDetails.status === 'FAILED' ? 'danger' : 'info'
              }`}>
                {runDetails.status}
              </span>
            </div>

            <div style={{
              flexGrow: 1,
              backgroundColor: '#0c0f17',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              overflowY: 'auto',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)'
            }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{runDetails.logs || 'No output recorded.'}</pre>
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Test Specs Breakdown */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '450px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Test Specs List ({runDetails.history?.length || 0})
            </h4>

            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {runDetails.history && runDetails.history.length > 0 ? (
                runDetails.history.map(test => (
                  <div 
                    key={test.id} 
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-tertiary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{test.test_name}</span>
                      <span className={`badge badge-${test.status === 'PASSED' ? 'success' : test.status === 'FAILED' ? 'danger' : 'warning'}`}>
                        {test.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>Duration: {(test.duration / 1000).toFixed(2)}s</span>
                      <span>{new Date(test.created_at).toLocaleTimeString()}</span>
                    </div>
                    {test.error_message && (
                      <p style={{
                        marginTop: '6px',
                        padding: '8px',
                        backgroundColor: 'var(--danger-light)',
                        color: 'var(--danger)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        borderLeft: '3px solid var(--danger)',
                        wordBreak: 'break-all'
                      }}>
                        {test.error_message}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                  {runDetails.status === 'RUNNING' ? 'Awaiting test completion to load specs...' : 'No details available.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Runs History */}
      <div className="card">
        <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Test Runs Log</h4>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Target Suite</th>
                <th>Run Outcome</th>
                <th>Duration</th>
                <th>Started At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allRuns.length > 0 ? (
                allRuns.map(run => (
                  <tr key={run.id}>
                    <td style={{ fontWeight: 600 }}>#{run.id}</td>
                    <td>{run.suite_name}</td>
                    <td>
                      <span className={`badge badge-${
                        run.status === 'PASSED' ? 'success' : 
                        run.status === 'FAILED' ? 'danger' : 
                        run.status === 'RUNNING' ? 'info' : 'warning'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td>{run.status === 'RUNNING' ? 'Running...' : `${(run.duration / 1000).toFixed(2)}s`}</td>
                    <td>{new Date(run.started_at).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => inspectRun(run.id)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Load Details
                        </button>
                        <button
                          onClick={() => deleteRun(run)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            color: 'var(--danger)',
                            borderColor: 'var(--danger-light)'
                          }}
                          disabled={run.status === 'RUNNING' || run.status === 'PENDING'}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No execution records found.
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

export default Execution;
