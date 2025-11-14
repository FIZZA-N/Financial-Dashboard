const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Create product
router.post('/', auth, async (req, res) => {
  try {
  const { businessType, name, basePrice, baseCost, deliveryCharges, stock, priceTiers } = req.body;
  // store baseCost as provided and keep deliveryCharges separately (do NOT fold delivery into baseCost)
  const created = await Product.create({
    businessType,
    name,
    basePrice: Number(basePrice || 0),
    baseCost: Number(baseCost || 0),
    deliveryCharges: Number(deliveryCharges || 0),
    stock: Number(stock || 0),
    priceTiers: Array.isArray(priceTiers) ? priceTiers.map(pt => ({ label: pt.label, price: Number(pt.price || 0) })) : []
  });
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
  // Do not fold deliveryCharges into baseCost on update; keep separate fields
  const body = { ...req.body };
  if (body.baseCost !== undefined) body.baseCost = Number(body.baseCost || 0);
  if (body.deliveryCharges !== undefined) body.deliveryCharges = Number(body.deliveryCharges || 0);
  if (body.stock !== undefined) body.stock = Number(body.stock || 0);
  if (body.priceTiers !== undefined) body.priceTiers = Array.isArray(body.priceTiers) ? body.priceTiers.map(pt => ({ label: pt.label, price: Number(pt.price || 0) })) : [];
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


