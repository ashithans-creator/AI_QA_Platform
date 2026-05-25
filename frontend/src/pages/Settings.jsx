import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings, Globe, Brain, Cpu, Moon, Sun,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Key, FileSpreadsheet
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { showNotification } = useNotification();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/status');
      setStatus(res.data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load server status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const providerLabels = {
    openai:  { label: 'OpenAI GPT-4o-mini', color: '#10a37f' },
    gemini:  { label: 'Google Gemini 1.5 Flash', color: '#4285F4' },
    groq:    { label: 'Groq Llama3-8B', color: '#f55036' },
    ollama:  { label: 'Ollama (Local)', color: '#8b5cf6' },
    mock:    { label: 'Offline Simulator (Mock)', color: '#6b7280' },
  };

  const ai = status?.ai;
  const activeLabel = providerLabels[ai?.activeProvider] || providerLabels.mock;

  const keyRows = [
    { id: 'openai', label: 'OpenAI API Key',    envVar: 'OPENAI_API_KEY',  value: ai?.keys?.openai  },
    { id: 'gemini', label: 'Gemini API Key',    envVar: 'GEMINI_API_KEY',  value: ai?.keys?.gemini  },
    { id: 'groq',   label: 'Groq API Key',      envVar: 'GROQ_API_KEY',    value: ai?.keys?.groq    },
    { id: 'ollama', label: 'Ollama Host',        envVar: 'OLLAMA_HOST',     value: ai?.keys?.ollama  },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── AI Provider Status Card ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={20} style={{ color: 'var(--primary)' }} />
            Active AI Provider
          </h3>
          <button onClick={fetchStatus} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading status...</p>
        ) : (
          <>
            {/* Active Provider Banner */}
            <div style={{
              padding: '1.25rem',
              borderRadius: '10px',
              border: `2px solid ${activeLabel.color}22`,
              backgroundColor: `${activeLabel.color}11`,
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                backgroundColor: `${activeLabel.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Cpu size={24} style={{ color: activeLabel.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '1.05rem' }}>{activeLabel.label}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Configured as: <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{ai?.configuredProvider || 'mock'}</code>
                  &nbsp;→&nbsp;
                  Actually running: <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{ai?.activeProvider || 'mock'}</code>
                </p>
              </div>
              <span style={{
                padding: '6px 14px', borderRadius: '50px', fontWeight: 700, fontSize: '0.8rem',
                backgroundColor: ai?.isMock ? '#6b728022' : '#10b98122',
                color: ai?.isMock ? '#6b7280' : '#10b981',
                border: `1px solid ${ai?.isMock ? '#6b7280' : '#10b981'}44`
              }}>
                {ai?.isMock ? '⚠ Mock Mode' : '✓ Live AI'}
              </span>
            </div>

            {/* If mock and provider was configured but key missing — show warning */}
            {ai?.isMock && ai?.configuredProvider !== 'mock' && (
              <div style={{
                padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem',
                backgroundColor: 'var(--warning-light)', border: '1px solid var(--warning)',
                display: 'flex', gap: '10px', alignItems: 'flex-start'
              }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Provider set to "{ai.configuredProvider}" but its API key is missing.</strong>
                  <br />
                  The backend fell back to Mock mode. Add the correct key to{' '}
                  <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>backend/.env</code>{' '}
                  and restart the backend server.
                </div>
              </div>
            )}

            {/* Key Status Table */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
              API Key Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {keyRows.map(row => (
                <div key={row.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: ai?.activeProvider === row.id ? `${activeLabel.color}0d` : 'var(--bg-tertiary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Key size={15} style={{ color: row.value ? 'var(--success)' : 'var(--text-muted)' }} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{row.label}</p>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.envVar}</code>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {row.value ? (
                      <>
                        <code style={{
                          fontSize: '0.78rem', padding: '3px 8px', borderRadius: '4px',
                          backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)'
                        }}>{row.value}</code>
                        <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Not set</span>
                        <XCircle size={16} style={{ color: 'var(--text-muted)' }} />
                      </>
                    )}
                    {ai?.activeProvider === row.id && (
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: '50px',
                        backgroundColor: activeLabel.color, color: 'white', fontWeight: 700
                      }}>IN USE</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* How to change instruction */}
            <div style={{
              marginTop: '1.5rem', padding: '14px 16px', borderRadius: '8px',
              backgroundColor: 'var(--bg-tertiary)', fontSize: '0.83rem', color: 'var(--text-secondary)'
            }}>
              <p style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                📝 How to change the AI provider
              </p>
              <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Open <code style={{ background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px' }}>c:\Users\Admin\Documents\Assesment-1\backend\.env</code></li>
                <li>Set <code style={{ background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px' }}>AI_PROVIDER=openai</code> (or <code>gemini</code> / <code>groq</code> / <code>ollama</code> / <code>mock</code>)</li>
                <li>Paste the matching API key (e.g. <code>OPENAI_API_KEY=sk-...</code>)</li>
                <li>Restart the backend: stop then re-run <code>npm run dev</code> in the <code>backend</code> folder</li>
                <li>Click <strong>Refresh</strong> above to confirm the change took effect</li>
              </ol>
            </div>
          </>
        )}
      </div>

      {/* ── Two-column bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>

        {/* Server / DB Status */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} style={{ color: 'var(--primary)' }} />
            Server Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Backend API', sub: 'http://localhost:5001', badge: status ? 'Online' : 'Unknown', color: 'success' },
              { label: 'Database Engine', sub: 'Active connection', badge: (status?.database || 'sqlite').toUpperCase(), color: status?.database === 'mysql' ? 'success' : 'warning' },
            ].map(row => (
              <div key={row.label} style={{
                padding: '12px', borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.label}</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.sub}</span>
                </div>
                <span className={`badge badge-${row.color}`}>{row.badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* UI Settings */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: 'var(--accent)' }} />
            UI Settings
          </h3>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>Theme</label>
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ width: '100%', display: 'flex', gap: '10px', padding: '12px' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>Switch to {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Module Reference ── */}
      <div className="card panel-glass">
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={16} style={{ color: 'var(--primary)' }} />
          AI Module Reference
        </h4>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>Module</th>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>Prompt Type</th>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>Mock Fallback</th>
              </tr>
            </thead>
            <tbody>
              {[
                { module: 'AI Test Generator', type: 'testcase', mock: '3 sample SauceDemo test cases' },
                { module: 'Defect Reporter',   type: 'defect',   mock: 'RCA + improved summary' },
                { module: 'API Assistant',     type: 'api-scenario / rest-assured', mock: 'Sample endpoint scenarios' },
                { module: 'DB Assistant',      type: 'db-assistant', mock: 'Keyword-matched SQL query' },
              ].map(row => (
                <tr key={row.module} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.module}</td>
                  <td style={{ padding: '10px 8px' }}><code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.78rem' }}>{row.type}</code></td>
                  <td style={{ padding: '10px 8px' }}>{row.mock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
