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
  doc.text(`Name: ${order.customerSupplierName}`, leftMargin, yPosition);
  yPosition += 4;
  
  doc.text(`Ph: ${order.customerPhone || '0340-XXXXXXX'}`, leftMargin, yPosition);
  yPosition += 4;
  
  const address = order.customerAddress || 'Karachi, Pakistan';
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
  
  const productNameLines = doc.splitTextToSize(order.productServiceName, 25);
  doc.text(productNameLines, leftMargin, yPosition);
  
  doc.text(`Rs ${order.sellingPrice.toFixed(2)}`, 30, yPosition);
  doc.text(order.quantity.toString(), 45, yPosition);
  doc.text('0', 55, yPosition);
  doc.text(`Rs ${(order.sellingPrice * order.quantity).toFixed(2)}`, 65, yPosition);
  
  yPosition += (productNameLines.length * 4) + 4;
  
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 4;

  // Total Section
  doc.setFont('helvetica', 'bold');
  
  const totals = [
    { label: 'Total Bill:', value: (order.sellingPrice * order.quantity).toFixed(2) },
    { label: 'Item Discount:', value: '0' },
    { label: 'Total Discount(Rs):', value: '0' },
    { label: 'Grand Total:', value: (order.sellingPrice * order.quantity).toFixed(2) },
  ];

  totals.forEach(item => {
    doc.text(item.label, leftMargin, yPosition);
    doc.text(item.value, 65, yPosition);
    yPosition += 4;
  });

  yPosition += 2;

  // Payment Details
  let amountPaid = 0;
  let balance = order.sellingPrice * order.quantity;
  
  if (order.paymentStatus === 'Paid') {
    amountPaid = order.sellingPrice * order.quantity;
    balance = 0;
  } else if (order.paymentStatus === 'Partial') {
    amountPaid = (order as any).partialPaidAmount || 0;
    balance = (order as any).partialRemainingAmount || (order.sellingPrice * order.quantity - amountPaid);
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


