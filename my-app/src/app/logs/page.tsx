'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type AuditLog = {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';
  entityType: string;
  entityId?: string;
  changes?: any;
  createdAt: string;
};

export default function LogsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState<'All'|'CREATE'|'UPDATE'|'DELETE'|'VIEW'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'Admin') {
      router.push('/orders');
      return;
    }
    fetchLogs();
  }, [isAuthenticated]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/audit-logs', { params: { limit: 200 } });
      let items: AuditLog[] = data;
      if (actionFilter !== 'All') items = items.filter(l => l.action === actionFilter);
      if (startDate) items = items.filter(l => new Date(l.createdAt) >= new Date(startDate));
      if (endDate) items = items.filter(l => new Date(l.createdAt) <= new Date(endDate));
      setLogs(items);
    } catch (e) {
      console.error('Fetch logs error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Activity Logs</h1>
            <div className="flex gap-2">
              <button onClick={()=>router.push('/dashboard')} className="px-4 py-2 bg-gray-600 text-white rounded-md">Dashboard</button>
              <button onClick={()=>router.push('/orders')} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Orders</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
              <select value={actionFilter} onChange={(e)=>setActionFilter(e.target.value as any)} className="w-full px-3 py-2 border rounded-md">
                <option>All</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="VIEW">VIEW</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
              <input type="datetime-local" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
              <input type="datetime-local" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex gap-2">
              <button onClick={fetchLogs} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Apply</button>
              <button onClick={()=>{setActionFilter('All');setStartDate('');setEndDate('');fetchLogs();}} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">Reset</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">When</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-6 py-4" colSpan={5}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td className="px-6 py-4" colSpan={5}>No logs</td></tr>
              ) : (
                logs.map((log) => {
                  const userName = typeof log.userId === 'object' ? `${(log.userId as any).name} (${(log.userId as any).email})` : (log.userName || 'Unknown');
                  return (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{userName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.action}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.entityType}{log.entityId ? ` (${log.entityId})` : ''}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xl truncate">{JSON.stringify(log.changes)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


