import React, { useState, useEffect } from 'react';
import api from './api';
import { Image, User, RefreshCw, ArrowLeft, Trash2 } from 'lucide-react';

const SystemDiagnostics = ({ onBack }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/developer/gallery');
      setImages(response.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load gallery images.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm('Are you sure you want to permanently delete this image from the server?')) return;
    
    try {
      await api.delete(`/api/admin/developer/gallery/image/${filename}`);
      // Remove from state instantly
      setImages(images.filter(img => img.filename !== filename));
    } catch (err) {
      console.error(err);
      alert('Failed to delete image.');
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Diagnostic Logs</h1>
        </div>
        <button 
          onClick={fetchImages}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {loading && images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <RefreshCw className="w-12 h-12 animate-spin mb-4 text-indigo-200" />
          <p className="text-xl">Loading your secret vault...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <Image className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-xl text-gray-400">No faces registered yet.</p>
          <p className="text-gray-400 text-sm">Photos will appear here once you register students.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((img) => (
            <div 
              key={img.filename} 
              className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="aspect-square relative overflow-hidden bg-gray-100">
                <img 
                  src={`${api.defaults.baseURL}${img.url}`} 
                  alt={img.filename}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400?text=Image+Missing';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white text-xs font-medium truncate">
                    {img.filename}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {img.filename.split('_').slice(1, -1).join(' ') || 'Student'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                      ID: {img.filename.split('_')[0]}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(img.filename)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemDiagnostics;
