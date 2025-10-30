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
  profit: {
    type: Number,
    default: function() {
      return this.sellingPrice - this.costPrice;
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);

