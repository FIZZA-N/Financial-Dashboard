const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const audit = require('../middleware/audit');

async function generateUniqueOrderId() {
  let id;
  let exists = true;
  while (exists) {
    id = String(Math.floor(10000 + Math.random() * 90000));
    // eslint-disable-next-line no-await-in-loop
    exists = await Order.exists({ orderId: id });
  }
  return id;
}

function computeDerived(data) {
  const tax = (data.taxPercent || 0) / 100;
  const finalAmount = Math.round((data.sellingPrice * (1 + tax)) * 100) / 100;
  const profit = finalAmount - data.costPrice;
  const partialPaid = Number(data.partialPaidAmount || 0);
  const partialRemainingAmount = data.paymentStatus === 'Partial' ? Math.max(0, finalAmount - partialPaid) : 0;
  return { finalAmount, profit, partialRemainingAmount };
}

// Create order
router.post('/', auth, audit('CREATE', 'Order'), async (req, res) => {
  try {
    const base = { ...req.body };
    if (!base.orderId) base.orderId = await generateUniqueOrderId();
    const { finalAmount, profit, partialRemainingAmount } = computeDerived(base);
    const order = new Order({
      ...base,
      userId: req.user._id,
      finalAmount,
      profit,
      partialRemainingAmount,
    });
    await order.save();
    res.json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all orders with filters
router.get('/', auth, async (req, res) => {
  try {
    const { businessType, paymentStatus, startDate, endDate, minRemaining, maxRemaining } = req.query;
    const query = {};
    if (businessType) query.businessType = businessType;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if ((minRemaining || maxRemaining) && (!paymentStatus || paymentStatus === 'Partial')) {
      query.paymentStatus = 'Partial';
      query.partialRemainingAmount = {};
      if (minRemaining) query.partialRemainingAmount.$gte = Number(minRemaining);
      if (maxRemaining) query.partialRemainingAmount.$lte = Number(maxRemaining);
    }
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update order
router.put('/:id', auth, audit('UPDATE', 'Order'), async (req, res) => {
  try {
    // capture before for audit
    res.locals.entityBefore = await Order.findById(req.params.id).lean();
    const base = { ...req.body };
    const { finalAmount, profit, partialRemainingAmount } = computeDerived(base);
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { ...base, finalAmount, profit, partialRemainingAmount },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Bulk delete by filters (must be BEFORE ':id' route to avoid routing conflicts)
router.delete('/bulk', auth, audit('DELETE', 'Order'), async (req, res) => {
  try {
    if (req.user.role === 'DataEntry') return res.status(403).json({ message: 'DataEntry is not allowed to delete orders' });
    const { businessType, startDate, endDate } = req.body || {};
    const query = {};
    if (businessType && businessType !== 'All') query.businessType = businessType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    // capture before count for audit context
    const toDelete = await Order.find(query).select('_id orderId productServiceName').lean();
    res.locals.entityBefore = { items: toDelete };
    const result = await Order.deleteMany(query);
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete order
router.delete('/:id', auth, audit('DELETE', 'Order'), async (req, res) => {
  try {
    if (req.user.role === 'DataEntry') return res.status(403).json({ message: 'DataEntry is not allowed to delete orders' });
    // capture before for audit
    res.locals.entityBefore = await Order.findById(req.params.id).lean();
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

