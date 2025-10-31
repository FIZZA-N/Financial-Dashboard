import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Order } from '@/store/orderStore';

export function generateOrderSlip(order: Order) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Order Slip', 14, 18);
  doc.setFontSize(11);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 14, 26);

  autoTable(doc, {
    startY: 32,
    head: [['Field', 'Value']],
    body: [
      ['Business', order.businessType],
      ['Order ID', order.orderId],
      ['Order Type', order.orderType],
      ['Product/Service', order.productServiceName],
      ['Quantity', String(order.quantity)],
      ['Cost Price', String(order.costPrice)],
      ['Selling Price', String(order.sellingPrice)],
      ['Profit', String(order.profit)],
      ['Payment Status', order.paymentStatus],
      ['Payment Method', order.paymentMethod],
      ['Customer/Supplier', order.customerSupplierName],
      ['Remarks', order.remarks || '-'],
    ],
    styles: { fontSize: 10 },
  });

  doc.save(`Order_${order.orderId}.pdf`);
}

export function generateOrdersReport(orders: Order[], title = 'Orders Report') {
  const doc = new jsPDF('l');
  doc.setFontSize(16);
  doc.text(title, 14, 14);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

  autoTable(doc, {
    startY: 26,
    head: [[
      'Business','Order ID','Type','Product/Service','Qty','Cost','Selling','Profit','Status','Method','Customer/Supplier','Created'
    ]],
    body: orders.map(o => [
      o.businessType,
      o.orderId,
      o.orderType,
      o.productServiceName,
      String(o.quantity),
      String(o.costPrice),
      String(o.sellingPrice),
      String(o.profit),
      o.paymentStatus,
      o.paymentMethod,
      o.customerSupplierName,
      new Date(o.createdAt).toLocaleDateString(),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  doc.save('orders_report.pdf');
}

export function generateBusinessReport(params: {
  business: 'Travel' | 'Dates' | 'Belts';
  orders: Order[];
  summary: { sales: number; cost: number; profit: number; pending: number; orderCount: number };
}) {
  const { business, orders, summary } = params;
  const doc = new jsPDF('l');
  doc.setFontSize(18);
  doc.text(`${business} - Business Report`, 14, 14);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

  autoTable(doc, {
    startY: 26,
    head: [['Metric', 'Value']],
    body: [
      ['Sales', String(summary.sales)],
      ['Cost', String(summary.cost)],
      ['Profit', String(summary.profit)],
      ['Pending', String(summary.pending)],
      ['Orders', String(summary.orderCount)],
    ],
    styles: { fontSize: 10 },
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [[
      'Order ID','Type','Product/Service','Qty','Cost','Selling','Profit','Status','Method','Customer/Supplier','Created'
    ]],
    body: orders.map(o => [
      o.orderId,
      o.orderType,
      o.productServiceName,
      String(o.quantity),
      String(o.costPrice),
      String(o.sellingPrice),
      String(o.profit),
      o.paymentStatus,
      o.paymentMethod,
      o.customerSupplierName,
      new Date(o.createdAt).toLocaleDateString(),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${business.toLowerCase()}_report.pdf`);
}


