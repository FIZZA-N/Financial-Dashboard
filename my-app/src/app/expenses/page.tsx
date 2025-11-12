"use client";
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { toast } from '@/store/toastStore';

export default function ExpensesPage() {
  // businessAdd is used in the Add Expense form; businessFilter is used for listing/filtering
  const [businessAdd, setBusinessAdd] = useState<'Travel'|'Dates'|'Belts'>('Dates');
  const [businessFilter, setBusinessFilter] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<any | null>(null);
  const debounceRef = useRef<number | null>(null);

  const load = async (p = 1) => {
    setLoading(true);
    try {
  const params: any = { page: p, limit: 50 };
  if (businessFilter) params.businessType = businessFilter;
      if (q) params.q = q;
      if (startDateFilter) params.startDate = new Date(startDateFilter).toISOString();
      if (endDateFilter) params.endDate = new Date(endDateFilter).toISOString();
      if (minAmount) params.minAmount = Number(minAmount);
      if (maxAmount) params.maxAmount = Number(maxAmount);
      const { data } = await api.get('/expenses', { params });
      if (data && data.items) {
        setList(data.items);
        setPage(data.page || 1);
        setPages(data.pages || 1);
      }
    } catch (e) {
      console.error('Failed to load expenses', e);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [businessFilter]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => load(1), 300);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [q, startDateFilter, endDateFilter, minAmount, maxAmount]);

  const save = async () => {
    try {
  const payload = { businessType: businessAdd, amount, description, date: date || new Date().toISOString() };
      await api.post('/expenses', payload);
      toast.success('Expense saved');
      setAmount(0); setDescription(''); setDate('');
      load(1);
    } catch (e:any) {
      console.error('Save failed', e);
      toast.error(e?.response?.data?.message || 'Failed to save expense');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Deleted');
      load(page);
    } catch (e) {
      console.error('Delete failed', e);
      toast.error('Delete failed');
    }
  };

  const startEdit = (exp: any) => {
    setEditing({ ...exp });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const payload = { businessType: editing.businessType, amount: Number(editing.amount || 0), description: editing.description, date: editing.date };
      await api.put(`/expenses/${editing._id}`, payload);
      toast.success('Expense updated');
      setEditing(null);
      load(page);
    } catch (e) {
      console.error('Update failed', e);
      toast.error('Update failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isAdmin={true} />
      <div className="flex-1 p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Expenses & Ledger</h1>

        {/* Top controls: add form + filters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Add Expense</h3>
            <div className="space-y-2">
              <label className="text-xs">Business</label>
              <select className="block w-full px-2 py-1 border rounded" value={businessAdd} onChange={(e)=>setBusinessAdd(e.target.value as any)}>
                <option value="Dates">Dates</option>
                <option value="Travel">Travel</option>
                <option value="Belts">Belts</option>
              </select>

              <label className="text-xs">Amount</label>
              <input type="number" className="w-full px-2 py-1 border rounded" value={amount} onChange={(e)=>setAmount(Number(e.target.value))} />

              <label className="text-xs">Date</label>
              <input type="date" className="w-full px-2 py-1 border rounded" value={date} onChange={(e)=>setDate(e.target.value)} />

              <label className="text-xs">Description</label>
              <input className="w-full px-2 py-1 border rounded" value={description} onChange={(e)=>setDescription(e.target.value)} />

              <div className="text-right">
                <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded">Add Expense</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Search / Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <input placeholder="Search description..." value={q} onChange={(e)=>setQ(e.target.value)} className="px-3 py-2 border rounded col-span-2" />
              <select value={businessFilter} onChange={(e)=>setBusinessFilter(e.target.value)} className="px-3 py-2 border rounded">
                <option value="">All Business</option>
                <option value="Dates">Dates</option>
                <option value="Travel">Travel</option>
                <option value="Belts">Belts</option>
              </select>
              <input type="date" value={startDateFilter} onChange={(e)=>setStartDateFilter(e.target.value)} className="px-3 py-2 border rounded" />
              <input type="date" value={endDateFilter} onChange={(e)=>setEndDateFilter(e.target.value)} className="px-3 py-2 border rounded" />
              <input placeholder="Min amount" value={minAmount} onChange={(e)=>setMinAmount(e.target.value)} className="px-3 py-2 border rounded" />
              <input placeholder="Max amount" value={maxAmount} onChange={(e)=>setMaxAmount(e.target.value)} className="px-3 py-2 border rounded" />
            </div>
          </div>
        </div>

        {/* Table / ledger */}
        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Ledger Entries</h4>
            <div className="text-sm text-gray-600">Showing {list.length} items</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="p-2">Date</th>
                  <th className="p-2">Business</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="p-4">Loading...</td></tr>}
                {!loading && list.map(l=> (
                  <tr key={l._id} className="border-t hover:bg-gray-50">
                    <td className="p-2 align-top w-32">{new Date(l.date).toLocaleDateString()}</td>
                    <td className="p-2 align-top w-28">{l.businessType}</td>
                    <td className="p-2 align-top">{l.description}</td>
                    <td className="p-2 align-top font-medium">-{Number(l.amount).toFixed(2)}</td>
                    <td className="p-2 align-top">
                      <div className="flex gap-2">
                        <button onClick={()=>startEdit(l)} className="px-2 py-1 bg-amber-500 text-white rounded">Edit</button>
                        <button onClick={()=>remove(l._id)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && list.length===0 && <tr><td colSpan={5} className="p-4 text-sm text-gray-500">No expenses found</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">Page {page} / {pages}</div>
            <div>
              <button disabled={page<=1} onClick={()=>load(page-1)} className="px-2 py-1 border rounded mr-2">Prev</button>
              <button disabled={page>=pages} onClick={()=>load(page+1)} className="px-2 py-1 border rounded">Next</button>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded shadow w-full max-w-lg">
              <h3 className="font-semibold mb-3">Edit Expense</h3>
              <div className="grid grid-cols-1 gap-2">
                <label className="text-xs">Business</label>
                <select value={editing.businessType} onChange={(e)=>setEditing({...editing, businessType: e.target.value})} className="px-2 py-1 border rounded">
                  <option value="Dates">Dates</option>
                  <option value="Travel">Travel</option>
                  <option value="Belts">Belts</option>
                </select>
                <label className="text-xs">Amount</label>
                <input type="number" value={editing.amount} onChange={(e)=>setEditing({...editing, amount: e.target.value})} className="px-2 py-1 border rounded" />
                <label className="text-xs">Date</label>
                <input type="date" value={editing.date ? new Date(editing.date).toISOString().slice(0,10) : ''} onChange={(e)=>setEditing({...editing, date: e.target.value})} className="px-2 py-1 border rounded" />
                <label className="text-xs">Description</label>
                <input value={editing.description} onChange={(e)=>setEditing({...editing, description: e.target.value})} className="px-2 py-1 border rounded" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=>setEditing(null)} className="px-3 py-1 border rounded">Cancel</button>
                <button onClick={saveEdit} className="px-3 py-1 bg-indigo-600 text-white rounded">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
