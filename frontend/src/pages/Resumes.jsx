import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { FileText, Plus, Trash2, Edit2, Link as LinkIcon, X } from 'lucide-react';

export default function Resumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    file_url: '',
    target_role: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      setResumes(res.data);
    } catch (error) {
      console.error('Error fetching resumes', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (id) => {
    if (window.confirm('Are you sure you want to delete this resume?')) {
      try {
        await api.delete(`/resumes/${id}`);
        setResumes(resumes.filter(r => r.id !== id));
      } catch (error) {
        console.error('Error deleting resume', error);
      }
    }
  };

  const handleEdit = (resume) => {
    setSelectedResume(resume);
    setFormData({
      name: resume.name,
      file_url: resume.file_url || '',
      target_role: resume.target_role || ''
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedResume(null);
    setFormData({ name: '', file_url: '', target_role: '' });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Use FormData if there's a file, otherwise use JSON
    let submitData;
    let config = {};
    
    if (selectedFile) {
      submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('file_url', formData.file_url);
      submitData.append('target_role', formData.target_role);
      submitData.append('file', selectedFile);
      config = { headers: { 'Content-Type': 'multipart/form-data' } };
    } else {
      submitData = formData;
    }

    try {
      if (selectedResume) {
        const res = await api.put(`/resumes/${selectedResume.id}`, submitData, config);
        setResumes(resumes.map(r => r.id === res.data.id ? res.data : r));
      } else {
        const res = await api.post('/resumes', submitData, config);
        setResumes([res.data, ...resumes]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving resume', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading resumes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Resume Versions</h1>
        <button onClick={handleAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Resume
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resumes.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
            No resumes added yet. Add a resume to track which version you use for each application!
          </div>
        ) : (
          resumes.map((resume) => (
            <div key={resume.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(resume)} className="text-slate-400 hover:text-blue-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteResume(resume.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-bold text-lg text-slate-900 mb-1">{resume.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{resume.target_role || 'General Role'}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  Added {format(new Date(resume.created_at), 'MMM d, yyyy')}
                </span>
                {resume.file_url && (
                  <a href={resume.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <LinkIcon className="w-4 h-4" />
                    Link
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {selectedResume ? 'Edit Resume' : 'Add Resume'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form id="resume-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resume Name *</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Frontend Dev V2" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Role</label>
                  <input type="text" value={formData.target_role} onChange={(e) => setFormData({...formData, target_role: e.target.value})} placeholder="e.g. React Developer" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">File Link / URL</label>
                  <input type="url" value={formData.file_url} onChange={(e) => setFormData({...formData, file_url: e.target.value})} placeholder="https://docs.google.com/..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Upload PDF Resume (Optional)</label>
                  <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files[0])} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <p className="text-xs text-slate-500 mt-1">Upload a PDF to enable AI Resume Tailoring.</p>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button form="resume-form" type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Save Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
