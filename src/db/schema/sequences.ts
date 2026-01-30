import { pgTable, varchar, integer, primaryKey } from 'drizzle-orm/pg-core';

export const sequences = pgTable('sequences', {
  entityType: varchar('entity_type', { length: 20 }).notNull(),
  year: integer('year').notNull(),
  currentValue: integer('current_value').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.entityType, table.year] }),
}));

export type SequenceEntityType = 'booking' | 'campaign' | 'po' | 'invoice';

export const SEQUENCE_PREFIXES: Record<SequenceEntityType, string> = {
  booking: 'BK',
  campaign: 'CP',
  po: 'PO',
  invoice: 'INV',
};
