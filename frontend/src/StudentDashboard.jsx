import React, { useState, useEffect, useRef } from 'react';
import { BarChart2, ClipboardList, BookOpen, User, LogOut, Camera, Smile, CheckCircle2, Upload } from 'lucide-react';
import { useAuth } from './AuthContext';
import api from './api';
import Webcam from 'react-webcam';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [toast, setToast] = useState(null);
  const [faceUploading, setFaceUploading] = useState(false);
  const webcamRef = useRef(null);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '', email: user?.email || '', password: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    try {
      const [pRes, ecRes, acRes, aRes] = await Promise.all([
        api.get('/api/student/profile'),
        api.get('/api/student/courses'),
        api.get('/api/student/courses/available'),
        api.get('/api/student/attendance'),
      ]);
      setProfile(pRes.data);
      setEnrolledCourses(ecRes.data);
      setAvailableCourses(acRes.data);
      setAttendance(aRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleEnroll = async (courseId) => {
    try {
      await api.post(`/api/student/courses/${courseId}/enroll`);
      showToast('Enrolled successfully!');
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to enroll', 'error');
    }
  };

  const handleUnenroll = async (courseId) => {
    try {
      await api.delete(`/api/student/courses/${courseId}/unenroll`);
      showToast('Unenrolled successfully!');
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to unenroll', 'error');
    }
  };

  const handleFaceCaptureWebcam = async () => {
    if (!webcamRef.current) return;
    const imgSrc = webcamRef.current.getScreenshot();
    if (!imgSrc) return;

    setFaceUploading(true);
    try {
      const blob = await fetch(imgSrc).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', blob, 'face.jpg');

      const res = await api.post('/api/student/face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(res.data.message || 'Face registered successfully!');
      setShowFaceModal(false);
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Face registration failed. Please try again.', 'error');
    } finally {
      setFaceUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      return showToast('Passwords do not match', 'error');
    }
    setSavingProfile(true);
    try {
      await api.put('/api/auth/profile', {
        full_name: profileForm.full_name,
        email: profileForm.email,
        password: profileForm.password || undefined
      });
      showToast('Profile updated!');
      window.location.reload(); 
    } catch (err) {
      showToast(err.response?.data?.detail || 'Update failed', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setSavingProfile(true);
    try {
      const res = await api.post('/api/auth/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Profile picture updated!');
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Upload failed', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    setSavingProfile(true);
    try {
      await api.delete('/api/auth/profile/picture');
      showToast('Profile picture removed!');
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Delete failed', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!profile) return <div className="spinner" style={{ margin: '100px auto' }}></div>;

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand" onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
            <div className="brand-icon">TP</div>
            <div className="brand-text">Tech<span>Phantom</span></div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <span className="nav-icon"><BarChart2 size={18} /></span> Overview
          </button>
          <button className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
            <span className="nav-icon"><ClipboardList size={18} /></span> My Attendance
          </button>
          <button className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            <span className="nav-icon"><BookOpen size={18} /></span> My Courses
          </button>
          <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="nav-icon"><User size={18} /></span> Profile
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-badge" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 16, border: 'none', background: 'transparent' }}>
            <button className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start', border: 'none', gap: 8 }} onClick={logout}>
               <LogOut size={16} /> 
               Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
           <div style={{ display: 'flex', gap: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <div><strong style={{color: 'var(--text-primary)'}}>Student Portal</strong><br/>{new Date().toLocaleDateString()}</div>
           </div>
           <div 
             style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
             onClick={() => setActiveTab('profile')}
           >
              {user?.profile_picture ? (
                <img src={api.defaults.baseURL + user.profile_picture} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-light)' }} />
              ) : (
                <div className="user-avatar" style={{width: 32, height: 32}}>{initials}</div>
              )}
              <span style={{ fontWeight: 600 }}>{user?.full_name}</span>
           </div>
        </div>

        {toast && (
          <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2000 }}>
            <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="animate-in grid grid-3">
            <div className="card" style={{ padding: 24, gridColumn: 'span 2' }}>
               <h2 style={{ marginBottom: 8 }}>Welcome back, {user?.full_name.split(' ')[0]}!</h2>
               <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Here's your attendance summary.</p>
               
               <div className="flex gap-lg" style={{ marginBottom: 32 }}>
                  <div style={{ flex: 1, padding: 20, background: 'var(--bg-input)', borderRadius: 16 }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Attendance Rate</div>
                     <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{profile.attendance_rate}%</div>
                  </div>
                  <div style={{ flex: 1, padding: 20, background: 'var(--bg-input)', borderRadius: 16 }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Attended Sessions</div>
                     <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{profile.attended_sessions} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>/ {profile.total_sessions}</span></div>
                  </div>
               </div>

               <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 20, background: profile.has_face ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 16 }}>
                  <div style={{ fontSize: '2rem', display: 'flex' }}>{profile.has_face ? <Smile size={36} /> : <Camera size={36} />}</div>
                  <div style={{ flex: 1 }}>
                     <h4 style={{ color: profile.has_face ? 'var(--success)' : 'var(--danger)', marginBottom: 4 }}>
                        {profile.has_face ? 'Face Data Registered' : 'Face Data Missing'}
                     </h4>
                     <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                        {profile.has_face ? 'You are ready to use the automated attendance kiosks.' : 'You must register your face to use the automated attendance kiosks.'}
                     </p>
                  </div>
                  {!profile.has_face && (
                     <button className="btn btn-danger" onClick={() => setShowFaceModal(true)}>
                        Register Now
                     </button>
                  )}
               </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
               <h3 style={{ marginBottom: 20 }}>Recent Attendance</h3>
               <div className="flex-col gap-sm">
                  {attendance.slice(0, 4).map(log => (
                     <div key={log.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                           <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.course_code}</span>
                           <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>• {log.status}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}</span>
                     </div>
                  ))}
                  {attendance.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 20, fontSize: '0.9rem' }}>No attendance records yet</div>}
               </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="animate-in card" style={{ padding: 0 }}>
             <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3>My Attendance History</h3>
             </div>
             {attendance.length === 0 ? (
               <div className="empty-state">
                  <div className="empty-icon"><ClipboardList size={48} /></div>
                  <h3>No attendance recorded</h3>
               </div>
             ) : (
               <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                  <table>
                     <thead>
                        <tr>
                           <th>Date & Time</th>
                           <th>Course</th>
                           <th>Status</th>
                           <th>Confidence</th>
                        </tr>
                     </thead>
                     <tbody>
                        {attendance.map(a => (
                           <tr key={a.id}>
                              <td>{new Date(a.timestamp).toLocaleString()}</td>
                              <td><strong style={{marginRight: 8}}>{a.course_code}</strong> {a.course_name}</td>
                              <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>• {a.status}</span></td>
                              <td>{a.confidence ? `${(a.confidence * 100).toFixed(1)}%` : '—'}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
             )}
          </div>
        )}

        {/* COURSES */}
        {activeTab === 'courses' && (
          <div className="animate-in">
             <div style={{ marginBottom: 40 }}>
                <h3 style={{ marginBottom: 20 }}>My Enrolled Courses</h3>
                {enrolledCourses.length === 0 ? (
                   <p style={{ color: 'var(--text-muted)' }}>You are not enrolled in any courses yet.</p>
                ) : (
                   <div className="grid grid-3">
                      {enrolledCourses.map(c => (
                         <div key={c.id} className="card" style={{ padding: 24, borderTop: '4px solid var(--primary)' }}>
                            <div className="badge badge-primary mb-sm">{c.course_code}</div>
                            <h3 style={{ marginBottom: 4 }}>{c.course_name}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>{c.description}</p>
                            <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                               <span style={{ fontSize: '0.85rem' }}>Attendance</span>
                               <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>{c.attendance_rate}%</span>
                            </div>
                            <button className="btn btn-ghost btn-block btn-sm" onClick={() => handleUnenroll(c.id)}>Unenroll</button>
                         </div>
                      ))}
                   </div>
                )}
             </div>

             <div>
                <h3 style={{ marginBottom: 20 }}>Available Courses</h3>
                <div className="grid grid-3">
                   {availableCourses.filter(c => !c.enrolled).map(c => (
                      <div key={c.id} className="card" style={{ padding: 24 }}>
                         <div className="badge badge-info mb-sm">{c.course_code}</div>
                         <h3 style={{ marginBottom: 4 }}>{c.course_name}</h3>
                         <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>{c.description}</p>
                         <button className="btn btn-primary btn-block btn-sm" onClick={() => handleEnroll(c.id)}>+ Enroll Now</button>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <div className="animate-in flex-col gap-lg" style={{ maxWidth: 800 }}>
             <div className="card" style={{ padding: 40 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 2fr', gap: 40, alignItems: 'flex-start' }}>
                   {/* Avatar Section */}
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                      <div style={{ position: 'relative' }}>
                        {user?.profile_picture ? (
                          <img src={api.defaults.baseURL + user.profile_picture} alt="Profile" style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--border-light)' }} />
                        ) : (
                          <div style={{ width: 140, height: 140, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 800 }}>
                            {initials}
                          </div>
                        )}
                        <label htmlFor="profile-upload" style={{ position: 'absolute', bottom: 5, right: 5, background: 'var(--success)', color: 'white', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid white', boxShadow: 'var(--shadow-md)' }}>
                           <Camera size={16} />
                           <input id="profile-upload" type="file" hidden accept="image/*" onChange={handleProfilePictureUpload} disabled={savingProfile} />
                        </label>
                        {user?.profile_picture && (
                          <button 
                            type="button"
                            onClick={handleDeleteProfilePicture}
                            style={{ position: 'absolute', top: 5, right: 5, background: 'var(--danger)', color: 'white', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white', boxShadow: 'var(--shadow-md)', padding: 0 }}
                            title="Remove Picture"
                          >
                             <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                         <h3 style={{ marginBottom: 4 }}>{user?.full_name}</h3>
                         <span className="badge badge-primary">{user?.role}</span>
                      </div>
                   </div>

                   {/* Info Form */}
                   <div style={{ flex: 1 }}>
                      <h2 style={{ marginBottom: 24 }}>Profile Settings</h2>
                      <form onSubmit={handleUpdateProfile} className="flex-col gap-md">
                         <div className="grid grid-2">
                            <div className="input-group">
                               <label>Full Name</label>
                               <input className="input" value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} required />
                            </div>
                            <div className="input-group">
                               <label>Email Address</label>
                               <input type="email" className="input" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} required />
                            </div>
                         </div>
                         
                         <div className="grid grid-2">
                            <div className="input-group">
                               <label>Roll Number</label>
                               <input className="input" defaultValue={profile.roll_number} disabled />
                            </div>
                            <div className="input-group">
                               <label>Department</label>
                               <input className="input" defaultValue={profile.department} disabled />
                            </div>
                         </div>

                         <div style={{ padding: '24px 0', borderTop: '1px solid var(--border-light)', marginTop: 20 }}>
                            <h3 style={{ marginBottom: 16 }}>Change Password</h3>
                            <div className="grid grid-2">
                               <div className="input-group">
                                  <label>New Password</label>
                                  <input type="password" placeholder="Leave blank to keep current" className="input" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} />
                               </div>
                               <div className="input-group">
                                  <label>Confirm Password</label>
                                  <input type="password" placeholder="Confirm new password" className="input" value={profileForm.confirmPassword} onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})} />
                               </div>
                            </div>
                         </div>

                         <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                            <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px' }} disabled={savingProfile}>
                               {savingProfile ? 'Saving...' : 'Save Changes'}
                            </button>
                         </div>
                      </form>

                      <div style={{ marginTop: 40, padding: 24, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-input)' }}>
                        <h4 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                           Face Recognition Data
                           {profile.has_face && <span style={{ color: 'var(--success)', display: 'flex' }}><CheckCircle2 size={20} /></span>}
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                           {profile.has_face 
                              ? 'Your face profile is currently active.'
                              : 'You have not registered your face data yet.'}
                        </p>
                        <button className={`btn ${profile.has_face ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowFaceModal(true)}>
                           <Camera size={18} style={{marginRight: 8}} /> {profile.has_face ? 'Update Face Profile' : 'Register Face Profile'}
                        </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Face Registration Modal */}
      {showFaceModal && (
         <div className="modal-overlay" onClick={() => !faceUploading && setShowFaceModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
               <h2 style={{ marginBottom: 8 }}>Scan Your Face</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                  Look directly at the camera. Ensure you are in a well-lit area.
               </p>
               <div style={{ borderRadius: 12, overflow: 'hidden', border: '2px solid var(--border)', marginBottom: 20 }}>
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" videoConstraints={{ facingMode: 'user', width: 480, height: 360 }} />
               </div>
               <button className="btn btn-primary btn-block btn-lg" onClick={handleFaceCaptureWebcam} disabled={faceUploading}>
                  {faceUploading ? 'Scanning...' : <span style={{display:'flex', alignItems:'center', justifyContent:'center', gap:8}}><Camera size={20}/> Capture Face</span>}
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default StudentDashboard;
