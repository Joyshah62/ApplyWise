import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Settings() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state for new link
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quick-links');
      setLinks(res.data);
    } catch (err) {
      setError('Failed to fetch quick links. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    
    // Auto-prepend https:// if missing
    let finalUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      setSaving(true);
      const res = await api.post('/quick-links', {
        title: newTitle.trim(),
        url: finalUrl
      });
      setLinks([...links, res.data]);
      setNewTitle('');
      setNewUrl('');
      setError(null);
    } catch (err) {
      setError('Failed to add link. ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (id) => {
    try {
      await api.delete(`/quick-links/${id}`);
      setLinks(links.filter(l => l.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete link. ' + err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>{error}</div>
        </div>
      )}

      <div className="bg-white shadow rounded-xl overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Quick Links</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add links here to have them automatically appear in the ApplyWise extension sidebar while you apply for jobs.
            </p>
          </div>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleAddLink} className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add a new link</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Link Title (e.g., LinkedIn)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div className="flex-[2]">
                <input
                  type="url"
                  placeholder="URL (e.g., https://linkedin.com/in/...)"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Link'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {links.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                You haven't added any quick links yet.
              </div>
            ) : (
              links.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <span className="font-semibold text-sm">{link.title.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{link.title}</h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{link.url}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    title="Delete link"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
