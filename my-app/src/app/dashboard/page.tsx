'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore, Order } from '@/store/orderStore';
import api from '@/lib/api';
import { generateBusinessReport } from '@/lib/pdf';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { BellIcon } from '@heroicons/react/24/outline';

interface Summary {
  summary: {
    Travel: { sales: number; cost: number; profit: number; pending: number; loss: number; orderCount: number };
    Dates: { sales: number; cost: number; profit: number; pending: number; loss: number; orderCount: number };
    Belts: { sales: number; cost: number; profit: number; pending: number; loss: number; orderCount: number };
  };
  totals: {
    sales: number;
    cost: number;
    profit: number;
    pending: number;
    loss: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { orders, fetchOrders, loading } = useOrderStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeBusiness, setActiveBusiness] = useState<'Travel' | 'Dates' | 'Belts' | 'All'>('All');
  const [startDate, setStartDate] = useState<string>(''); // ISO string for datetime-local
  const [endDate, setEndDate] = useState<string>('');
  const [logsCount, setLogsCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      if (user?.role === 'DataEntry') {
        router.push('/orders');
        return;
      }
      // Initial: current month summary + all orders
      fetchOrders();
      fetchSummary();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (user?.role === 'Admin') {
      const load = async () => {
        try {
          const { data } = await api.get('/users/audit-logs', { params: { limit: 20 } });
          const lastSeen = Number(localStorage.getItem('logs_last_seen') || '0');
          const newCount = data.filter((l: any) => new Date(l.createdAt).getTime() > lastSeen).length;
          setLogsCount(newCount);
        } catch (e) {}
      };
      load();
      const id = setInterval(load, 30000);
      return () => clearInterval(id);
    }
  }, [user?.role]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const { data } = await api.get('/summary/monthly');
      setSummary(data);
    } catch (error) {
      console.error('Fetch summary error:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount);
  };

  const syncToNow = () => {
    const now = new Date();
    setEndDate(now.toISOString().slice(0, 16));
  };

  const applyRange = async () => {
    const params: any = {};
    if (startDate) params.startDate = new Date(startDate).toISOString();
    if (endDate) params.endDate = new Date(endDate).toISOString();
    await fetchOrders(params);
  };

  const computedByBusiness = useMemo(() => {
    const groups: Record<'Travel'|'Dates'|'Belts', { sales: number; cost: number; profit: number; pending: number; orderCount: number }> = {
      Travel: { sales: 0, cost: 0, profit: 0, pending: 0, orderCount: 0 },
      Dates: { sales: 0, cost: 0, profit: 0, pending: 0, orderCount: 0 },
      Belts: { sales: 0, cost: 0, profit: 0, pending: 0, orderCount: 0 },
    };
    orders.forEach(o => {
      const g = groups[o.businessType];
      g.sales += o.sellingPrice;
      g.cost += o.costPrice;
      g.profit += o.profit;
      g.orderCount += 1;
      if (o.paymentStatus !== 'Paid') {
        g.pending += o.paymentStatus === 'Partial' ? o.sellingPrice * 0.5 : o.sellingPrice;
      }
    });
    const totals = Object.values(groups).reduce((acc, g) => ({
      sales: acc.sales + g.sales,
      cost: acc.cost + g.cost,
      profit: acc.profit + g.profit,
      pending: acc.pending + g.pending,
    }), { sales: 0, cost: 0, profit: 0, pending: 0 });
    return { groups, totals };
  }, [orders]);

  const businessOrders = (business: 'Travel' | 'Dates' | 'Belts' | 'All'): Order[] => {
    if (business === 'All') return orders;
    return orders.filter(o => o.businessType === business);
  };
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const businessChartData = summary ? [
    { name: 'Travel', sales: summary.summary.Travel.sales, cost: summary.summary.Travel.cost, profit: summary.summary.Travel.profit, loss: summary.summary.Travel.loss },
    { name: 'Dates', sales: summary.summary.Dates.sales, cost: summary.summary.Dates.cost, profit: summary.summary.Dates.profit, loss: summary.summary.Dates.loss },
    { name: 'Belts', sales: summary.summary.Belts.sales, cost: summary.summary.Belts.cost, profit: summary.summary.Belts.profit, loss: summary.summary.Belts.loss },
  ] : [];

  if (loading || summaryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">PS</div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Pak Soorty Business Dashboard</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => router.push('/orders')}
                className="hidden sm:inline-flex px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                title="Manage Orders"
              >
                Orders
              </button>
              {user?.role === 'Admin' && (
                <button onClick={() => { localStorage.setItem('logs_last_seen', String(Date.now())); setLogsCount(0); router.push('/logs'); }} title="Activity Logs" className="relative inline-flex items-center justify-center h-9 w-9 rounded-md bg-gray-100 hover:bg-gray-200">
                  <BellIcon className="h-5 w-5 text-gray-700" />
                  {logsCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-xs bg-red-600 text-white rounded-full px-1.5 py-0.5">{logsCount}</span>
                  )}
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-700">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-semibold">
                  {user?.name?.[0]}
                </div>
                <span>{user?.name}</span>
                <span className="text-gray-400">•</span>
                <span>{user?.role}</span>
              </div>
              <button
                onClick={()=>{logout; router.push("/login");}}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Business</label>
                <select
                  value={activeBusiness}
                  onChange={(e)=>{ setActiveBusiness(e.target.value as any); setPage(1); }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="All">All</option>
                  <option value="Travel">Travel</option>
                  <option value="Dates">Dates</option>
                  <option value="Belts">Belts</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={syncToNow} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Now</button>
              <button onClick={applyRange} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apply</button>
              <button onClick={()=>{ setStartDate(''); setEndDate(''); setActiveBusiness('All'); fetchOrders(); }} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Clear All</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Sales</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {summary ? formatCurrency(summary.totals.sales) : formatCurrency(computedByBusiness.totals.sales)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Cost</h3>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {summary ? formatCurrency(summary.totals.cost) : formatCurrency(computedByBusiness.totals.cost)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Net Profit</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {summary ? formatCurrency(summary.totals.profit) : formatCurrency(computedByBusiness.totals.profit)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Pending Payments</h3>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {summary ? formatCurrency(summary.totals.pending) : formatCurrency(computedByBusiness.totals.pending)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Loss</h3>
            <p className="text-2xl font-bold text-rose-600 mt-2">
              {summary ? formatCurrency(summary.totals.loss) : '0'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Business Comparison</h2>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={businessChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#10b981" name="Sales" />
                <Bar dataKey="cost" fill="#64748b" name="Cost" />
                <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
                <Bar dataKey="loss" fill="#f59e0b" name="Loss" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {(summary ? ['Travel','Dates','Belts'] : ['Travel','Dates','Belts']).map((business) => {
            const data = summary
              ? summary.summary[business as keyof typeof summary.summary]
              : (computedByBusiness.groups as any)[business];
            return (
              <div key={business} className={`bg-white rounded-lg shadow p-6 border ${activeBusiness===business ? 'border-indigo-500' : 'border-transparent'}`}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">{business}</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sales:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(data.sales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(data.cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(data.profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orders:</span>
                    <span className="font-semibold">{data.orderCount}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setActiveBusiness(business as any)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => generateBusinessReport({ business: business as any, orders: businessOrders(business as any), summary: data })}
                      className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unpaid/Pending section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Unpaid & Partial Payments</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {(['Travel','Dates','Belts'] as const).map(b => {
              const g = (computedByBusiness.groups as any)[b];
              return (
                <div key={b} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">{b}</span>
                    <span className="text-sm text-gray-500">Orders: {g.orderCount}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">Pending: {formatCurrency(g.pending)}</div>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders
                  .filter(o => o.paymentStatus !== 'Paid')
                  .map(o => {
                    const pendingAmt = o.paymentStatus === 'Partial' ? o.sellingPrice * 0.5 : o.sellingPrice;
                    return (
                      <tr key={o._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{o.businessType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{o.orderId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{o.customerSupplierName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{o.paymentStatus}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-600">{formatCurrency(pendingAmt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(o.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">{activeBusiness==='All' ? 'Recent Orders' : `${activeBusiness} Orders`}</h2>
              <div className="flex gap-2">
                {['All','Travel','Dates','Belts'].map(b => (
                  <button
                    key={b}
                    onClick={() => setActiveBusiness(b as any)}
                    className={`px-3 py-1 rounded text-sm ${activeBusiness===b ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {businessOrders(activeBusiness).slice((page-1)*pageSize, page*pageSize).map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.businessType === 'Travel' ? 'bg-blue-100 text-blue-800' :
                        order.businessType === 'Dates' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {order.businessType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.orderId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.productServiceName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                        order.paymentStatus === 'Unpaid' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {formatCurrency(order.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(businessOrders(activeBusiness).length / pageSize))}</div>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50">Prev</button>
              <button disabled={page*pageSize>=businessOrders(activeBusiness).length} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

