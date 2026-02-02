import PDFDocument from 'pdfkit';
import type { PurchaseOrderWithDetails } from './purchase-order.service.js';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber?: string;
  panNumber?: string;
}

// Default company info - should be configurable via settings
const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'Billboard Management Co.',
  address: '123 Business Park, Bangalore, Karnataka 560001',
  phone: '+91 80 1234 5678',
  email: 'accounts@billboardmgmt.com',
  gstNumber: '29AABCU9603R1ZM',
  panNumber: 'AABCU9603R',
};

class PDFService {
  private formatCurrency(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  private formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '-';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  async generatePurchaseOrderPDF(po: PurchaseOrderWithDetails, companyInfo?: CompanyInfo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Purchase Order - ${po.poNumber}`,
            Author: 'Billboard Management System',
            Subject: 'Purchase Order',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const company = companyInfo || DEFAULT_COMPANY_INFO;
        const pageWidth = doc.page.width - 100; // 50px margin on each side

        // Header - Company Info
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(company.name, { align: 'center' });

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(company.address, { align: 'center' })
          .text(`Phone: ${company.phone} | Email: ${company.email}`, { align: 'center' });

        if (company.gstNumber) {
          doc.text(`GSTIN: ${company.gstNumber} | PAN: ${company.panNumber || '-'}`, { align: 'center' });
        }

        doc.moveDown(2);

        // Title
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#1a56db')
          .text('PURCHASE ORDER', { align: 'center' });

        doc.moveDown(0.5);

        // PO Number and Date Box
        const boxTop = doc.y;
        doc
          .rect(50, boxTop, pageWidth, 50)
          .stroke('#e5e7eb');

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(`PO Number: ${po.poNumber}`, 60, boxTop + 10);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Date: ${this.formatDate(po.createdAt)}`, 60, boxTop + 30);

        doc
          .text(`Booking Ref: ${po.booking?.referenceCode || '-'}`, 300, boxTop + 10)
          .text(`Status: PO Generated`, 300, boxTop + 30);

        doc.y = boxTop + 60;
        doc.moveDown(1);

        // Customer Information Section
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text('BILL TO:');

        doc.moveDown(0.3);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(po.customer?.name || '-');

        doc
          .fontSize(10)
          .font('Helvetica');

        if (po.customer?.contactPerson) {
          doc.text(`Contact: ${po.customer.contactPerson}`);
        }
        if (po.customer?.address) {
          doc.text(po.customer.address);
        }
        if (po.customer?.phone) {
          doc.text(`Phone: ${po.customer.phone}`);
        }
        if (po.customer?.email) {
          doc.text(`Email: ${po.customer.email}`);
        }
        if (po.customer?.gstNumber) {
          doc.text(`GSTIN: ${po.customer.gstNumber}`);
        }
        if (po.customer?.panNumber) {
          doc.text(`PAN: ${po.customer.panNumber}`);
        }

        doc.moveDown(1.5);

        // Billboard & Display Period Section
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text('DISPLAY DETAILS:');

        doc.moveDown(0.5);

        // Details Table Header
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 200;
        const colWidth1 = 145;
        const colWidth2 = pageWidth - colWidth1;

        // Table rows
        const drawRow = (label: string, value: string, y: number) => {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#6b7280')
            .text(label, col1, y);

          doc
            .font('Helvetica')
            .fillColor('#000000')
            .text(value, col2, y, { width: colWidth2 });
        };

        let currentY = tableTop;
        const rowHeight = 20;

        drawRow('Billboard:', `${po.billboard?.name || '-'} (${po.billboard?.code || '-'})`, currentY);
        currentY += rowHeight;

        drawRow('Type:', po.billboard?.type?.toUpperCase() || '-', currentY);
        currentY += rowHeight;

        if (po.billboard?.address) {
          drawRow('Location:', po.billboard.address, currentY);
          currentY += rowHeight;
        }

        drawRow('Rate per Day:', this.formatCurrency(po.billboard?.ratePerDay || '0'), currentY);
        currentY += rowHeight;

        doc.moveDown(1);

        // Separator line
        doc
          .moveTo(50, currentY + 5)
          .lineTo(50 + pageWidth, currentY + 5)
          .stroke('#e5e7eb');

        currentY += 15;
        doc.y = currentY;

        // Period Comparison
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text('PERIOD DETAILS:', 50, currentY);

        currentY += 25;

        const originalDays = this.calculateDays(po.booking?.startDate || '', po.booking?.endDate || '');
        const actualDays = this.calculateDays(po.actualStartDate, po.actualEndDate);

        // Original Period
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#6b7280')
          .text('Original Period:', col1, currentY);

        doc
          .font('Helvetica')
          .fillColor('#000000')
          .text(
            `${this.formatDate(po.booking?.startDate)} to ${this.formatDate(po.booking?.endDate)} (${originalDays} days)`,
            col2,
            currentY
          );

        currentY += rowHeight;

        // Actual Period
        doc
          .font('Helvetica-Bold')
          .fillColor('#6b7280')
          .text('Actual Period:', col1, currentY);

        doc
          .font('Helvetica')
          .fillColor('#000000')
          .text(
            `${this.formatDate(po.actualStartDate)} to ${this.formatDate(po.actualEndDate)} (${actualDays} days)`,
            col2,
            currentY
          );

        currentY += rowHeight + 10;

        // Campaign info if available
        if (po.campaign) {
          doc
            .font('Helvetica-Bold')
            .fillColor('#6b7280')
            .text('Campaign:', col1, currentY);

          doc
            .font('Helvetica')
            .fillColor('#000000')
            .text(`${po.campaign.name} (${po.campaign.referenceCode})`, col2, currentY);

          currentY += rowHeight;
        }

        doc.y = currentY + 10;
        doc.moveDown(1);

        // Value Summary Box
        const summaryBoxTop = doc.y;
        const summaryBoxHeight = 100;

        doc
          .rect(50, summaryBoxTop, pageWidth, summaryBoxHeight)
          .fillAndStroke('#f9fafb', '#e5e7eb');

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text('VALUE SUMMARY', 60, summaryBoxTop + 10);

        let summaryY = summaryBoxTop + 35;

        // Notional Value
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text('Notional Value (Original):', 60, summaryY);

        doc
          .fillColor('#000000')
          .text(this.formatCurrency(po.booking?.notionalValue || '0'), 250, summaryY);

        summaryY += 18;

        // Adjustment
        const notionalValue = parseFloat(po.booking?.notionalValue || '0');
        const actualValue = parseFloat(po.actualValue);
        const adjustment = actualValue - notionalValue;
        const adjustmentPercent = notionalValue > 0 ? ((adjustment / notionalValue) * 100).toFixed(2) : '0';

        doc
          .fillColor('#6b7280')
          .text('Adjustment:', 60, summaryY);

        doc
          .fillColor(adjustment >= 0 ? '#059669' : '#dc2626')
          .text(
            `${adjustment >= 0 ? '+' : ''}${this.formatCurrency(adjustment)} (${adjustmentPercent}%)`,
            250,
            summaryY
          );

        summaryY += 18;

        // Actual Value (highlighted)
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#1a56db')
          .text('ACTUAL VALUE:', 60, summaryY);

        doc
          .fontSize(14)
          .text(this.formatCurrency(po.actualValue), 250, summaryY);

        doc.y = summaryBoxTop + summaryBoxHeight + 20;

        // Adjustment Notes
        if (po.adjustmentNotes) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#374151')
            .text('Adjustment Notes:', 50);

          doc
            .font('Helvetica')
            .fillColor('#6b7280')
            .text(po.adjustmentNotes, 50, doc.y + 5, { width: pageWidth });

          doc.moveDown(1);
        }

        // Footer
        const footerY = doc.page.height - 100;

        doc
          .moveTo(50, footerY)
          .lineTo(50 + pageWidth, footerY)
          .stroke('#e5e7eb');

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#9ca3af')
          .text('This is a computer-generated document.', 50, footerY + 10, { align: 'center' })
          .text(
            `Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
            50,
            footerY + 22,
            { align: 'center' }
          )
          .text('Billboard Management System', 50, footerY + 34, { align: 'center' });

        // Page number
        doc.text(`Page 1 of 1`, 50, footerY + 50, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const pdfService = new PDFService();
