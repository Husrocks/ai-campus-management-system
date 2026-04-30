import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BarChart2, ClipboardList, GraduationCap, BookOpen, LogOut, Camera, Trash2, Download, CheckCircle2, XCircle, TrendingUp, Users, Activity, User, Upload } from 'lucide-react';
import { useAuth } from './AuthContext';
import api from './api';
import Webcam from 'react-webcam';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const AdminDashboard = ({ onOpenKiosk }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedCourseChart, setSelectedCourseChart] = useState('all');
  const [toast, setToast] = useState(null);

  // Forms
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ course_code: '', course_name: '', description: '' });
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionCourseId, setSessionCourseId] = useState('');

  // Profile
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '', email: user?.email || '', password: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Modals
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [studentForm, setStudentForm] = useState({ full_name: '', roll_number: '', email: '', password: '', department: '', phone: '', course_ids: [] });
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingCourse, setEditingCourse] = useState(null);
  const [faceStudent, setFaceStudent] = useState(null);
  const [faceUploading, setFaceUploading] = useState(false);
  const webcamRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, stRes, cRes, sesRes, aRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/students'),
        api.get('/api/admin/courses'),
        api.get('/api/admin/sessions'),
        api.get('/api/admin/attendance'),
      ]);
      setStats(sRes.data);
      setStudents(stRes.data);
      setCourses(cRes.data);
      setSessions(sesRes.data);
      setAttendance(aRes.data);
    } catch (err) {
      console.error('Admin fetch error:', err);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Actions ---
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/courses', courseForm);
      showToast('Course created!');
      setCourseForm({ course_code: '', course_name: '', description: '' });
      setShowCourseForm(false);
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create course', 'error');
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/admin/courses/${editingCourse.id}`, editingCourse);
      showToast('Course updated!');
      setEditingCourse(null);
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update course', 'error');
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course? This will remove all associated sessions and attendance records.")) return;
    try {
      await api.delete(`/api/admin/courses/${id}`);
      showToast('Course deleted!');
      fetchAll();
    } catch(err) {
      showToast(err.response?.data?.detail || 'Failed to delete course', 'error');
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/students', studentForm);
      showToast('Student created successfully!');
      setShowStudentForm(false);
      setStudentForm({ full_name: '', roll_number: '', email: '', password: '', department: '', phone: '', course_ids: [] });
      fetchAll();
    } catch (err) {
       showToast(err.response?.data?.detail || 'Failed to create student', 'error');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/admin/students/${editingStudent.id}`, editForm);
      showToast('Student updated!');
      setEditingStudent(null);
      fetchAll();
    } catch (err) {
       showToast(err.response?.data?.detail || 'Failed to update student', 'error');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/students/${id}`);
      showToast('Student deleted!');
      fetchAll();
    } catch(err) {
      showToast(err.response?.data?.detail || 'Failed to delete student', 'error');
    }
  };

  const handleCourseSelection = (courseId, formSetter) => {
    formSetter(prev => {
      const isSelected = prev.course_ids?.includes(courseId);
      if (isSelected) return { ...prev, course_ids: prev.course_ids.filter(id => id !== courseId) };
      return { ...prev, course_ids: [...(prev.course_ids || []), courseId] };
    });
  };

  const handleStartSession = async (course_id) => {
    if (!course_id) return;
    try {
      const res = await api.post('/api/admin/sessions', { course_id: parseInt(course_id) });
      showToast(`Face Scanner session started for ${res.data.course_name}!`);
      setShowSessionForm(false);
      setSessionCourseId('');
      fetchAll();
      onOpenKiosk(res.data.session_id); // Auto open Kiosk
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to start session', 'error');
    }
  };

  const handleEndSession = async (sessionId, action) => {
    try {
      await api.put(`/api/admin/sessions/${sessionId}?action=${action}`);
      showToast(`Session ${action}d.`);
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Action failed', 'error');
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
      const res = await api.post(`/api/admin/students/${faceStudent.id}/face`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(res.data.message || 'Face registered!');
      setFaceStudent(null);
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Face registration failed. Please ensure the face is clearly visible.', 'error');
    } finally {
      setFaceUploading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (attendance.length === 0) return showToast('No attendance records to export', 'error');
    
    const headers = ['Student Name', 'Roll Number', 'Course Code', 'Course Name', 'Check Time', 'Status', 'Confidence'];
    const rows = attendance.map(r => [
      `"${r.student_name}"`,
      `"${r.roll_number}"`,
      `"${r.course_code}"`,
      `"${r.course_name}"`,
      `"${new Date(r.timestamp).toLocaleString()}"`,
      `"${r.status}"`,
      `${r.confidence ? (r.confidence * 100).toFixed(0) + '%' : ''}`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      // Update local storage/context if needed, or just re-fetch me
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

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  // Real-time chart data from fetched attendance
  const chartData = useMemo(() => {
    if (!attendance || attendance.length === 0) return [];
    
    // Filter attendance if a specific course is selected
    const filteredAttendance = selectedCourseChart === 'all' 
      ? attendance 
      : attendance.filter(rec => rec.course_code === selectedCourseChart);

    const counts = {};

    if (selectedCourseChart === 'all') {
      // Group by course code for overview
      filteredAttendance.forEach(rec => {
        if (!counts[rec.course_code]) {
          counts[rec.course_code] = { OnTime: 0, Late: 0 };
        }
        if (rec.status === 'present' || rec.status === 'On Time') {
          counts[rec.course_code].OnTime += 1;
        } else {
          counts[rec.course_code].Late += 1;
        }
      });

      return Object.keys(counts).map(code => ({
        name: code,
        OnTime: counts[code].OnTime,
        Late: counts[code].Late
      }));
    } else {
      // Group by Date for specific course to show trends
      filteredAttendance.forEach(rec => {
        const date = new Date(rec.timestamp).toLocaleDateString();
        if (!counts[date]) {
          counts[date] = { OnTime: 0, Late: 0 };
        }
        if (rec.status === 'present' || rec.status === 'On Time') {
          counts[date].OnTime += 1;
        } else {
          counts[date].Late += 1;
        }
      });

      // Sort dates
      return Object.keys(counts).sort((a, b) => new Date(a) - new Date(b)).map(date => ({
        name: date,
        OnTime: counts[date].OnTime,
        Late: counts[date].Late
      }));
    }
  }, [attendance, selectedCourseChart]);

  const pieChartData = useMemo(() => {
    if (!attendance || attendance.length === 0) return [];
    const counts = { OnTime: 0, Late: 0 };
    attendance.forEach(rec => {
      if (rec.status === 'present' || rec.status === 'On Time') counts.OnTime++;
      else counts.Late++;
    });
    return [
      { name: 'On-Time', value: counts.OnTime, color: 'var(--success)' },
      { name: 'Late', value: counts.Late, color: 'var(--secondary)' }
    ].filter(d => d.value > 0);
  }, [attendance]);

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
            <span className="nav-icon"><BarChart2 size={18} /></span> Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
            <span className="nav-icon"><ClipboardList size={18} /></span> Attendance List
          </button>
          <button className={`nav-item ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            <span className="nav-icon"><GraduationCap size={18} /></span> Students
          </button>
          <button className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            <span className="nav-icon"><BookOpen size={18} /></span> Courses
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
      <div className="main-content" style={{ background: 'var(--bg-primary)' }}>
        {/* Top Navbar Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
           <div style={{ display: 'flex', gap: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <div><strong style={{color: 'var(--text-primary)'}}>Attendance</strong><br/>{new Date().toLocaleDateString()}</div>
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
          <div className="animate-in flex-col gap-lg">
            
            {/* 1. TOP METRICS ROW */}
            <div className="grid grid-4 mb-lg">
               <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff, #f8f9ff)', borderLeft: '4px solid var(--primary)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="stat-label">Total Students</div>
                      <div className="stat-value">{stats.total_students || 0}</div>
                    </div>
                    <div className="stat-icon" style={{ background: 'rgba(72, 76, 218, 0.1)', color: 'var(--primary)' }}><Users size={20}/></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <TrendingUp size={12}/> <span>System Active</span>
                  </div>
               </div>

               <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff, #fefaff)', borderLeft: '4px solid var(--secondary)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="stat-label">Active Courses</div>
                      <div className="stat-value">{stats.total_courses || 0}</div>
                    </div>
                    <div className="stat-icon" style={{ background: 'rgba(15, 201, 231, 0.1)', color: 'var(--secondary)' }}><BookOpen size={20}/></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    {stats.active_sessions || 0} Ongoing Sessions
                  </div>
               </div>

               <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff, #f7fffb)', borderLeft: '4px solid var(--success)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="stat-label">Face Registration</div>
                      <div className="stat-value">
                        {stats.total_students > 0 ? Math.round((stats.students_with_face / stats.total_students) * 100) : 0}%
                      </div>
                    </div>
                    <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><Camera size={20}/></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    {stats.students_with_face || 0} enrolled profiles
                  </div>
               </div>

               <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff, #fffaf7)', borderLeft: '4px solid var(--warning)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="stat-label">Total Logs</div>
                      <div className="stat-value">{stats.total_records || 0}</div>
                    </div>
                    <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}><Activity size={20}/></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    All-time attendance
                  </div>
               </div>
            </div>

            {/* 2. CHARTS ROW */}
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 32 }}>
               
               {/* Attendance Bar Chart */}
               <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
                     <div>
                       <h3 style={{ marginBottom: 4 }}>Attendance Trends</h3>
                       <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time statistics per course/date</p>
                     </div>
                     <select 
                        className="input" 
                        style={{ width: 160, padding: '8px 12px', fontSize: '0.85rem' }}
                        value={selectedCourseChart}
                        onChange={(e) => setSelectedCourseChart(e.target.value)}
                     >
                        <option value="all">All Courses</option>
                        {courses.map(c => (
                           <option key={c.id} value={c.course_code}>{c.course_code}</option>
                        ))}
                     </select>
                  </div>
                  <div style={{ height: 300, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                        <Bar dataKey="OnTime" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={selectedCourseChart === 'all' ? 12 : 30} />
                        <Bar dataKey="Late" fill="var(--secondary)" radius={[4, 4, 0, 0]} barSize={selectedCourseChart === 'all' ? 12 : 30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Attendance Status Pie Chart */}
               <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ marginBottom: 4 }}>Status Distribution</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>Overall system check-ins</p>
                  
                  <div style={{ flex: 1, minHeight: 200 }}>
                    {pieChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-md)' }} />
                          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '0.8rem', paddingTop: 20 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex-col items-center justify-center" style={{ height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No data available
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* 3. BOTTOM ROW: BANNER + LISTS */}
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
               
               <div className="flex-col gap-lg">
                  {/* Premium Scanner Banner */}
                  <div className="card" style={{ padding: 32, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                       <h2 style={{ color: 'white', marginBottom: 12, fontSize: '1.8rem' }}>Intelligent Face Kiosk</h2>
                       <p style={{ opacity: 0.9, maxWidth: 450, marginBottom: 24, lineHeight: 1.6 }}>Ready to track attendance? Launch the smart scanner to automatically detect and mark register students.</p>
                        <div className="flex gap-md">
                           <button className="btn btn-success" style={{ borderRadius: 30, padding: '12px 28px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }} onClick={() => setShowSessionForm(true)}>
                              <span style={{display:'flex', alignItems:'center', gap:10}}><Camera size={18}/> Locked Session</span>
                           </button>
                           <button className="btn btn-primary" style={{ borderRadius: 30, padding: '12px 28px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} onClick={() => onOpenKiosk('live')}>
                              <span style={{display:'flex', alignItems:'center', gap:10}}><Activity size={18}/> Universal Kiosk</span>
                           </button>
                        </div>
                    </div>
                    {/* Decorative Element */}
                    <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1 }}>
                       <Camera size={200} color="white" />
                    </div>
                  </div>

                  {/* Quick Management Hub */}
                  <div style={{ marginTop: 32 }}>
                    <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                       <Activity size={18} color="var(--primary)" /> Quick Management
                    </h3>
                    <div className="grid grid-2">
                       <div className="card hover-up" style={{ padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => { setActiveTab('students'); setShowStudentForm(true); }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Users size={24} />
                          </div>
                          <div>
                             <h4 style={{ fontSize: '1rem', marginBottom: 2 }}>Register Student</h4>
                             <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Add new profile</p>
                          </div>
                       </div>

                       <div className="card hover-up" style={{ padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => { setActiveTab('courses'); setShowCourseForm(true); }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <BookOpen size={24} />
                          </div>
                          <div>
                             <h4 style={{ fontSize: '1rem', marginBottom: 2 }}>Create Course</h4>
                             <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Setup new subject</p>
                          </div>
                       </div>

                       <div className="card hover-up" style={{ padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={handleDownloadCSV}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Download size={24} />
                          </div>
                          <div>
                             <h4 style={{ fontSize: '1rem', marginBottom: 2 }}>Export Reports</h4>
                             <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Get CSV data</p>
                          </div>
                       </div>

                       <div className="card hover-up" style={{ padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => setActiveTab('profile')}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <User size={24} />
                          </div>
                          <div>
                             <h4 style={{ fontSize: '1rem', marginBottom: 2 }}>Edit Profile</h4>
                             <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account settings</p>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Recent Activity Sidebar */}
               <div className="card" style={{ padding: 24, height: 'fit-content' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                     <h3>Recent Logs</h3>
                     <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('attendance')}>View All</button>
                  </div>
                  <div className="flex-col gap-sm">
                     {attendance.slice(0, 8).map(log => (
                        <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
                           <div className="user-avatar" style={{width: 38, height: 38, fontSize: '0.85rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)'}}>{log.student_name[0]}</div>
                           <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.student_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.course_code} • {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</div>
                           </div>
                           <span style={{ fontSize: '0.8rem', color: log.status === 'present' || log.status === 'On Time' ? 'var(--success)' : 'var(--secondary)', fontWeight: 600 }}>• {log.status}</span>
                        </div>
                     ))}
                     {attendance.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40 }}>No activity recorded yet.</div>}
                  </div>
               </div>

            </div>

          </div>
        )}

        {/* ATTENDANCE LIST (Table View mimicking Mockup 3) */}
        {activeTab === 'attendance' && (
          <div className="animate-in card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3>Attendance List</h3>
               <div style={{ display: 'flex', gap: 12 }}>
                  <input type="text" className="input" placeholder="Search..." style={{ width: 200, padding: '8px 12px' }} />
                  <button className="btn btn-primary" style={{display:'flex', gap:8, alignItems:'center'}} onClick={handleDownloadCSV}><Download size={16} /> Download CSV</button>
               </div>
            </div>
            {attendance.length === 0 ? (
               <div className="empty-state">
                  <div className="empty-icon"><ClipboardList size={48} /></div>
                  <h3>No attendance recorded yet</h3>
               </div>
            ) : (
               <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                  <table>
                     <thead>
                        <tr>
                           <th>Employee / Student Name</th>
                           <th>ID No</th>
                           <th>Course</th>
                           <th>Check Time</th>
                           <th>Status</th>
                           <th>Confidence</th>
                        </tr>
                     </thead>
                     <tbody>
                        {attendance.map(r => (
                           <tr key={r.id}>
                              <td>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>{r.student_name[0]}</div>
                                    <div>
                                       <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.student_name}</div>
                                    </div>
                                 </div>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{r.roll_number}</td>
                              <td>{r.course_code}</td>
                              <td>{new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString()}</td>
                              <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>• {r.status}</span></td>
                              <td>{r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : '—'}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
          </div>
        )}

        {/* STUDENTS */}
        {activeTab === 'students' && (
          <div className="animate-in card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3>Student Directory</h3>
               <button className="btn btn-primary" onClick={() => setShowStudentForm(true)}>
                 + Add Student
               </button>
            </div>
            {students.length === 0 ? (
               <div className="empty-state">
                  <div className="empty-icon"><GraduationCap size={48} /></div>
                  <h3>No students registered</h3>
               </div>
            ) : (
               <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                  <table>
                     <thead>
                        <tr>
                           <th>Roll No.</th>
                           <th>Name</th>
                           <th>Email</th>
                           <th>Face ID</th>
                           <th>Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {students.map(s => (
                           <tr key={s.id}>
                              <td style={{ fontWeight: 600 }}>{s.roll_number}</td>
                              <td>{s.full_name}</td>
                              <td>{s.email}</td>
                              <td>
                                 {s.has_face
                                   ? <span className="badge badge-success"><CheckCircle2 size={12} style={{marginRight:4}} /> Registered</span>
                                   : <span className="badge badge-danger"><XCircle size={12} style={{marginRight:4}} /> None</span>
                                 }
                              </td>
                              <td>
                                 <div className="flex gap-sm">
                                   <button className="btn btn-primary btn-sm" onClick={() => setFaceStudent(s)}>
                                     <Camera size={16}/> Face
                                   </button>
                                   <button className="btn btn-ghost btn-sm" onClick={() => { setEditForm(s); setEditingStudent(s); }}>
                                     Edit
                                   </button>
                                   <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(s.id)}>
                                     <Trash2 size={16}/>
                                   </button>
                                 </div>
                              </td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
               <h1 style={{ fontSize: '1.6rem' }}>Course Management</h1>
               <button className="btn btn-primary" onClick={() => setShowCourseForm(true)}>
                 + New Course
               </button>
            </div>
            
            {showCourseForm && (
              <div className="card mb-lg" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Create New Course</h3>
                <form onSubmit={handleCreateCourse} className="flex gap-md items-end">
                   <div className="input-group" style={{ flex: 1 }}>
                     <label>Course Code</label>
                     <input className="input" placeholder="e.g. CS101" required value={courseForm.course_code} onChange={e => setCourseForm({ ...courseForm, course_code: e.target.value.toUpperCase() })} />
                   </div>
                   <div className="input-group" style={{ flex: 2 }}>
                     <label>Course Name</label>
                     <input className="input" placeholder="e.g. Intro to CS" required value={courseForm.course_name} onChange={e => setCourseForm({ ...courseForm, course_name: e.target.value })} />
                   </div>
                                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ visibility: 'hidden', height: 20, marginBottom: 4 }}>S</label>
                      <button type="submit" className="btn btn-success" style={{ height: 46, padding: '0 24px' }}>Save Course</button>
                   </div>
                                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ visibility: 'hidden', height: 20, marginBottom: 4 }}>S</label>
                      <button type="button" className="btn btn-ghost" style={{ height: 46, padding: '0 20px' }} onClick={() => setShowCourseForm(false)}>Cancel</button>
                   </div>
                </form>
              </div>
            )}

            <div className="grid grid-3">
               {courses.map(c => (
                 <div key={c.id} className="card" style={{ padding: 24 }}>
                    <div className="badge badge-primary mb-sm">{c.course_code}</div>
                    <h3 style={{ marginBottom: 12 }}>{c.course_name}</h3>
                    <div className="flex items-center justify-between" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                       <span>{c.student_count} Enrolled</span>
                       <span>{c.session_count} Sessions</span>
                    </div>
                    <div className="flex gap-sm">
                       <button className="btn btn-ghost btn-sm" onClick={() => setEditingCourse(c)}>Edit</button>
                       <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCourse(c.id)}><Trash2 size={14}/></button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}


        {/* PROFILE SETTINGS */}
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
                      <h2 style={{ marginBottom: 24 }}>Account Settings</h2>
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
                            <button type="button" className="btn btn-ghost" onClick={() => setActiveTab('overview')}>Cancel</button>
                         </div>
                      </form>
                   </div>
                </div>
             </div>
           </div>
        )}
      </div>

      {/* Start Session / Take Attendance Modal */}
      {showSessionForm && (
         <div className="modal-overlay" onClick={() => setShowSessionForm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
               <h2 style={{ marginBottom: 8 }}>Launch Face Scanner</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>Choose the course you want to take attendance for.</p>
               <div className="input-group" style={{ marginBottom: 24 }}>
                  <label>Select Course</label>
                  <select className="input" value={sessionCourseId} onChange={e => setSessionCourseId(e.target.value)} required>
                     <option value="">— Choose a course —</option>
                     {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>)}
                  </select>
               </div>
                <button className="btn btn-primary btn-block btn-lg" onClick={() => handleStartSession(sessionCourseId)} disabled={!sessionCourseId}>
                   📸 Initialize Scanner
                </button>
            </div>
         </div>
      )}

      {/* Face Registration Modal */}
      {faceStudent && (
         <div className="modal-overlay" onClick={() => !faceUploading && setFaceStudent(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
               <h2 style={{ marginBottom: 8 }}>Register Face Data</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                  Scanning face for: <strong>{faceStudent.full_name}</strong>
               </p>
               <div style={{ borderRadius: 12, overflow: 'hidden', border: '2px solid var(--border)', marginBottom: 20 }}>
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" videoConstraints={{ facingMode: 'user', width: 480, height: 360 }} />
               </div>
               <button className="btn btn-primary btn-block btn-lg" onClick={handleFaceCaptureWebcam} disabled={faceUploading}>
                  {faceUploading ? 'Capturing...' : '📸 Capture Face'}
               </button>
            </div>
         </div>
      )}

      {/* Add Student Modal */}
      {showStudentForm && (
         <div className="modal-overlay" onClick={() => setShowStudentForm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
               <h2>Add New Student</h2>
               <form onSubmit={handleCreateStudent} className="flex-col gap-md" style={{ marginTop: 24 }}>
                  <div className="input-group">
                     <label>Full Name</label>
                     <input className="input" required value={studentForm.full_name} onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} />
                  </div>
                  <div className="input-group">
                     <label>Email Address</label>
                     <input type="email" className="input" required value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} />
                  </div>
                  <div className="input-group">
                     <label>Password</label>
                     <input type="password" className="input" required minLength={6} value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} />
                  </div>
                  <div className="flex gap-md">
                     <div className="input-group" style={{flex: 1}}>
                        <label>Roll Number</label>
                        <input className="input" placeholder="Auto-generated if empty" value={studentForm.roll_number} onChange={e => setStudentForm({...studentForm, roll_number: e.target.value})} />
                     </div>
                     <div className="input-group" style={{flex: 1}}>
                        <label>Department</label>
                        <input className="input" value={studentForm.department} onChange={e => setStudentForm({...studentForm, department: e.target.value})} />
                     </div>
                  </div>
                  <div className="input-group">
                     <label>Assign Courses</label>
                     <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                        {courses.map(c => (
                           <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                              <input type="checkbox" checked={studentForm.course_ids?.includes(c.id)} onChange={() => handleCourseSelection(c.id, setStudentForm)} />
                              <span>{c.course_code} - {c.course_name}</span>
                           </label>
                        ))}
                     </div>
                  </div>
                  <div className="flex gap-sm" style={{ marginTop: 12 }}>
                     <button type="submit" className="btn btn-primary btn-block">Save Student</button>
                     <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowStudentForm(false)}>Cancel</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
         <div className="modal-overlay" onClick={() => setEditingStudent(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
               <h2>Edit Student: {editingStudent.full_name}</h2>
               <form onSubmit={handleUpdateStudent} className="flex-col gap-md" style={{ marginTop: 24 }}>
                  <div className="input-group">
                     <label>Full Name</label>
                     <input className="input" required value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                  </div>
                  <div className="input-group">
                     <label>Email Address</label>
                     <input type="email" className="input" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="flex gap-md">
                     <div className="input-group" style={{flex: 1}}>
                        <label>Roll Number</label>
                        <input className="input" value={editForm.roll_number} onChange={e => setEditForm({...editForm, roll_number: e.target.value})} />
                     </div>
                     <div className="input-group" style={{flex: 1}}>
                        <label>Department</label>
                        <input className="input" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} />
                     </div>
                  </div>
                  <div className="input-group">
                     <label>Enrolled Courses</label>
                     <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                        {courses.map(c => (
                           <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                              <input type="checkbox" checked={editForm.course_ids?.includes(c.id)} onChange={() => handleCourseSelection(c.id, setEditForm)} />
                              <span>{c.course_code} - {c.course_name}</span>
                           </label>
                        ))}
                     </div>
                  </div>
                  <div className="flex gap-sm" style={{ marginTop: 12 }}>
                     <button type="submit" className="btn btn-primary btn-block">Update Details</button>
                     <button type="button" className="btn btn-ghost btn-block" onClick={() => setEditingStudent(null)}>Cancel</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
         <div className="modal-overlay" onClick={() => setEditingCourse(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
               <h2>Edit Course: {editingCourse.course_code}</h2>
               <form onSubmit={handleUpdateCourse} className="flex-col gap-md" style={{ marginTop: 24 }}>
                  <div className="input-group">
                     <label>Course Name</label>
                     <input className="input" required value={editingCourse.course_name} onChange={e => setEditingCourse({...editingCourse, course_name: e.target.value})} />
                  </div>
                  <div className="input-group">
                     <label>Description (Optional)</label>
                     <textarea className="input" rows={3} value={editingCourse.description || ''} onChange={e => setEditingCourse({...editingCourse, description: e.target.value})} />
                  </div>
                  <div className="flex gap-sm" style={{ marginTop: 12 }}>
                     <button type="submit" className="btn btn-primary btn-block">Update Course</button>
                     <button type="button" className="btn btn-ghost btn-block" onClick={() => setEditingCourse(null)}>Cancel</button>
                  </div>
               </form>
            </div>
         </div>
      )}

     </div>
  );
};

export default AdminDashboard;
