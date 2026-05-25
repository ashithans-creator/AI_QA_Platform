import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Activity, Award, Bug, CheckCircle2, Clock, 
  AlertTriangle
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Dashboard = () => {
  const { showNotification } = useNotification();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);


  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/executions/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      showNotification('Failed to fetch dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Loading metrics...</p>
      </div>
    );
  }

  // Fallback metrics in case db is empty
  const executionSummary = metrics?.executions || { total: 0, passed: 0, failed: 0, running: 0 };
  const defectSummary = metrics?.defects || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, severityBreakdown: [] };
  const recentRuns = metrics?.recentExecutions || [];

  const passRate = executionSummary.total > 0 
    ? Math.round((executionSummary.passed / (executionSummary.passed + executionSummary.failed)) * 100) 
    : 100;

  // Recharts Formats
  const executionPieData = [
    { name: 'Passed', value: executionSummary.passed, color: 'var(--success)' },
    { name: 'Failed', value: executionSummary.failed, color: 'var(--danger)' },
    { name: 'Running', value: executionSummary.running, color: 'var(--primary)' }
  ].filter(d => d.value > 0);

  // Default display if no data
  if (executionPieData.length === 0) {
    executionPieData.push({ name: 'No Executions', value: 1, color: 'var(--text-muted)' });
  }

  const severityChartData = defectSummary.severityBreakdown.map(s => ({
    name: s.severity,
    count: s.count
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        {/* KPI 1 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: '10px' }}>
            <Activity size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Total Executions</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{executionSummary.total}</h4>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '12px', borderRadius: '10px' }}>
            <Award size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Execution Pass Rate</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{passRate}%</h4>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px', borderRadius: '10px' }}>
            <Bug size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Active Defects</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{defectSummary.open + defectSummary.inProgress}</h4>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '12px', borderRadius: '10px' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Avg Step Pass Rate</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {metrics?.testSteps?.total > 0 
                ? Math.round((metrics.testSteps.passed / metrics.testSteps.total) * 100) 
                : 100}%
            </h4>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        
        {/* Execution Distribution Chart */}
        <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Runs Outcome Distribution</h4>
          <div style={{ flexGrow: 1, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={executionPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {executionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Severity Chart */}
        <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Defect Severity Breakdown</h4>
          <div style={{ flexGrow: 1 }}>
            {severityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'var(--bg-tertiary)' }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name === 'Critical' ? 'var(--danger)' : 
                              entry.name === 'Major' ? 'var(--warning)' : 
                              'var(--primary)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '80%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No active defects reported.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution Run Log */}
      <div className="card">
        <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Execution History</h4>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Suite</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Executed At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.length > 0 ? (
                recentRuns.map(run => (
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
                      <a 
                        href={`#/reports/${run.id}`} 
                        style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        Inspect Logs
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No execution records found. Run a test suite above!
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

export default Dashboard;
