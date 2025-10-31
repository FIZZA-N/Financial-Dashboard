const mongoose = require('mongoose');

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
  productServiceName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  // Optional tax percent applied on selling price to compute finalAmount
  taxPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Final amount customer owes (sellingPrice + tax)
  finalAmount: {
    type: Number,
    default: function() {
      const tax = (this.taxPercent || 0) / 100;
      return Math.round((this.sellingPrice * (1 + tax)) * 100) / 100;
    }
  },
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
  remarks: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Profit calculated from finalAmount (includes tax) minus cost
  profit: {
    type: Number,
    default: function() {
      const tax = (this.taxPercent || 0) / 100;
      const finalAmount = Math.round((this.sellingPrice * (1 + tax)) * 100) / 100;
      return finalAmount - this.costPrice;
    }
  },
  // Partial payment tracking (used when paymentStatus === 'Partial')
  partialPaidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  partialRemainingAmount: {
    type: Number,
    default: function() {
      if (this.paymentStatus !== 'Partial') return 0;
      const tax = (this.taxPercent || 0) / 100;
      const finalAmount = Math.round((this.sellingPrice * (1 + tax)) * 100) / 100;
      const paid = this.partialPaidAmount || 0;
      const remaining = Math.max(0, finalAmount - paid);
      return Math.round(remaining * 100) / 100;
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);

