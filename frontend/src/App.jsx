import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';
import LiveAttendance from './LiveAttendance';
import SystemDiagnostics from './SystemDiagnostics';

function AppContent() {
  const { user, loading } = useAuth();
  const [kioskSessionId, setKioskSessionId] = useState(null);

  if (window.location.pathname === '/diagnostic-logs') {
    return <SystemDiagnostics onBack={() => window.location.href = '/'} />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16
      }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading...</span>
      </div>
    );
  }

  if (!user && !kioskSessionId) {
    return <Login onOpenGlobalKiosk={() => setKioskSessionId('live')} />;
  }

  // Live Attendance Kiosk overlay
  if (kioskSessionId) {
    return (
      <LiveAttendance
        sessionId={kioskSessionId}
        onClose={() => setKioskSessionId(null)}
      />
    );
  }

  if (user.role === 'admin') {
    return <AdminDashboard onOpenKiosk={(id) => setKioskSessionId(id)} />;
  }

  return <StudentDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;