const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Get monthly summary
router.get('/monthly', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let startDate, endDate;
    if (year && month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      // Current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }
    
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const businessTypes = ['Travel', 'Dates', 'Belts'];
    const summary = {};
    
    let totalSales = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let pendingPayments = 0;
    
    businessTypes.forEach(business => {
      const businessOrders = orders.filter(o => o.businessType === business);
      
      const sales = businessOrders.reduce((sum, o) => sum + o.sellingPrice, 0);
      const cost = businessOrders.reduce((sum, o) => sum + o.costPrice, 0);
      const profit = sales - cost;
      const pending = businessOrders
        .filter(o => o.paymentStatus !== 'Paid')
        .reduce((sum, o) => sum + (o.paymentStatus === 'Partial' ? o.sellingPrice * 0.5 : o.sellingPrice), 0);
      
      summary[business] = {
        sales,
        cost,
        profit,
        pending,
        orderCount: businessOrders.length
      };
      
      totalSales += sales;
      totalCost += cost;
      totalProfit += profit;
      pendingPayments += pending;
    });
    
    // Investor view - show only 40% of actual profit
    let displayProfit = totalProfit;
    if (req.user.role === 'Investor') {
      displayProfit = totalProfit * 0.4;
    }
    
    res.json({
      summary,
      totals: {
        sales: totalSales,
        cost: totalCost,
        profit: displayProfit,
        pending: pendingPayments
      },
      period: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get date range summary
router.get('/range', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }
    
    const orders = await Order.find({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
    
    const totals = orders.reduce((acc, order) => {
      acc.sales += order.sellingPrice;
      acc.cost += order.costPrice;
      acc.profit += order.profit;
      if (order.paymentStatus !== 'Paid') {
        acc.pending += order.paymentStatus === 'Partial' 
          ? order.sellingPrice * 0.5 
          : order.sellingPrice;
      }
      return acc;
    }, { sales: 0, cost: 0, profit: 0, pending: 0 });
    
    // Investor view
    if (req.user.role === 'Investor') {
      totals.profit = totals.profit * 0.4;
    }
    
    res.json({
      ...totals,
      orderCount: orders.length,
      period: { start: startDate, end: endDate }
    });
  } catch (error) {
    console.error('Range summary error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

