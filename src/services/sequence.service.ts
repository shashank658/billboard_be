import { eq, and, sql as drizzleSql } from 'drizzle-orm';
import { db, sql } from '../db/index.js';
import { sequences, SEQUENCE_PREFIXES, type SequenceEntityType } from '../db/schema/index.js';

class SequenceService {
  async getNextSequence(entityType: SequenceEntityType): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = SEQUENCE_PREFIXES[entityType];

    // Use INSERT ON CONFLICT (upsert) with RETURNING to atomically get next value
    // This avoids the need for transactions which aren't supported by neon-http
    const result = await sql`
      INSERT INTO sequences (entity_type, year, current_value)
      VALUES (${entityType}, ${year}, 1)
      ON CONFLICT (entity_type, year)
      DO UPDATE SET current_value = sequences.current_value + 1
      RETURNING current_value
    `;

    const nextValue = result[0]?.current_value || 1;

    // Format: BK-2024-0001
    const paddedNumber = nextValue.toString().padStart(4, '0');
    return `${prefix}-${year}-${paddedNumber}`;
  }

  async getCurrentSequence(entityType: SequenceEntityType): Promise<number> {
    const year = new Date().getFullYear();

    const [existing] = await db
      .select()
      .from(sequences)
      .where(
        and(
          eq(sequences.entityType, entityType),
          eq(sequences.year, year)
        )
      )
      .limit(1);

    return existing?.currentValue || 0;
  }
}

export const sequenceService = new SequenceService();
