import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { 
  Database, RefreshCw, Edit2, Check, X, Play, Loader, 
  Terminal, ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const DataDriven = () => {
  const [datasets, setDatasets] = useState({ loginData: [], checkoutData: [] });
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  // Inline editing state
  const [editDataset, setEditDataset] = useState(null); // 'loginData' or 'checkoutData'
  const [editIndex, setEditIndex] = useState(-1);
  const [editFormData, setEditFormData] = useState({});

  // Execution state
  const [activeExecId, setActiveExecId] = useState(null);
  const [executingRow, setExecutingRow] = useState(null); // { datasetType, index }
  const [consoleLogs, setConsoleLogs] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const [consoleStatus, setConsoleStatus] = useState('IDLE'); // IDLE, RUNNING, PASSED, FAILED

  const consoleEndRef = useRef(null);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/data-driven/datasets');
      setDatasets(res.data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load CSV datasets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Poll execution logs
  useEffect(() => {
    let interval;
    if (activeExecId) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/api/executions/${activeExecId}`);
          setConsoleLogs(res.data.logs || '');
          setConsoleStatus(res.data.status);
          if (res.data.status !== 'RUNNING' && res.data.status !== 'PENDING') {
            setActiveExecId(null);
            setExecutingRow(null);
            showNotification(`Data-driven test execution complete: ${res.data.status}`, res.data.status === 'PASSED' ? 'success' : 'error');
          }
        } catch (err) {
          console.error('Error polling execution:', err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeExecId]);

  // Scroll to bottom of console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  // Inline editing actions
  const startEdit = (datasetType, index, rowData) => {
    setEditDataset(datasetType);
    setEditIndex(index);
    setEditFormData({ ...rowData });
  };

  const cancelEdit = () => {
    setEditDataset(null);
    setEditIndex(-1);
    setEditFormData({});
  };

  const handleInputChange = (field, val) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const saveEdit = async (datasetType, index) => {
    try {
      const updatedRows = [...datasets[datasetType]];
      updatedRows[index] = editFormData;

      await axios.post('/api/data-driven/save', {
        datasetType,
        data: updatedRows
      });

      setDatasets(prev => ({
        ...prev,
        [datasetType]: updatedRows
      }));

      showNotification('Dataset saved successfully', 'success');
      cancelEdit();
    } catch (err) {
      console.error(err);
      showNotification('Failed to save dataset', 'error');
    }
  };

  // Row execution action
  const executeRow = async (datasetType, index, scenario) => {
    if (activeExecId) {
      showNotification('An execution is already running. Please wait.', 'warning');
      return;
    }

    try {
      setExecutingRow({ datasetType, index });
      setConsoleLogs('Initiating data-driven execution...\n');
      setConsoleStatus('RUNNING');
      setShowConsole(true);

      const res = await axios.post('/api/data-driven/execute', {
        datasetType,
        scenario
      });

      setActiveExecId(res.data.executionId);
      showNotification(`Triggered test for scenario: ${scenario}`, 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to trigger execution', 'error');
      setExecutingRow(null);
      setConsoleStatus('FAILED');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: showConsole ? '220px' : '2rem' }}>
      <div className="card panel-glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>CSV Data-Driven Testing</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Modify test parameters inline and execute individual scenarios immediately to see results.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {consoleLogs && (
              <button 
                onClick={() => setShowConsole(!showConsole)} 
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Terminal size={16} />
                <span>{showConsole ? 'Hide Console' : 'Show Console'}</span>
              </button>
            )}
            <button onClick={fetchDatasets} className="btn btn-secondary" disabled={loading || activeExecId}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      <DataTable 
        title="Login Data" 
        datasetType="loginData"
        rows={datasets.loginData} 
        editIndex={editDataset === 'loginData' ? editIndex : -1}
        editFormData={editFormData}
        executingRow={executingRow}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSaveEdit={saveEdit}
        onInputChange={handleInputChange}
        onExecuteRow={executeRow}
        isExecDisabled={!!activeExecId}
      />

      <DataTable 
        title="Checkout Data" 
        datasetType="checkoutData"
        rows={datasets.checkoutData} 
        editIndex={editDataset === 'checkoutData' ? editIndex : -1}
        editFormData={editFormData}
        executingRow={executingRow}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSaveEdit={saveEdit}
        onInputChange={handleInputChange}
        onExecuteRow={executeRow}
        isExecDisabled={!!activeExecId}
      />

      {/* Floating Console Drawer */}
      {showConsole && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '220px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid var(--border-color)',
          zIndex: 999,
          color: '#f8fafc',
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.2)'
        }}>
          {/* Console Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            background: 'rgba(30, 41, 59, 0.8)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600 }}>Live Playwright Test Output</span>
              <span className={`badge badge-${
                consoleStatus === 'PASSED' ? 'success' : 
                consoleStatus === 'FAILED' ? 'danger' : 
                consoleStatus === 'RUNNING' ? 'info' : 'warning'
              }`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                {consoleStatus}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {consoleStatus === 'RUNNING' && <Loader size={12} className="spin" />}
              <button 
                onClick={() => setShowConsole(false)} 
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Console Body */}
          <div style={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }}>
            {consoleLogs}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

const DataTable = ({ 
  title, 
  datasetType,
  rows, 
  editIndex,
  editFormData,
  executingRow,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onInputChange,
  onExecuteRow,
  isExecDisabled
}) => {
  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <Database size={18} style={{ color: 'var(--primary)' }} />
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h4>
        <span className="badge badge-info">{rows.length} rows</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No CSV rows found.</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Actions</th>
                {columns.map(column => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isEditing = editIndex === index;
                const isExecuting = executingRow && executingRow.datasetType === datasetType && executingRow.index === index;

                return (
                  <tr key={index}>
                    <td style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {isEditing ? (
                        <>
                          <button 
                            onClick={() => onSaveEdit(datasetType, index)} 
                            className="btn-icon" 
                            style={{ color: 'var(--success)' }}
                            title="Save changes"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={onCancelEdit} 
                            className="btn-icon" 
                            style={{ color: 'var(--danger)' }}
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => onStartEdit(datasetType, index, row)} 
                            className="btn-icon" 
                            style={{ color: 'var(--primary)' }}
                            title="Edit row"
                            disabled={isExecDisabled}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => onExecuteRow(datasetType, index, row.scenario)} 
                            className="btn-icon" 
                            style={{ color: isExecuting ? 'var(--info)' : 'var(--success)' }}
                            title="Run test case using this data row"
                            disabled={isExecDisabled || !row.scenario}
                          >
                            {isExecuting ? <Loader size={15} className="spin" /> : <Play size={15} fill="currentColor" />}
                          </button>
                        </>
                      )}
                    </td>
                    {columns.map(column => (
                      <td key={column} style={{ fontSize: '0.85rem' }}>
                        {isEditing && column !== 'scenario' ? (
                          <input 
                            type="text" 
                            className="form-control"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.85rem',
                              width: '100%',
                              minWidth: '100px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)'
                            }}
                            value={editFormData[column] || ''}
                            onChange={(e) => onInputChange(column, e.target.value)}
                          />
                        ) : (
                          row[column] || <em style={{ color: 'var(--text-muted)' }}>empty</em>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataDriven;
