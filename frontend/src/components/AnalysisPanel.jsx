import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import api from '../services/api';

export default function AnalysisPanel({ app, onClose }) {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

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
      // silently fail — empty list handled in UI
    }
  };

  const handleAnalyze = async () => {
    if (!selectedResumeId) {
      setError('Please select a resume to analyze against.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please provide a job description.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/applications/analyze', {
        job_description: jobDescription,
        resume_id: parseInt(selectedResumeId),
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = result
    ? result.fit_score >= 70 ? 'text-green-600' : result.fit_score >= 40 ? 'text-yellow-600' : 'text-red-600'
    : '';

  const scoreBorder = result
    ? result.fit_score >= 70 ? 'border-green-200 bg-green-50' : result.fit_score >= 40 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'
    : '';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">AI Resume Fit</span>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Resume to Analyze</label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                No resumes found. Upload a PDF on the Resumes page to enable this feature.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Job Description
              {app.job_description && (
                <span className="ml-2 text-xs text-green-600 font-normal">auto-filled from application</span>
              )}
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={7}
              placeholder="Paste the full job description here..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {result && (
            <div className="space-y-5">
              <div className={`p-5 rounded-xl border-2 text-center ${scoreBorder}`}>
                <div className={`text-5xl font-bold ${scoreColor}`}>
                  {result.fit_score}<span className="text-2xl font-semibold">%</span>
                </div>
                <div className="text-sm text-slate-600 mt-1 font-medium">Resume Fit Score</div>
              </div>

              {result.matched_keywords?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">
                      Matched Keywords ({result.matched_keywords.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.matched_keywords.map((kw) => (
                      <span key={kw} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.missing_keywords?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">
                      Missing Keywords ({result.missing_keywords.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_keywords.map((kw) => (
                      <span key={kw} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.suggestions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">Suggestions</span>
                  </div>
                  <ul className="space-y-2">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <span className="shrink-0 font-bold text-amber-600">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Analyzing...' : result ? 'Re-analyze' : 'Analyze Fit'}
          </button>
        </div>
      </div>
    </>
  );
}
