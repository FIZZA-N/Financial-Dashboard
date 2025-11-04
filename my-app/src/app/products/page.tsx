"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/Sidebar';

type Product = { _id: string; businessType: 'Travel'|'Dates'|'Belts'; name: string; basePrice: number; baseCost?: number; deliveryCharges?: number };

export default function ProductsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [businessType, setBusinessType] = useState<'Dates'|'Travel'|'Belts'>('Dates');
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [baseCost, setBaseCost] = useState<number>(0);
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    load();
  }, [isAuthenticated, businessType]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', { params: { businessType } });
      setItems(data);
    } finally { setLoading(false); }
  };

  const addProduct = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, { businessType, name, basePrice, baseCost, deliveryCharges });
        setEditingId(null);
      } else {
        await api.post('/products', { businessType, name, basePrice, baseCost, deliveryCharges });
      }
      setName(''); setBasePrice(0); setBaseCost(0); setDeliveryCharges(0);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    await api.delete(`/products/${id}`);
    await load();
  };

  const edit = (p: Product) => {
    setEditingId(p._id);
    setBusinessType(p.businessType);
    setName(p.name);
    setBasePrice(p.basePrice || 0);
    // stored baseCost already includes delivery charges per server logic; expose deliveryCharges separately when present
  const del = (p as any).deliveryCharges || 0;
  // stored p.baseCost already includes deliveryCharges (server stores baseCost + delivery). When editing, expose baseCost without delivery so server can recompute.
  setBaseCost((p.baseCost || 0) - del);
  setDeliveryCharges(del);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1">
        <nav className="bg-white border-b sticky top-0 z-50">
          <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">PS</div>
            <button onClick={()=>router.push('/orders')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md">Orders</button>
          </div>
        </nav>

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business</label>
              <select value={businessType} onChange={(e)=>setBusinessType(e.target.value as any)} className="w-full px-3 py-2 border rounded-md">
                <option value="Dates">Dates</option>
                <option value="Travel">Travel</option>
                <option value="Belts">Belts</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base Price</label>
              <input type="number" step="0.01" value={basePrice} onChange={(e)=>setBasePrice(parseFloat(e.target.value||'0'))} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base Cost</label>
              <input type="number" step="0.01" value={baseCost} onChange={(e)=>setBaseCost(parseFloat(e.target.value||'0'))} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Charges</label>
              <input type="number" step="0.01" value={deliveryCharges} onChange={(e)=>setDeliveryCharges(parseFloat(e.target.value||'0'))} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex items-end">
              <button disabled={saving} onClick={addProduct} className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md disabled:opacity-50">{saving ? 'Saving...' : (editingId ? 'Update' : 'Add')}</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-6 py-4" colSpan={6}>Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="px-6 py-4" colSpan={6}>No products</td></tr>
              ) : (
                items.map(p => (
                  <tr key={p._id}>
                    <td className="px-6 py-4 text-sm">{p.name}</td>
                    <td className="px-6 py-4 text-sm">{p.businessType}</td>
                    <td className="px-6 py-4 text-sm">{p.basePrice}</td>
                    <td className="px-6 py-4 text-sm">{p.baseCost || 0}</td>
                    <td className="px-6 py-4 text-sm">{(p as any).deliveryCharges || 0}</td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={()=>edit(p)} className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                      <button onClick={()=>remove(p._id)} className="text-rose-600 hover:text-rose-800">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}


