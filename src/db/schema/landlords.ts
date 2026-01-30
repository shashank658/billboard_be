import { pgTable, uuid, varchar, text, decimal, timestamp, boolean } from 'drizzle-orm/pg-core';

export const landlords = pgTable('landlords', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  contactPerson: varchar('contact_person', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  bankName: varchar('bank_name', { length: 100 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  ifscCode: varchar('ifsc_code', { length: 20 }),
  agreementDetails: text('agreement_details'),
  rentAmount: decimal('rent_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  paymentFrequency: varchar('payment_frequency', { length: 20 }).notNull().default('monthly'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});
