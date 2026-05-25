import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Network, Sparkles, Upload, FileCode, PlayCircle, 
  Download, Save, RefreshCw, Layers, PlusCircle, Check
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const ApiAssistant = () => {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/api/v1/users');
  const [swaggerFile, setSwaggerFile] = useState(null);
  const [parsedEndpoints, setParsedEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [generatedCode, setGeneratedCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const { showNotification } = useNotification();

  const fetchCollections = async () => {
    try {
      const res = await axios.get('/api/api-assistant/collections');
      setCollections(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleSwaggerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSwaggerFile(file);
    setLoading(true);
    setParsedEndpoints([]);

    const formData = new FormData();
    formData.append('swagger', file);

    try {
      const res = await axios.post('/api/api-assistant/upload-swagger', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setParsedEndpoints(res.data.endpoints || []);
      showNotification(`OpenAPI contract parsed successfully! Found ${res.data.endpoints.length} endpoints.`, 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to parse OpenAPI document. Verify spec schema.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeEndpoint = async (inputEndpoint, inputMethod) => {
    setLoading(true);
    setScenarios([]);
    setGeneratedCode('');

    try {
      const res = await axios.post('/api/api-assistant/analyze-endpoint', {
        endpoint: inputEndpoint || endpoint,
        method: inputMethod || method,
        spec: selectedEndpoint // Send details if selected from swagger
      });

      // API structure response returns array of endpoints or scenarios
      const resultScenarios = res.data.scenarios[0]?.scenarios || res.data.scenarios || [];
      setScenarios(resultScenarios);
      showNotification('Test scenarios generated successfully!', 'success');
      
      // Auto-trigger code generation
      await handleGenerateCode(inputEndpoint || endpoint, inputMethod || method, resultScenarios);
    } catch (err) {
      console.error(err);
      showNotification('Endpoint analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async (path, verb, testScenarios) => {
    setCodeLoading(true);
    try {
      const res = await axios.post('/api/api-assistant/generate-code', {
        path,
        method: verb,
        scenarios: testScenarios
      });
      setGeneratedCode(res.data.code);
    } catch (err) {
      console.error(err);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleDownloadJava = () => {
    if (!generatedCode) return;

    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Determine class name
    const cleanPath = (selectedEndpoint?.path || endpoint)
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    const cleanMethod = (selectedEndpoint?.method || method).charAt(0).toUpperCase() + (selectedEndpoint?.method || method).slice(1).toLowerCase();
    const className = `${cleanPath}${cleanMethod}Test.java`;

    const link = document.createElement('a');
    link.href = url;
    link.download = className;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('RestAssured Java code downloaded successfully!', 'success');
  };

  const handleSaveCollection = async () => {
    try {
      setLoading(true);
      const path = selectedEndpoint?.path || endpoint;
      const verb = selectedEndpoint?.method || method;

      await axios.post('/api/api-assistant/save-collection', {
        name: `Suite for ${verb} ${path}`,
        endpoint: path,
        method: verb,
        swaggerSpec: swaggerFile ? swaggerFile.name : 'Manual Entry',
        testScenarios: scenarios,
        codeGenerated: generatedCode
      });

      showNotification('API collection suite saved to database!', 'success');
      fetchCollections();
    } catch (err) {
      console.error(err);
      showNotification('Failed to save API collection', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Input Methods panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Manual Entry */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Manual Endpoint Setup</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
              <select 
                value={method} 
                onChange={(e) => setMethod(e.target.value)} 
                className="input-field"
                style={{ width: '120px', fontWeight: 700 }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              
              <input 
                type="text" 
                placeholder="e.g. /api/v1/users" 
                className="input-field" 
                value={endpoint} 
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => {
                setSelectedEndpoint(null);
                handleAnalyzeEndpoint(endpoint, method);
              }}
              className="btn btn-primary"
              disabled={loading}
            >
              <Sparkles size={16} />
              <span>{loading ? 'Analyzing Endpoint...' : 'Analyze Endpoint'}</span>
            </button>
          </div>

          {/* Swagger Upload */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Upload Swagger / OpenAPI</h3>
            
            <label className="btn btn-secondary" style={{ borderStyle: 'dashed', borderWidth: '2px', display: 'flex', flexDirection: 'column', padding: '1.5rem', cursor: 'pointer', textAlign: 'center' }}>
              <Upload size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ingest Contract spec (.json, .yaml)</span>
              <input type="file" accept=".json,.yaml,.yml" style={{ display: 'none' }} onChange={handleSwaggerUpload} />
            </label>
            
            {swaggerFile && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 600 }}>
                Selected: {swaggerFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Parsed endpoints from contract */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            <span>Contract Endpoints ({parsedEndpoints.length})</span>
          </h3>

          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {parsedEndpoints.length > 0 ? (
              parsedEndpoints.map((ep, idx) => {
                const isSelected = selectedEndpoint?.path === ep.path && selectedEndpoint?.method === ep.method;
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setSelectedEndpoint(ep);
                      handleAnalyzeEndpoint(ep.path, ep.method);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge badge-${
                        ep.method === 'GET' ? 'success' : 
                        ep.method === 'POST' ? 'info' : 
                        ep.method === 'PUT' ? 'warning' : 'danger'
                      }`} style={{ width: '64px', textAlign: 'center', justifyContent: 'center' }}>
                        {ep.method}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{ep.path}</span>
                    </div>
                    {isSelected && <Check size={16} style={{ color: 'var(--primary)' }} />}
                  </div>
                );
              })
            ) : (
              <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                Upload Swagger or OpenAPI document to view and generate code for endpoints automatically.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code generation preview and validation scenarios */}
      {scenarios.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
          
          {/* Validation scenarios */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Test Validation Scenarios</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scenarios.map((sc, idx) => (
                <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className={`badge badge-${
                      sc.type === 'Positive' ? 'success' : 
                      sc.type === 'Negative' ? 'danger' : 'warning'
                    }`}>
                      {sc.type}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Expected status: {sc.expectedStatus}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {sc.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Code generated panel */}
          <div className="card panel-glass" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>RestAssured Code Preview</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleSaveCollection} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Save size={14} />
                  <span>Save Suite</span>
                </button>
                <button onClick={handleDownloadJava} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} disabled={!generatedCode}>
                  <Download size={14} />
                  <span>Download .java</span>
                </button>
              </div>
            </div>

            <div style={{ flexGrow: 1, position: 'relative' }}>
              {codeLoading ? (
                <div style={{ display: 'flex', height: '240px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  Generating RestAssured Java test suite...
                </div>
              ) : (
                <pre style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  maxHeight: '320px',
                  textAlign: 'left',
                  border: '1px solid var(--border-color)',
                  whiteSpace: 'pre-wrap'
                }}>
                  <code>{generatedCode || '// Select or analyze an endpoint to generate code.'}</code>
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Collections */}
      <div className="card">
        <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Saved API Collections</h4>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Endpoint</th>
                <th>Method</th>
                <th>Contract Src</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collections.length > 0 ? (
                collections.map(col => (
                  <tr key={col.id}>
                    <td>#{col.id}</td>
                    <td style={{ fontWeight: 600 }}>{col.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{col.endpoint}</td>
                    <td>
                      <span className={`badge badge-${
                        col.method === 'GET' ? 'success' : 
                        col.method === 'POST' ? 'info' : 
                        col.method === 'PUT' ? 'warning' : 'danger'
                      }`}>
                        {col.method}
                      </span>
                    </td>
                    <td>{col.swagger_spec}</td>
                    <td>{new Date(col.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => {
                          setEndpoint(col.endpoint);
                          setMethod(col.method);
                          setGeneratedCode(col.code_generated);
                          
                          try {
                            const parsedScenarios = JSON.parse(col.test_scenarios);
                            setScenarios(parsedScenarios);
                          } catch (e) {
                            setScenarios([]);
                          }
                          
                          showNotification('API collection suite loaded', 'info');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No saved API test collections found.
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

export default ApiAssistant;
