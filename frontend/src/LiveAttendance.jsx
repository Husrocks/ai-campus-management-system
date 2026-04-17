import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { ScanFace, Check, Info, AlertTriangle } from 'lucide-react';
import { API_BASE } from './api';

const LiveAttendance = ({ sessionId, onClose }) => {
  const webcamRef = useRef(null);
  const wsRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [faceData, setFaceData] = useState({ box: null, color: '#ff0000', label: '' });
  const [markedCount, setMarkedCount] = useState(0);
  const [totalEnrolled, setTotalEnrolled] = useState(0);
  const [error, setError] = useState('');
  
  const [courseOptions, setCourseOptions] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/attendance/' + sessionId;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      if (wsRef.current) wsRef.current.isProcessing = false;
      const data = JSON.parse(event.data);

      if (data.status === 'ready') {
        setSessionInfo(data);
        setTotalEnrolled(data.total_enrolled || 0);
        return;
      }

      if (data.status === 'error') {
        setError(data.message);
        return;
      }

      const isLive = sessionId === 'live';
      if (data.status === 'session_ended' && !isLive) {
        setError('Session has ended.');
        setIsConnected(false);
        return;
      }

      if (data.status === 'no_face') {
        setFaceData({ box: null, color: '#ff0000', label: '' });
        return;
      }
      
      if (data.status === 'multiple_courses') {
        setCourseOptions({
          student_id: data.student_id,
          student_name: data.student_name,
          courses: data.courses
        });
        setFaceData({ box: data.box, color: '#FFB020', label: 'Please select a course' });
        return;
      }

      if (data.status === 'success') {
        setCourseOptions(null);
        setFaceData({
          box: data.box,
          color: '#00D2A0',
          label: `${data.student_name} (${data.roll_number})`
        });
        setMarkedCount(data.marked_count || 0);
        setTotalEnrolled(data.total_enrolled || 0);
        setLogs(prev => [{
          name: data.student_name,
          roll: data.roll_number,
          confidence: data.confidence,
          time: new Date().toLocaleTimeString(),
          type: 'success'
        }, ...prev]);
      } else if (data.status === 'duplicate') {
        setCourseOptions(null);
        setFaceData({
          box: data.box,
          color: '#54A0FF',
          label: `${data.student_name} (Already Marked)`
        });
      } else if (data.status === 'unknown') {
        setFaceData({
          box: data.box,
          color: '#FF6B6B',
          label: 'Unknown Face'
        });
      }
    };

    let isCancelled = false;

    ws.onclose = () => {
      if (!isCancelled) setIsConnected(false);
    };
    
    ws.onerror = () => {
      if (!isCancelled) setError('WebSocket connection failed');
    };

    return () => {
      isCancelled = true;
      if (wsRef.current) wsRef.current.close();
    };
  }, [sessionId]);

  // Send frames
  useEffect(() => {
    let interval;
    if (isConnected && sessionInfo && !courseOptions) {
      interval = setInterval(() => {
        if (webcamRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          if (wsRef.current.isProcessing) return; // Wait for backend response loop hole fix
          wsRef.current.isProcessing = true;
          
          const imgSrc = webcamRef.current.getScreenshot();
          if (imgSrc) {
            fetch(imgSrc).then(r => r.blob()).then(blob => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                 wsRef.current.send(blob);
              }
            }).catch(() => {
              if (wsRef.current) wsRef.current.isProcessing = false;
            });
          } else {
            wsRef.current.isProcessing = false;
          }
        }
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isConnected, sessionInfo, courseOptions]);

  const handleSelectCourse = (courseId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && courseOptions) {
      wsRef.current.send(JSON.stringify({
        action: 'select_course',
        student_id: courseOptions.student_id,
        course_id: courseId
      }));
      setCourseOptions(null); // Wait for success response
    }
  };

  return (
    <div className="scanner-kiosk">
      <div className="scanner-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, background: 'rgba(255,255,255,0.05)', 
            borderRadius: 12, display: 'flex', alignItems: 'center', 
            justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <ScanFace size={24} />
          </div>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: 1 }}>TechPhantom</span>
          </div>
        </div>
        <button className="btn btn-danger" onClick={onClose} style={{ borderRadius: 30, padding: '8px 24px' }}>
          {sessionId === 'live' ? 'Close Scanner' : 'Stop Session'}
        </button>
      </div>

      <div className="scanner-body">
        <div className="scanner-info">
          <h1>AI Face Recognition<br/><span>Attendance System</span></h1>
          <p>
            {sessionInfo ? (sessionId === 'live' ? 'Global Scan Active Target: All Enrolled Students' : `${sessionInfo.course_name} • Session Active`) : `Connecting to Scanner...`}
          </p>
          
          <div className="scanner-features">
            <div className="scanner-feature">
              <div className="icon"><Check size={18}/></div>
              <span>Real-time Detection</span>
            </div>
            <div className="scanner-feature">
              <div className="icon"><Check size={18}/></div>
              <span>99.9% Accuracy</span>
            </div>
            <div className="scanner-feature">
              <div className="icon"><Check size={18}/></div>
              <span>Secure & Private</span>
            </div>
          </div>
          
          <div style={{ marginTop: 40, padding: '16px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', flexDirection: 'column' }}>
             <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Attendance Progress</span>
             <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00b87c' }}>{markedCount} {sessionId !== 'live' && `/ ${totalEnrolled}`}</span>
          </div>
        </div>

        <div className="scanner-frame-wrapper">
          <div className="scanner-corners"><span /></div>
          
          <div className="scanner-frame">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              videoConstraints={{ width: 500, height: 500, facingMode: 'user' }}
            />
            {isConnected && sessionInfo && !courseOptions && <div className="scanner-scanline" />}
            
            {/* Face Box */}
            {faceData.box && (
              <div style={{
                position: 'absolute',
                border: `3px solid ${faceData.color}`,
                borderRadius: '8px',
                boxShadow: `0 0 12px ${faceData.color}44`,
                top: `${faceData.box[0]}px`,
                height: `${faceData.box[2] - faceData.box[0]}px`,
                left: `${faceData.box[3]}px`,
                width: `${faceData.box[1] - faceData.box[3]}px`,
                transition: 'all 0.15s ease',
                zIndex: 10,
                pointerEvents: 'none'
              }}>
                <span style={{
                  position: 'absolute', top: -32, left: -3,
                  backgroundColor: faceData.color,
                  color: 'white',
                  padding: '4px 12px', borderRadius: 20,
                  fontSize: '0.8rem', fontWeight: 700,
                  whiteSpace: 'nowrap', fontFamily: 'var(--font)'
                }}>
                  {faceData.label}
                </span>
              </div>
            )}

            {!sessionInfo && !error && (
              <div className="scanner-overlay">
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4, borderTopColor: '#4facfe' }} />
                <span style={{ marginTop: 24, fontSize: '1.1rem', fontWeight: 600, letterSpacing: 1 }}>CONNECTING...</span>
              </div>
            )}

            {error && (
              <div className="scanner-overlay">
                <h3 style={{ color: '#ff5e5e', marginBottom: 8, fontSize: '1.5rem' }}>Error</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 300 }}>{error}</p>
                <button className="btn btn-ghost" style={{ marginTop: 20, color: 'white' }} onClick={onClose}>Dismiss</button>
              </div>
            )}

            {courseOptions && (
              <div className="scanner-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
                <h3 style={{ color: 'white', marginBottom: 16 }}>Select Course</h3>
                <p style={{ color: '#ccc', marginBottom: 24 }}>Welcome {courseOptions.student_name}. Which course's attendance do you want to mark?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
                   {courseOptions.courses.map(c => (
                     <button key={c.id} className="btn btn-primary btn-lg" onClick={() => handleSelectCourse(c.id)}>
                        {c.course_code} - {c.course_name}
                     </button>
                   ))}
                </div>
                <button className="btn btn-ghost" style={{ marginTop: 24, color: 'white' }} onClick={() => setCourseOptions(null)}>Cancel</button>
              </div>
            )}

          </div>
          
          <div className="scanner-status">
            {isConnected && sessionInfo ? (courseOptions ? 'Waiting for Selection...' : 'Scanning Active') : 'Waiting...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAttendance;