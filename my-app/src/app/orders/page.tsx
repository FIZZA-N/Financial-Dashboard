'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { BellIcon } from '@heroicons/react/24/outline';
import { useOrderStore, Order } from '@/store/orderStore';
import { generateOrderSlip, generateOrdersReport } from '@/lib/pdf';
import api from '@/lib/api';

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [logsCount, setLogsCount] = useState(0);
  const { orders, fetchOrders, createOrder, updateOrder, deleteOrder, loading } = useOrderStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'All'|'Paid'|'Unpaid'|'Partial'>('All');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<'All'|'Travel'|'Dates'|'Belts'>('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const generateId = () => String(Math.floor(10000 + Math.random() * 90000));

  const [formData, setFormData] = useState({
    businessType: 'Travel',
    orderId: '',
    orderType: 'Retail',
    productServiceName: '',
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    taxPercent: 0,
    partialPaidAmount: 0,
    partialRemainingAmount: 0,
    paymentStatus: 'Unpaid',
    paymentMethod: 'Cash',
    customerSupplierName: '',
    remarks: ''
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      fetchOrders();
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

  useEffect(() => {
    // Auto-generate ID when opening form for new order
    if (showForm && !editingOrder && !formData.orderId) {
      setFormData(prev => ({ ...prev, orderId: generateId() }));
    }
  }, [showForm, editingOrder]);

  useEffect(() => {
    // Recompute remaining for Partial
    if (formData.paymentStatus === 'Partial') {
      const tax = (formData.taxPercent || 0) / 100;
      const finalAmount = Math.round((formData.sellingPrice * (1 + tax)) * 100) / 100;
      const remaining = Math.max(0, finalAmount - (formData.partialPaidAmount || 0));
      if (remaining !== formData.partialRemainingAmount) {
        setFormData(prev => ({ ...prev, partialRemainingAmount: Math.round(remaining * 100) / 100 }));
      }
    }
  }, [formData.paymentStatus, formData.taxPercent, formData.sellingPrice, formData.partialPaidAmount]);

  const applyFilters = async () => {
    const params: any = {};
    if (startDate) params.startDate = new Date(startDate).toISOString();
    if (endDate) params.endDate = new Date(endDate).toISOString();
    if (paymentStatusFilter !== 'All') params.paymentStatus = paymentStatusFilter;
    if (businessTypeFilter !== 'All') params.businessType = businessTypeFilter;
    await fetchOrders(params);
    setPage(1);
  };

  // Delete-by-filter modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [delStart, setDelStart] = useState('');
  const [delEnd, setDelEnd] = useState('');
  const [delBusiness, setDelBusiness] = useState<'All'|'Travel'|'Dates'|'Belts'>('All');
  const [deleting, setDeleting] = useState(false);

  const clearDeleteFilters = () => {
    setDelStart('');
    setDelEnd('');
    setDelBusiness('All');
  };

  const deleteByFilter = async () => {
    setDeleting(true);
    try {
      const payload: any = {};
      if (delStart) payload.startDate = new Date(delStart).toISOString();
      if (delEnd) payload.endDate = new Date(delEnd).toISOString();
      if (delBusiness !== 'All') payload.businessType = delBusiness;
      await api.delete('/orders/bulk', { data: payload });
      setShowDeleteModal(false);
      clearDeleteFilters();
      await applyFilters();
    } catch (e) {
      console.error('Bulk delete failed', e);
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingOrder) {
        await updateOrder(editingOrder._id, formData);
      } else {
        await createOrder(formData);
      }
      
      setShowForm(false);
      setEditingOrder(null);
      setFormData({
        businessType: 'Travel',
        orderId: '',
        orderType: 'Retail',
        productServiceName: '',
        quantity: 0,
        costPrice: 0,
        sellingPrice: 0,
        taxPercent: 0,
        partialPaidAmount: 0,
        partialRemainingAmount: 0,
        paymentStatus: 'Unpaid',
        paymentMethod: 'Cash',
        customerSupplierName: '',
        remarks: ''
      });
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      businessType: order.businessType,
      orderId: order.orderId,
      orderType: order.orderType,
      productServiceName: order.productServiceName,
      quantity: order.quantity,
      costPrice: order.costPrice,
      sellingPrice: order.sellingPrice,
      taxPercent: (order as any).taxPercent || 0,
      partialPaidAmount: (order as any).partialPaidAmount || 0,
      partialRemainingAmount: (order as any).partialRemainingAmount || 0,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      customerSupplierName: order.customerSupplierName,
      remarks: order.remarks
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      await deleteOrder(id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">BD</div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Orders Management</h1>
            </div>
            <div className="flex gap-4">
              {user?.role === 'DataEntry' ? (
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Dashboard
                  </button>
                  <button onClick={() => { localStorage.setItem('logs_last_seen', String(Date.now())); setLogsCount(0); router.push('/logs'); }} title="Activity Logs" className="relative inline-flex items-center justify-center h-9 w-9 rounded-md bg-gray-100 hover:bg-gray-200">
                    <BellIcon className="h-5 w-5 text-gray-700" />
                    {logsCount > 0 && (
                      <span className="absolute -top-1 -right-1 text-xs bg-red-600 text-white rounded-full px-1.5 py-0.5">{logsCount}</span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
              <input type="datetime-local" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
              <input type="datetime-local" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business</label>
              <select value={businessTypeFilter} onChange={(e)=>setBusinessTypeFilter(e.target.value as any)} className="w-full px-3 py-2 border rounded-md">
                <option value="All">All</option>
                <option value="Travel">Travel</option>
                <option value="Dates">Dates</option>
                <option value="Belts">Belts</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
              <select value={paymentStatusFilter} onChange={(e)=>setPaymentStatusFilter(e.target.value as any)} className="w-full px-3 py-2 border rounded-md">
                <option value="All">All</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
            {paymentStatusFilter === 'Partial' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min Remaining</label>
                  <input id="minRemaining" name="minRemaining" type="number" step="0.01" className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Remaining</label>
                  <input id="maxRemaining" name="maxRemaining" type="number" step="0.01" className="w-full px-3 py-2 border rounded-md" />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={applyFilters} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apply</button>
              <button onClick={()=>{setStartDate('');setEndDate('');setPaymentStatusFilter('All');setBusinessTypeFilter('All');fetchOrders();}} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Reset</button>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingOrder(null);
              setFormData({
                businessType: 'Travel',
                orderId: '',
                orderType: 'Retail',
                productServiceName: '',
                quantity: 0,
                costPrice: 0,
                sellingPrice: 0,
                paymentStatus: 'Unpaid',
                paymentMethod: 'Cash',
                customerSupplierName: '',
                remarks: ''
              });
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            {showForm ? 'Cancel' : '+ Add New Order'}
          </button>
          <div>
            <button
              onClick={() => generateOrdersReport(orders, 'All Orders Report')}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Export All (PDF)
            </button>
            {user?.role !== 'DataEntry' && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="ml-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete by Filter
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">{editingOrder ? 'Edit Order' : 'New Order'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="Travel">Travel</option>
                  <option value="Dates">Dates</option>
                  <option value="Belts">Belts</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                <input
                  type="text"
                  value={formData.orderId}
                  onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                  placeholder="Auto-generated if left blank"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                <select
                  value={formData.orderType}
                  onChange={(e) => setFormData({ ...formData, orderType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="Retail">Retail</option>
                  <option value="Shopify">Shopify</option>
                  <option value="Preorder">Preorder</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Service">Service</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product/Service Name</label>
                <input
                  type="text"
                  value={formData.productServiceName}
                  onChange={(e) => setFormData({ ...formData, productServiceName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                <input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                <input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax (%)</label>
                <input
                  type="number"
                  value={formData.taxPercent}
                  onChange={(e) => setFormData({ ...formData, taxPercent: parseFloat(e.target.value || '0') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>

              {formData.paymentStatus === 'Partial' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                    <input
                      type="number"
                      value={formData.partialPaidAmount}
                      onChange={(e) => setFormData({ ...formData, partialPaidAmount: parseFloat(e.target.value || '0') })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Amount</label>
                    <input
                      type="number"
                      value={formData.partialRemainingAmount}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer/Supplier Name</label>
                <input
                  type="text"
                  value={formData.customerSupplierName}
                  onChange={(e) => setFormData({ ...formData, customerSupplierName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <button
                  type="submit"
                  className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.slice((page-1)*pageSize, page*pageSize).map((order) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.costPrice}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.sellingPrice}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">{order.profit}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                      order.paymentStatus === 'Unpaid' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(order)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    {user?.role !== 'DataEntry' && (
                      <button
                        onClick={() => handleDelete(order._id)}
                        className="text-red-600 hover:text-red-900 mr-3"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => generateOrderSlip(order)}
                      className="text-emerald-600 hover:text-emerald-800"
                    >
                      Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(orders.length / pageSize))}</div>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50">Prev</button>
            <button disabled={page*pageSize>=orders.length} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold mb-4">Delete Orders by Filter</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                <input type="datetime-local" value={delStart} onChange={(e)=>setDelStart(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                <input type="datetime-local" value={delEnd} onChange={(e)=>setDelEnd(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Business</label>
                <select value={delBusiness} onChange={(e)=>setDelBusiness(e.target.value as any)} className="w-full px-3 py-2 border rounded-md">
                  <option value="All">All</option>
                  <option value="Travel">Travel</option>
                  <option value="Dates">Dates</option>
                  <option value="Belts">Belts</option>
                </select>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded p-3 mb-4">
              This action is permanent and cannot be undone.
            </div>
            <div className="flex justify-between">
              <button onClick={clearDeleteFilters} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Clear</button>
              <div className="flex gap-2">
                <button onClick={()=>setShowDeleteModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
                <button disabled={deleting} onClick={deleteByFilter} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

