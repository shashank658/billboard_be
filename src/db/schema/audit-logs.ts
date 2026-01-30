import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id'),
  userEmail: varchar('user_email', { length: 255 }),
  action: varchar('action', { length: 50 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  entityType: varchar('entity_type', { length: 50 }),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changes: jsonb('changes'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  requestPath: varchar('request_path', { length: 255 }),
  requestMethod: varchar('request_method', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  moduleIdx: index('audit_logs_module_idx').on(table.module),
  entityIdx: index('audit_logs_entity_id_idx').on(table.entityId),
  dateIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));
