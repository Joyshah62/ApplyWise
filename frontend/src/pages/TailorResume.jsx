import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Send, Download, RefreshCw, Wand2,
  MessageSquare, Code2, AlertTriangle, Loader2,
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../utils/cn';

export default function TailorResume() {
  const { appId } = useParams();

  const [app, setApp] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [latex, setLatex] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [latexDraft, setLatexDraft] = useState('');

  const [pageLoading, setPageLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [compileError, setCompileError] = useState(null);
  const [error, setError] = useState('');

  const chatEndRef = useRef(null);
  const pdfUrlRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [appRes, resumesRes] = await Promise.all([
          api.get(`/applications/${appId}`),
          api.get('/resumes'),
        ]);
        setApp(appRes.data);
        setResumes(resumesRes.data);
        if (appRes.data.resume_version_id) {
          setSelectedResumeId(String(appRes.data.resume_version_id));
        } else if (resumesRes.data.length > 0) {
          setSelectedResumeId(String(resumesRes.data[0].id));
        }
        try {
          const tailoredRes = await api.get(`/applications/${appId}/tailor`);
          setLatex(tailoredRes.data.latex_content);
          setLatexDraft(tailoredRes.data.latex_content);
          setMessages(tailoredRes.data.chat_history || []);
          compile(tailoredRes.data.latex_content);
        } catch {
          // no tailored resume yet — show the setup screen
        }
      } catch {
        setError('Could not load this application.');
      } finally {
        setPageLoading(false);
      }
    };
    load();
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const compile = useCallback(async (source) => {
    setCompiling(true);
    setCompileError(null);
    try {
      const res = await api.post(
        '/tailor/compile',
        { latex_content: source },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = url;
      setPdfUrl(url);
    } catch (err) {
      let detail = 'Compilation failed.';
      try {
        const text = await err.response?.data?.text?.();
        if (text) {
          const parsed = JSON.parse(text);
          detail = parsed.log || parsed.error || detail;
        }
      } catch { /* keep generic message */ }
      setCompileError(detail);
    } finally {
      setCompiling(false);
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedResumeId) {
      setError('Select a resume to tailor.');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const res = await api.post(`/applications/${appId}/tailor`, {
        resume_id: parseInt(selectedResumeId),
      });
      setLatex(res.data.latex_content);
      setLatexDraft(res.data.latex_content);
      setMessages(res.data.chat_history || []);
      compile(res.data.latex_content);
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    const message = input.trim();
    if (!message || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setSending(true);
    try {
      const res = await api.post(`/applications/${appId}/tailor/chat`, { message });
      setMessages(res.data.chat_history);
      if (res.data.latex_changed) {
        setLatex(res.data.latex_content);
        setLatexDraft(res.data.latex_content);
        compile(res.data.latex_content);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err.response?.data?.error || 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSaveLatex = async () => {
    try {
      await api.put(`/applications/${appId}/tailor`, { latex_content: latexDraft });
      setLatex(latexDraft);
      compile(latexDraft);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save changes.');
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    const base = `${app?.company_name || 'resume'}_${app?.job_title || ''}`
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    a.download = `${base}_resume.pdf`;
    a.click();
  };

  if (pageLoading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  if (!app) {
    return (
      <div className="p-8 text-center text-slate-500">
        {error || 'Application not found.'}
        <div className="mt-4">
          <Link to="/applications" className="text-indigo-600 hover:underline">Back to applications</Link>
        </div>
      </div>
    );
  }

  // --- Setup screen: no tailored resume yet ---
  if (!latex) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <Link to="/applications" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to applications
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Wand2 className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">AI Resume Tailor</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">
            {app.company_name} — {app.job_title}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Pick a base resume and the AI will rewrite it in a clean LaTeX template,
            tailored to this job description. You can then refine it through chat.
          </p>

          {!app.job_description && (
            <div className="flex gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              This application has no job description saved. Edit the application and paste one first.
            </div>
          )}

          <label className="block text-sm font-medium text-slate-700 mb-1">Base Resume</label>
          <select
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="w-full px-3 py-2 mb-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">-- Select a resume --</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}{r.target_role ? ` (${r.target_role})` : ''}
              </option>
            ))}
          </select>
          {resumes.length === 0 && (
            <p className="text-xs text-slate-500 -mt-2 mb-4">
              No resumes found. Upload a PDF on the Resumes page first.
            </p>
          )}

          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !app.job_description || !selectedResumeId}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Tailoring your resume... (~20s)' : 'Generate Tailored Resume'}
          </button>
        </div>
      </div>
    );
  }

  // --- Main split view: chat/source on the left, PDF preview on the right ---
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-2">
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/applications" className="text-slate-400 hover:text-slate-600 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-indigo-600">
              <Wand2 className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">AI Resume Tailor</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {app.company_name} — {app.job_title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={generating}
            title="Regenerate from scratch"
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
            Regenerate
          </button>
          <button
            onClick={handleDownload}
            disabled={!pdfUrl}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: chat + LaTeX source */}
        <div className="w-[42%] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                activeTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button
              onClick={() => setActiveTab('latex')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                activeTab === 'latex' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Code2 className="w-4 h-4" /> LaTeX Source
            </button>
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap',
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-700 rounded-bl-md'
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-500 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Updating your resume...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-slate-200 shrink-0">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={2}
                    placeholder='e.g. "Make the first bullet under my internship mention Kubernetes" or "Shorten the projects section"'
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <textarea
                value={latexDraft}
                onChange={(e) => setLatexDraft(e.target.value)}
                spellCheck={false}
                className="flex-1 p-4 font-mono text-xs text-slate-700 resize-none focus:outline-none"
              />
              <div className="p-3 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400">
                  {latexDraft !== latex ? 'Unsaved changes' : 'Saved'}
                </span>
                <button
                  onClick={handleSaveLatex}
                  disabled={latexDraft === latex}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Save & Recompile
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: PDF preview */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 shrink-0">
            <span className="text-sm font-medium text-slate-600">Preview</span>
            <button
              onClick={() => compile(latex)}
              disabled={compiling}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', compiling && 'animate-spin')} />
              {compiling ? 'Compiling...' : 'Recompile'}
            </button>
          </div>
          <div className="flex-1 bg-slate-100 relative min-h-0">
            {compiling && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compiling PDF...
                </div>
              </div>
            )}
            {compileError ? (
              <div className="p-6 overflow-y-auto h-full">
                <div className="flex items-center gap-2 text-red-600 font-semibold text-sm mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  LaTeX compilation failed
                </div>
                <pre className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-4 whitespace-pre-wrap">
                  {compileError}
                </pre>
                <p className="text-xs text-slate-500 mt-3">
                  Ask the AI to fix it in chat (e.g. "the LaTeX doesn't compile, fix it"), or edit the source directly.
                </p>
              </div>
            ) : pdfUrl ? (
              <iframe title="Resume preview" src={pdfUrl} className="w-full h-full border-0" />
            ) : (
              !compiling && (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  The PDF preview will appear here.
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
