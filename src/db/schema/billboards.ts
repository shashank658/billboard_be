import { pgTable, uuid, varchar, text, decimal, integer, timestamp, boolean, doublePrecision, index } from 'drizzle-orm/pg-core';
import { zones } from './locations.js';
import { landlords } from './landlords.js';

export const billboards = pgTable('billboards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull().default('static'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  width: decimal('width', { precision: 10, scale: 2 }).notNull(),
  height: decimal('height', { precision: 10, scale: 2 }).notNull(),
  orientation: varchar('orientation', { length: 20 }).default('landscape'),
  zoneId: uuid('zone_id').notNull().references(() => zones.id, { onDelete: 'restrict' }),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  illumination: varchar('illumination', { length: 50 }),
  installationDate: timestamp('installation_date', { withTimezone: true }),
  landlordId: uuid('landlord_id').notNull().references(() => landlords.id, { onDelete: 'restrict' }),
  ratePerDay: decimal('rate_per_day', { precision: 12, scale: 2 }).notNull().default('0'),
  loopDuration: integer('loop_duration'),
  slotCount: integer('slot_count'),
  slotDuration: integer('slot_duration'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  zoneIdx: index('billboards_zone_id_idx').on(table.zoneId),
  landlordIdx: index('billboards_landlord_id_idx').on(table.landlordId),
  typeIdx: index('billboards_type_idx').on(table.type),
  statusIdx: index('billboards_status_idx').on(table.status),
}));
