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
  // For multi-product support (preferred)
  products?: Array<{
    productId: string;
    name: string;
    quantity: number;
    basePrice: number;
    baseCost?: number;
    sellingPrice: number;
    costPrice: number;
  }>;
  // Backwards-compatible single-product fields
  productServiceName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  taxPercent: number;
  partialPaidAmount: number;
  partialRemainingAmount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paymentMethod: 'Cash' | 'Bank' | 'JazzCash' | 'Online';
  // Client info (phone lookup will populate name/address)
  clientPhone?: string;
  clientName?: string;
  clientAddress?: string;
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
    products: [],
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    taxPercent: 0,
    partialPaidAmount: 0,
    partialRemainingAmount: 0,
    paymentStatus: 'Unpaid',
    paymentMethod: 'Cash',
    clientPhone: '',
    clientName: '',
    clientAddress: '',
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
      // Prepare payload: prefer products array if present
      const payload: any = { ...formData };
      if (formData.products && formData.products.length > 0) {
        // Ensure numeric values and remove client transient fields
        payload.products = formData.products.map(p => ({
          productId: p.productId,
          name: p.name,
          quantity: Number(p.quantity),
          basePrice: Number(p.basePrice),
          baseCost: Number(p.baseCost || 0),
          sellingPrice: Number(p.sellingPrice),
          costPrice: Number(p.costPrice)
        }));
        // keep sellingPrice/costPrice totals for backwards compatibility
        payload.sellingPrice = Number(formData.sellingPrice || 0);
        payload.costPrice = Number(formData.costPrice || 0);
        // Provide a human-friendly productServiceName for legacy fields and validations
        payload.productServiceName = formData.products.map(p => p.name).join(', ');
      }
      // Ensure customerSupplierName is present (backend requires it)
      if (!payload.customerSupplierName) payload.customerSupplierName = formData.clientName || formData.customerSupplierName || '';

      // If clientPhone provided, ensure a Customer exists: lookup by phone, create if missing
      if (formData.clientPhone) {
        try {
          const { data: existing } = await api.get('/customers', { params: { phone: formData.clientPhone } });
          if (existing && existing.name) {
            payload.customerSupplierName = existing.name;
          }
        } catch (e) {
          // Not found -> create customer record before creating order
          try {
            const createPayload = {
              name: formData.clientName || payload.customerSupplierName || 'Unknown',
              phone: formData.clientPhone,
              address: formData.clientAddress || ''
            };
            const { data: created } = await api.post('/customers', createPayload);
            if (created && created.name) payload.customerSupplierName = created.name;
          } catch (ce) {
            // swallow customer create errors but continue to create order (backend will still validate required fields)
            console.error('Customer create failed', ce);
          }
        }
      }

        // persist customer contact fields on the order so slips can use them
        if (formData.clientPhone) payload.customerPhone = formData.clientPhone;
        if (formData.clientAddress) payload.customerAddress = formData.clientAddress;

      // If products array present, ensure totals and total quantity are computed now (avoid stale state)
      if (payload.products && payload.products.length > 0) {
        const totalSelling = payload.products.reduce((s: number, p: any) => s + (Number(p.sellingPrice || p.basePrice || 0) * Number(p.quantity || 0)), 0);
        const totalCost = payload.products.reduce((s: number, p: any) => s + (Number(p.costPrice || p.baseCost || 0) * Number(p.quantity || 0)), 0);
        const totalQty = payload.products.reduce((s: number, p: any) => s + Number(p.quantity || 0), 0);
        payload.sellingPrice = Math.round(totalSelling * 100) / 100;
        payload.costPrice = Math.round(totalCost * 100) / 100;
        payload.quantity = totalQty;
      }

      if (editingOrder) {
        await updateOrder(editingOrder._id, payload);
      } else {
        await createOrder(payload);
      }
      
      setShowForm(false);
      setEditingOrder(null);
      setFormData({
        businessType: 'Travel',
        orderId: '',
        orderType: 'Retail',
        productServiceName: '',
        products: [],
        quantity: 0,
        costPrice: 0,
        sellingPrice: 0,
        taxPercent: 0,
        partialPaidAmount: 0,
        partialRemainingAmount: 0,
        paymentStatus: 'Unpaid',
        paymentMethod: 'Cash',
        clientPhone: '',
        clientName: '',
        clientAddress: '',
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
      productServiceName: order.productServiceName || '',
      products: (order as any).products && (order as any).products.length > 0 ? (order as any).products.map((p: any) => ({
        productId: p.productId || p._id || '',
        name: p.name,
        quantity: p.quantity,
        basePrice: p.basePrice,
        baseCost: p.baseCost || 0,
        sellingPrice: p.sellingPrice,
        costPrice: p.costPrice
      })) : [],
      quantity: order.quantity || 0,
      costPrice: order.costPrice || 0,
      sellingPrice: order.sellingPrice || 0,
      taxPercent: (order as any).taxPercent || 0,
      partialPaidAmount: (order as any).partialPaidAmount || 0,
      partialRemainingAmount: (order as any).partialRemainingAmount || 0,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      clientPhone: (order as any).clientPhone || '',
      clientName: order.customerSupplierName || '',
      clientAddress: (order as any).clientAddress || '',
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
      products: [],
      quantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      taxPercent: 0,
      partialPaidAmount: 0,
      partialRemainingAmount: 0,
      paymentStatus: 'Unpaid',
      paymentMethod: 'Cash',
      clientPhone: '',
      clientName: '',
      clientAddress: '',
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