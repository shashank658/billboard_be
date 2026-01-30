import { pgTable, uuid, varchar, text, decimal, timestamp, date, index } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  poNumber: varchar('po_number', { length: 50 }).notNull().unique(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'restrict' }).unique(),
  actualStartDate: date('actual_start_date').notNull(),
  actualEndDate: date('actual_end_date').notNull(),
  actualValue: decimal('actual_value', { precision: 14, scale: 2 }).notNull(),
  adjustmentNotes: text('adjustment_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  bookingIdx: index('purchase_orders_booking_id_idx').on(table.bookingId),
  poNumberIdx: index('purchase_orders_po_number_idx').on(table.poNumber),
}));
