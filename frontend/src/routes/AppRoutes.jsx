import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';

// Import Pages
import Dashboard from '../pages/Dashboard';
import TestGenerator from '../pages/TestGenerator';
import DefectReporter from '../pages/DefectReporter';
import ApiAssistant from '../pages/ApiAssistant';
import Execution from '../pages/Execution';
import DataDriven from '../pages/DataDriven';
import DbAssistant from '../pages/DbAssistant';
import Settings from '../pages/Settings';
import Reports from '../pages/Reports';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Protected Dashboard Shell Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/test-generator" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TestGenerator />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/defect-reporter" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DefectReporter />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/api-assistant" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ApiAssistant />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/automation-run" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Execution />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/data-driven" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DataDriven />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/db-assistant" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DbAssistant />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports/:id" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Reports />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
