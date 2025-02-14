import { Pool } from "pg"

export const ensureEventStoreInstalled = async (pool: Pool) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS events (
            sequence_number BIGSERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            data JSONB NOT NULL,
            metadata JSONB NOT NULL,
            tags JSONB NOT NULL,
            "timestamp" TIMESTAMPTZ DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_sequence_number ON events(sequence_number);
        CREATE INDEX IF NOT EXISTS idx_type ON events(type);
        CREATE INDEX IF NOT EXISTS idx_tags ON events USING gin (tags);
        CREATE INDEX IF NOT EXISTS idx_data ON events USING gin (data);
    `)
}
