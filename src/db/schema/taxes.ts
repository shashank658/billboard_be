import { pgTable, uuid, varchar, decimal, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const taxes = pgTable('taxes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(),
  hsnSacCode: varchar('hsn_sac_code', { length: 20 }),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});
