import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const regions = pgTable('regions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const cities = pgTable('cities', {
  id: uuid('id').defaultRandom().primaryKey(),
  regionId: uuid('region_id').notNull().references(() => regions.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  regionIdx: index('cities_region_id_idx').on(table.regionId),
}));

export const zones = pgTable('zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  cityId: uuid('city_id').notNull().references(() => cities.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  cityIdx: index('zones_city_id_idx').on(table.cityId),
}));
