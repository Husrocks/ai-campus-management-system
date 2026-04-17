import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BarChart2, ClipboardList, GraduationCap, BookOpen, LogOut, Camera, Trash2, Download, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import api from './api';
import Webcam from 'react-webcam';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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
           <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="user-avatar" style={{width: 32, height: 32}}>{initials}</div>
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
            
            {/* Left Column: Chart & Backlog */}
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 24 }}>
               
               {/* Standout Face Scanner Start Box */}
               <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ color: 'white', marginBottom: 8 }}>Take Attendance</h2>
                    <p style={{ opacity: 0.9, maxWidth: 400 }}>Start the intelligent face scanner to instantly mark attendance for your class.</p>
                  </div>
                  <button className="btn btn-success btn-lg" style={{ borderRadius: 30, padding: '12px 32px' }} onClick={() => setShowSessionForm(true)}>
                     <span style={{display:'flex', alignItems:'center', gap:8}}><Camera size={18}/> Open Face Scanner</span>
                  </button>
               </div>

               {/* Chart Card */}
               <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                     <h3>Attendance Status</h3>
                     <select 
                        className="input" 
                        style={{ width: 150, padding: '8px 12px' }}
                        value={selectedCourseChart}
                        onChange={(e) => setSelectedCourseChart(e.target.value)}
                     >
                        <option value="all">All Courses</option>
                        {courses.map(c => (
                           <option key={c.id} value={c.course_code}>{c.course_code}</option>
                        ))}
                     </select>
                  </div>
                  <div style={{ height: 250, width: '100%', minWidth: 0, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="OnTime" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="Late" fill="var(--secondary)" radius={[4, 4, 0, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="grid grid-2">
                 {sessions.filter(s => s.status === 'active').slice(0,2).map(s => (
                   <div key={s.id} className="card" style={{ padding: 20, borderLeft: '4px solid var(--success)' }}>
                      <span className="badge badge-success mb-sm">Active Session</span>
                      <h4>{s.course_code} - {s.course_name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Started at {new Date(s.start_time).toLocaleTimeString()}</p>
                      <div className="flex gap-sm">
                        <button className="btn btn-primary btn-sm" style={{display:'inline-flex', alignItems:'center', gap:6}} onClick={() => onOpenKiosk(s.id)}><Camera size={14}/> Open Kiosk</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEndSession(s.id, 'complete')}>End</button>
                      </div>
                   </div>
                 ))}
               </div>

            </div>

            {/* Right Column: Active Streams & Recent Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               
               <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ marginBottom: 20 }}>System Stats</h3>
                  <div className="flex-col gap-md">
                     <div className="flex justify-between items-center" style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
                        <div>
                          <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.total_students || 0}</span>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Students</div>
                        </div>
                     </div>
                     <div className="flex justify-between items-center" style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
                        <div>
                          <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.total_courses || 0}</span>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Courses</div>
                        </div>
                     </div>
                     <div className="flex justify-between items-center">
                        <div>
                          <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.students_with_face || 0}</span>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Faces</div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="card" style={{ padding: 24, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                     <h3>Recent Activity</h3>
                  </div>
                  <div className="flex-col gap-sm">
                     {attendance.slice(0, 5).map(log => (
                        <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                           <div className="user-avatar" style={{width: 36, height: 36, fontSize: '0.8rem'}}>{log.student_name[0]}</div>
                           <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.student_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.course_code} • {new Date(log.timestamp).toLocaleTimeString()}</div>
                           </div>
                           <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>• Ontime</span>
                        </div>
                     ))}
                     {attendance.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 20 }}>No records yet</div>}
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
                              <td>{new Date(r.timestamp).toLocaleTimeString()}</td>
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
                   <button type="submit" className="btn btn-success">Save Course</button>
                   <button type="button" className="btn btn-ghost" onClick={() => setShowCourseForm(false)}>Cancel</button>
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
