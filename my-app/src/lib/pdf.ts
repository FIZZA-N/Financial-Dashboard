import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Order } from '@/store/orderStore';

// @/lib/utils.ts mein ye function add karo
export const convertImageToBase64 = async (imagePath: string): Promise<string> => {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Logo Not loaded:', error);
    return '';
  }
};

export  async function generateOrderSlip(order: Order) {
  // Thermal slip dimensions
  const pageWidth = 80;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, 297]
  });

  const leftMargin = 2;
  const rightMargin = 2;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Your Base64 Logo - YAHAN APNA LOGO KA BASE64 STRING DALDEN
const logoBase64 = await convertImageToBase64('/logo.png');
  const centerText = (text: string, y: number) => {
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };

  let yPosition = 5;

  // LOGO ADD KARNA - Top Center
  if (logoBase64) {
    try {
      // Logo dimensions for thermal slip (small size)
      const logoWidth = 30; // mm
      const logoHeight = 15; // mm
      const logoX = (pageWidth - logoWidth) / 2;
      
      doc.addImage(logoBase64, 'PNG', logoX, yPosition, logoWidth, logoHeight);
      yPosition += logoHeight + 2; // Logo ke baad spacing
    } catch (error) {
      console.error('Logo load nahi hua:', error);
    }
  }

  // Header Text - Logo ke neeche
  doc.setFontSize(8);
  doc.setTextColor(0);
  centerText('03218286245 | 02133542016', yPosition);
  yPosition += 4;
  
  centerText('Shop# 08 Euro Grand Park Nazimabad', yPosition);
  yPosition += 4;
  
  centerText('No 1, Karachi, Pakistan', yPosition);
  yPosition += 6;

  // Baaki ka same code...
  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()} ${currentDate.getHours()}:${currentDate.getMinutes().toString().padStart(2, '0')}${currentDate.getHours() >= 12 ? 'PM' : 'AM'}`;
  
  doc.text(`Date: ${formattedDate}`, leftMargin, yPosition);
  yPosition += 4;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  centerText(`Bill No: ${order.orderId}`, yPosition);
  yPosition += 6;

  // Customer Information
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const custName = (order as any).customerSupplierName || (order as any).clientName || (order as any).customerName || ((order as any).customer && (order as any).customer.name) || '';
  doc.text(`Name: ${custName}`, leftMargin, yPosition);
  yPosition += 4;
  
  const custPhone = (order as any).customerPhone || (order as any).clientPhone || (order as any).customerPhone || ((order as any).customer && (order as any).customer.phone) || '0340-XXXXXXX';
  doc.text(`Ph: ${custPhone}`, leftMargin, yPosition);
  yPosition += 4;
  
  const address = (order as any).customerAddress || (order as any).clientAddress || ((order as any).customer && (order as any).customer.address) || 'Karachi, Pakistan';
  const addressLines = doc.splitTextToSize(`Address: ${address}`, contentWidth);
  doc.text(addressLines, leftMargin, yPosition);
  yPosition += (addressLines.length * 4);
  
  yPosition += 2;

  // Line separator
  doc.setDrawColor(0);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 4;

  // Duplicate Bill text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  centerText('DUPLICATE BILL', yPosition);
  yPosition += 6;

  // Items Table Header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  doc.text('Item', leftMargin, yPosition);
  doc.text('Price', 30, yPosition);
  doc.text('Qty', 45, yPosition);
  doc.text('Disc', 55, yPosition);
  doc.text('Amount', 65, yPosition);
  
  yPosition += 4;
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 4;

  // Item Details
  doc.setFont('helvetica', 'normal');
  let totalSelling = 0;
  let totalCost = 0;
  let totalQty = 0;

  if ((order as any).products && Array.isArray((order as any).products) && (order as any).products.length > 0) {
    // render each product line
    (order as any).products.forEach((p: any) => {
      const nameLines = doc.splitTextToSize(p.name || p.productServiceName || '', 25);
      doc.text(nameLines, leftMargin, yPosition);
      doc.text(`Rs ${Number(p.sellingPrice || p.basePrice || 0).toFixed(2)}`, 30, yPosition);
      doc.text(String(p.quantity || 0), 45, yPosition);
      doc.text('0', 55, yPosition);
      const lineAmount = Number(p.sellingPrice || p.basePrice || 0) * Number(p.quantity || 0);
      doc.text(`Rs ${lineAmount.toFixed(2)}`, 65, yPosition);
      yPosition += (nameLines.length * 4) + 2;
      totalSelling += lineAmount;
      totalQty += Number(p.quantity || 0);
      totalCost += Number(p.costPrice || p.baseCost || 0) * Number(p.quantity || 0);
    });
  } else {
    // single-product fallback
    const name = order.productServiceName || (order as any).name || '';
    const productNameLines = doc.splitTextToSize(name, 25);
    doc.text(productNameLines, leftMargin, yPosition);
    const sp = Number(order.sellingPrice || 0);
    const qty = Number(order.quantity || 0);
    doc.text(`Rs ${sp.toFixed(2)}`, 30, yPosition);
    doc.text(String(qty), 45, yPosition);
    doc.text('0', 55, yPosition);
    doc.text(`Rs ${(sp * qty).toFixed(2)}`, 65, yPosition);
    yPosition += (productNameLines.length * 4) + 4;
    totalSelling = sp * qty;
    totalQty = qty;
    totalCost = Number(order.costPrice || 0) * qty;
  }
  
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 4;

  // Total Section
  doc.setFont('helvetica', 'bold');
  
  const delivery = Number((order as any).deliveryCharge || 0);
  const deliveryPaidByCustomer = (order as any).deliveryPaidByCustomer !== undefined ? Boolean((order as any).deliveryPaidByCustomer) : true;
  // Use finalAmount from the order when available (backend computes it to keep consistency)
  const finalAmountFromOrder = Number((order as any).finalAmount || 0);
  // compute displayed grand total: prefer backend finalAmount, otherwise compute locally
  const computedGrandTotal = finalAmountFromOrder || ((totalSelling * (1 + ((order as any).taxPercent || 0)/100)) + (deliveryPaidByCustomer ? delivery : 0));

  const totals = [
    { label: 'Total Bill:', value: totalSelling.toFixed(2) },
    { label: 'Item Discount:', value: '0' },
    { label: 'Total Discount(Rs):', value: '0' },
    // show delivery only when charged to customer
    { label: 'Delivery:', value: (deliveryPaidByCustomer ? delivery.toFixed(2) : '0.00') },
    { label: 'Grand Total:', value: computedGrandTotal.toFixed(2) },
  ];

  totals.forEach(item => {
    doc.text(item.label, leftMargin, yPosition);
    doc.text(item.value, 65, yPosition);
    yPosition += 4;
  });

  yPosition += 2;

  // Payment Details
  let amountPaid = 0;
  let balance = computedGrandTotal;

  // Prefer backend-computed finalAmount and partial fields when available
  const finalAmount = finalAmountFromOrder || computedGrandTotal;
  if (order.paymentStatus === 'Paid') {
    amountPaid = finalAmount;
    balance = 0;
  } else if (order.paymentStatus === 'Partial') {
    amountPaid = Number((order as any).partialPaidAmount || 0);
    balance = Number((order as any).partialRemainingAmount || Math.max(0, finalAmount - amountPaid));
  }

  doc.text('Amount Paid:', leftMargin, yPosition);
  doc.text(amountPaid.toFixed(2), 65, yPosition);
  yPosition += 4;

  doc.text('Balance:', leftMargin, yPosition);
  doc.text(balance.toFixed(2), 65, yPosition);
  yPosition += 6;

  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 4;

  // Footer Section
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  centerText('Thankyou For Shopping. Come Again.', yPosition);
  yPosition += 4;
  
  centerText('No Return No Exchange Without Bill', yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'bold');
  centerText('For Payment Details:', yPosition);
  yPosition += 4;
  
  doc.setFont('helvetica', 'normal');
  centerText('Meezan Bank', yPosition);
  yPosition += 3;
  
  centerText('Pak Soorty Dates', yPosition);
  yPosition += 3;
  
  centerText('Account No:99 6201 0943 5654', yPosition);
  yPosition += 6;

  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 4;

  doc.setFontSize(6);
  centerText('Software Design By Metawayz', yPosition);
  yPosition += 3;
  
  centerText('www.metawayz.com | +923452208269', yPosition);

  doc.save(`SLIP_${order.orderId}.pdf`);
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


