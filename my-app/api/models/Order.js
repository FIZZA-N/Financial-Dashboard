const mongoose = require('mongoose');

const ProductItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  basePrice: { type: Number, required: true, min: 0 },
  baseCost: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  businessType: {
    type: String,
    required: true,
    enum: ['Travel', 'Dates', 'Belts']
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  orderType: {
    type: String,
    required: true,
    enum: ['Retail', 'Shopify', 'Preorder', 'Wholesale', 'Service']
  },
  // New multi-product support
  products: {
    type: [ProductItemSchema],
    default: []
  },
  // Backward compatibility for single-product
  productServiceName: String,
  quantity: Number,
  costPrice: Number,
  sellingPrice: Number,

  taxPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  finalAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['Paid', 'Unpaid', 'Partial'],
    default: 'Unpaid'
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Bank', 'JazzCash', 'Online']
  },
  customerSupplierName: {
    type: String,
    required: true
  },
  // Reference to Customer for easy population
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  // Optional customer contact details (saved from order form)
  customerPhone: { type: String },
  customerAddress: { type: String },
  remarks: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profit: { type: Number, default: 0 },
  partialPaidAmount: { type: Number, default: 0, min: 0 },
  partialRemainingAmount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Pre-save hook to calculate totals
OrderSchema.pre('save', function(next) {
  const order = this;

  let totalSelling = 0;
  let totalCost = 0;

  if (order.products.length > 0) {
    // Multi-product calculation
    order.products.forEach(p => {
      totalSelling += (p.sellingPrice || p.basePrice) * (p.quantity || 0);
      totalCost += (p.costPrice || p.baseCost) * (p.quantity || 0);
    });
  } else if (order.sellingPrice && order.quantity) {
    // Single product fallback
    totalSelling = order.sellingPrice * order.quantity;
    totalCost = order.costPrice || 0;
  }

  const taxMultiplier = 1 + ((order.taxPercent || 0) / 100);
  order.finalAmount = Math.round(totalSelling * taxMultiplier * 100) / 100;
  order.profit = Math.round((totalSelling * taxMultiplier - totalCost) * 100) / 100;

  if (order.paymentStatus === 'Partial') {
    const remaining = Math.max(0, order.finalAmount - (order.partialPaidAmount || 0));
    order.partialRemainingAmount = Math.round(remaining * 100) / 100;
  } else {
    order.partialRemainingAmount = 0;
  }

  next();
});

module.exports = mongoose.model('Order', OrderSchema);
