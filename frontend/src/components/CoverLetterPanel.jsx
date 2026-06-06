import React, { useState, useEffect } from 'react';
import { X, FileText, Copy, Check, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function CoverLetterPanel({ app, onClose, onSuccess }) {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchResumes();
    if (app.job_description) setJobDescription(app.job_description);
    if (app.resume_version_id) setSelectedResumeId(String(app.resume_version_id));
  }, [app]);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      setResumes(res.data);
    } catch {
      // silently fail
    }
  };

  const handleGenerate = async () => {
    if (!selectedResumeId) {
      setError('Please select a resume.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please provide a job description.');
      return;
    }
    setError('');
    setLoading(true);
    setCoverLetter('');
    try {
      const res = await api.post('/applications/cover-letter', {
        job_description: jobDescription,
        resume_id: parseInt(selectedResumeId),
        company_name: app.company_name,
        job_title: app.job_title,
      });
      setCoverLetter(res.data.cover_letter);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Cover Letter</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {app.company_name} — {app.job_title}
            </h2>
          </div>
          <button onClick={onClose} className="ml-4 shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Resume</label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="">-- Select a resume --</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.target_role ? ` (${r.target_role})` : ''}
                </option>
              ))}
            </select>
            {resumes.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">
                No resumes found. Upload a PDF on the Resumes page first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Job Description
              {app.job_description && (
                <span className="ml-2 text-xs text-green-600 font-normal">auto-filled</span>
              )}
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={5}
              placeholder="Paste the full job description here..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {coverLetter && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Generated Cover Letter</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={16}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
              <p className="text-xs text-slate-400 mt-1.5">You can edit the letter directly above before copying.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : coverLetter ? 'Regenerate' : 'Generate Cover Letter'}
          </button>
        </div>
      </div>
    </>
  );
}
