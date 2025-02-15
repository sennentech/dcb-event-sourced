import { Pool, PoolClient } from "pg"

export const ensureInstalled = async (pool: Pool | PoolClient, tableName: string) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          sequence_number BIGSERIAL PRIMARY KEY,
          type TEXT NOT NULL,
          data JSONB NOT NULL,
          metadata JSONB NOT NULL,
          tags TEXT[] NOT NULL,
          "timestamp" TIMESTAMPTZ DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS ${tableName}_sequence_number_idx 
        ON ${tableName}(sequence_number);
        CREATE INDEX IF NOT EXISTS ${tableName}_type_idx 
        ON ${tableName}(type);
        CREATE INDEX IF NOT EXISTS ${tableName}_tags_idx 
        ON ${tableName} USING GIN (tags);
        CREATE INDEX IF NOT EXISTS ${tableName}_data_idx 
        ON ${tableName} USING GIN (data);
  `)
}
