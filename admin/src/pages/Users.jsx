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
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <span className="text-slate-400 text-sm">{users.length} total</span>
      </div>

      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full max-w-sm px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-slate-800">
            <tr className="text-slate-500 text-xs uppercase font-semibold">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Signed Up</th>
              <th className="px-5 py-3">Last Active</th>
              <th className="px-5 py-3 text-center">Apps</th>
              <th className="px-5 py-3 text-center">AI Calls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No users found.</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium">{u.name}</div>
                      <div className="text-slate-500 text-xs">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {u.last_active_at ? format(new Date(u.last_active_at), 'MMM d, yyyy') : 'Never'}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-blue-400 font-semibold">{u.app_count}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-violet-400 font-semibold">{u.ai_count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
