import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import AdminShell from './pages/AdminShell';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Chat Router */}
          <Route path="/" element={<ChatPage />} />
          
          {/* Authentication Router */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Admin Protected Router */}
          <Route path="/admin/*" element={
            <ProtectedRoute requiredRole="admin">
              <AdminShell />
            </ProtectedRoute>
          } />
          
          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
