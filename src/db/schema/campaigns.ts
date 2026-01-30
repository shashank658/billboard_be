import { pgTable, uuid, varchar, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  referenceCode: varchar('reference_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  description: text('description'),
  totalValue: decimal('total_value', { precision: 14, scale: 2 }).notNull().default('0'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  customerIdx: index('campaigns_customer_id_idx').on(table.customerId),
  refCodeIdx: index('campaigns_reference_code_idx').on(table.referenceCode),
}));
