import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';
import { Plus, Edit2, Trash2, ExternalLink, Sparkles, FileText, Download, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import ApplicationModal from '../components/ApplicationModal';
import AnalysisPanel from '../components/AnalysisPanel';
import CoverLetterPanel from '../components/CoverLetterPanel';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [analysisApp, setAnalysisApp] = useState(null);
  const [coverLetterApp, setCoverLetterApp] = useState(null);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [aiUsage, setAiUsage] = useState(null);

  useEffect(() => {
    fetchApplications();
    fetchAiUsage();
  }, []);

  const fetchAiUsage = async () => {
    try {
      const res = await api.get('/applications/ai-usage');
      setAiUsage(res.data);
    } catch {}
  };

  const refreshAiUsage = () => fetchAiUsage();

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      setApplications(res.data);
    } catch (error) {
      console.error('Error fetching applications', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async (id) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await api.delete(`/applications/${id}`);
        setApplications(applications.filter(app => app.id !== id));
      } catch (error) {
        console.error('Error deleting application', error);
      }
    }
  };

  const handleEdit = (app) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedApp(null);
    setIsModalOpen(true);
  };

  const handleSave = (savedApp) => {
    if (selectedApp) {
      setApplications(applications.map(app => app.id === savedApp.id ? savedApp : app));
    } else {
      setApplications([savedApp, ...applications]);
    }
  };

  const toggleNote = (app) => {
    if (expandedNoteId === app.id) {
      setExpandedNoteId(null);
    } else {
      setExpandedNoteId(app.id);
      setNoteText(app.notes || '');
    }
  };

  const saveNote = async (appId) => {
    try {
      await api.put(`/applications/${appId}`, { notes: noteText });
      setApplications(applications.map(a => a.id === appId ? { ...a, notes: noteText } : a));
      setExpandedNoteId(null);
    } catch (error) {
      console.error('Error saving note', error);
    }
  };

  const exportCSV = () => {
    const headers = ['Company', 'Role', 'Status', 'Portal', 'Location', 'Date Applied', 'Job URL', 'Notes'];
    const rows = applications.map(a => [
      a.company_name,
      a.job_title,
      a.status,
      a.portal || '',
      a.location || '',
      a.date_applied || '',
      a.job_url,
      (a.notes || '').replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Offer': return 'bg-green-100 text-green-800';
      case 'Interview': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Assessment': return 'bg-purple-100 text-purple-800';
      case 'Withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800'; // Applied, Saved
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Job Applications</h1>
        <div className="flex items-center gap-2">
          {aiUsage && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-500 whitespace-nowrap">AI today</span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    aiUsage.remaining === 0
                      ? 'bg-red-500'
                      : aiUsage.remaining <= 5
                      ? 'bg-amber-400'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, (aiUsage.used / aiUsage.limit) * 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium tabular-nums ${
                aiUsage.remaining === 0
                  ? 'text-red-600'
                  : aiUsage.remaining <= 5
                  ? 'text-amber-600'
                  : 'text-slate-600'
              }`}>
                {aiUsage.used}/{aiUsage.limit}
              </span>
            </div>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 border border-slate-300 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={handleAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Manual
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company & Role</th>
                <th className="px-6 py-4">Date Applied</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Portal</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No applications found. Use the extension to add some!
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <React.Fragment key={app.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{app.company_name}</div>
                        <div className="text-slate-500">{app.job_title}</div>
                      </td>
                      <td className="px-6 py-4">
                        {app.date_applied ? format(new Date(app.date_applied), 'MMM d, yyyy') : 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500">{app.portal || 'Direct'}</span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        {app.job_url && (
                          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="inline-block text-slate-400 hover:text-blue-600 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => toggleNote(app)}
                          title="Notes"
                          className={`transition-colors ${expandedNoteId === app.id ? 'text-amber-500' : app.notes ? 'text-amber-400 hover:text-amber-600' : 'text-slate-400 hover:text-amber-500'}`}
                        >
                          {expandedNoteId === app.id ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                        </button>
                        <button
                          onClick={() => setAnalysisApp(app)}
                          title="Analyze Resume Fit"
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => setCoverLetterApp(app)}
                          title="Generate Cover Letter"
                          className="text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <FileText className="w-4 h-4 inline" />
                        </button>
                        <Link
                          to={`/applications/${app.id}/tailor`}
                          title="Tailor Resume with AI"
                          className="inline-block text-slate-400 hover:text-purple-600 transition-colors"
                        >
                          <Wand2 className="w-4 h-4 inline" />
                        </Link>
                        <button onClick={() => handleEdit(app)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => deleteApplication(app.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                    {expandedNoteId === app.id && (
                      <tr className="bg-amber-50 border-b border-amber-100">
                        <td colSpan="5" className="px-6 py-4">
                          <div className="flex gap-3 items-start">
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              rows={3}
                              placeholder="Add notes about this application (e.g. recruiter name, interview prep, next steps)..."
                              className="flex-1 px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
                            />
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                onClick={() => saveNote(app.id)}
                                className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setExpandedNoteId(null)}
                                className="px-4 py-2 text-slate-500 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        application={selectedApp}
        onSave={handleSave}
      />

      {analysisApp && (
        <AnalysisPanel app={analysisApp} onClose={() => setAnalysisApp(null)} onSuccess={refreshAiUsage} />
      )}

      {coverLetterApp && (
        <CoverLetterPanel app={coverLetterApp} onClose={() => setCoverLetterApp(null)} onSuccess={refreshAiUsage} />
      )}
    </div>
  );
}
