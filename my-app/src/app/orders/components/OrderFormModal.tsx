import { useState, useEffect } from 'react';
import { Order } from '@/store/orderStore';
import api from '@/lib/api';
import { FormData } from '../page'; 
interface OrderFormModalProps {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editingOrder: Order | null;
  formData: any;
  setFormData: (data: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export default function OrderFormModal({
  showForm,
  setShowForm,
  editingOrder,
  formData,
  setFormData,
  handleSubmit
}: OrderFormModalProps) {
  const [products, setProducts] = useState<{ _id: string; name: string; basePrice: number; baseCost?: number }[]>([]);
  const [productQuery, setProductQuery] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      if (formData.businessType === 'Dates') {
        const { data } = await api.get('/products', { params: { businessType: 'Dates', q: productQuery || undefined } });
        setProducts(data);
      } else {
        setProducts([]);
      }
    };
    loadProducts();
  }, [formData.businessType, productQuery, showForm]);

  useEffect(() => {
    // Recompute remaining for Partial
    if (formData.paymentStatus === 'Partial') {
      const tax = (formData.taxPercent || 0) / 100;
      const finalAmount = Math.round((formData.sellingPrice * (1 + tax)) * 100) / 100;
      const remaining = Math.max(0, finalAmount - (formData.partialPaidAmount || 0));
      if (remaining !== formData.partialRemainingAmount) {
        setFormData((prev: FormData) => ({ ...prev, partialRemainingAmount: Math.round(remaining * 100) / 100 }));
      }
    }
  }, [formData.paymentStatus, formData.taxPercent, formData.sellingPrice, formData.partialPaidAmount]);

  // When product changes or quantity changes for Dates, auto-price
  useEffect(() => {
    if (formData.businessType === 'Dates') {
      const selected = products.find(p => p.name === formData.productServiceName);
      if (selected) {
        const price = (selected.basePrice || 0) * Math.max(1, Number(formData.quantity || 0));
        setFormData((prev: FormData) => ({ ...prev, sellingPrice: price, costPrice: (selected.baseCost || 0) * Math.max(1, Number(prev.quantity || 0)) }));
      }
    }
  }, [formData.productServiceName, formData.quantity, formData.businessType, products]);

  if (!showForm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{editingOrder ? 'Edit Order' : 'New Order'}</h2>
          <button onClick={()=>setShowForm(false)} type="button" className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
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
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Product/Service
  </label>

  {formData.businessType === "Dates" ? (
    <>
      {formData.productServiceName ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg w-full">
          <span className="text-indigo-700 font-medium">{formData.productServiceName}</span>
          <button
            onClick={() => setFormData({ ...formData, productServiceName: "" })}
            className="text-indigo-500 hover:text-red-600 transition"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            placeholder="Search product..."
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
          />

          {productQuery && products.length > 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 max-h-56 overflow-y-auto shadow-xl animate-fadeIn z-50">
              {products.map((p) => (
                <div
                  key={p._id}
                  onClick={() => {
                    setFormData({ ...formData, productServiceName: p.name });
                    setProductQuery("");
                  }}
                  className="px-4 py-3 cursor-pointer hover:bg-indigo-50 flex justify-between items-center transition"
                >
                  <span className="font-medium text-gray-800">{p.name}</span>
                  <span className="text-xs text-gray-500">Base: {p.basePrice}</span>
                </div>
              ))}
            </div>
          )}

          {productQuery && products.length === 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 px-4 py-3 shadow-md text-sm text-gray-500">
              No products found.
            </div>
          )}
        </div>
      )}
    </>
  ) : (
    <input
      type="text"
      value={formData.productServiceName}
      onChange={(e) =>
        setFormData({ ...formData, productServiceName: e.target.value })
      }
      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
      required
    />
  )}
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

          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              {editingOrder ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}