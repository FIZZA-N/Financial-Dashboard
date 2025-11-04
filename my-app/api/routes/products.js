const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Create product
router.post('/', auth, async (req, res) => {
  try {
    const { businessType, name, basePrice, baseCost, deliveryCharges } = req.body;
    const computedBaseCost = Number(baseCost || 0) + Number(deliveryCharges || 0);
    const created = await Product.create({ businessType, name, basePrice, baseCost: computedBaseCost, deliveryCharges: Number(deliveryCharges || 0) });
    res.json(created);
  } catch (e) {
    console.error('Create product error:', e);
    res.status(500).json({ message: e.message });
  }
});

// List products (optional filters: businessType, q)
router.get('/', auth, async (req, res) => {
  try {
    const { businessType, q } = req.query;
    const filter = {};
    if (businessType) filter.businessType = businessType;
    if (q) filter.name = { $regex: String(q), $options: 'i' };
    const items = await Product.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    console.error('List products error:', e);
    res.status(500).json({ message: e.message });
  }
});

// Update
router.put('/:id', auth, async (req, res) => {
  try {
    // If deliveryCharges provided, compute total baseCost = provided baseCost + deliveryCharges
    const body = { ...req.body };
    if (body.deliveryCharges !== undefined || body.baseCost !== undefined) {
      const baseCostVal = Number(body.baseCost || 0);
      const deliveryVal = Number(body.deliveryCharges || 0);
      body.baseCost = baseCostVal + deliveryVal;
      body.deliveryCharges = deliveryVal;
    }
    const updated = await Product.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (e) {
    console.error('Update product error:', e);
    res.status(500).json({ message: e.message });
  }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (e) {
    console.error('Delete product error:', e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;


