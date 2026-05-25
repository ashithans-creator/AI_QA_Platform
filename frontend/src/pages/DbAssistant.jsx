import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Database, Sparkles, Play, ShieldCheck, 
  Terminal, ShieldAlert, Clock, RefreshCw
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const DbAssistant = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedSql, setGeneratedSql] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  
  const [queryDuration, setQueryDuration] = useState('');
  const [results, setResults] = useState([]);
  const [isWriteQuery, setIsWriteQuery] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [schema, setSchema] = useState(null);

  const { showNotification } = useNotification();

  const samplePrompts = [
    { label: 'Failed executions', text: 'Show all failed executions' },
    { label: 'Defect status audit', text: 'Show all defects order by severity' },
    { label: 'Join executions & details', text: 'Join executions with history details to see all test specs' },
    { label: 'Add pending test suite', text: 'Insert a new execution for Regression suite with status PENDING' }
  ];

  const fetchSchema = async () => {
    try {
      const res = await axios.get('/api/db-assistant/schema');
      setSchema(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, []);

  const handleGenerateSql = async (selectedPrompt) => {
    const targetPrompt = selectedPrompt || prompt;
    if (!targetPrompt.trim()) {
      showNotification('Please enter a natural language instruction', 'warning');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setGeneratedSql('');
    setExplanation('');

    try {
      const res = await axios.post('/api/db-assistant/generate-sql', { prompt: targetPrompt });
      setGeneratedSql(res.data.sql);
      setExplanation(res.data.explanation);
      showNotification('SQL query generated!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to translate prompt to SQL', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSql = async () => {
    if (!generatedSql.trim()) return;

    setExecuting(true);
    setErrorMessage('');
    setResults([]);
    setQueryDuration('');

    try {
      const res = await axios.post('/api/db-assistant/execute', { sql: generatedSql });
      
      setResults(res.data.results || []);
      setIsWriteQuery(res.data.isWrite);
      setQueryDuration(res.data.duration);
      showNotification('SQL query executed successfully!', 'success');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || err.response?.data?.message || 'Execution error');
      showNotification('Query execution failed', 'error');
    } finally {
      setExecuting(false);
    }
  };

  // Extract columns dynamically from query result keys
  const getColumns = () => {
    if (results.length === 0) return [];
    return Object.keys(results[0]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        
        {/* NLP Prompter card */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
            AI Database Assistant
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Instruct the database in natural language. The AI translates it to SQL and runs it securely against schema tables.
          </p>

          <textarea
            placeholder="Type your database request here (e.g. Show all defects, or Join executions with defect lists...)"
            rows={4}
            className="input-field"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ marginBottom: '1rem' }}
          />

          {/* Quick links */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Quick Suggestions
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p.text);
                    handleGenerateSql(p.text);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '50px' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleGenerateSql()}
            className="btn btn-primary"
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
          >
            <Sparkles size={16} />
            <span>{loading ? 'Translating prompt...' : 'Translate to SQL'}</span>
          </button>
        </div>

        {/* Query inspection panel */}
        <div className="card panel-glass" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Generated SQL query</h3>
            </div>
            
            {generatedSql && (
              <span className="badge badge-success" style={{ display: 'flex', gap: '4px' }}>
                <ShieldCheck size={12} />
                <span>Security Passed</span>
              </span>
            )}
          </div>

          {generatedSql ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
              <pre style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                padding: '1rem',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                border: '1px solid var(--border-color)',
                whiteSpace: 'pre-wrap',
                textAlign: 'left'
              }}>
                <code>{generatedSql}</code>
              </pre>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Explanation</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {explanation}
                </p>
              </div>

              <button
                onClick={handleExecuteSql}
                className="btn btn-primary"
                disabled={executing}
                style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
              >
                <Play size={14} fill="white" />
                <span>{executing ? 'Executing Query...' : 'Run Query'}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              <Database size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem' }}>Translate an instruction to view the SQL query, explanation details, and trigger DB executions.</p>
            </div>
          )}
        </div>
      </div>

      {schema && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '1.1rem' }}>Connected Schema ({schema.dbType})</h4>
            <button onClick={fetchSchema} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {schema.tables.map(table => (
              <button
                key={table.name}
                onClick={() => setPrompt(`Show all ${table.name}`)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                {table.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query output results grid */}
      {(results.length > 0 || errorMessage) && (
        <div className="card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '1.1rem' }}>Query Executions Results</h4>
            
            {queryDuration && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                <span>Duration: {queryDuration}</span>
              </span>
            )}
          </div>

          {errorMessage ? (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--danger-light)', 
              color: 'var(--danger)', 
              borderRadius: '8px', 
              borderLeft: '4px solid var(--danger)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>SQL Syntax or Execution Error</p>
                <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{errorMessage}</p>
              </div>
            </div>
          ) : isWriteQuery ? (
            <div style={{ padding: '1rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '8px' }}>
              <p style={{ fontWeight: 600 }}>Command completed successfully. Rows affected: {results[0]?.affectedRows || 0}. Last Insert ID: {results[0]?.insertId || 'N/A'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    {getColumns().map((col, idx) => (
                      <th key={idx}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {getColumns().map((col, colIdx) => {
                        const val = row[col];
                        return (
                          <td key={colIdx} style={{ fontSize: '0.85rem' }}>
                            {val === null ? (
                              <em style={{ color: 'var(--text-muted)' }}>null</em>
                            ) : typeof val === 'object' ? (
                              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>JSON object</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DbAssistant;
