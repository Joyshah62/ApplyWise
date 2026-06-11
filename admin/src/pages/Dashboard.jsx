import React, { useEffect, useState } from 'react';
import { Users, Briefcase, Sparkles, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import api from '../services/api';

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-800">{value ?? '—'}</div>
      {sub && <div className="text-slate-400 text-xs mt-1.5 font-medium">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = () => {
    setLoading(true);
    setError(null);
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.error || err.message || 'Failed to connect to backend.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>;
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 bg-white border border-slate-200/60 rounded-2xl space-y-4 shadow-sm">
        <div className="text-red-500 font-semibold text-lg">⚠️ Connection Error</div>
        <p className="text-slate-600 text-sm max-w-md">
          {error || 'Could not load dashboard statistics.'}
        </p>
        <p className="text-slate-400 text-xs max-w-sm">
          If your Flask backend is deployed on Render's free tier, it may take 1-2 minutes to spin up after periods of inactivity.
        </p>
        <button
          onClick={fetchStats}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-indigo-100 active:scale-95 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const aiBar = [
    { name: 'Resume Fit', count: stats.ai_usage?.analyze || 0 },
    { name: 'Cover Letter', count: stats.ai_usage?.cover_letter || 0 },
    { name: 'Refine', count: stats.ai_usage?.refine || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.users.total} sub={`+${stats.users.new_this_week} this week`} icon={Users} color="bg-indigo-600 shadow-sm shadow-indigo-100" />
        <StatCard label="Active (7d)" value={stats.users.active_this_week} sub="logged in last 7 days" icon={TrendingUp} color="bg-emerald-600 shadow-sm shadow-emerald-100" />
        <StatCard label="Applications" value={stats.applications.total} sub={`+${stats.applications.this_week} this week`} icon={Briefcase} color="bg-blue-600 shadow-sm shadow-blue-100" />
        <StatCard label="AI Events" value={Object.values(stats.ai_usage).reduce((a, b) => a + b, 0)} sub="total AI feature calls" icon={Sparkles} color="bg-violet-600 shadow-sm shadow-violet-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 tracking-tight">New Signups (30d)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.daily_signups}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 tracking-tight">AI Feature Usage</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={aiBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 tracking-tight">Daily AI Events (30d)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.daily_ai}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 tracking-tight">Top Portals</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.top_portals} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis type="category" dataKey="portal" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
