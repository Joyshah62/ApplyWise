import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

export default function ApplicationModal({ isOpen, onClose, application, onSave }) {
  const [formData, setFormData] = useState({
    company_name: '',
    job_title: '',
    location: '',
    portal: '',
    status: 'Applied',
    job_url: '',
    resume_version_id: '',
    date_applied: new Date().toISOString().split('T')[0],
  });
  
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchResumes();
      if (application) {
        setFormData({
          company_name: application.company_name || '',
          job_title: application.job_title || '',
          location: application.location || '',
          portal: application.portal || '',
          status: application.status || 'Applied',
          job_url: application.job_url || '',
          resume_version_id: application.resume_version_id || '',
          date_applied: application.date_applied ? application.date_applied.split('T')[0] : new Date().toISOString().split('T')[0],
        });
      } else {
        setFormData({
          company_name: '',
          job_title: '',
          location: '',
          portal: '',
          status: 'Applied',
          job_url: '',
          resume_version_id: '',
          date_applied: new Date().toISOString().split('T')[0],
        });
      }
      setError('');
    }
  }, [isOpen, application]);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      setResumes(res.data);
    } catch (err) {
      console.error('Failed to fetch resumes');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = { ...formData };
    if (!payload.resume_version_id) {
      payload.resume_version_id = null;
    } else {
      payload.resume_version_id = parseInt(payload.resume_version_id);
    }

    try {
      let res;
      if (application) {
        res = await api.put(`/applications/${application.id}`, payload);
      } else {
        res = await api.post('/applications', payload);
      }
      onSave(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            {application ? 'Edit Application' : 'Add Application'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          
          <form id="app-modal-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
                <input required type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <input required type="text" name="job_title" value={formData.job_title} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job URL *</label>
              <input required type="url" name="job_url" value={formData.job_url} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Applied</label>
                <input type="date" name="date_applied" value={formData.date_applied} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Portal</label>
                <input type="text" name="portal" value={formData.portal} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Assessment">Assessment</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resume Used</label>
              <select name="resume_version_id" value={formData.resume_version_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- None --</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button form="app-modal-form" type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
