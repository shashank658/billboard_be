import { pgTable, uuid, varchar, text, decimal, timestamp, date, index } from 'drizzle-orm/pg-core';
import { purchaseOrders } from './purchase-orders.js';
import { taxes } from './taxes.js';

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'restrict' }).unique(),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date').notNull(),
  subtotal: decimal('subtotal', { precision: 14, scale: 2 }).notNull(),
  taxId: uuid('tax_id').references(() => taxes.id, { onDelete: 'set null' }),
  taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('unpaid'),
  paymentDate: date('payment_date'),
  paymentNotes: text('payment_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  poIdx: index('invoices_purchase_order_id_idx').on(table.purchaseOrderId),
  invoiceNumberIdx: index('invoices_invoice_number_idx').on(table.invoiceNumber),
  statusIdx: index('invoices_payment_status_idx').on(table.paymentStatus),
  dateIdx: index('invoices_invoice_date_idx').on(table.invoiceDate),
}));
