import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/users')
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
        <span className="text-slate-500 text-sm font-medium">{users.length} total</span>
      </div>

      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full max-w-sm px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 shadow-sm"
      />

      <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-slate-100 bg-slate-50/50">
            <tr className="text-slate-500 text-xs uppercase font-semibold">
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Signed Up</th>
              <th className="px-5 py-3.5">Last Active</th>
              <th className="px-5 py-3.5 text-center">Apps</th>
              <th className="px-5 py-3.5 text-center">AI Calls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">No users found.</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-slate-800 font-semibold">{u.name}</div>
                      <div className="text-slate-400 text-xs font-medium">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-600 font-medium">
                  {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-5 py-3.5 text-slate-600 font-medium">
                  {u.last_active_at ? format(new Date(u.last_active_at), 'MMM d, yyyy') : 'Never'}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full text-xs border border-blue-100/50">{u.app_count}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-full text-xs border border-violet-100/50">{u.ai_count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
