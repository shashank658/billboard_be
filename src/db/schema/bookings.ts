import { pgTable, uuid, varchar, text, decimal, integer, timestamp, date, index } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';
import { campaigns } from './campaigns.js';
import { billboards } from './billboards.js';

export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  referenceCode: varchar('reference_code', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  billboardId: uuid('billboard_id').notNull().references(() => billboards.id, { onDelete: 'restrict' }),
  slotNumber: integer('slot_number'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  actualEndDate: date('actual_end_date'),
  notionalValue: decimal('notional_value', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('created'),
  creativeRef: varchar('creative_ref', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  customerIdx: index('bookings_customer_id_idx').on(table.customerId),
  campaignIdx: index('bookings_campaign_id_idx').on(table.campaignId),
  billboardIdx: index('bookings_billboard_id_idx').on(table.billboardId),
  statusIdx: index('bookings_status_idx').on(table.status),
  startDateIdx: index('bookings_start_date_idx').on(table.startDate),
  endDateIdx: index('bookings_end_date_idx').on(table.endDate),
  refCodeIdx: index('bookings_reference_code_idx').on(table.referenceCode),
}));
