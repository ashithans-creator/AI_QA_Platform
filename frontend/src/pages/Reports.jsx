import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ChevronLeft, FileText, Terminal, Clock, 
  Calendar, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Reports = () => {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/executions/${id}`);
        setDetails(res.data);
      } catch (err) {
        console.error(err);
        showNotification('Failed to fetch execution run details', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Retrieving report details...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="card text-center" style={{ padding: '3rem' }}>
        <p>Execution run not found.</p>
        <Link to="/automation-run" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Runner</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header and overview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Link to="/automation-run" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
          <ChevronLeft size={16} />
          <span>Runner</span>
        </Link>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Inspection Report: Run #{details.id}</h3>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '10px', borderRadius: '8px' }}>
            <FileText size={20} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Suite Name</p>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{details.suite_name}</h4>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            backgroundColor: details.status === 'PASSED' ? 'var(--success-light)' : 'var(--danger-light)', 
            color: details.status === 'PASSED' ? 'var(--success)' : 'var(--danger)', 
            padding: '10px', 
            borderRadius: '8px' 
          }}>
            {details.status === 'PASSED' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Run Outcome</p>
            <span className={`badge badge-${details.status === 'PASSED' ? 'success' : 'danger'}`}>{details.status}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '10px', borderRadius: '8px' }}>
            <Clock size={20} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Duration</p>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{(details.duration / 1000).toFixed(2)}s</h4>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '10px', borderRadius: '8px' }}>
            <Calendar size={20} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Executed At</p>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{new Date(details.started_at).toLocaleString()}</h4>
          </div>
        </div>
      </div>

      {/* Grid detailing logs and histories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        
        {/* Terminal logs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '480px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <Terminal size={18} style={{ color: 'var(--primary)' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Console Output Trace</h4>
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
            textAlign: 'left'
          }}>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{details.logs || 'No log output recorded.'}</pre>
          </div>
        </div>

        {/* Specs Table */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '480px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Individual Test Specs
          </h4>

          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {details.history && details.history.length > 0 ? (
              details.history.map(test => (
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
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duration: {(test.duration / 1000).toFixed(2)}s</p>
                  
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
              <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No separate test specs parsed for this run.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
