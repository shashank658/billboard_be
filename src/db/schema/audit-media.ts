import { pgTable, uuid, varchar, text, integer, timestamp, date, index } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';
import { billboards } from './billboards.js';

export const auditMedia = pgTable('audit_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  billboardId: uuid('billboard_id').notNull().references(() => billboards.id, { onDelete: 'cascade' }),
  mediaDate: date('media_date').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  s3Bucket: varchar('s3_bucket', { length: 100 }).notNull(),
  description: text('description'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  uploadedBy: uuid('uploaded_by').notNull(),
}, (table) => ({
  bookingIdx: index('audit_media_booking_id_idx').on(table.bookingId),
  billboardIdx: index('audit_media_billboard_id_idx').on(table.billboardId),
  dateIdx: index('audit_media_media_date_idx').on(table.mediaDate),
}));
