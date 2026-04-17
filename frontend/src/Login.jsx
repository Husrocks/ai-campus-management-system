import React, { useState } from 'react';
import { Camera, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';

const Login = ({ onOpenGlobalKiosk }) => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student'); // 'student' or 'admin'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  const validateForm = () => {
    if (!email || !password) return "Email and password are required.";
    if (!isLogin && !fullName) return "Full name is required for registration.";
    if (!isLogin && role === 'student' && !rollNumber) return "Roll number is required for students.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Login Flow
        await login(email, password);
      } else {
        // Registration Flow
        const payload = {
          email,
          password,
          full_name: fullName,
          role,
          roll_number: role === 'student' ? rollNumber : undefined,
        };
        await register(payload);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Network error. Make sure the backend server is running.");
        console.error("Auth error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-card">
          <div className="login-brand" onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">T</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>Tech<span style={{ color: 'var(--primary)' }}>Phantom</span></div>
          </div>

          <h1 className="login-title">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="login-subtitle">
            {isLogin 
              ? 'Please enter your details to access your dashboard.' 
              : 'Sign up to get started with the attendance system.'}
          </p>

          {!isLogin && (
            <div className="role-selector" style={{ marginBottom: 24 }}>
              <div 
                className={`role-option ${role === 'student' ? 'selected' : ''}`}
                onClick={() => setRole('student')}
              >
                <div className="role-icon"><GraduationCap size={24} /></div>
                <div className="role-name">Student</div>
              </div>
              <div 
                className={`role-option ${role === 'admin' ? 'selected' : ''}`}
                onClick={() => setRole('admin')}
              >
                <div className="role-icon"><ShieldCheck size={24} /></div>
                <div className="role-name">Admin</div>
              </div>
            </div>
          )}

          {error && <div className="toast toast-error mb-md" style={{ background: 'var(--danger-bg)', border: 'none', color: 'var(--danger)' }}>{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="input-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            {!isLogin && role === 'student' && (
              <div className="input-group">
                <label>Roll Number</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. STU-1001"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="input" 
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                className="input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="view-toggle">
            {isLogin ? (
              <>Don't have an account? <span onClick={() => { setIsLogin(false); setError(''); }}>Sign up</span></>
            ) : (
              <>Already have an account? <span onClick={() => { setIsLogin(true); setError(''); }}>Sign in</span></>
            )}
          </div>
        </div>
      </div>
      <div className="login-right">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
           <button className="btn btn-success btn-lg" style={{ display:'flex', alignItems:'center', gap:8, padding: '16px 32px', borderRadius: 40, boxShadow: '0 8px 32px rgba(0, 210, 160, 0.4)', fontSize: '1.1rem', fontWeight: 700, margin: '0 auto' }} onClick={onOpenGlobalKiosk}>
              <Camera size={24} /> Launch Global Scanner
           </button>
           <p style={{ marginTop: 12, opacity: 0.8, fontSize: '0.9rem' }}>Open the student check-in kiosk without logging in.</p>
        </div>
        <h2 style={{ letterSpacing: '-0.03em' }}>Unmatched Precision in<br/>Face Recognition</h2>
        <p>TechPhantom NavTac provides a seamless, secure, and instant check-in experience. Powered by advanced AI models, it ensures that your identity is verified with 99.9% accuracy.</p>
      </div>
    </div>
  );
};

export default Login;
