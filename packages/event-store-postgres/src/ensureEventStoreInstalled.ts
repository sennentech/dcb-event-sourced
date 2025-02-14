import { Pool } from "pg"
import { getTableName } from "./utils"

export const ensureEventStoreInstalled = async (pool: Pool, tablePrefixOverride?: string) => {
    const tableName = getTableName(tablePrefixOverride)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
            sequence_number BIGSERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            data JSONB NOT NULL,
            metadata JSONB NOT NULL,
            tags JSONB NOT NULL,
            "timestamp" TIMESTAMPTZ DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_sequence_number ON events(sequence_number);
        CREATE INDEX IF NOT EXISTS idx_type ON ${tableName}(type);
        CREATE INDEX IF NOT EXISTS idx_tags ON ${tableName} USING gin (tags);
        CREATE INDEX IF NOT EXISTS idx_data ON ${tableName} USING gin (data);
    `)
}
