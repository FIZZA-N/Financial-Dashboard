 'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/Sidebar';
import { useOrderStore, Order } from '@/store/orderStore';
import { generateOrdersReport } from '@/lib/pdf';
import FiltersSection from './components/FiltersSection';
import OrdersTable from "@/app/orders/components/OrdersTable";
import OrderFormModal from './components/OrderFormModal';
import DeleteModal from './components/DeleteModal';
import HeaderActions from './components/HeaderActions';
import api from '@/lib/api';

type BusinessType = 'Travel' | 'Dates' | 'Belts';
 export type FormData = {
  businessType: BusinessType;
  orderId: string;
  orderType: 'Retail' | 'Shopify' | 'Preorder' | 'Wholesale' | 'Service';
  productServiceName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  taxPercent: number;
  partialPaidAmount: number;
  partialRemainingAmount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paymentMethod: 'Cash' | 'Bank' | 'JazzCash' | 'Online';
  customerSupplierName: string;
  remarks: string;
};

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

  const [formData, setFormData] = useState<FormData>({
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

  // Delete-by-filter modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [delStart, setDelStart] = useState('');
  const [delEnd, setDelEnd] = useState('');
  const [delBusiness, setDelBusiness] = useState<'All'|'Travel'|'Dates'|'Belts'>('All');
  const [deleting, setDeleting] = useState(false);

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

  const applyFilters = async () => {
    const params: any = {};
    if (startDate) params.startDate = new Date(startDate).toISOString();
    if (endDate) params.endDate = new Date(endDate).toISOString();
    if (paymentStatusFilter !== 'All') params.paymentStatus = paymentStatusFilter;
    if (businessTypeFilter !== 'All') params.businessType = businessTypeFilter;
    await fetchOrders(params);
    setPage(1);
  };

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

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setPaymentStatusFilter('All');
    setBusinessTypeFilter('All');
    fetchOrders();
  };

  const openAddOrderForm = () => {
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
      taxPercent: 0,
      partialPaidAmount: 0,
      partialRemainingAmount: 0,
      paymentStatus: 'Unpaid',
      paymentMethod: 'Cash',
      customerSupplierName: '',
      remarks: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isAdmin={user?.role==='Admin'} />
      <div className="flex-1">
        <nav className="bg-white border-b sticky top-0 z-50">
          <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">BD</div>
            <button onClick={logout} className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700">Sign out</button>
          </div>
        </nav>

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <FiltersSection
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            businessTypeFilter={businessTypeFilter}
            setBusinessTypeFilter={setBusinessTypeFilter}
            paymentStatusFilter={paymentStatusFilter}
            setPaymentStatusFilter={setPaymentStatusFilter}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
          />

          <HeaderActions
            showForm={showForm}
            openAddOrderForm={openAddOrderForm}
            generateOrdersReport={() => generateOrdersReport(orders, 'All Orders Report')}
            router={router}
            user={user}
            setShowDeleteModal={setShowDeleteModal}
          />

          <OrderFormModal
            showForm={showForm}
            setShowForm={setShowForm}
            editingOrder={editingOrder}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
          />

          <OrdersTable
            orders={orders}
            page={page}
            pageSize={pageSize}
            user={user}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(orders.length / pageSize))}</div>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50">Prev</button>
              <button disabled={page*pageSize>=orders.length} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>

      <DeleteModal
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        delStart={delStart}
        setDelStart={setDelStart}
        delEnd={delEnd}
        setDelEnd={setDelEnd}
        delBusiness={delBusiness}
        setDelBusiness={setDelBusiness}
        deleting={deleting}
        clearDeleteFilters={clearDeleteFilters}
        deleteByFilter={deleteByFilter}
      />
    </div>
  );
}