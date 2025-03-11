import { Pool, PoolClient } from "pg"

export const ensureHandlersInstalled = async (pool: Pool | PoolClient, handlerIds: string[], tableName: string) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
            handler_id TEXT PRIMARY KEY,
            last_sequence_position BIGINT
        );`)

    await registerhandlers(pool, handlerIds, tableName)
}

export const registerhandlers = async (pool: Pool | PoolClient, handlerIds: string[], tableName: string) => {
    await pool.query(
        `
        INSERT INTO ${tableName} (handler_id, last_sequence_position)
        SELECT handler_id, 0
        FROM unnest($1::text[]) handler_id
        ON CONFLICT (handler_id) DO NOTHING
    `,
        [handlerIds]
    )
}
